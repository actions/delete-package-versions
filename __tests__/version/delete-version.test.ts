import {rest} from 'msw'
import {setupServer} from 'msw/node'
import {deletePackageVersion, deletePackageVersions} from '../../src/version'

describe('delete tests - mock rest', () => {
  let server = setupServer()

  beforeEach(() => {
    server = setupServer()
    server.listen()
  })

  afterEach(() => {
    server.close()
  })

  it('deletePackageVersion', done => {
    server.use(
      rest.delete(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions/123',
        (req, res, ctx) => {
          return res(ctx.status(204))
        }
      )
    )

    deletePackageVersion(
      '123',
      'test-owner',
      'test-package',
      'npm',
      'test-token'
    ).subscribe(result => {
      expect(result).toBe(true)
      done()
    })
  })

  it('deletePackageVersions', done => {
    let success = 0

    server.use(
      rest.delete(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions/*',
        (req, res, ctx) => {
          return res(ctx.status(204))
        }
      )
    )

    deletePackageVersions(
      ['123', '456', '789'],
      'test-owner',
      'test-package',
      'npm',
      'test-token'
    )
      .subscribe(
        result => {
          expect(result).toBe(true)
          success++
        },
        err => {
          // should not get here
          done.fail(err)
        }
      )
      .add(() => {
        expect(success).toBe(3)
        done()
      })
  })

  it('deletePackageVersions - GHES', done => {
    process.env.GITHUB_API_URL = 'https://github.someghesinstance.com/api/v3'

    let success = 0

    server.use(
      rest.delete(
        'https://github.someghesinstance.com/api/v3/users/test-owner/packages/npm/test-package/versions/*',
        (req, res, ctx) => {
          return res(ctx.status(204))
        }
      )
    )

    deletePackageVersions(
      ['123', '456', '789'],
      'test-owner',
      'test-package',
      'npm',
      'test-token'
    )
      .subscribe(
        result => {
          expect(result).toBe(true)
          success++
        },
        err => {
          // should not get here
          done.fail(err)
        }
      )
      .add(() => {
        expect(success).toBe(3)

        delete process.env.GITHUB_API_URL
        done()
      })
  })

  it('deletePackageVersion - API error', done => {
    server.use(
      rest.delete(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions/123',
        (req, res, ctx) => {
          return res(ctx.status(500))
        }
      )
    )

    deletePackageVersion(
      '123',
      'test-owner',
      'test-package',
      'npm',
      'test-token'
    ).subscribe(
      () => {
        done.fail('should not get here.')
      },
      err => {
        expect(err).toContain('delete version API failed.')
        done()
      }
    )
  })

  it('deletePackageVersions - API error for some versions', done => {
    let success = 0
    let failed = 0

    server.use(
      rest.delete(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions/:versionId',
        (req, res, ctx) => {
          if (req.params.versionId === '456') {
            return res(ctx.status(500))
          }
          return res(ctx.status(204))
        }
      )
    )

    deletePackageVersions(
      ['123', '456', '789'],
      'test-owner',
      'test-package',
      'npm',
      'test-token'
    )
      .subscribe(
        result => {
          expect(result).toBe(true)
          success++
        },
        err => {
          expect(err).toContain('delete version API failed.')
          failed++
        }
      )
      .add(() => {
        expect(success).toBe(2)
        expect(failed).toBe(1)
        done()
      })
  })
})
