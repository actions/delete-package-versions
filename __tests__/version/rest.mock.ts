/* eslint-disable @typescript-eslint/no-unused-vars */
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types'

type GetVersionsResponseData = RestEndpointMethodTypes['packages']['getAllPackageVersionsForPackageOwnedByUser']['response']['data']

export function getMockedVersionsResponse(
  numVersions: number
): GetVersionsResponseData {
  const versions: GetVersionsResponseData = []
  for (let i = 1; i <= numVersions; ++i) {
    versions.push({
      id: i,
      name: `v${i}.0.0`,
      created_at: new Date().toISOString(),
      url: '',
      package_html_url: '',
      updated_at: ''
    })
  }
  return versions
}
