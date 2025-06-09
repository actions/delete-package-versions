/* eslint-disable @typescript-eslint/no-unused-vars */
import {rest} from 'msw'
import {setupServer} from 'msw/node'
import {Input, InputParams} from '../src/input'
import {deleteVersions, finalIds, RATE_LIMIT} from '../src/delete'
import {getMockedVersionsResponse} from './version/rest.mock'
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types'

type GetVersionsResponseData =
  RestEndpointMethodTypes['packages']['getAllPackageVersionsForPackageOwnedByUser']['response']['data']

describe('index tests -- call rest', () => {
  let server = setupServer()

  beforeEach(() => {
    server = setupServer()
    server.listen()
  })

  afterEach(() => {
    server.close()
  })

  it('finalIds test - supplied package version id', done => {
    const suppliedIds = ['123', '456', '789']
    finalIds(getInput({packageVersionIds: suppliedIds})).subscribe(ids => {
      expect(ids).toStrictEqual(suppliedIds)
      done()
    })
  })

  it('finalIDs test - success', done => {
    const numVersions = 10
    let apiCalled = 0

    const versions = getMockedVersionsResponse(numVersions)

    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions',
        (req, res, ctx) => {
          apiCalled++
          return res(ctx.status(200), ctx.json(versions))
        }
      )
    )

    finalIds(getInput()).subscribe(ids => {
      expect(apiCalled).toBe(1)
      expect(ids.length).toBe(numVersions)
      for (let i = 0; i < numVersions; i++) {
        expect(ids[i]).toBe(versions[i].id.toString())
      }
      done()
    })
  })

  it('finalIDs test - success - GHES', done => {
    process.env.GITHUB_API_URL = 'https://github.someghesinstance.com/api/v3'

    const numVersions = 10
    let apiCalled = 0

    const versions = getMockedVersionsResponse(numVersions)

    server.use(
      rest.get(
        'https://github.someghesinstance.com/api/v3/users/test-owner/packages/npm/test-package/versions',
        (req, res, ctx) => {
          apiCalled++
          return res(ctx.status(200), ctx.json(versions))
        }
      )
    )

    finalIds(getInput()).subscribe(ids => {
      expect(apiCalled).toBe(1)
      expect(ids.length).toBe(numVersions)
      for (let i = 0; i < numVersions; i++) {
        expect(ids[i]).toBe(versions[i].id.toString())
      }

      delete process.env.GITHUB_API_URL
      done()
    })
  })

  it('finalIDs test - success - pagination', done => {
    const numVersions = RATE_LIMIT * 2
    let apiCalled = 0

    const versions = getMockedVersionsResponse(numVersions)

    const firstPage = versions.slice(0, RATE_LIMIT)
    const secondPage = versions.slice(RATE_LIMIT)

    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions',
        (req, res, ctx) => {
          apiCalled++
          const page = req.url.searchParams.get('page')
          if (page === '1') {
            return res(ctx.status(200), ctx.json(firstPage))
          } else if (page === '2') {
            return res(ctx.status(200), ctx.json(secondPage))
          } else {
            return res(ctx.status(200), ctx.json([]))
          }
        }
      )
    )

    finalIds(getInput()).subscribe(ids => {
      expect(apiCalled).toBe(3) // 2 full pages + 1 empty page
      // never returns more than RATE_LIMIT versions
      expect(ids.length).toBe(RATE_LIMIT)
      for (let i = 0; i < RATE_LIMIT; i++) {
        expect(ids[i]).toBe(versions[i].id.toString())
      }
      done()
    })
  })

  it('finalIDs test - success - sorting accross pages', done => {
    const numVersions = RATE_LIMIT * 2
    let apiCalled = 0

    // versions is in ascending order of created_at
    const versions = getMockedVersionsResponse(numVersions)

    // return newer versions on first page to test sorting
    const firstPage = versions.slice(RATE_LIMIT).reverse()
    const secondPage = versions.slice(0, RATE_LIMIT).reverse()

    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions',
        (req, res, ctx) => {
          apiCalled++
          const page = req.url.searchParams.get('page')
          if (page === '1') {
            return res(ctx.status(200), ctx.json(firstPage))
          } else if (page === '2') {
            return res(ctx.status(200), ctx.json(secondPage))
          } else {
            return res(ctx.status(200), ctx.json([]))
          }
        }
      )
    )

    finalIds(getInput()).subscribe(ids => {
      expect(apiCalled).toBe(3) // 2 full pages + 1 empty page
      expect(ids.length).toBe(RATE_LIMIT)
      for (let i = 0; i < RATE_LIMIT; i++) {
        expect(ids[i]).toBe(versions[i].id.toString())
      }
      done()
    })
  })

  it('finalIds test - do not delete more than numOldVersionsToDelete', done => {
    const numVersions = 50
    let apiCalled = 0

    const versions = getMockedVersionsResponse(numVersions)

    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions',
        (req, res, ctx) => {
          apiCalled++
          return res(ctx.status(200), ctx.json(versions))
        }
      )
    )

    const numOldVersionsToDelete = 10

    finalIds(getInput({numOldVersionsToDelete})).subscribe(ids => {
      expect(apiCalled).toBe(1)
      expect(ids.length).toBe(numOldVersionsToDelete)
      for (let i = 0; i < numOldVersionsToDelete; i++) {
        expect(ids[i]).toBe(versions[i].id.toString())
      }
      done()
    })
  })

  it('finalIds test - keep minVersionsToKeep', done => {
    const numVersions = 50
    let apiCalled = 0

    const versions = getMockedVersionsResponse(numVersions)

    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions',
        (req, res, ctx) => {
          apiCalled++
          return res(ctx.status(200), ctx.json(versions))
        }
      )
    )

    const minVersionsToKeep = 10

    finalIds(getInput({minVersionsToKeep})).subscribe(ids => {
      expect(apiCalled).toBe(1)
      expect(ids.length).toBe(numVersions - minVersionsToKeep)
      for (let i = 0; i < numVersions - minVersionsToKeep; i++) {
        expect(ids[i]).toBe(versions[i].id.toString())
      }
      done()
    })
  })

  it('finalIds test - delete only prerelease versions with minVersionsToKeep', done => {
    const numVersions = 50
    let apiCalled = 0

    const versions = getMockedVersionsResponse(numVersions)
    // make half versions prerelease
    for (let i = 0; i < numVersions; i++) {
      if (i % 2 === 0) {
        versions[i].name += '-alpha'
      }
    }

    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions',
        (req, res, ctx) => {
          apiCalled++
          return res(ctx.status(200), ctx.json(versions))
        }
      )
    )

    const toDelete = numVersions / 2 - 10

    finalIds(
      getInput({
        ignoreVersions: RegExp('^(0|[1-9]\\d*)((\\.(0|[1-9]\\d*))*)$'),
        minVersionsToKeep: 10
      })
    ).subscribe(ids => {
      expect(apiCalled).toBe(1)
      expect(ids.length).toBe(toDelete)
      for (let i = 0; i < toDelete; i++) {
        expect(ids[i]).toBe(versions[i * 2].id.toString())
      }
      done()
    })
  })

  it('finalIds test - delete only untagged versions with minVersionsToKeep', done => {
    const numVersions = 50
    const numTaggedVersions = 20
    const numUntaggedVersions = numVersions - numTaggedVersions

    const taggedVersions = getMockedVersionsResponse(
      numTaggedVersions,
      0,
      'container',
      true
    )
    const untaggedVersions = getMockedVersionsResponse(
      numUntaggedVersions,
      numTaggedVersions,
      'container',
      false
    )
    const versions = taggedVersions.concat(untaggedVersions)

    let apiCalled = 0

    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/container/test-package/versions',
        (req, res, ctx) => {
          apiCalled++
          return res(ctx.status(200), ctx.json(versions))
        }
      )
    )

    finalIds(
      getInput({
        minVersionsToKeep: 10,
        deleteUntaggedVersions: 'true',
        packageType: 'container'
      })
    ).subscribe(ids => {
      expect(apiCalled).toBe(1)
      expect(ids.length).toBe(numUntaggedVersions - 10)
      for (let i = 0; i < numUntaggedVersions - 10; i++) {
        expect(ids[i]).toBe(untaggedVersions[i].id.toString())
      }
      done()
    })
  })

  it('finalIds test - no versions deleted if API error even once', done => {
    const numVersions = RATE_LIMIT * 2
    let apiCalled = 0

    const versions = getMockedVersionsResponse(numVersions)

    const firstPage = versions.slice(0, RATE_LIMIT)
    const secondPage = versions.slice(RATE_LIMIT)

    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions',
        (req, res, ctx) => {
          apiCalled++
          const page = req.url.searchParams.get('page')
          if (page === '1') {
            return res(ctx.status(200), ctx.json(firstPage))
          } else if (page === '2') {
            return res(ctx.status(500), ctx.json([]))
          } else {
            return res(ctx.status(200), ctx.json([]))
          }
        }
      )
    )

    finalIds(getInput()).subscribe(
      () => {
        done.fail('should not complete')
      },
      err => {
        expect(apiCalled).toBe(2) // 1 full page + 1 error page
        expect(err).toBeTruthy()
        expect(err).toContain('get versions API failed.')
        done()
      }
    )
  })

  it('finalIds test - no versions deleted if tags match ignore version and include tags is enabled', done => {
    const numVersions = 10
    let apiCalled = 0

    const versions = getMockedVersionsResponse(
      numVersions,
      0,
      'container',
      true
    )

    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/container/test-package/versions',
        (req, res, ctx) => {
          apiCalled++
          return res(ctx.status(200), ctx.json(versions))
        }
      )
    )

    finalIds(
      getInput({
        minVersionsToKeep: 2,
        packageType: 'container',
        ignoreVersions: RegExp('^(latest[1-3]{1})$'),
        includeTags: 'true'
      })
    ).subscribe(ids => {
      expect(apiCalled).toBe(1)
      expect(ids).toStrictEqual(['4', '5', '6', '7', '8'])
      done()
    })
  })

  it('', done => {
    const numVersions = 10
    let apiCalled = 0

    let date = new Date()
    date.setUTCFullYear(2000, 1, 1)

    const version = {
      id: 1,
      name: '1.0.0',
      url: '',
      created_at: date.toUTCString(),
      package_html_url: '',
      updated_at: '',
      metadata: {
        package_type: 'container',
        container: {
          tags: [
            'test',
            '9970186500fd471320e7340b256229209899bde5',
            'my-first-pr'
          ] as string[]
        }
      }
    }

    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/container/test-package/versions',
        (req, res, ctx) => {
          apiCalled++
          return res(ctx.status(200), ctx.json([version]))
        }
      )
    )

    finalIds(
      getInput({
        packageType: 'container',
        ignoreVersions: RegExp('^production|acceptance|test$'),
        includeTags: 'true'
      })
    ).subscribe(ids => {
      expect(apiCalled).toBe(1)
      expect(ids.length).toBe(0)
      done()
    })
  })

  it('deleteVersions test - missing token', done => {
    deleteVersions(getInput({token: ''})).subscribe({
      error: err => {
        expect(err).toBeTruthy()
        done()
      },
      complete: async () => done.fail('no error thrown')
    })
  })

  it('deleteVersions test - missing packageName', done => {
    deleteVersions(getInput({packageName: ''})).subscribe({
      error: err => {
        expect(err).toBeTruthy()
        done()
      },
      complete: async () => done.fail('no error thrown')
    })
  })

  it('deleteVersions test - missing packageType', done => {
    deleteVersions(getInput({packageType: ''})).subscribe({
      error: err => {
        expect(err).toBeTruthy()
        done()
      },
      complete: async () => done.fail('no error thrown')
    })
  })

  it('deleteVersions test - zero numOldVersionsToDelete', done => {
    deleteVersions(getInput({numOldVersionsToDelete: 0})).subscribe(result => {
      expect(result).toBe(true)
      done()
    })
  })

  it('deleteVersions test - success complete flow', done => {
    const numVersions = 10
    let getApiCalled = 0
    let deleteApiCalled = 0

    const versions = getMockedVersionsResponse(numVersions)
    const versionsDeleted: string[] = []

    server.use(
      rest.get(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions',
        (req, res, ctx) => {
          getApiCalled++
          return res(ctx.status(200), ctx.json(versions))
        }
      )
    )

    server.use(
      rest.delete(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions/:versionId',
        (req, res, ctx) => {
          deleteApiCalled++
          versionsDeleted.push(req.params.versionId as string)
          return res(ctx.status(204))
        }
      )
    )

    deleteVersions(getInput())
      .subscribe(result => {
        expect(result).toBe(true)
      })
      .add(() => {
        expect(getApiCalled).toBe(1)
        expect(deleteApiCalled).toBe(numVersions)
        for (let i = 0; i < numVersions; i++) {
          expect(versionsDeleted[i]).toBe(versions[i].id.toString())
        }
        done()
      })
  })

  it('deleteVersions test - success complete flow - GHES', done => {
    process.env.GITHUB_API_URL = 'https://github.someghesinstance.com/api/v3'

    const numVersions = 10
    let getApiCalled = 0
    let deleteApiCalled = 0

    const versions = getMockedVersionsResponse(numVersions)
    const versionsDeleted: string[] = []

    server.use(
      rest.get(
        'https://github.someghesinstance.com/api/v3/users/test-owner/packages/npm/test-package/versions',
        (req, res, ctx) => {
          getApiCalled++
          return res(ctx.status(200), ctx.json(versions))
        }
      )
    )

    server.use(
      rest.delete(
        'https://github.someghesinstance.com/api/v3/users/test-owner/packages/npm/test-package/versions/:versionId',
        (req, res, ctx) => {
          deleteApiCalled++
          versionsDeleted.push(req.params.versionId as string)
          return res(ctx.status(204))
        }
      )
    )

    deleteVersions(getInput())
      .subscribe(result => {
        expect(result).toBe(true)
      })
      .add(() => {
        expect(getApiCalled).toBe(1)
        expect(deleteApiCalled).toBe(numVersions)
        for (let i = 0; i < numVersions; i++) {
          expect(versionsDeleted[i]).toBe(versions[i].id.toString())
        }

        delete process.env.GITHUB_API_URL
        done()
      })
  })
})

const defaultInput: InputParams = {
  packageVersionIds: [],
  owner: 'test-owner',
  packageName: 'test-package',
  packageType: 'npm',
  numOldVersionsToDelete: RATE_LIMIT,
  minVersionsToKeep: -1,
  ignoreVersions: RegExp('^$'),
  token: 'test-token',
  includeTags: 'false'
}

function getInput(params?: InputParams): Input {
  return new Input({...defaultInput, ...params})
}
