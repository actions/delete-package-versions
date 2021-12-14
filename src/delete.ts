import {Input} from './input'
import {EMPTY, Observable, of, throwError} from 'rxjs'
import {deletePackageVersions, getOldestVersions} from './version'
import {concatMap, map, expand, tap} from 'rxjs/operators'

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

let totalCount: number

export function getVersionIds(
  owner: string,
  repo: string,
  packageName: string,
  numVersions: number,
  ignoreVersions: RegExp,
  cursor: string,
  token: string
): Observable<VersionInfo[]> {
  return getOldestVersions(
    owner,
    repo,
    packageName,
    numVersions,
    ignoreVersions,
    cursor,
    token
  ).pipe(
    expand(value =>
      value.paginate
        ? getOldestVersions(
            owner,
            repo,
            packageName,
            numVersions,
            ignoreVersions,
            value.cursor,
            token
          )
        : EMPTY
    ),
    tap(value => (totalCount = value.totalCount)),
    map(value => value.versions),
    tap(value =>
      value.map(info =>
        console.log(`id0: ${info.id}, version: ${info.version}`)
      )
    )
  )
}

export function finalIds(input: Input): Observable<string[]> {
  if (input.packageVersionIds.length > 0) {
    return of(input.packageVersionIds)
  }
  if (input.hasOldestVersionQueryInfo()) {
    if (input.minVersionsToKeep < 0) {
      console.log(`in numOldVersionsToDelete`)
      return getVersionIds(
        input.owner,
        input.repo,
        input.packageName,
        input.numOldVersionsToDelete,
        input.ignoreVersions,
        '',
        input.token
      ).pipe(
        map(value => {
          const temp = input.numOldVersionsToDelete
          input.numOldVersionsToDelete =
            input.numOldVersionsToDelete - value.length <= 0
              ? 0
              : input.numOldVersionsToDelete - value.length
          console.log(
            `temp: ${temp} numVersions: ${input.numOldVersionsToDelete} ignore-versions: ${input.ignoreVersions}`
          )
          return value
            .filter(info => !input.ignoreVersions.test(info.version))
            .map(info => info.id)
            .slice(0, temp)
        })
      )
    } else {
      console.log(`in min versions to keep`)
      return getVersionIds(
        input.owner,
        input.repo,
        input.packageName,
        100,
        input.ignoreVersions,
        '',
        input.token
      ).pipe(
        map(value => {
          console.log(`point 1`)
          const toDelete =
            totalCount -
            value.filter(info => input.ignoreVersions.test(info.version))
              .length -
            input.minVersionsToKeep
          value = value.filter(info => !input.ignoreVersions.test(info.version))
          console.log(
            `toDelete: ${toDelete} numVersions: ${input.numOldVersionsToDelete} total count: ${totalCount}`
          )
          if (toDelete > input.numOldVersionsToDelete) {
            //here input.numOldVersionsToDelete will never have user value hence using it to keep track of deleted versions
            input.numOldVersionsToDelete =
              input.numOldVersionsToDelete + value.length
            return toDelete - input.numOldVersionsToDelete >= 0
              ? value.map(info => info.id)
              : value
                  .map(info => info.id)
                  .slice(0, toDelete - input.numOldVersionsToDelete)
          } else return []
        })
      )
    }
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
    return throwError('Invlaid input combination')
  }

  if (input.numOldVersionsToDelete <= 0 && input.minVersionsToKeep < 0) {
    console.log(
      'Number of old versions to delete input is 0 or less, no versions will be deleted'
    )
    return of(true)
  }

  return finalIds(input).pipe(
    concatMap(ids => deletePackageVersions(ids, input.token))
  )
}
