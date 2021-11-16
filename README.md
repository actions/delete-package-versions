# Delete Package Versions

This action deletes versions of a package from [GitHub Packages](https://github.com/features/packages).

### What It Can Do

* Delete a single version
* Delete multiple versions
* Delete specific version(s)
* Delete oldest version(s)
* Delete version(s) of a package that is hosted in the same repo that is executing the workflow
* Delete version(s) of a package that is hosted in a different repo than the one executing the workflow
* Specify a minimum number of latest package versions to not get deleted.
* Ignore some versions based on name and delete remaining versions.
* Delete all pre-release versions

# Usage

```yaml
- uses: actions/delete-package-versions@v1
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

  # The min number of latest versions to never delete.
  # Defaults to 1.
  min-versions-to-keep:

  # The package versions to ignore exclude from deletion.
  # By default nothing is ignored"
  ignore-versions:

  # If true it will delete all the pre-release versions upto 100 at once.
  # Defaults to false.
  delete-only-pre-release-versions:

  # The token used to authenticate with GitHub Packages.
  # Defaults to github.token.
  # Required if deleting a version from a package hosted in a different repo than the one executing the workflow.
  #   If `package-version-ids` is given the token only needs the delete packages scope.
  #   If `package-version-ids` is not given the token needs the delete packages scope and the read packages scope
  token:
```

# Scenarios

  - [Delete a specific version of a package hosted in the same repo as the workflow](#delete-a-specific-version-of-a-package-hosted-in-the-same-repo-as-the-workflow)
  - [Delete a specific version of a package hosted in a different repo than the workflow](#delete-a-specific-version-of-a-package-hosted-in-a-different-repo-than-the-workflow)
  - [Delete multiple specific versions of a package hosted in the same repo as the workflow](#delete-multiple-specific-versions-of-a-package-hosted-in-the-same-repo-as-the-workflow)
  - [Delete multiple specific versions of a package hosted in a different repo than the workflow](#delete-multiple-specific-versions-of-a-package-hosted-in-a-different-repo-than-the-workflow)
  - [Delete oldest version of a package hosted in the same repo as the workflow](#delete-oldest-version-of-a-package-hosted-in-the-same-repo-as-the-workflow)
  - [Delete oldest version of a package hosted in a different repo than the workflow](#delete-oldest-version-of-a-package-hosted-in-a-different-repo-than-the-workflow)
  - [Delete oldest x number of versions of a package hosted in the same repo as the workflow](#delete-oldest-x-number-of-versions-of-a-package-hosted-in-the-same-repo-as-the-workflow)
  - [Delete oldest x number of versions of a package hosted in a different repo than the workflow](#delete-oldest-x-number-of-versions-of-a-package-hosted-in-a-different-repo-than-the-workflow)
  - [Delete oldest x number of versions and keeping y latest versions of a package hosted in the same repo as the workflow](#delete-oldest-x-number-of-versions-and-keeping-y-latest-versions-of-a-package-hosted-in-the-same-repo-as-the-workflow)
  - [Delete oldest x number of versions and keeping y latest versions of a package hosted in a different repo than the workflow](#delete-oldest-x-number-of-versions-and-keeping-y-latest-versions-of-a-package-hosted-in-a-different-repo-than-the-workflow)
  - [Delete oldest x number of versions while ignoring particular package versions in the same repo as the workflow](#delete-oldest-x-number-of-versions-while-ignoring-particular-package-versions-in-the-same-repo-as-the-workflow)
  - [Delete all pre-release package versions in the same repo as the workflow](#delete-all-pre-release-package-versions-in-the-same-repo-as-the-workflow)


### Delete a specific version of a package hosted in the same repo as the workflow

To delete a specific version of a package that is hosted in the same repo as the one executing the workflow the __package-version-ids__ input is required.

Package version ids can be retrieved via the [GitHub GraphQL API][api]

__Example__

```yaml
- uses: actions/delete-package-versions@v1
  with:
    package-version-ids: 'MDE0OlBhY2thZ2VWZXJzaW9uOTcyMDY3'
```

<br>

### Delete a specific version of a package hosted in a different repo than the workflow

To delete a specific version of a package that is hosted in a different repo than the one executing the workflow the __package-version-ids__, and __token__ inputs are required.

Package version ids can be retrieved via the [GitHub GraphQL API][api].

The [token][token] only needs the delete packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

__Example__

```yaml
- uses: actions/delete-package-versions@v1
  with:
    package-version-ids: 'MDE0OlBhY2thZ2VWZXJzaW9uOTcyMDY3'
    token: ${{ secrets.GITHUB_PAT }}
```

<br>

### Delete multiple specific versions of a package hosted in the same repo as the workflow

To delete multiple specifc versions of a package that is hosted in the same repo that is executing the workflow the __package-version-ids__ input is required.

The __package-version-ids__ input should be a comma separated string of package version ids. Package version ids can be retrieved via the [GitHub GraphQL API][api].

__Example__

```yaml
- uses: actions/delete-package-versions@v1
  with:
    package-version-ids: 'MDE0OlBhY2thZ2VWZXJzaW9uOTcyMDY3, MDE0OlBhY2thZ2VWZXJzaW9uOTcyMzQ5, MDE0OlBhY2thZ2VWZXJzaW9uOTcyMzUw'
```

<br>

### Delete multiple specific versions of a package hosted in a different repo than the workflow

To delete multiple specifc versions of a package that is hosted in a different repo than the one executing the workflow the __package-version-ids__, and __token__ inputs are required.

The __package-version-ids__ input should be a comma separated string of package version ids. Package version ids can be retrieved via the [GitHub GraphQL API][api].

The [token][token] only needs the delete packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

__Example__

```yaml
- uses: actions/delete-package-versions@v1
  with:
    package-version-ids: 'MDE0OlBhY2thZ2VWZXJzaW9uOTcyMDY3, MDE0OlBhY2thZ2VWZXJzaW9uOTcyMzQ5, MDE0OlBhY2thZ2VWZXJzaW9uOTcyMzUw'
    token: ${{ secrets.GITHUB_PAT }}
```

<br>

### Delete oldest version of a package hosted in the same repo as the workflow

To delete the oldest version of a package that is hosted in the same repo that is executing the workflow the __package-name__ input is required.

__Example__

```yaml
- uses: actions/delete-package-versions@v1
  with:
    package-name: 'test-package'
```

<br>

### Delete oldest version of a package hosted in a different repo than the workflow

To delete the oldest version of a package that is hosted in a different repo than the one executing the workflow the __package-name__, __owner__, __repo__, and __token__ inputs are required.

The [token][token] needs the delete packages and read packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

__Example__

```yaml
- uses: actions/delete-package-versions@v1
  with:
    owner: 'github'
    repo: 'packages'
    package-name: 'test-package'
    token: ${{ secrets.GITHUB_PAT }}
```

<br>

### Delete oldest x number of versions of a package hosted in the same repo as the workflow

To delete the oldest x number of versions of a package hosted in the same repo that is executing the workflow the __package-name__, and __num-old-versions-to-delete__ inputs are required.

__Example__

Delete the oldest 3 version of a package hosted in the same repo as the workflow

```yaml
- uses: actions/delete-package-versions@v1
  with:
    package-name: 'test-package'
    num-old-versions-to-delete: 3
```

<br>

### Delete oldest x number of versions of a package hosted in a different repo than the workflow

To delete the oldest x number of versions of a package hosted in a different repo than the one executing the workflow the __package-name__, __num-old-versions-to-delete__, __owner__, __repo__, and __token__ inputs are required.

The [token][token] needs the delete packages and read packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

__Example__

Delete the oldest 3 version of a package hosted in a different repo than the one executing the workflow

```yaml
- uses: actions/delete-package-versions@v1
  with:
    owner: 'github'
    repo: 'packages'
    package-name: 'test-package'
    num-old-versions-to-delete: 3
    token: ${{ secrets.GITHUB_PAT }}
```

<br>

### Delete oldest x number of versions and keeping y latest versions of a package hosted in the same repo as the workflow

To delete oldest x number of versions while keeping minimum y latest versions of a package hosted in the same repo as the workflow the __package-name__, __num-old-versions-to-delete__, and __min-versions-to-keep__ inputs are required.

__Example__

Delete the oldest 3 version and always keep atleast 2 versions of a package hosted in the same repo as the workflow

```yaml
- uses: actions/delete-package-versions@v1
  with:
    package-name: 'test-package'
    num-old-versions-to-delete: 3
    min-versions-to-keep: 2
```

<br>

### Delete oldest x number of versions and keeping y latest versions of a package hosted in a different repo than the workflow

To delete oldest x number of versions while keeping minimum y latest versions of a package hosted in a different repo than the workflow the __package-name__, __num-old-versions-to-delete__, __min-versions-to-keep__, __owner__, __repo__, and __token__ inputs are required.

The [token][token] needs the delete packages and read packages scope. It is recommended [to store the token as a secret][secret]. In this example the [token][token] was stored as a secret named __GITHUB_PAT__.

__Example__

Delete the oldest 3 version and always keep atleast 2 versions of a package hosted in a different repo than the workflow

```yaml
- uses: actions/delete-package-versions@v1
  with:
    owner: 'github'
    repo: 'packages'
    package-name: 'test-package'
    num-old-versions-to-delete: 3
    min-versions-to-keep: 2
    token: ${{ secrets.GITHUB_PAT }}
```

<br>

### Delete oldest x number of versions while ignoring particular package versions in the same repo as the workflow

To delete oldest x number of versions while ignoring all the major package versions in the same repo as the workflow the __package-name__, __num-oldest-versions-to-delete__ and __ignore-versions__ inputs are required.

There is a possibility if the oldest x number of versions contain ignored package versions, actual package versions to get deleted will be less than x.

__Example__

Delete 3 oldest versions excluding major versions as per semver is the same repo as the workflow

```yaml
- uses: actions/delete-package-versions@v1
  with: 
    package-name: 'test-packae'
    num-old-versions-to-delete: 3
    ignore-versions: '^(0|[1-9]\\d*)\\.0\\.0$'
```

### Delete all pre-release package versions in the same repo as the workflow

To delete all pre release package versions in the same repo as the workflow the __package-name__ and __delete-only-pre-release-versions__ inputs are required.

__Example__

Delete all pre-release package versions in the same repo as the workflow

```yaml
- uses: actions/delete-package-versions@v1
  with: 
    package-name: 'test-package'
    delete-only-pre-release-versions: "true"
```

# License

The scripts and documentation in this project are released under the [MIT License](https://github.com/actions/delete-package-versions/blob/main/LICENSE)

[api]: https://developer.github.com/v4/previews/#github-packages
[token]: https://help.github.com/en/packages/publishing-and-managing-packages/about-github-packages#about-tokens
[secret]: https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets
