import {createHash} from 'crypto'
import {rest} from 'msw'
import {setupServer} from 'msw/node'
import {firstValueFrom} from 'rxjs'
import {Input} from '../src/input'
import {deleteVersions, finalIds} from '../src/delete'
import {protectedContainerDigests} from '../src/version/container-references'
import {RestVersionInfo} from '../src/version/get-versions'
import {
  dockerImageType,
  dockerIndexType,
  fixture,
  image,
  index
} from './version/container.mock'

const server = setupServer()
const input = new Input({
  owner: 'test-owner',
  packageName: 'nested/image',
  packageType: 'container',
  token: 'secret-test-token',
  deleteUntaggedVersions: 'true',
  minVersionsToKeep: 0,
  ignoreVersions: /^$/
})
const base = 'https://ghcr.io/v2/test-owner/nested/image'
const leaf = image()
const attestation = image(leaf.digest)
const nested = index([leaf.digest, attestation.digest], dockerIndexType)
const root = index([nested.digest, leaf.digest])
let documents: Map<string, string>
let requests: string[]

function version(ref: string, tagged = false, id = 1): RestVersionInfo {
  return {
    id,
    version: ref,
    tagged,
    created_at: new Date(id * 1000).toISOString()
  }
}

beforeAll(() => server.listen({onUnhandledRequest: 'error'}))
afterAll(() => server.close())
beforeEach(() => {
  requests = []
  documents = new Map([
    ['latest', root.body],
    [root.digest, root.body],
    [nested.digest, nested.body],
    [leaf.digest, leaf.body],
    [attestation.digest, attestation.body]
  ])
  server.use(
    rest.get('https://ghcr.io/token', (req, res, ctx) => {
      expect(req.url.searchParams.get('scope')).toBe(
        'repository:test-owner/nested/image:pull'
      )
      expect(req.headers.get('authorization')).toBe(
        `Basic ${Buffer.from(`${process.env.GITHUB_ACTOR || input.owner}:${input.token}`).toString('base64')}`
      )
      return res(ctx.json({token: 'registry-test-token'}))
    }),
    rest.get(`${base}/tags/list`, (_req, res, ctx) =>
      res(ctx.json({tags: ['latest']}))
    ),
    rest.get(`${base}/manifests/:ref`, (req, res, ctx) => {
      expect(req.headers.get('authorization')).toBe(
        'Bearer registry-test-token'
      )
      const ref = req.params.ref as string
      requests.push(ref)
      return documents.has(ref)
        ? res(ctx.body(documents.get(ref)!))
        : res(ctx.status(404))
    })
  )
})
afterEach(() => server.resetHandlers())

test('protects nested indexes, shared platform images, and provenance subjects', async () => {
  expect(
    await protectedContainerDigests(input, [version(root.digest, true)])
  ).toEqual(
    new Set([root.digest, nested.digest, leaf.digest, attestation.digest])
  )
  expect(requests.filter(ref => ref === leaf.digest)).toHaveLength(1)
  expect(requests.filter(ref => ref === 'latest')).toHaveLength(2)
})

test('uses registry tags even when new tagged roots are absent from package metadata', async () => {
  expect(
    await protectedContainerDigests(input, [version(leaf.digest)])
  ).toContain(leaf.digest)
})

test('also protects tagged package versions absent from registry tag listing', async () => {
  server.use(
    rest.get(`${base}/tags/list`, (_req, res, ctx) =>
      res(ctx.json({tags: null}))
    )
  )
  expect(
    await protectedContainerDigests(input, [version(root.digest, true)])
  ).toContain(attestation.digest)
})

test('supports Docker image manifests', async () => {
  const dockerImage = image(undefined, dockerImageType)
  documents.set('latest', dockerImage.body)
  expect(await protectedContainerDigests(input, [])).toEqual(
    new Set([dockerImage.digest])
  )
})

