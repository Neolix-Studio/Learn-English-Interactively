# Dev Server Cleanup

Target folder:

```text
lexipaws.eu/sub/dev
```

Target URL:

```text
https://dev.lexipaws.eu
```

## Branch Mapping

Use this mapping:

| GitHub branch | Websupport folder | URL |
| --- | --- | --- |
| `dev` | `lexipaws.eu/sub/dev` | `https://dev.lexipaws.eu` |
| `main` | `lexipaws.eu/web` | `https://lexipaws.eu` |

## Can The Current Dev Folder Be Deleted?

Yes, because it is the dev environment, but do it intentionally.

Do not delete production:

```text
lexipaws.eu/web
```

Recommended safer approach:

1. In Websupport file manager, rename:
   ```text
   lexipaws.eu/sub/dev
   ```
   to:
   ```text
   lexipaws.eu/sub/dev_backup_before_react
   ```
2. Create a new empty folder:
   ```text
   lexipaws.eu/sub/dev
   ```
3. Push/create the GitHub `dev` branch with the migrated app.
4. Let GitHub Actions deploy the generated `release/` package into `lexipaws.eu/sub/dev`.
5. Verify:
   ```text
   https://dev.lexipaws.eu
   ```
6. After a few days, delete `dev_backup_before_react` if nothing is missing.

## What Can Be Lost If You Delete Dev?

Usually safe to lose in dev:

- old app files
- `.DS_Store`
- old source folders
- old generated assets
- old docs/reference files

Think before deleting if you care about dev-only generated data:

- `audio/` cached TTS files
- `avatars/` uploaded user avatars
- `logs/`
- any manually uploaded file not in Git

Production data is not affected as long as you only touch `lexipaws.eu/sub/dev`.

## Important

GitHub Actions deploys the generated `release/` folder. It does not need the random files currently sitting in the dev folder.

Do not manually upload the whole local project folder. If manual upload is ever needed, run:

```bash
npm run package:release
```

Then upload only the contents of:

```text
release/
```
