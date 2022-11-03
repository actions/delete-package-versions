import {
  GraphQlQueryResponseData,
  RequestParameters
} from '@octokit/graphql/dist-types/types'

import * as Graphql from '../../src/common/graphql'
import {GetVersionsQueryResponse} from '../../src/version'

export function getMockedOldestQueryResponse(
  numVersions: number
): GetVersionsQueryResponse {
  const versions = []
  numVersions = numVersions < 100 ? numVersions : numVersions
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
                totalCount: 200,
                edges: versions.reverse(),
                pageInfo: {
                  startCursor: 'AAA',
                  hasPreviousPage: false
                }
              }
            }
          }
        ]
      }
    }
  }
}

export function mockOldestQueryResponse(numVersions: number): void {
  const response = new Promise<GetVersionsQueryResponse>(resolve => {
    resolve(getMockedOldestQueryResponse(numVersions))
  }) as Promise<GraphQlQueryResponseData>
  jest
    .spyOn(Graphql, 'graphql')
    .mockImplementation(
      (token: string, query: string, parameters: RequestParameters) => response
    )
}
