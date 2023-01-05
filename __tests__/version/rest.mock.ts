import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types'

type GetVersionsResponseData =
  RestEndpointMethodTypes['packages']['getAllPackageVersionsForPackageOwnedByUser']['response']['data']

export function getMockedVersionsResponse(
  numVersions: number,
  offset = 0
): GetVersionsResponseData {
  const versions: GetVersionsResponseData = []
  for (let i = 1 + offset; i <= numVersions + offset; ++i) {
    const created_at = new Date()
    created_at.setUTCFullYear(2000 + Number(i), 1, 1)
    versions.push({
      id: i,
      name: `${i}.0.0`,
      url: '',
      created_at: created_at.toUTCString(),
      package_html_url: '',
      updated_at: ''
    })
  }
  return versions
}
