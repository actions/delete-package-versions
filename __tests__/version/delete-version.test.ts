import {deletePackageVersion, deletePackageVersions} from '../../src/version'

const githubToken = process.env.GITHUB_TOKEN as string

describe('delete tests', () => {
  it('deletePackageVersion', async () => {
    const response = await deletePackageVersion(
      'PV_lADOGReZt84AEI7FzgDSHEI',
      githubToken
    ).toPromise()
    expect(response).toBe(true)
  })

  it('deletePackageVersions', async () => {
    const response = await deletePackageVersions(
      [
        'PV_lADOGReZt84AEI7FzgDSHDs',
        'PV_lADOGReZt84AEI7FzgDSHDY',
        'PV_lADOGReZt84AEI7FzgDSHC8'
      ],
      githubToken
    ).toPromise()
    expect(response).toBe(true)
  })
})
