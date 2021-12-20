import {Input} from './input'
import {EMPTY, Observable, of, throwError} from 'rxjs'
import {deletePackageVersions, getOldestVersions, VersionInfo} from './version'
import {concatMap, map, expand, tap} from 'rxjs/operators'

let totalCount: number

export function getVersionIds(
  owner: string,
  repo: string,
  packageName: string,
  numVersions: number,
  cursor: string,
  token: string
): Observable<VersionInfo[]> {
  return getOldestVersions(
    owner,
    repo,
    packageName,
    numVersions,
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
            value.cursor,
            token
          )
        : EMPTY
    ),
    tap(value => (totalCount = value.totalCount)),
    map(value => value.versions)
  )
}

export function finalIds(input: Input): Observable<string[]> {
  if (input.packageVersionIds.length > 0) {
    return of(input.packageVersionIds)
  }
  if (input.hasOldestVersionQueryInfo()) {
    if (input.minVersionsToKeep < 0) {
      return getVersionIds(
        input.owner,
        input.repo,
        input.packageName,
        input.numOldVersionsToDelete,
        '',
        input.token
      ).pipe(
        map(value => {
          const temp = input.numOldVersionsToDelete
          input.numOldVersionsToDelete =
            input.numOldVersionsToDelete - value.length <= 0
              ? 0
              : input.numOldVersionsToDelete - value.length
          input.numDeleted += value.filter(
            info => !input.ignoreVersions.test(info.version)
          ).length
          return value
            .filter(info => !input.ignoreVersions.test(info.version))
            .map(info => info.id)
            .slice(0, temp)
        })
      )
    } else {
      return getVersionIds(
        input.owner,
        input.repo,
        input.packageName,
        100,
        '',
        input.token
      ).pipe(
        map(value => {
          let toDelete =
            totalCount -
            value.filter(info => input.ignoreVersions.test(info.version))
              .length -
            input.minVersionsToKeep
          toDelete = toDelete > 100 ? 100 : toDelete
          value = value.filter(info => !input.ignoreVersions.test(info.version))
          if (toDelete > input.numDeleted && input.numDeleted < 100) {
            // using input.numDeleted to keep track of deleted and remaining packages
            input.numDeleted =
              input.numDeleted + value.length > 100
                ? 100
                : input.numDeleted + value.length
            return toDelete - input.numDeleted >= 0
              ? value.map(info => info.id)
              : value.map(info => info.id).slice(0, toDelete - input.numDeleted)
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

  const result = finalIds(input)

  return result.pipe(
    tap(value => (input.numDeleted = value.length < 100 ? value.length : 100)),
    tap(() => console.log(`${input.numDeleted} versions will be deleted`)),
    concatMap(ids => deletePackageVersions(ids.slice(0, 100), input.token))
  )
}
