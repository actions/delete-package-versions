/**
 * Used to apply memoization on getPackageNameFilter
 */
const resultCache = {} as Record<string, PackageNamesFilter>

interface PackageNameSubFilter {
  type: 'regex' | 'wildcard' | 'string'
  apply: (packageName: string) => boolean
}

interface PackageNamesFilter {
  readonly subfilters: readonly PackageNameSubFilter[]
  readonly isEmpty: boolean
  readonly apply: (packageName: string) => boolean
}

/**
 * Get a filter based on package names to match
 *
 * @param packageNames - serialized package names filter as string
 * @returns the respective package filter
 */
export function getPackageNameFilter(packageNames: string): PackageNamesFilter {
  if (resultCache[packageNames]) {
    return resultCache[packageNames]
  }
  const result = calculatePackageNameFilter(packageNames)
  resultCache[packageNames] = result
  return result
}

const emptyFilter = Object.freeze({
  subfilters: Object.freeze([]),
  isEmpty: true,
  apply: () => false as boolean
})

/**
 * Generates a filter based package names to match
 *
 * @param packageNames - serialized package names filter as string
 * @returns the respective package filter
 */
function calculatePackageNameFilter(
  packageNames: string
): Readonly<PackageNamesFilter> {
  if (packageNames === '') {
    return emptyFilter
  }
  const separatedPackageNames = packageNames
    .split(',')
    .map(name => name.trim())
    .filter(name => name !== '')

  if (separatedPackageNames.length <= 0) {
    return emptyFilter
  }

  const subfilters = separatedPackageNames.map(createFilter)
  return {
    subfilters,
    isEmpty: subfilters.length <= 0,
    apply: names => subfilters.some(filter => filter.apply(names))
  }
}

function createFilter(packageName: string): PackageNameSubFilter {
  if (packageName.startsWith('*') || packageName.endsWith('*')) {
    return createWildcardFilter(packageName)
  } else if (packageName.startsWith('/') && packageName.endsWith('/')) {
    return createRegexFilter(packageName)
  } else {
    return createExactMatchFilter(packageName)
  }
}

function createWildcardFilter(
  wildcardPackageName: string
): PackageNameSubFilter {
  const startsWithWildCard = wildcardPackageName.startsWith('*')
  const endsWithWildCard = wildcardPackageName.endsWith('*')
  let fn: PackageNameSubFilter['apply']
  if (startsWithWildCard && endsWithWildCard) {
    const targetText = wildcardPackageName.substring(
      1,
      wildcardPackageName.length - 1
    )
    fn = (packageName: string) => packageName.includes(targetText)
  } else if (startsWithWildCard) {
    const targetText = wildcardPackageName.substring(1)
    fn = (packageName: string) => packageName.endsWith(targetText)
  } else {
    const targetText = wildcardPackageName.substring(
      0,
      wildcardPackageName.length - 1
    )
    fn = (packageName: string) => packageName.startsWith(targetText)
  }
  return {
    type: 'wildcard',
    apply: fn
  }
}

function createRegexFilter(regexPackageName: string): PackageNameSubFilter {
  const regexPattern = regexPackageName.substring(
    1,
    regexPackageName.length - 1
  )
  const regex = new RegExp(regexPattern)
  return {
    type: 'regex',
    apply: (packageName: string) => regex.test(packageName)
  }
}

function createExactMatchFilter(
  matchingPackageName: string
): PackageNameSubFilter {
  return {
    type: 'string',
    apply: (packageName: string) => packageName === matchingPackageName
  }
}
