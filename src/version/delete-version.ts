import {from, Observable, merge, throwError, of} from 'rxjs'
import {catchError, map, tap} from 'rxjs/operators'
import {graphql} from './graphql'

let deleted = 0

export interface DeletePackageVersionMutationResponse {
  deletePackageVersion: {
    success: boolean
  }
}

const mutation = `
  mutation deletePackageVersion($packageVersionId: String!) {
      deletePackageVersion(input: {packageVersionId: $packageVersionId}) {
          success
      }
  }`

export function deletePackageVersion(
  packageVersionId: string,
  token: string
): Observable<boolean> {
  deleted += 1
  return from(
    graphql(token, mutation, {
      packageVersionId,
      headers: {
        Accept: 'application/vnd.github.package-deletes-preview+json'
      }
    }) as Promise<DeletePackageVersionMutationResponse>
  ).pipe(
    catchError(err => {
      const msg = 'delete version mutation failed.'
      return throwError(
        err.errors && err.errors.length > 0
          ? `${msg} ${err.errors[0].message}`
          : `${msg} ${err.message} \n${deleted - 1} versions deleted till now.`
      )
    }),
    map(response => response.deletePackageVersion.success)
  )
}

export function deletePackageVersions(
  packageVersionIds: string[],
  token: string
): Observable<boolean> {
  if (packageVersionIds.length === 0) {
    return of(true)
  }

  const deletes = packageVersionIds.map(id =>
    deletePackageVersion(id, token).pipe(
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
