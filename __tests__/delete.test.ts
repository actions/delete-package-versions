import {Input, InputParams} from '../src/input'
import {deleteVersions, finalIds} from '../src/delete'

jest.setTimeout(10000)
describe('index tests -- call graphql', () => {
  it('finalIds test -- get oldest version', done => {
    const numVersions = 1

    finalIds(getInput({numOldVersionsToDelete: numVersions})).subscribe(ids => {
      expect(ids.length).toBe(numVersions)
      done()
    })
  })

  it.skip('finalIds test -- get oldest 3 versions', done => {
    const numVersions = 3
    finalIds(getInput({numOldVersionsToDelete: numVersions})).subscribe(ids => {
      expect(ids.length).toBe(numVersions)
      done()
    })
  })

  it.skip('finalIds test -- get oldest 110 versions', done => {
    const numVersions = 110

    finalIds(getInput({numOldVersionsToDelete: numVersions})).subscribe(ids => {
      expect(ids.length).toBe(99), async () => done()
    })
  })

  it('finalIds test -- supplied package version id', done => {
    const suppliedIds = [
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'
    ]

    finalIds(getInput({packageVersionIds: suppliedIds})).subscribe(ids => {
      expect(ids).toBe(suppliedIds)
      done()
    })
  })

  it('deleteVersions test -- missing token', done => {
    deleteVersions(getInput({token: ''})).subscribe({
      error: err => {
        expect(err).toBeTruthy()
        done()
      },
      complete: async () => done.fail('no error thrown')
    })
  })

  it('deleteVersions test -- missing packageName', done => {
    deleteVersions(getInput({packageName: ''})).subscribe({
      error: err => {
        expect(err).toBeTruthy()
        done()
      },
      complete: async () => done.fail('no error thrown')
    })
  })

  it.skip('deleteVersions test -- delete oldest version', done => {
    deleteVersions(getInput({numOldVersionsToDelete: 1})).subscribe(
      isSuccess => {
        expect(isSuccess)
      },
      async () => done()
    )
  })

  it.skip('deleteVersions test -- delete 3 oldest versions', done => {
    deleteVersions(getInput({numOldVersionsToDelete: 3})).subscribe(
      isSuccess => {
        expect(isSuccess)
      },
      async () => done()
    )
  })

  it.skip('deleteVersions test -- keep 5 versions', done => {
    deleteVersions(getInput({minVersionsToKeep: 100})).subscribe(isSuccess => {
      expect(isSuccess).toBe(true)
    }),
      async () => done()
  })
})

const defaultInput: InputParams = {
  packageVersionIds: [],
  owner: 'namratajha',
  repo: 'only-pkg',
  packageName: 'only-pkg',
  numOldVersionsToDelete: 1,
  minVersionsToKeep: -1,
  ignoreVersions: RegExp('^$'),
  token: process.env.GITHUB_TOKEN as string
}

function getInput(params?: InputParams): Input {
  return new Input({...defaultInput, ...params})
}
