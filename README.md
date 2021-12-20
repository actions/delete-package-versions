# Delete Package Versions

This action deletes versions of a package from [GitHub Packages](https://github.com/features/packages). This action will only delete a maximum of 100 versions in one run.

### What It Can Do

* Create a retention policy (delete all except n most recent pre-release versions)
* Delete all package versions except n most recent versions
* Delete oldest version(s)
* Ignore version(s) from deletion through regex
* Delete version(s) of a package that is hosted in the same repo that is executing the workflow
* Delete version(s) of a package that is hosted in a different repo than the one executing the workflow
* Delete a single version
* Delete multiple versions
* Delete specific version(s)

# Usage

```yaml
- uses: actions/delete-package-versions@v2
  with:
  # Can be a single package version id, or a comma separated list of package version ids.
  # Defaults to an empty string.
  package-version-ids:

  # Owner of the repo hosting the package.
  # Defaults to the owner of the repo executing the workflow.
  # Required if deleting a version from a package hosted in a different repo than the one executing the workflow.
  owner:

  # Repo hosting the package.
  # Defaults to the repo executing the workflow.
  # Required if deleting a version from a package hosted in a different repo than the one executing the workflow.
  repo:

  # Name of the package.
  # Defaults to an empty string.
  # Required if `package-version-ids` input is not given.
  package-name:

  # The number of old versions to delete starting from the oldest version.
  # Defaults to 1.
  num-old-versions-to-delete:

  # The number of latest versions to not delete.
  # This cannot be specified with `num-old-versions-to-delete`. By default, `num-old-versions-to-delete` is taken into account.
  # When set to 0, all deletable versions will be deleted.
  # When set greater than 0, all deletable package versions except the specified number will be deleted.
  min-versions-to-keep:

  # The package versions to exclude from deletion.
  # Takes regex for the version name as input.
  # By default nothing is ignored.
  ignore-versions:

  # If true it will delete only the pre-release versions.
  # The number of pre-release versions to keep can be set by using `min-versions-to-keep` value with this.
  # When `min-versions-to-keep` is 0, all pre-release versions get deleted.
  # Defaults to false.
  # Cannot be used with `num-old-versions-to-delete`.
  delete-only-pre-release-versions:

  # The token used to authenticate with GitHub Packages.
  # Defaults to github.token.
  # Required if deleting a version from a package hosted in a different repo than the one executing the workflow.
  #   If `package-version-ids` is given the token only needs the delete packages scope.
  #   If `package-version-ids` is not given the token needs the delete packages scope and the read packages scope
  token:
```

# Valid Input Combinations

`owner`, `repo`, `package-name` and `token` can be used with the following combinations in a workflow - 

  - `num-old-versions-to-delete`
  - `min-versions-to-keep` 
  - `delete-only-pre-release-versions`
  - `ignore-versions`
  - `num-old-versions-to-delete` + `ignore-versions`
  - `min-versions-to-keep` + `ignore-versions`
  - `min-versions-to-keep` + `delete-only-pre-release-versions`

# Scenarios

  - [Delete all pre-release versions except y latest pre-release package versions](#delete-all-pre-release-versions-except-y-latest-pre-release-package-versions)
  - [Delete all except y latest versions while ignoring particular package versions](#delete-all-except-y-latest-versions-while-ignoring-particular-package-versions)
  - [Delete oldest x number of versions while ignoring particular package versions](#delete-oldest-x-number-of-versions-while-ignoring-particular-package-versions)
  - [Delete all except y latest versions of a package](#delete-all-except-y-latest-versions-of-a-package)
  - [Delete oldest x number of versions of a package](#delete-oldest-x-number-of-versions-of-a-package)
  - [Delete oldest version of a package](#delete-oldest-version-of-a-package)
  - [Delete a specific version of a package](#delete-a-specific-version-of-a-package)
  - [Delete multiple specific versions of a package](#delete-multiple-specific-versions-of-a-package)
  

  ### Delete all pre-release versions except y latest pre-release package versions

  To delete all pre release versions except y latest pre-release package versions in the same repo as the workflow the __package-name__, __min-versions-to-keep__ and __delete-only-pre-release-versions__ inputs are required.

  __Example__

  Delete all pre-release package versions except latest 10 in the same repo as the workflow

  ```yaml
  - uses: actions/delete-package-versions@v2
    with: 
      package-name: 'test-package'
      min-versions-to-keep: 10
      delete-only-pre-release-versions: "true"
  ```
  To delete all pre release versions except y latest pre-release package versions in a different repo than the workflow the __owner__, __repo__, __package-name__, __token__, __min-versions-to-keep__ and __delete-only-pre-release-versions__ inputs are required.

  The [token][token] needs the delete packages and read packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

  __Example__

  Delete all pre-release package versions except latest 10 in a different repo than the workflow

  ```yaml
  - uses: actions/delete-package-versions@v2
    with: 
      owner: 'github'
      repo: 'packages'
      package-name: 'test-package'
      token: ${{ secrets.GITHUB_PAT }}
      min-versions-to-keep: 10
      delete-only-pre-release-versions: "true"
  ```

  <br>

  ### Delete all except y latest versions while ignoring particular package versions

  To delete all except y latest versions while ignoring particular package versions in the same repo as the workflow the __package-name__, __min-versions-to-keep__ and __ignore-versions__ inputs are required.

  __Example__

  Delete all except latest 3 package versions excluding major versions as per semver in the same repo as the workflow

  ```yaml
  - uses: actions/delete-package-versions@v2
    with: 
      package-name: 'test-packae'
      min-versions-to-keep: 3
      ignore-versions: '^(0|[1-9]\\d*)\\.0\\.0$'
  ```

  To delete all except y latest versions while ignoring particular package versions in a different repo than the workflow the __owner__, __repo__, __package-name__, __token__, __min-versions-to-keep__ and __ignore-versions__ inputs are required.

  The [token][token] needs the delete packages and read packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

  __Example__

  Delete all except latest 3 package versions excluding major versions as per semver in a different repo than the workflow

  ```yaml
  - uses: actions/delete-package-versions@v2
    with: 
      owner: 'github'
      repo: 'packages'
      package-name: 'test-packae'
      token: ${{ secrets.GITHUB_PAT }}
      min-versions-to-keep: 3
      ignore-versions: '^(0|[1-9]\\d*)\\.0\\.0$'
  ```

  <br>

  ### Delete oldest x number of versions while ignoring particular package versions

  To delete oldest x number of versions while ignoring all the major package versions in the same repo as the workflow the __package-name__, __num-oldest-versions-to-delete__ and __ignore-versions__ inputs are required.

  There is a possibility if the oldest x number of versions contain ignored package versions, actual package versions to get deleted will be less than x.

  __Example__

  Delete 3 oldest versions excluding major versions as per semver is the same repo as the workflow

  ```yaml
  - uses: actions/delete-package-versions@v2
    with: 
      package-name: 'test-packae'
      num-old-versions-to-delete: 3
      ignore-versions: '^(0|[1-9]\\d*)\\.0\\.0$'
  ```

  To delete oldest x number of versions while ignoring all the major package versions in a different repo than the workflow the __owner__, __repo__, __package-name__, __token__, __num-oldest-versions-to-delete__ and __ignore-versions__ inputs are required.

  There is a possibility if the oldest x number of versions contain ignored package versions, actual package versions to get deleted will be less than x.

  The [token][token] needs the delete packages and read packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

  __Example__

  Delete 3 oldest versions excluding major versions as per semver is a differernt repo than the workflow

  ```yaml
  - uses: actions/delete-package-versions@v2
    with: 
      owner: 'github'
      repo: 'packages'
      package-name: 'test-packae'
      token: ${{ secrets.PAT }}
      num-old-versions-to-delete: 3
      ignore-versions: '^(0|[1-9]\\d*)\\.0\\.0$'
  ```

  <br>

  ### Delete all except y latest versions of a package

  To delete all except y latest versions of a package hosted in the same repo as the workflow the __package-name__ and __min-versions-to-keep__ inputs are required.

  __Example__

  Delete all except latest 2 versions of a package hosted in the same repo as the workflow

  ```yaml
  - uses: actions/delete-package-versions@v2
    with:
      package-name: 'test-package'
      min-versions-to-keep: 2
  ```

  To delete all except y latest versions of a package hosted in a repo other than the workflow the __owner__, __repo__, __package-name__, __token__ and __min-versions-to-keep__ inputs are required.

  The [token][token] needs the delete packages and read packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

  __Example__

  Delete all except latest 2 versions of a package hosted in a repo other than the workflow

  ```yaml
  - uses: actions/delete-package-versions@v2
    with:
      owner: 'github'
      repo: 'packages'
      package-name: 'test-package'
      token: ${{ secrets.PAT }}
      min-versions-to-keep: 2
  ```

  <br>

  ### Delete oldest x number of versions of a package

  To delete the oldest x number of versions of a package hosted in the same repo as the workflow the __package-name__, and __num-old-versions-to-delete__ inputs are required.

  __Example__

  Delete the oldest 3 version of a package hosted in the same repo as the workflow

  ```yaml
  - uses: actions/delete-package-versions@v2
    with:
      package-name: 'test-package'
      num-old-versions-to-delete: 3
  ```

  To delete the oldest x number of versions of a package hosted in a different repo than the workflow the __owner__, __repo__, __package-name__, __token__ and __num-old-versions-to-delete__ inputs are required.

  The [token][token] needs the delete packages and read packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

  __Example__

  Delete the oldest 3 version of a package hosted in a different repo than the one executing the workflow

  ```yaml
  - uses: actions/delete-package-versions@v2
    with:
      owner: 'github'
      repo: 'packages'
      package-name: 'test-package'
      num-old-versions-to-delete: 3
      token: ${{ secrets.GITHUB_PAT }}
  ```

  <br>

  ### Delete oldest version of a package

  To delete the oldest version of a package that is hosted in the same repo as the workflow the __package-name__ input is required.

  __Example__

  ```yaml
  - uses: actions/delete-package-versions@v2
    with:
      package-name: 'test-package'
  ```

  To delete the oldest version of a package that is hosted in a different repo than the workflow the __owner__, __repo__, __package-name__, __token__ inputs are required.

  The [token][token] needs the delete packages and read packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

  __Example__

  ```yaml
  - uses: actions/delete-package-versions@v2
    with:
      owner: 'github'
      repo: 'packages'
      package-name: 'test-package'
      token: ${{ secrets.PAT }}
  ```

  <br>

  ### Delete a specific version of a package

  To delete a specific version of a package that is hosted in the same repo as the workflow the __package-version-ids__ input is required.

  Package version ids can be retrieved via the [GitHub GraphQL API][api]

  __Example__

  ```yaml
  - uses: actions/delete-package-versions@v2
    with:
      package-version-ids: 'MDE0OlBhY2thZ2VWZXJzaW9uOTcyMDY3'
  ```

  To delete a specific version of a package that is hosted in a different repo than the workflow the __package-version-ids__ and __token__ inputs are required.

  The [token][token] needs the delete packages and read packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

  Package version ids can be retrieved via the [GitHub GraphQL API][api]

  __Example__

  ```yaml
  - uses: actions/delete-package-versions@v2
    with:
      package-version-ids: 'MDE0OlBhY2thZ2VWZXJzaW9uOTcyMDY3'
      token: ${{ secrets.PAT }}
  ```

  <br>

  ### Delete multiple specific versions of a package

  To delete multiple specifc versions of a package that is hosted in the same repo as the workflow the __package-version-ids__ input is required.

  The __package-version-ids__ input should be a comma separated string of package version ids. Package version ids can be retrieved via the [GitHub GraphQL API][api].

  __Example__

  ```yaml
  - uses: actions/delete-package-versions@v2
    with:
      package-version-ids: 'MDE0OlBhY2thZ2VWZXJzaW9uOTcyMDY3, MDE0OlBhY2thZ2VWZXJzaW9uOTcyMzQ5, MDE0OlBhY2thZ2VWZXJzaW9uOTcyMzUw'
  ```

  To delete multiple specifc versions of a package that is hosted in a repo other than the workflow the __package-version-ids__, __token__ inputs are required.

  The __package-version-ids__ input should be a comma separated string of package version ids. Package version ids can be retrieved via the [GitHub GraphQL API][api].

  The [token][token] needs the delete packages and read packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

  __Example__

  ```yaml
  - uses: actions/delete-package-versions@v2
    with:
      package-version-ids: 'MDE0OlBhY2thZ2VWZXJzaW9uOTcyMDY3, MDE0OlBhY2thZ2VWZXJzaW9uOTcyMzQ5, MDE0OlBhY2thZ2VWZXJzaW9uOTcyMzUw'
      token: ${{ secrets.PAT }}
  ```

# License

The scripts and documentation in this project are released under the [MIT License](https://github.com/actions/delete-package-versions/blob/main/LICENSE)

[api]: https://developer.github.com/v4/previews/#github-packages
[token]: https://help.github.com/en/packages/publishing-and-managing-packages/about-github-packages#about-tokens
[secret]: https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets
