## CI/CD Pipeline

Both development and production vesions are running on University of Helsinki's staging server in a docker container.
Watchtower running on the staging server watches for changes to the Docker Hub repository and in case there is an update, the container gets updated and restarted, launching a brand-new version of the bot.

### Continuous Integration (CI)

There is currently no automated test or lint workflow. The only workflow is [Publish Docker image](../.github/workflows/publish.yml), which builds the image and pushes it to the registry when a release is published. Linting, formatting and tests are run locally before pushing:

- `npm run lint` runs oxlint
- `npm run format:check` checks formatting with oxfmt (`npm run format` fixes it)
- `npm test` runs the jest tests and the coverage report

### Continuous Deployment (CD)

Deployment requires a pull request from dev to main that is approved by one reviewer. After merging workflows run on main branch and a new version of production docker image is pushed to DockerHub.

In case something unwanted gets deployed, the bot can be reverted to an older version by simply re-running [a publish workflow](https://github.com/UniversityOfHelsinkiCS/cs-discord-bot/actions/workflows/publish.yml) of the desired version.

