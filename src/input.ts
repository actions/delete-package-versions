export interface InputParams {
  packageVersionIds?: string[]
  owner?: string
  repo?: string
  packageName?: string
  numOldVersionsToDelete?: number
  token?: string
  minVersionsToKeep?: number
  ignoreVersions?: RegExp
}

const defaultParams = {
  packageVersionIds: [],
  owner: '',
  repo: '',
  packageName: '',
  numOldVersionsToDelete: 0,
  token: '',
  minVersionsToKeep: 0,
  ignoreVersions: new RegExp('')
}

export class Input {
  packageVersionIds: string[]
  owner: string
  repo: string
  packageName: string
  numOldVersionsToDelete: number
  token: string
  minVersionsToKeep: number
  ignoreVersions: RegExp

  constructor(params?: InputParams) {
    const validatedParams: Required<InputParams> = {...defaultParams, ...params}

    this.packageVersionIds = validatedParams.packageVersionIds
    this.owner = validatedParams.owner
    this.repo = validatedParams.repo
    this.packageName = validatedParams.packageName
    this.numOldVersionsToDelete = validatedParams.numOldVersionsToDelete
    this.token = validatedParams.token
    this.minVersionsToKeep = validatedParams.minVersionsToKeep
    this.ignoreVersions = validatedParams.ignoreVersions
  }

  hasOldestVersionQueryInfo(): boolean {
    return !!(
      this.owner &&
      this.repo &&
      this.packageName &&
      this.numOldVersionsToDelete > 0 &&
      this.token
    )
  }
}
