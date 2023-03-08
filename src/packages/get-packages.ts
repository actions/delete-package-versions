import {GraphQlQueryResponse} from '@octokit/graphql/dist-types/types'

import {Observable, from, throwError} from 'rxjs'
import {catchError, map} from 'rxjs/operators'
import {graphql} from '../common/graphql'

export interface PackageInfo {
  id: string
  name: string
}

export interface QueryInfo {
  packages: PackageInfo[]
  cursor: string
  paginate: boolean
}

export interface GetPackagesQueryResponse {
  repository: {
    packages: {
      edges: {node: PackageInfo}[]
      pageInfo: {
        endCursor: string
        hasNextPage: boolean
      }
    }
  }
}

const query = `
  query getPackages($owner: String!, $repo: String!, $first: Int!){
    repository(owner: $owner, name: $repo) {
      packages(first:$first){
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
  query getPackages($owner: String!, $repo: String!, $first: Int!, $after: String!){
    repository(owner: $owner, name: $repo) {
      packages(first:$first){
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
          paginate: false
        }
        return r
      }

      const packages = result.repository.packages.edges
      const pages = result.repository.packages.pageInfo

      r = {
        packages: packages.map(value => ({
          id: value.node.id,
          name: value.node.name
        })),
        cursor: pages.endCursor,
        paginate: pages.hasNextPage
      }

      return r
    })
  )
}
