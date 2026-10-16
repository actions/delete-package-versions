/* eslint-disable i18n-text/no-en */
import {createHash} from 'crypto'
import {request} from 'https'
import {Input} from '../input'
import {RestVersionInfo} from './get-versions'

const mediaTypes = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json'
]

interface RegistryResponse {
  body: string
  link?: string
}

interface JsonObject {
  [key: string]: unknown
}

function object(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function digest(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^(sha256:[a-f0-9]{64}|sha512:[a-f0-9]{128})$/.test(value)
  ) {
    throw new Error('Invalid container manifest digest; refusing cleanup')
  }
  return value
}

// Do not follow redirects or include response bodies/credentials in errors.
async function get(url: URL, authorization: string): Promise<RegistryResponse> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {headers: {Authorization: authorization, Accept: mediaTypes.join(', ')}},
      response => {
        if (response.statusCode !== 200) {
          response.resume()
          reject(
            new Error(
              `Container registry request failed (HTTP ${response.statusCode}); refusing cleanup`
            )
          )
          return
        }
        const chunks: Buffer[] = []
        let size = 0
        response.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > 16 * 1024 * 1024) {
            req.destroy(
              new Error(
                'Container registry response too large; refusing cleanup'
              )
            )
            return
          }
          chunks.push(chunk)
        })
        response.on('error', () =>
          reject(
            new Error('Container registry response failed; refusing cleanup')
          )
        )
        response.on('aborted', () =>
          reject(
            new Error(
              'Container registry response incomplete; refusing cleanup'
            )
          )
        )
        response.on('end', () =>
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            link: Array.isArray(response.headers.link)
              ? response.headers.link.join(', ')
              : response.headers.link
          })
        )
      }
    )
    req.on('error', () =>
      reject(
        new Error('Container registry connection failed; refusing cleanup')
      )
    )
    req.setTimeout(30000, () => req.destroy(new Error('Registry timeout')))
    req.end()
  })
}

function parse(body: string): JsonObject {
  let value: unknown
  try {
    value = JSON.parse(body)
  } catch {
    throw new Error('Invalid container registry JSON; refusing cleanup')
  }
  if (!object(value))
    throw new Error('Invalid container registry response; refusing cleanup')
  return value
}

function children(manifest: JsonObject): string[] {
  if (
    manifest.schemaVersion !== 2 ||
    !mediaTypes.includes(String(manifest.mediaType))
  ) {
    throw new Error('Unsupported container manifest; refusing cleanup')
  }
  const refs: string[] = []
  if (mediaTypes.slice(0, 2).includes(String(manifest.mediaType))) {
    if (!Array.isArray(manifest.manifests))
      throw new Error('Incomplete container index; refusing cleanup')
    for (const descriptor of manifest.manifests) {
      if (!object(descriptor))
        throw new Error('Invalid container descriptor; refusing cleanup')
      refs.push(digest(descriptor.digest))
    }
  } else if (!object(manifest.config) || !Array.isArray(manifest.layers)) {
    throw new Error('Incomplete container image manifest; refusing cleanup')
  }
  if (manifest.subject !== undefined) {
    if (!object(manifest.subject))
      throw new Error('Invalid container subject; refusing cleanup')
    refs.push(digest(manifest.subject.digest))
  }
  return refs
}

