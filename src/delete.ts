import {Input} from './input'
import {EMPTY, Observable, of, throwError} from 'rxjs'
import {deletePackageVersions, getOldestVersions, VersionInfo} from './version'
import {concatMap, map, expand, tap} from 'rxjs/operators'

const RATE_LIMIT = 99
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
      input.numOldVersionsToDelete =
        input.numOldVersionsToDelete < RATE_LIMIT
          ? input.numOldVersionsToDelete
          : RATE_LIMIT
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
        RATE_LIMIT,
        '',
        input.token
      ).pipe(
        map(value => {
          totalCount =
            totalCount -
            value.filter(info => input.ignoreVersions.test(info.version)).length
          value = value.filter(info => !input.ignoreVersions.test(info.version))
          let toDelete = totalCount - input.minVersionsToKeep - input.numDeleted
          toDelete = toDelete > value.length ? value.length : toDelete
          if (toDelete > 0 && input.numDeleted < RATE_LIMIT) {
            // using input.numDeleted to keep track of deleted and remaining packages
            if (input.numDeleted + toDelete > 99) {
              toDelete = RATE_LIMIT - input.numDeleted
              input.numDeleted = RATE_LIMIT
            } else {
              input.numDeleted = input.numDeleted + toDelete
            }
            return value.map(info => info.id).slice(0, toDelete)
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
    tap(() => {
      if (input.numDeleted > 0)
        console.log(`${input.numDeleted} versions will be deleted`)
    }),
    concatMap(ids => deletePackageVersions(ids, input.token))
  )
}
