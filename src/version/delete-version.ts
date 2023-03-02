import {from, Observable, merge, throwError, of} from 'rxjs'
import {catchError, map, tap} from 'rxjs/operators'
import {Octokit} from '@octokit/rest'
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types'

let deleted = 0
type PackageType =
  RestEndpointMethodTypes['packages']['getAllPackageVersionsForPackageOwnedByUser']['parameters']['package_type']

export function deletePackageVersion(
  packageVersionId: string,
  owner: string,
  packageName: string,
  packageType: string,
  token: string
): Observable<boolean> {
  const octokit = new Octokit({
    auth: token,
    baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com'
  })
  const package_version_id = +packageVersionId
  const package_type: PackageType = packageType as PackageType
  deleted += 1

  return from(
    octokit.rest.packages.deletePackageVersionForUser({
      package_type,
      package_name: packageName,
      username: owner,
      package_version_id
    })
  ).pipe(
    catchError(err => {
      const msg = 'delete version API failed.'
      return throwError(
        err.errors && err.errors.length > 0
          ? `${msg} ${err.errors[0].message}`
          : `${msg} ${err.message} \n${deleted - 1} versions deleted till now.`
      )
    }),
    map(response => response.status === 204)
  )
}

export function deletePackageVersions(
  packageVersionIds: string[],
  owner: string,
  packageName: string,
  packageType: string,
  token: string
): Observable<boolean> {
  if (packageVersionIds.length === 0) {
    return of(true)
  }

  const deletes = packageVersionIds.map(id =>
    deletePackageVersion(id, owner, packageName, packageType, token).pipe(
      tap(result => {
        if (!result) {
          console.log(`version with id: ${id}, not deleted`)
        }
      })
    )
  )
  console.log(`Total versions deleted till now: ${deleted}`)
  return merge(...deletes)
}
