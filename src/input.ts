export interface InputParams {
  packageVersionIds?: string[]
  ignoredVersions?: RegExp
  owner?: string
  repo?: string
  packageName?: string
  numOldVersionsToDelete?: number
  token?: string
}

const defaultParams = {
  packageVersionIds: [],
  ignoredVersions: new RegExp('^(?!.*)$'),
  owner: '',
  repo: '',
  packageName: '',
  numOldVersionsToDelete: 0,
  token: ''
}

export class Input {
  packageVersionIds: string[]
  ignoredVersions: RegExp
  owner: string
  repo: string
  packageName: string
  numOldVersionsToDelete: number
  token: string

  constructor(params?: InputParams) {
    const validatedParams: Required<InputParams> = {...defaultParams, ...params}

    this.packageVersionIds = validatedParams.packageVersionIds
    this.ignoredVersions = validatedParams.ignoredVersions
    this.owner = validatedParams.owner
    this.repo = validatedParams.repo
    this.packageName = validatedParams.packageName
    this.numOldVersionsToDelete = validatedParams.numOldVersionsToDelete
    this.token = validatedParams.token
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
