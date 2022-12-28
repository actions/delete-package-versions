import * as github from '@actions/github'

// Centralize all Octokit references by re-exporting
export {Octokit} from '@octokit/rest'

export interface OctokitOptions {
  baseUrl?: string
  userAgent?: string
}

export function getOctokit(
  authToken: string,
  opts: OctokitOptions
): github.GitHub {
  const options: OctokitOptions = {
    baseUrl: 'https://api.github.com'
  }

  if (opts.userAgent) {
    options.userAgent = opts.userAgent
  }

  return new github.GitHub(authToken, options)
}
