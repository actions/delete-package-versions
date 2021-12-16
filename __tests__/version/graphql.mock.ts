import {
  GraphQlQueryResponseData,
  RequestParameters
} from '@octokit/graphql/dist-types/types'

import * as Graphql from '../../src/version/graphql'
import {GetVersionsQueryResponse} from '../../src/version'

export function getMockedOldestQueryResponseForLessThan100(
  numVersions: number
): GetVersionsQueryResponse {
  const versions = []

  for (let i = 1; i <= numVersions; ++i) {
    versions.push({
      node: {
        id: i.toString(),
        version: `${i}.0.0`
      }
    })
  }

  return {
    repository: {
      packages: {
        edges: [
          {
            node: {
              name: 'test',
              versions: {
                edges: versions.reverse()
              }
            }
          }
        ]
      }
    }
  }
}

export function mockOldestQueryResponse(
  numVersions: number
) {
  const response = new Promise((resolve) => {
    resolve(getMockedOldestQueryResponse(numVersions))
  }) as Promise<GraphQlQueryResponseData>
  jest.spyOn(Graphql, 'graphql').mockImplementation(
    (token: string, query: string, parameters: RequestParameters) => response)
}
