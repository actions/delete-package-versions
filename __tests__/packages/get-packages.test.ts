import {mockPackagesQueryResponse} from './graphql.mock'
import {
  getRepoPackages as _getRepoPackages,
  QueryInfo
} from '../../src/packages'
import {Observable} from 'rxjs'

describe.skip('get versions tests -- call graphql', () => {
    it('getRepoPackages -- succeeds', done => {
      const numPackages = 1
      getRepoPackages({numPackages}).subscribe(result => {
        expect(result.packages.length).toBe(numPackages)
        done()
      })
    })
  
    it('getRepoPackages -- fails for invalid repo', done => {
        getRepoPackages({repo: 'actions-testin'}).subscribe({
        error: err => {
          expect(err).toBeTruthy()
          done()
        },
        complete: async () => done.fail('no error thrown')
      })
    })
  })
  
  describe('get versions tests -- mock graphql', () => {
    it('getRepoPackages -- success', done => {
      const numPackages = 5
      mockPackagesQueryResponse(numPackages)
  
      getRepoPackages({numPackages}).subscribe(result => {
        expect(result.packages.length).toBe(numPackages)
        done()
      })
    })
  })
  
  interface Params {
    owner?: string
    repo?: string
    numPackages?: number
    startCursor?: string
    token?: string
  }
  
  const defaultParams = {
    owner: 'namratajha',
    repo: 'test-repo',
    packageName: 'test-repo',
    numPackages: 1,
    startCursor: '',
    token: process.env.GITHUB_TOKEN as string
  }
  
  function getRepoPackages(params?: Params): Observable<QueryInfo> {
    const p: Required<Params> = {...defaultParams, ...params}
    return _getRepoPackages(
      p.owner,
      p.repo,
      p.numPackages,
      p.startCursor,
      p.token
    )
  }