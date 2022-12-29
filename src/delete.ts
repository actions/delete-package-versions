/* eslint-disable i18n-text/no-en */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {Input} from './input'
import {EMPTY, Observable, of, throwError} from 'rxjs'
import {reduce} from 'rxjs/operators'
import {
  deletePackageVersions,
  getOldestVersions,
  RestVersionInfo
} from './version'
import {concatMap, map, expand, tap} from 'rxjs/operators'

const RATE_LIMIT = 1
let totalCount = 0

export function getVersionIds(
  owner: string,
  packageName: string,
  packageType: string,
  numVersions: number,
  page: number,
  token: string
): Observable<RestVersionInfo[]> {
  return getOldestVersions(
    owner,
    packageName,
    packageType,
    numVersions,
    page,
    token
  ).pipe(
    expand(value =>
      value.paginate
        ? getOldestVersions(
            owner,
            packageName,
            packageType,
            numVersions,
            value.page + 1,
            token
          )
        : EMPTY
    ),
    tap(value => (totalCount = totalCount + value.totalCount)),
    reduce((acc, value) => acc.concat(value.versions), [] as RestVersionInfo[])
  )
}

export function finalIds(input: Input): Observable<string[]> {
  if (input.packageVersionIds.length > 0) {
    return of(input.packageVersionIds)
  }
  if (input.hasOldestVersionQueryInfo()) {
    return getVersionIds(
      input.owner,
      input.packageName,
      input.packageType,
      RATE_LIMIT,
      1,
      input.token
    ).pipe(
      // This code block executes on all versions of a package starting from oldest
      map(value => {
        // we need to delete oldest versions first
        value.sort((a, b) => {
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })
        /* 
          Here first filter out the versions that are to be ignored.
          Then update input.numOldeVersionsToDelete to the no of versions deleted from the next 100 versions batch.
          */
        value = value.filter(info => !input.ignoreVersions.test(info.version))
        let toDelete = 0
        if (input.minVersionsToKeep < 0) {
          toDelete = Math.min(
            value.length,
            Math.min(input.numOldVersionsToDelete, RATE_LIMIT)
          )
        } else {
          toDelete = Math.min(
            value.length - input.minVersionsToKeep,
            RATE_LIMIT
          )
        }
        if (toDelete < 0) return []
        return value.map(info => info.id.toString()).slice(0, toDelete)
      })
    )
  }
  return throwError(
    "Could not get packageVersionIds. Explicitly specify using the 'package-version-ids' input"
  )
}

export function deleteVersions(input: Input): Observable<boolean> {
  if (!input.token) {
    return throwError('No token found')
  }

  if (!input.checkInput()) {
    return throwError('Invalid input combination')
  }

  if (input.numOldVersionsToDelete <= 0 && input.minVersionsToKeep < 0) {
    console.log(
      'Number of old versions to delete input is 0 or less, no versions will be deleted'
    )
    return of(true)
  }

  const result = finalIds(input)

  return result.pipe(
    concatMap(ids =>
      deletePackageVersions(
        ids,
        input.owner,
        input.packageName,
        input.packageType,
        input.token
      )
    )
  )
}