test('follows tag pagination', async () => {
  const other = image(leaf.digest, dockerImageType)
  documents.set('older', other.body)
  server.use(
    rest.get(`${base}/tags/list`, (req, res, ctx) =>
      req.url.searchParams.has('last')
        ? res(ctx.json({tags: ['older']}))
        : res(
            ctx.set(
              'Link',
              `</v2/test-owner/nested/image/tags/list?last=latest&n=100>; rel="next"`
            ),
            ctx.json({tags: ['latest']})
          )
    )
  )
  expect(await protectedContainerDigests(input, [])).toContain(other.digest)
})

test('rejects pagination to another host without sending it credentials', async () => {
  server.use(
    rest.get(`${base}/tags/list`, (_req, res, ctx) =>
      res(
        ctx.set('Link', '<https://example.com/steal>; rel="next"'),
        ctx.json({tags: []})
      )
    )
  )
  await expect(protectedContainerDigests(input, [])).rejects.toThrow(
    'pagination'
  )
})

test.each([401, 403, 404, 429, 500])(
  'fails closed on registry HTTP %s',
  async status => {
    server.use(
      rest.get(`${base}/manifests/:ref`, (_req, res, ctx) =>
        res(ctx.status(status))
      )
    )
    await expect(protectedContainerDigests(input, [])).rejects.toThrow(
      `HTTP ${status}`
    )
  }
)

test('fails closed when an image child or attestation is missing', async () => {
  documents.delete(attestation.digest)
  await expect(protectedContainerDigests(input, [])).rejects.toThrow('HTTP 404')
})

test('rejects a mismatched manifest digest', async () => {
  documents.set(nested.digest, leaf.body)
  await expect(protectedContainerDigests(input, [])).rejects.toThrow(
    'digest mismatch'
  )
})

test.each([
  {schemaVersion: 2, mediaType: 'unsupported'},
  {schemaVersion: 2, mediaType: 'application/vnd.oci.image.index.v1+json'},
  {
    schemaVersion: 2,
    mediaType: 'application/vnd.oci.image.index.v1+json',
    manifests: [{digest: 'invalid'}]
  },
  {
    schemaVersion: 2,
    mediaType: 'application/vnd.oci.image.manifest.v1+json',
    config: {}
  },
  {
    schemaVersion: 2,
    mediaType: 'application/vnd.oci.image.manifest.v1+json',
    config: {},
    layers: [],
    subject: null
  }
])('fails closed on malformed/unsupported manifests %#', async value => {
  documents.set('latest', fixture(value).body)
  await expect(protectedContainerDigests(input, [])).rejects.toThrow(
    'refusing cleanup'
  )
})

test('fails closed if tags are added during discovery', async () => {
  let listings = 0
  server.use(
    rest.get(`${base}/tags/list`, (_req, res, ctx) =>
      res(ctx.json({tags: ++listings === 1 ? ['latest'] : ['latest', 'new']}))
    )
  )
  await expect(protectedContainerDigests(input, [])).rejects.toThrow(
    'tags changed'
  )
})

test('fails closed if an existing tag moves during discovery', async () => {
  let reads = 0
  server.use(
    rest.get(`${base}/manifests/latest`, (_req, res, ctx) =>
      res(ctx.body(++reads === 1 ? root.body : leaf.body))
    )
  )
  await expect(protectedContainerDigests(input, [])).rejects.toThrow(
    'tag moved'
  )
})

test('rejects GHES before making any registry requests', async () => {
  const previous = process.env.GITHUB_SERVER_URL
  process.env.GITHUB_SERVER_URL = 'https://github.example.com'
  try {
    await expect(protectedContainerDigests(input, [])).rejects.toThrow(
      'ghcr.io only'
    )
    expect(requests).toEqual([])
  } finally {
    if (previous) process.env.GITHUB_SERVER_URL = previous
    else delete process.env.GITHUB_SERVER_URL
  }
})

