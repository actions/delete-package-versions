import {deletePackageVersion, deletePackageVersions} from '../../src/version'

const githubToken = process.env.GITHUB_TOKEN as string

describe.skip('delete tests', () => {
  it('deletePackageVersion', async () => {
    const response = await deletePackageVersion(
      'MDE0OlBhY2thZ2VWZXJzaW9uNjg5OTU1',
      githubToken
    ).toPromise()
    expect(response).toBe(true)
  })

  it('deletePackageVersion (dry-run)', async () => {
    const response = await deletePackageVersion(
      'MDE0OlBhY2thZ2VWZXJzaW9uNjg5OTU1',
      githubToken,
      true
    ).toPromise()
    expect(response).toBe(true)
  })

  it('deletePackageVersions', async () => {
    const response = await deletePackageVersions(
      [
        'MDE0OlBhY2thZ2VWZXJzaW9uNjk4Mjc0',
        'MDE0OlBhY2thZ2VWZXJzaW9uNjk4Mjcx',
        'MDE0OlBhY2thZ2VWZXJzaW9uNjk4MjY3'
      ],
      githubToken
    ).toPromise()
    expect(response).toBe(true)
  })

  it('deletePackageVersions', async () => {
    const response = await deletePackageVersions(
      [
        'MDE0OlBhY2thZ2VWZXJzaW9uNjk4Mjc0',
        'MDE0OlBhY2thZ2VWZXJzaW9uNjk4Mjcx',
        'MDE0OlBhY2thZ2VWZXJzaW9uNjk4MjY3'
      ],
      githubToken,
      true
    ).toPromise()
    expect(response).toBe(true)
  })
})
