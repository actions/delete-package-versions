export interface InputParams {
  packageVersionIds?: string[]
  owner?: string
  repo?: string
  packageName?: string
  numOldVersionsToDelete?: number
  minVersionsToKeep?: number
  ignoreVersions?: RegExp
  token?: string
}

const defaultParams = {
  packageVersionIds: [],
  owner: '',
  repo: '',
  packageName: '',
  numOldVersionsToDelete: 0,
  minVersionsToKeep: 0,
  ignoreVersions: new RegExp(''),
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
    this.token = validatedParams.token
  }

  hasOldestVersionQueryInfo(): boolean {
    return !!(
      this.owner &&
      this.repo &&
      this.packageName &&
      this.numOldVersionsToDelete > 0 &&
      this.minVersionsToKeep > 0 &&
      this.token
    )
  }
}