test.each([0, 2])(
  'protects an older reused child with retention %s when its ignored parent is on a later API page',
  async keep => {
    const versions = Array.from({length: 101}, (_, i) => ({
      id: i + 1,
      name: `sha256:${createHash('sha256').update(String(i)).digest('hex')}`,
      created_at: new Date((i + 1) * 1000).toISOString(),
      metadata: {container: {tags: [] as string[]}}
    }))
    versions[0].name = leaf.digest
    versions[100].name = root.digest
    versions[100].metadata.container.tags = ['latest']
    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/container/nested%2Fimage/versions',
        (req, res, ctx) =>
          res(
            ctx.json(
              req.url.searchParams.get('page') === '1'
                ? versions.slice(0, 100)
                : versions.slice(100)
            )
          )
      )
    )
    const ids = await firstValueFrom(
      finalIds(
        new Input({
          ...input,
          minVersionsToKeep: keep,
          ignoreVersions: new RegExp(`^${root.digest}$`)
        })
      )
    )
    expect(ids).toEqual(
      Array.from({length: 99 - keep}, (_, i) => String(i + 2))
    )
  }
)

test('a graph error prevents all DELETE requests', async () => {
  let deletes = 0
  const versions = [
    {
      id: 1,
      name: root.digest,
      created_at: '2000-01-01',
      metadata: {container: {tags: ['latest']}}
    },
    {
      id: 2,
      name: leaf.digest,
      created_at: '2001-01-01',
      metadata: {container: {tags: []}}
    }
  ]
  server.use(
    rest.get(
      'https://api.github.com/users/test-owner/packages/container/nested%2Fimage/versions',
      (_req, res, ctx) => res(ctx.json(versions))
    ),
    rest.delete('https://api.github.com/*', (_req, res, ctx) => {
      deletes++
      return res(ctx.status(204))
    })
  )
  documents.delete(attestation.digest)
  await expect(
    firstValueFrom(deleteVersions(new Input({...input})))
  ).rejects.toThrow('HTTP 404')
  expect(deletes).toBe(0)
})

test('missing tag metadata fails before deletion', async () => {
  server.use(
    rest.get(
      'https://api.github.com/users/test-owner/packages/container/nested%2Fimage/versions',
      (_req, res, ctx) =>
        res(ctx.json([{id: 1, name: leaf.digest, created_at: '2000-01-01'}]))
    )
  )
  await expect(firstValueFrom(finalIds(new Input({...input})))).rejects.toThrow(
    'metadata is incomplete'
  )
})

test.each([{}, {token: ''}, {token: 123}])(
  'rejects missing/invalid authentication token %#',
  async response => {
    server.use(
      rest.get('https://ghcr.io/token', (_req, res, ctx) =>
        res(ctx.json(response))
      )
    )
    await expect(protectedContainerDigests(input, [])).rejects.toThrow(
      'authentication failed'
    )
  }
)

test('does not expose invalid registry response bodies in errors', async () => {
  server.use(
    rest.get('https://ghcr.io/token', (_req, res, ctx) =>
      res(ctx.body('secret-test-token'))
    )
  )
  await expect(protectedContainerDigests(input, [])).rejects.toThrow(
    'Invalid container registry JSON; refusing cleanup'
  )
})

test('accepts an empty registry with no tagged roots', async () => {
  server.use(
    rest.get(`${base}/tags/list`, (_req, res, ctx) =>
      res(ctx.json({tags: null}))
    )
  )
  expect(await protectedContainerDigests(input, [])).toEqual(new Set())
})

test('rejects a looping tag pagination link', async () => {
  server.use(
    rest.get(`${base}/tags/list`, (_req, res, ctx) =>
      res(
        ctx.set(
          'Link',
          '</v2/test-owner/nested/image/tags/list?n=100>; rel="next"'
        ),
        ctx.json({tags: []})
      )
    )
  )
  await expect(protectedContainerDigests(input, [])).rejects.toThrow(
    'pagination'
  )
})

test.each([
  {minVersionsToKeep: 0, numOldVersionsToDelete: 0},
  {minVersionsToKeep: -1, numOldVersionsToDelete: 1}
])(
  'other container deletion modes retain missing-metadata behavior %#',
  async retention => {
    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/container/nested%2Fimage/versions',
        (_req, res, ctx) =>
          res(ctx.json([{id: 1, name: leaf.digest, created_at: '2000-01-01'}]))
      )
    )
    expect(
      await firstValueFrom(
        finalIds(
          new Input({...input, ...retention, deleteUntaggedVersions: 'false'})
        )
      )
    ).toEqual(['1'])
    expect(requests).toEqual([])
  }
)
