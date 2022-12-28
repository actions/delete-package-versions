/* eslint-disable @typescript-eslint/no-unused-vars */
import {getInput, setFailed} from '@actions/core'
import {context} from '@actions/github'
import {Input} from './input'
import {Observable, throwError} from 'rxjs'
import {deleteVersions} from './delete'
import {catchError} from 'rxjs/operators'

function getActionInput(): Input {
  console.log('this is deletion using rest APIs')
  return new Input({
    packageVersionIds: getInput('package-version-ids')
      ? getInput('package-version-ids').split(',')
      : [],
    owner: getInput('owner') ? getInput('owner') : context.repo.owner,
    repo: getInput('repo') ? getInput('repo') : context.repo.repo,
    packageName: getInput('package-name'),
    packageType: getInput('package-type'),
    numOldVersionsToDelete: Number(getInput('num-old-versions-to-delete')),
    minVersionsToKeep: Number(getInput('min-versions-to-keep')),
    ignoreVersions: RegExp(getInput('ignore-versions')),
    deletePreReleaseVersions: getInput(
      'delete-only-pre-release-versions'
    ).toLowerCase(),
    token: getInput('token')
  })
}

function run(): Observable<boolean> {
  try {
    return deleteVersions(getActionInput()).pipe(
      catchError(err => throwError(err))
    )
  } catch (error) {
    if (error instanceof Error) {
      return throwError(error.message)
    }
    return throwError(error)
  }
}

run().subscribe({
  error: err => {
    setFailed(err)
  }
})
