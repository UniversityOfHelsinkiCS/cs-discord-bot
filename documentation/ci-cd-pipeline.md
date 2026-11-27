## CI/CD Pipeline

There is one environment, production. There is no staging server.

### Continuous Integration (CI)

There is no automated test or lint workflow. Linting, formatting and tests are run locally before pushing:

- `npm run lint` runs oxlint
- `npm run format:check` checks formatting with oxfmt (`npm run format` fixes it)
- `npm test` runs the jest tests and the coverage report

### Continuous Deployment (CD)

The only workflow is [Release](../.github/workflows/publish.yml). It runs when a GitHub release is published: it builds the Docker image and pushes it to the University of Helsinki registry (`registry.version.helsinki.fi/toska/openshift/kontit/cs-discord-bot`) with the tags `production` and the commit SHA.

To roll back, re-run the [Release workflow](https://github.com/UniversityOfHelsinkiCS/cs-discord-bot/actions/workflows/publish.yml) of the release you want to go back to.