/** Protect image and provenance manifests reachable from every retained tag. */
export async function protectedContainerDigests(
  input: Input,
  versions: RestVersionInfo[]
): Promise<Set<string>> {
  if (
    (process.env.GITHUB_SERVER_URL &&
      process.env.GITHUB_SERVER_URL !== 'https://github.com') ||
    (process.env.GITHUB_API_URL &&
      process.env.GITHUB_API_URL !== 'https://api.github.com')
  ) {
    throw new Error(
      'Reference-aware container cleanup currently supports ghcr.io only; refusing cleanup on GHES'
    )
  }
  const repository = `${input.owner}/${input.packageName}`.toLowerCase()
  if (
    !repository.split('/').every(part => /^[a-z0-9][a-z0-9._-]*$/.test(part))
  ) {
    throw new Error('Invalid container repository name; refusing cleanup')
  }
  for (const version of versions) digest(version.version)

  const tokenUrl = new URL('https://ghcr.io/token')
  tokenUrl.searchParams.set('service', 'ghcr.io')
  tokenUrl.searchParams.set('scope', `repository:${repository}:pull`)
  const username = process.env.GITHUB_ACTOR || input.owner
  const credentials = Buffer.from(`${username}:${input.token}`).toString(
    'base64'
  )
  const tokenResponse = parse(
    (await get(tokenUrl, `Basic ${credentials}`)).body
  )
  const token = tokenResponse.token || tokenResponse.access_token
  if (typeof token !== 'string' || !token)
    throw new Error(
      'Container registry authentication failed; refusing cleanup'
    )
  const authorization = `Bearer ${token}`
  const base = `https://ghcr.io/v2/${repository}`

  async function tags(): Promise<string[]> {
    const names = new Set<string>()
    const pages = new Set<string>()
    let next: URL | undefined = new URL(`${base}/tags/list?n=100`)
    while (next) {
      if (
        next.origin !== 'https://ghcr.io' ||
        next.pathname !== `/v2/${repository}/tags/list` ||
        pages.has(next.href)
      ) {
        throw new Error('Invalid container tag pagination; refusing cleanup')
      }
      pages.add(next.href)
      const response: RegistryResponse = await get(next, authorization)
      const listing = parse(response.body)
      if (listing.tags !== null && !Array.isArray(listing.tags))
        throw new Error('Incomplete container tag listing; refusing cleanup')
      for (const tag of (listing.tags || []) as unknown[]) {
        if (typeof tag !== 'string' || !/^[\w][\w.-]{0,127}$/.test(tag))
          throw new Error('Invalid container tag; refusing cleanup')
        names.add(tag)
      }
      const link: RegExpMatchArray | null | undefined = response.link?.match(
        /<([^>]+)>;\s*rel="?next"?/
      )
      if (response.link && !link)
        throw new Error('Invalid container tag pagination; refusing cleanup')
      next = link ? new URL(link[1], next) : undefined
    }
    return Array.from(names).sort()
  }

  async function manifest(
    ref: string
  ): Promise<{digest: string; children: string[]}> {
    const response = await get(
      new URL(`${base}/manifests/${ref}`),
      authorization
    )
    const algorithm = ref.startsWith('sha512:') ? 'sha512' : 'sha256'
    const actual = `${algorithm}:${createHash(algorithm).update(response.body).digest('hex')}`
    if (ref.includes(':') && actual !== ref)
      throw new Error('Container manifest digest mismatch; refusing cleanup')
    return {digest: actual, children: children(parse(response.body))}
  }

  const tagNames = await tags()
  const tagged = new Map<string, string>()
  const protectedDigests = new Set<string>()
  const pending = versions
    .filter(version => version.tagged)
    .map(version => version.version)
  for (const tag of tagNames) {
    const root = await manifest(tag)
    tagged.set(tag, root.digest)
    protectedDigests.add(root.digest)
    pending.push(...root.children)
  }
  while (pending.length) {
    const ref = digest(pending.pop())
    if (protectedDigests.has(ref)) continue
    const value = await manifest(ref)
    protectedDigests.add(ref)
    pending.push(...value.children)
  }
  // Detect tag changes during discovery. Publishers must also share a concurrency
  // group with cleanup: the registry offers no atomic snapshot-and-delete API.
  if (JSON.stringify(await tags()) !== JSON.stringify(tagNames))
    throw new Error('Container tags changed during discovery; refusing cleanup')
  for (const [tag, expected] of tagged) {
    if ((await manifest(tag)).digest !== expected)
      throw new Error('Container tag moved during discovery; refusing cleanup')
  }
  return protectedDigests
}
