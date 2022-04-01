// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {GraphQlQueryResponse} from '@octokit/graphql/dist-types/types'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Observable, from, throwError} from 'rxjs'
import {catchError, map} from 'rxjs/operators'
import {graphql} from './graphql'

export interface PackageInfo {
  id: string
  name: string
}

export interface QueryInfo {
  packages: PackageInfo[]
  cursor: string
  paginate: boolean
  totalCount: number
}

export interface GetPackagesQueryResponse {
  repository: {
    packages: {
      totalCount: number
      edges: {node: PackageInfo}[]
      pageInfo: {
        endCursor: string
        hasNextPage: boolean
      }
    }
  }
}

const query = `
  query getPackages($owner: String!, $name: String!, $first: Int!){
    repository(owner: $owner, name: $name) {
      packages(first:$first){
        totalCount
        edges {
          node {
            name
            id
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }`

const Paginatequery = `
  query getPackages($owner: String!, $name: String!, $first: Int!, $after: String!){
    repository(owner: $owner, name: $name) {
      packages(first:$first){
        totalCount
        edges {
          node {
            name
            id
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }`

export function queryForRepoPackages(
  owner: string,
  repo: string,
  numPackages: number,
  startCursor: string,
  token: string
): Observable<GetPackagesQueryResponse> {
  if (startCursor === '') {
    return from(
      graphql(token, query, {
        owner,
        repo,
        first: numPackages,
        headers: {
          Accept: 'application/vnd.github.packages-preview+json'
        }
      }) as Promise<GetPackagesQueryResponse>
    ).pipe(
      catchError((err: GraphQlQueryResponse<unknown>) => {
        const msg = 'query for packages failed.'
        return throwError(
          err.errors && err.errors.length > 0
            ? `${msg} ${err.errors[0].message}`
            : `${msg} verify input parameters are correct ${JSON.stringify(
                err,
                null,
                2
              )}`
        )
      })
    )
  } else {
    return from(
      graphql(token, Paginatequery, {
        owner,
        repo,
        first: numPackages,
        before: startCursor,
        headers: {
          Accept: 'application/vnd.github.packages-preview+json'
        }
      }) as Promise<GetPackagesQueryResponse>
    ).pipe(
      catchError((err: GraphQlQueryResponse<unknown>) => {
        const msg = 'query for packages failed.'
        return throwError(
          err.errors && err.errors.length > 0
            ? `${msg} ${err.errors[0].message}`
            : `${msg} verify input parameters are correct`
        )
      })
    )
  }
}

export function getRepoPackages(
  owner: string,
  repo: string,
  numPackages: number,
  startCursor: string,
  token: string
): Observable<QueryInfo> {
  return queryForRepoPackages(
    owner,
    repo,
    numPackages,
    startCursor,
    token
  ).pipe(
    map(result => {
      let r: QueryInfo
      if (result.repository.packages.edges.length < 1) {
        console.log(
          `package: No packages found for owner: ${owner} in repo: ${repo}`
        )
        r = {
          packages: [] as PackageInfo[],
          cursor: '',
          paginate: false,
          totalCount: 0
        }
        return r
      }

      const packages = result.repository.packages.edges
      const pages = result.repository.packages.pageInfo
      const count = result.repository.packages.totalCount

      r = {
        packages: packages.map(value => ({
          id: value.node.id,
          name: value.node.name
        })),
        cursor: pages.endCursor,
        paginate: pages.hasNextPage,
        totalCount: count
      }

      return r
    })
  )
}
