import {
  GraphQlQueryResponseData,
  RequestParameters
} from '@octokit/graphql/dist-types/types'

import * as Graphql from '@octokit/graphql'
import {GetVersionsQueryResponse} from '../../src/version'

import SpyInstance = jest.SpyInstance

export function mockGraphql(): SpyInstance<
  Promise<GraphQlQueryResponseData>,
  [string, (RequestParameters | undefined)?]
> {
  return jest.spyOn(Graphql, 'graphql')
}

export function getMockedOldestQueryResponse(
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
): ReturnType<typeof mockGraphql> {
  return mockGraphql().mockResolvedValue(
    getMockedOldestQueryResponse(numVersions)
  )
}
