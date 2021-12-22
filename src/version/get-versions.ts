import {GraphQlQueryResponse} from '@octokit/graphql/dist-types/types'
import {Observable, from, throwError} from 'rxjs'
import {catchError, map} from 'rxjs/operators'
import {graphql} from './graphql'

export interface VersionInfo {
  id: string
  version: string
}

export interface QueryInfo {
  versions: VersionInfo[]
  cursor: string
  paginate: boolean
  totalCount: number
}

export interface GetVersionsQueryResponse {
  repository: {
    packages: {
      edges: {
        node: {
          name: string
          versions: {
            totalCount: number
            edges: {node: VersionInfo}[]
            pageInfo: {
              startCursor: string
              hasPreviousPage: boolean
            }
          }
        }
      }[]
    }
  }
}

const query = `
  query getVersions($owner: String!, $repo: String!, $package: String!, $last: Int!) {
    repository(owner: $owner, name: $repo) {
      packages(first: 1, names: [$package]) {
        edges {
          node {
            name
            versions(last: $last) {
              totalCount
              edges {
                node {
                  id
                  version
                }
              }
              pageInfo {
                startCursor
                hasPreviousPage
              }
            }
          }
        }
      }
    }
  }`

const Paginatequery = `
  query getVersions($owner: String!, $repo: String!, $package: String!, $last: Int!, $before: String!) {
    repository(owner: $owner, name: $repo) {
      packages(first: 1, names: [$package]) {
        edges {
          node {
            name
            versions(last: $last, before: $before) {
              totalCount
              edges {
                node {
                  id
                  version
                }
              }
              pageInfo{
                startCursor
                hasPreviousPage
              }
            }
          }
        }
      }
    }
  }`

export function queryForOldestVersions(
  owner: string,
  repo: string,
  packageName: string,
  numVersions: number,
  startCursor: string,
  token: string
): Observable<GetVersionsQueryResponse> {
  if (startCursor === '') {
    return from(
      graphql(token, query, {
        owner,
        repo,
        package: packageName,
        last: numVersions > 100 ? 100 : numVersions,
        headers: {
          Accept: 'application/vnd.github.packages-preview+json'
        }
      }) as Promise<GetVersionsQueryResponse>
    ).pipe(
      catchError((err: GraphQlQueryResponse) => {
        const msg = 'query for oldest version failed.'
        console.log(`numversions: ${numVersions} startCursor: ${startCursor}`)
        return throwError(
          err.errors && err.errors.length > 0
            ? `${msg} ${err.errors[0].message}`
            : `${msg} verify input parameters are correct`
        )
      })
    )
  } else {
    return from(
      graphql(token, Paginatequery, {
        owner,
        repo,
        package: packageName,
        last: numVersions > 100 ? 100 : numVersions,
        before: startCursor,
        headers: {
          Accept: 'application/vnd.github.packages-preview+json'
        }
      }) as Promise<GetVersionsQueryResponse>
    ).pipe(
      catchError((err: GraphQlQueryResponse) => {
        const msg = 'query for oldest version failed.'
        return throwError(
          err.errors && err.errors.length > 0
            ? `${msg} ${err.errors[0].message}`
            : `${msg} verify input parameters are correct`
        )
      })
    )
  }
}

export function getOldestVersions(
  owner: string,
  repo: string,
  packageName: string,
  numVersions: number,
  startCursor: string,
  token: string
): Observable<QueryInfo> {
  return queryForOldestVersions(
    owner,
    repo,
    packageName,
    numVersions,
    startCursor,
    token
  ).pipe(
    map(result => {
      let r: QueryInfo
      if (result.repository.packages.edges.length < 1) {
        console.log(
          `package: ${packageName} not found for owner: ${owner} in repo: ${repo}`
        )
        r = {
          versions: <VersionInfo[]>[],
          cursor: '',
          paginate: false,
          totalCount: 0
        }
        return r
      }

      const versions = result.repository.packages.edges[0].node.versions.edges
      const pages = result.repository.packages.edges[0].node.versions.pageInfo
      const count = result.repository.packages.edges[0].node.versions.totalCount

      r = {
        versions: versions
          .map(value => ({id: value.node.id, version: value.node.version}))
          .reverse(),
        cursor: pages.startCursor,
        paginate: pages.hasPreviousPage,
        totalCount: count
      }

      return r
    })
  )
}
