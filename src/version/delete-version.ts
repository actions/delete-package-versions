// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {from, Observable, merge, throwError, of} from 'rxjs'
import {catchError, map, tap} from 'rxjs/operators'
import {graphql} from './graphql'
import {Octokit} from '@octokit/rest'

let deleted = 0

// export interface DeletePackageVersionAPIResponse {
//   deletePackageVersion: {
//     success: boolean
//   }
// }

// const mutation = `
//   mutation deletePackageVersion($packageVersionId: ID!) {
//       deletePackageVersion(input: {packageVersionId: $packageVersionId}) {
//           success
//       }
//   }`

export function deletePackageVersion(
  packageVersionId: string,
  owner: string,
  packageName: string,
  packageType: string,
  token: string
): Observable<boolean> {
  const octokit = new Octokit({
    auth: token,
  });
  let package_version_id = +packageVersionId
  // const response = octokit.rest.packages.deletePackageVersionForUser({
  //   packageType,
  //   packageName,
  //   owner,
  //   packageVersionId,
  // });
  // if (response.status != 200) {
  //   throw new Error(
  //     `Unexpected response from GitHub API. Status: ${response.status}, Data: ${response.data}`
  //   )
  // }
  deleted += 1

  // return from(
  //   graphql(token, mutation, {
  //     packageVersionId,
  //     headers: {
  //       Accept: 'application/vnd.github.package-deletes-preview+json'
  //     }
  //   }) as Promise<DeletePackageVersionMutationResponse>
  // ).pipe(
  //   catchError(err => {
  //     const msg = 'delete version mutation failed.'
  //     return throwError(
  //       err.errors && err.errors.length > 0
  //         ? `${msg} ${err.errors[0].message}`
  //         : `${msg} ${err.message} \n${deleted - 1} versions deleted till now.`
  //     )
  //   }),
  //   map(response => response.deletePackageVersion.success)
  // )

  return from(
    octokit.rest.packages.deletePackageVersionForUser({
      package_type: "npm",
      package_name: packageName,
      username: owner,
      package_version_id: package_version_id,
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
