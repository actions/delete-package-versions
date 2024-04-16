/* eslint-disable @typescript-eslint/no-unused-vars */
import {from, Observable, merge, throwError, of} from 'rxjs'
import {catchError, map} from 'rxjs/operators'
import {Octokit} from '@octokit/rest'
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types'

export interface RestVersionInfo {
  id: number
  version: string
  created_at: string
  tagged: boolean
}

export interface RestQueryInfo {
  versions: RestVersionInfo[]
  page: number
  paginate: boolean
  totalCount: number
}

type PackageType =
  RestEndpointMethodTypes['packages']['getAllPackageVersionsForPackageOwnedByUser']['parameters']['package_type']
type GetVersionsResponse =
  RestEndpointMethodTypes['packages']['getAllPackageVersionsForPackageOwnedByUser']['response']['data']

export function getOldestVersions(
  owner: string,
  packageName: string,
  packageType: string,
  numVersions: number,
  page: number,
  token: string
): Observable<RestQueryInfo> {
  const octokit = new Octokit({
    auth: token,
    baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com'
  })
  const package_type: PackageType = packageType as PackageType

  return from(
    octokit.rest.packages.getAllPackageVersionsForPackageOwnedByUser({
      package_type,
      package_name: packageName,
      username: owner,
      per_page: numVersions,
      page
    })
  ).pipe(
    catchError(err => {
      const msg = 'get versions API failed.'
      return throwError(
        err.errors && err.errors.length > 0
          ? `${msg} ${err.errors[0].message}`
          : `${msg} ${err.message}`
      )
    }),
    map(response => {
      const resp = {
        versions: response.data.map((version: GetVersionsResponse[0]) => {
          let tagged = false
          if (
            package_type === 'container' &&
            version.metadata &&
            version.metadata.container
          ) {
            tagged = version.metadata.container.tags.length > 0
          }

          return {
            id: version.id,
            version: version.name,
            created_at: version.created_at,
            tagged,
            subIds: [] <<<<<<<<<<<<<<<<<<<<<<<<<<<<< First, we need to get for all packages the subIds (if they have any)
              Example: https://github.com/ManiMatter/decluttarr/pkgs/container/decluttarr/204442395?tag=v1.38.0
              Package v1.38.0: sha256:b4a9b04d8c0a5ab9f400f7f64f8be20d9951a996fd00882a936087af8f5ce43d
              Has 3 Sub-IDs:
                linux/amd64:      sha256:c2dfb515fd9a6ad396fe6a48cd3e535b4079b467cb691bcb3faede6889089d6e
                linux/arm64:      sha256:59b2aa2e04cc6b3391f612833e87bbd0c4fdfddb04845b8e8f0365a45e90151c
                unknown/unknown:  sha256:6dfc07ab69cbe95303f51fed14b40a9574bbebbb3501d7aec481d184a8321c91   


          }
        }),
        page,
        paginate: response.data.length === numVersions,
        totalCount: response.data.length
      }
      return resp
    })
  )
}
