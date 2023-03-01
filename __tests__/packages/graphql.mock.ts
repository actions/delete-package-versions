import {
  GraphQlQueryResponseData,
  RequestParameters
} from '@octokit/graphql/dist-types/types'

import * as Graphql from '../../src/common/graphql'
import {GetPackagesQueryResponse} from '../../src/packages'

export function getMockedPackagesQueryResponse(
  numPackages: number
): GetPackagesQueryResponse {
  const packages: any[]  = []
  for (let i = 1; i <= numPackages; ++i) {
    packages.push({
      node: {
        id: i.toString(),
        name: `package${i}`
      }
    })
  }

  return {
    repository: {
      packages: {
        pageInfo: {
          endCursor: 'AAA',
          hasNextPage: false
        },
        edges: packages
      }
    }
  }
}

export function mockPackagesQueryResponse(numVersions: number): void {
  const response = new Promise<GetPackagesQueryResponse>(resolve => {
    resolve(getMockedPackagesQueryResponse(numVersions))
  }) as Promise<GraphQlQueryResponseData>
  jest
    .spyOn(Graphql, 'graphql')
    .mockImplementation(
      (token: string, query: string, parameters: RequestParameters) => response
    )
}
