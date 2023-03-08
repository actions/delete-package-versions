import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types'

type GetVersionsResponseData =
  RestEndpointMethodTypes['packages']['getAllPackageVersionsForPackageOwnedByUser']['response']['data']
type PackageType =
  RestEndpointMethodTypes['packages']['getAllPackageVersionsForPackageOwnedByUser']['parameters']['package_type']

export function getMockedVersionsResponse(
  numVersions: number,
  offset = 0,
  packageType = 'npm',
  tagged = false
): GetVersionsResponseData {
  const versions: GetVersionsResponseData = []
  for (let i = 1 + offset; i <= numVersions + offset; ++i) {
    const created_at = new Date()
    created_at.setUTCFullYear(2000 + Number(i), 1, 1)
    let version = {
      id: i,
      name: `${i}.0.0`,
      url: '',
      created_at: created_at.toUTCString(),
      package_html_url: '',
      updated_at: '',
      metadata: {
        package_type: packageType as PackageType
      }
    } as GetVersionsResponseData[0]

    if (packageType === 'container' && tagged) {
      version = {
        ...version,
        metadata: {
          package_type: packageType as PackageType,
          container: {
            tags: [`latest${i}`] as string[]
          }
        }
      }
    }

    versions.push(version)
  }
  return versions
}
