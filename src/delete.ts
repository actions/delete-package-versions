/* eslint-disable i18n-text/no-en */

import {Input} from './input'
import {EMPTY, Observable, of, throwError} from 'rxjs'
import {reduce, concatMap, map, expand, tap} from 'rxjs/operators'
import {
  deletePackageVersions,
  getOldestVersions,
  RestVersionInfo
} from './version'

export const RATE_LIMIT = 100
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
    const toDelete = Math.min(input.packageVersionIds.length, RATE_LIMIT)
    return of(input.packageVersionIds.slice(0, toDelete))
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
          if (a.created_at === b.created_at) {
            return a.id - b.id
          }
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })

        /* 
          Here first filter out the versions that are to be ignored.
          Then compute number of versions to delete (toDelete) based on the inputs.
        */
        value = value.filter(info => !input.ignoreVersions.test(info.version))

        /* 
            Step 0:
            Iterate over value to extract subIDs and create a new array.
            This new array just contains the subIDs and shows to which parentID (= Multi Arch package) the are linked and whether that parentId is tagged
        */
        value.forEach(value => {
          const { id, tagged, subIds } = version;
          
          // Add parentID to the subIDs array with tagged status
          subIds.forEach(subId => {
            subIdsArray.push({
              subId: subId,
              parentId: id,
              tagged: tagged
            });
          });
        });



        if (input.deleteUntaggedVersions === 'true') {
            // Previous Code: 
            // value = value.filter(info => !info.tagged)
            // Problem: This loses untagged packages that belong to multi-arch containers that are tagged

            // PSEUDOCODE TO FIX THIS:        
            // Keep only packages that are not subpackages and not tagged; or that are subpackages and the parent package is not tagged
            value = value.filter(info =>
              (!info.tagged && !subIdsArray.some(subIdInfo => subIdInfo.subId === info.id)) ||
              (subIdsArray.some(subIdInfo => subIdInfo.subId === info.id && !subIdInfo.tagged))
            );

        }

        let toDelete = 0
        if (input.minVersionsToKeep < 0) {
          toDelete = Math.min(
            value.length,
            Math.min(input.numOldVersionsToDelete, RATE_LIMIT)
          )
        } else {
          /*
            Keeps only n packages
            If deleteUntaggedVersions is true, then all tagged versions are kept, plus a number of untagged versions (minVersionsToKeep)
            If deleteUntaggedVersions is false, then just n versions should remain. 
            In both cases, sub-packages should not be counted (keen n real packages, not n subpackages) 
            Problem with current code: when determining n-versions, also subpackages are counted (rather than just counting real packages)
          */
         // PSEUDOCODE TO FIX THIS:  
         // Step 1: Create an array that does not include the subpackages to calculate which ones need to be retained
          const valueWithoutSub = value.filter(info => (!subIdsArray.some(subIdInfo => subIdInfo.subId === info.id)))
          toDelete = Math.min(
            valueWithoutSub.length - input.minVersionsToKeep,
            RATE_LIMIT
          )
        }
        if (toDelete < 0) return []
        
        // Step 2: Filter out the parent packages that need to be retained
        valueWithoutSub = valueWithoutSub.map(info => info.id.toString()).slice(0, toDelete)
        
        // Step 3: Filter out from value all packages that meet either of these two conditions:
        // a. all parent packages flagged for deletion
        // b. all subpackages that belong to these parent packages that are flagged for deletion
        value = value.filter(info => 
          valueWithoutSub.some(item => item.id === info.id) ||  
          subIdsArray.some(subIdInfo => 
            subIdInfo.subId === info.id && 
            valueWithoutSub.some(item => item.id === subIdInfo.parentId)
          )
        );
 
        return value
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
