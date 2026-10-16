import {createHash} from 'crypto'

export const imageType = 'application/vnd.oci.image.manifest.v1+json'
export const indexType = 'application/vnd.oci.image.index.v1+json'
export const dockerIndexType =
  'application/vnd.docker.distribution.manifest.list.v2+json'
export const dockerImageType =
  'application/vnd.docker.distribution.manifest.v2+json'

export function fixture(value: object): {body: string; digest: string} {
  const body = JSON.stringify(value)
  return {
    body,
    digest: `sha256:${createHash('sha256').update(body).digest('hex')}`
  }
}

export function image(
  subject?: string,
  mediaType = imageType
): {body: string; digest: string} {
  return fixture({
    schemaVersion: 2,
    mediaType,
    config: {},
    layers: [],
    ...(subject ? {subject: {digest: subject}} : {})
  })
}

export function index(
  refs: string[],
  mediaType = indexType
): {body: string; digest: string} {
  return fixture({
    schemaVersion: 2,
    mediaType,
    manifests: refs.map(digest => ({digest}))
  })
}
