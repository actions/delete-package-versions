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
      .subscribe(result => {
        expect(result).toBe(true)
        // done() is called in the finally block
      })
      .add(done)
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
})
