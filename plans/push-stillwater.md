# Replace Bheemty/Stillwater main with this project

## Goal
Overwrite `main` on https://github.com/Bheemty/Stillwater.git with this project's current `main` (cinematic concert site, local commit history).

## Known facts
- Remote `origin` is already added. Remote `main` is at `95b6bb12f587b09b1562d0c8726ddb185829b336`; it also has branch `improve-mobile-and-launch-kit` (PR #1).
- Histories are unrelated, so a normal push is rejected; a force push is required.
- Secret `GITHUB_PUSH_TOKEN` is now saved (contents read/write on the repo). Its validity is not yet proven.

## Steps
1. Confirm the token works without printing it: `git ls-remote` with the token supplied through an `http.extraheader` or a credential helper reading `$GITHUB_PUSH_TOKEN` from the environment. Never write it into the remote URL, config, files or logs.
2. Backup (recommended default): push the current remote `main` to `backup-before-cinematic` by pushing remote commit `95b6bb1` to that branch. Needs the commit fetched first: `git fetch origin main`.
3. Force push with lease: `git push --force-with-lease=main:95b6bb12f587b09b1562d0c8726ddb185829b336 origin main:main`. The lease aborts if someone pushed since.
4. Verify: `git ls-remote origin refs/heads/main` equals local `HEAD`.
5. Do not touch the `improve-mobile-and-launch-kit` branch or PR #1.

## Failure modes
- 401/403: token invalid or lacks Contents write or wrong repo selected; ask the user to regenerate it.
- Branch protection rejects force push: stop and offer a branch plus pull request instead (`cinematic-concert-site`).
- Lease failure: remote moved; re-fetch, report, and ask before retrying.
- Large media (about 22 MB of video, PNGs): well under GitHub's 100 MB per-file limit.

## After
Tell the user to revoke or delete the GitHub token.
