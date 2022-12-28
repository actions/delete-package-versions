import {Input} from './input'
import {EMPTY, Observable, of, throwError} from 'rxjs'
import {deletePackageVersions, getOldestVersions, VersionInfo} from './version'
import {concatMap, map, expand, tap} from 'rxjs/operators'

const RATE_LIMIT = 99
let totalCount = 0

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
    tap(
      value => (totalCount = totalCount === 0 ? value.totalCount : totalCount)
    ),
    map(value => value.versions)
  )
}

export function finalIds(input: Input): Observable<string[]> {
  if (input.packageVersionIds.length > 0) {
    return of(input.packageVersionIds)
  }
  if (input.hasOldestVersionQueryInfo()) {
    if (input.minVersionsToKeep < 0) {
      // This code block is when num-old-versions-to-delete is specified.
      // Setting input.numOldVersionsToDelete is set as minimum of input.numOldVersionsToDelete and RATE_LIMIT
      input.numOldVersionsToDelete =
        input.numOldVersionsToDelete < RATE_LIMIT
          ? input.numOldVersionsToDelete
          : RATE_LIMIT
      return getVersionIds(
        input.owner,
        input.repo,
        input.packageName,
        RATE_LIMIT,
        '',
        input.token
      ).pipe(
        // This code block executes on batches of 100 versions starting from oldest
        map(value => {
          /* 
          Here first filter out the versions that are to be ignored.
          Then update input.numOldeVersionsToDelete to the no of versions deleted from the next 100 versions batch.
          */
          value = value.filter(info => !input.ignoreVersions.test(info.version))
          const temp = input.numOldVersionsToDelete
          input.numOldVersionsToDelete =
            input.numOldVersionsToDelete - value.length <= 0
              ? 0
              : input.numOldVersionsToDelete - value.length
          return value.map(info => info.id).slice(0, temp)
        })
      )
    } else {
      // This code block is when min-versions-to-keep is specified.
      return getVersionIds(
        input.owner,
        input.repo,
        input.packageName,
        RATE_LIMIT,
        '',
        input.token
      ).pipe(
        // This code block executes on batches of 100 versions starting from oldest
        map(value => {
          /* 
          Here totalCount is the total no of versions in the package.
          First we update totalCount by removing no of ignored versions from it and also filter them out from value.
          toDelete is the no of versions that need to be deleted and input.numDeleted is the total no of versions deleted before this batch.
          We calculate this from total no of versions in the package, the min no of versions to keep and the no of versions we have deleted in earlier batch.
          Then we update toDelete to not exceed the length of current batch of versions.
          Now toDelete holds the no of versions to be deleted from the current batch of versions.
          */
          totalCount =
            totalCount -
            value.filter(info => input.ignoreVersions.test(info.version)).length
          value = value.filter(info => !input.ignoreVersions.test(info.version))
          let toDelete = totalCount - input.minVersionsToKeep - input.numDeleted
          toDelete = toDelete > value.length ? value.length : toDelete
          //Checking here if we have any versions to delete and whether we are within the RATE_LIMIT.
          if (toDelete > 0 && input.numDeleted < RATE_LIMIT) {
            /* 
            Checking here if we can delete all the versions left in the current batch.
            input.numDeleted + toDelete should not exceed RATE_LIMIT.
            If it is exceeding we only delete the no of versions from this batch that are allowed within the RATE_LIMIT.
            i.e. diff between RATE_LIMIT and versions deleted till now (input.numDeleted) 
            input.numDeleted is updated accordingly.
            */
            if (input.numDeleted + toDelete > RATE_LIMIT) {
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
    return throwError('Invalid input combination')
  }

  if (input.numOldVersionsToDelete <= 0 && input.minVersionsToKeep < 0) {
    console.log(
      'Number of old versions to delete input is 0 or less, no versions will be deleted'
    )
    return of(true)
  }

  const result = finalIds(input)

  return result.pipe(concatMap(ids => deletePackageVersions(ids, input.owner, input.packageName, input.packageType, input.token)))
}
