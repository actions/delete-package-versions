import {from, Observable, merge, throwError, of} from 'rxjs'
import {catchError, delay, map, tap} from 'rxjs/operators'
import {GraphQlQueryResponse} from '@octokit/graphql/dist-types/types'
import {graphql} from './graphql'

let deleted = 0

export interface DeletePackageVersionMutationResponse {
  deletePackageVersion: {
    success: boolean
  }
}

const mutation = `
  mutation deletePackageVersion($packageVersionId: String!) {
      deletePackageVersion(input: {packageVersionId: $packageVersionId}) {
          success
      }
  }`

export interface RateLimitResponse {
  viewer: {
    login: string
  }
  ratelimit: {
    limit: number
    cost: number
    remaining: number
    resetAt: string
  }
}

const ratelimitQuery = `
query {
  viewer {
    login
  }
  rateLimit {
    limit
    cost
    remaining
    resetAt
  }
}`

export async function getRateLimit(token: string): Promise<RateLimitResponse> {
  return graphql(token, ratelimitQuery, {
    headers: {
      Accept: 'application/vnd.github.package-deletes-preview+json'
    }
  }) as Promise<RateLimitResponse>
}

export function deletePackageVersion(
  packageVersionId: string,
  token: string
): Observable<boolean> {
  if (deleted === 100) {
    console.log(`reaching rate limit`)
    delay(5000)
  }
  deleted += 1
  return from(
    graphql(token, mutation, {
      packageVersionId,
      headers: {
        Accept: 'application/vnd.github.package-deletes-preview+json'
      }
    }) as Promise<DeletePackageVersionMutationResponse>
  ).pipe(
    catchError((err: GraphQlQueryResponse) => {
      const msg = 'delete version mutation failed.'
      return throwError(
        err.errors && err.errors.length > 0
          ? `${msg} ${err.errors[0].message}`
          : `${msg} verify input parameters are correct`
      )
    }),
    map(response => response.deletePackageVersion.success)
  )
}

export function deletePackageVersions(
  packageVersionIds: string[],
  token: string
): Observable<boolean> {
  if (packageVersionIds.length === 0) {
    return of(true)
  }

  const deletes = packageVersionIds.map(id =>
    deletePackageVersion(id, token).pipe(
      tap(result => {
        console.log(`versions Deleted 0 : ${deleted}`)
        if (result) {
          console.log(`version with id: ${id}, deleted`)
        } else {
          console.log(`version with id: ${id}, not deleted`)
        }
      })
    )
  )
  console.log(`Versions Deleted Final2: ${deleted}`)
  return merge(...deletes)
}
