import {throwError} from 'rxjs'

export interface InputParams {
  packageVersionIds?: string[]
  owner?: string
  repo?: string
  packageName?: string
  numOldVersionsToDelete?: number
  minVersionsToKeep?: number
  ignoreVersions?: RegExp
  token?: string
  deletePreReleaseVersions?: string
}

const defaultParams = {
  packageVersionIds: [],
  owner: '',
  repo: '',
  packageName: '',
  numOldVersionsToDelete: 0,
  minVersionsToKeep: 0,
  ignoreVersions: new RegExp(''),
  deletePreReleaseVersions: '',
  token: ''
}

export class Input {
  packageVersionIds: string[]
  owner: string
  repo: string
  packageName: string
  numOldVersionsToDelete: number
  minVersionsToKeep: number
  ignoreVersions: RegExp
  deletePreReleaseVersions: string
  token: string

  constructor(params?: InputParams) {
    const validatedParams: Required<InputParams> = {...defaultParams, ...params}

    this.packageVersionIds = validatedParams.packageVersionIds
    this.owner = validatedParams.owner
    this.repo = validatedParams.repo
    this.packageName = validatedParams.packageName
    this.numOldVersionsToDelete = validatedParams.numOldVersionsToDelete
    this.minVersionsToKeep = validatedParams.minVersionsToKeep
    this.ignoreVersions = validatedParams.ignoreVersions
    this.deletePreReleaseVersions = validatedParams.deletePreReleaseVersions
    this.token = validatedParams.token

    if (
      this.numOldVersionsToDelete > 1 &&
      (this.minVersionsToKeep >= 0 || this.deletePreReleaseVersions == 'true')
    ) {
      throwError('Invalid input combination')
    }

    if (this.deletePreReleaseVersions === 'true') {
      this.minVersionsToKeep =
        this.minVersionsToKeep > 0 ? this.minVersionsToKeep : 0
      this.ignoreVersions = new RegExp('^(0|[1-9]\\d*)((\\.(0|[1-9]\\d*))*)$')
    }

    if (this.minVersionsToKeep >= 0) {
      this.numOldVersionsToDelete = 0
    }
  }

  hasOldestVersionQueryInfo(): boolean {
    return !!(
      this.owner &&
      this.repo &&
      this.packageName &&
      this.numOldVersionsToDelete > 0 &&
      this.minVersionsToKeep >= 0 &&
      this.token
    )
  }
}
