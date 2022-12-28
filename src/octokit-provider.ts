import * as github from '@actions/github'
import {Octokit} from '@octokit/rest'

// Centralize all Octokit references by re-exporting
export {Octokit} from '@octokit/rest'

export type OctokitOptions = {
  baseUrl?: string
  userAgent?: string
}

export function getOctokit(authToken: string, opts: OctokitOptions) {
  const options: Octokit.Options = {
    baseUrl: "https://api.github.com"
  }

  if (opts.userAgent) {
    options.userAgent = opts.userAgent
  }

  return new github.GitHub(authToken, options)
}