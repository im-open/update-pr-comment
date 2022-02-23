# update-pr-comment

Create and update a PR comment, rather than creating a new one with every run.

## Index

- [Inputs](#inputs)
- [Usage Examples](#usage-examples)
- [Contributing](#contributing)
  - [Recompiling](#recompiling)
  - [Incrementing the Version](#incrementing-the-version)
- [Code of Conduct](#code-of-conduct)
- [License](#license)

## TODOs

- Repository Settings
  - [ ] On the _Options_ tab check the box to _Automatically delete head branches_
  - [ ] On the _Options_ tab update the repository's visibility (must be done by an org owner)
  - [ ] On the _Branches_ tab add a branch protection rule
    - [ ] Check _Require pull request reviews before merging_
    - [ ] Check _Dismiss stale pull request approvals when new commits are pushed_
    - [ ] Check _Require review from Code Owners_
    - [ ] Check _Include Administrators_
  - [ ] On the _Manage Access_ tab add the appropriate groups
- About Section (accessed on the main page of the repo, click the gear icon to edit)
  - [ ] The repo should have a short description of what it is for
  - [ ] Add one of the following topic tags:
        | Topic Tag | Usage |
        | --------------- | ---------------------------------------- |
        | az | For actions related to Azure |
        | code | For actions related to building code |
        | certs | For actions related to certificates |
        | db | For actions related to databases |
        | git | For actions related to Git |
        | iis | For actions related to IIS |
        | microsoft-teams | For actions related to Microsoft Teams |
        | svc | For actions related to Windows Services |
        | jira | For actions related to Jira |
        | meta | For actions related to running workflows |
        | pagerduty | For actions related to PagerDuty |
        | test | For actions related to testing |
        | tf | For actions related to Terraform |
  - [ ] Add any additional topics for an action if they apply
  - [ ] The Packages and Environments boxes can be unchecked

## Inputs

| Parameter            | Is Required | Default | Description                                                     |
| -------------------- | ----------- | ------- | --------------------------------------------------------------- |
| `github-token`       | true        |         | The GitHub token for interacting with the repository.           |
| `comment-identifier` | true        |         | An unchanging identifier for the comment that should be updated |
| `comment-content`    | true        |         | A string of Github-flavored markdown for your comment           |

## Usage Examples

```yml
jobs:
  jobname:
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v2

      - name: ''
        uses: im-open/update-pr-comment@v1.0.0
        with:
          comment-identifier: 'specific-comment-identifier' # this should not change
          comment-content: |
            # Comment Content

            Some Github-flavored markdown for your comment...
```

## Contributing

When creating new PRs please ensure:

1. The action has been recompiled. See the [Recompiling](#recompiling) section below for more details.
2. For major or minor changes, at least one of the commit messages contains the appropriate `+semver:` keywords listed under [Incrementing the Version](#incrementing-the-version).
3. The `README.md` example has been updated with the new version. See [Incrementing the Version](#incrementing-the-version).
4. The action code does not contain sensitive information.

### Recompiling

If changes are made to the action's code in this repository, or its dependencies, you will need to re-compile the action.

```sh
# Installs dependencies and bundles the code
npm run build

# Bundle the code (if dependencies are already installed)
npm run bundle
```

These commands utilize [esbuild](https://esbuild.github.io/getting-started/#bundling-for-node) to bundle the action and
its dependencies into a single file located in the `dist` folder.

### Incrementing the Version

This action uses [git-version-lite] to examine commit messages to determine whether to perform a major, minor or patch increment on merge. The following table provides the fragment that should be included in a commit message to active different increment strategies.
| Increment Type | Commit Message Fragment |
| -------------- | ------------------------------------------- |
| major | +semver:breaking |
| major | +semver:major |
| minor | +semver:feature |
| minor | +semver:minor |
| patch | _default increment type, no comment needed_ |

## Code of Conduct

This project has adopted the [im-open's Code of Conduct](https://github.com/im-open/.github/blob/master/CODE_OF_CONDUCT.md).

## License

Copyright &copy; 2021, Extend Health, LLC. Code released under the [MIT license](LICENSE).

[git-version-lite]: https://github.com/im-open/git-version-lite
