# Releasing whispers-foundry

All releases go through `release.py`. Do not bump the version, build the zip, or run `gh release create` by hand — the script keeps the tag, manifest, and asset filename in lockstep.

The repo holds a **Foundry VTT system** (the `whispers` system). v0.1.x release tags carry the old module form; v0.2.x onward are the system. v1.0.0 is reserved for when the system reaches a feature-complete first release (full sheet, populated compendium packs, etc.).

## How to release

1. Write release notes to a markdown file (the agent does this — typically `/tmp/whispers-release-notes.md`).
2. From `/workspace/dev/whispers-foundry/`, run:

   ```bash
   python release.py --notes-file /tmp/whispers-release-notes.md
   ```

   By default this is a **patch** bump (e.g. `v0.2.0` → `v0.2.1`). For other bumps:

   ```bash
   python release.py --notes-file <path> --minor   # v0.2.1 → v0.3.0
   python release.py --notes-file <path> --major   # v0.2.1 → v1.0.0
   ```

   Always rehearse with `--dry-run` first — it prints the planned version, manifest diff, and zip contents without touching anything.

## What the script does (in order)

1. **Pre-flight** — must be in a git repo on `main`, working tree clean, local up to date with `origin/main`, `gh auth status` succeeds, notes file exists and is non-empty.
2. **Determine version** — reads the latest GitHub release tag (via `gh release list --json tagName`), parses it as semver, applies the requested bump.
3. **Update `system.json`** — uses `json.load` / `json.dump` (no string editing). Sets `version` and updates `download` URL to `…/releases/download/v<new>/whispers-foundry.zip`. Round-trip-verifies the write.
4. **Commit + push** — `chore: release v<new>` against `system.json`, pushed to `origin/main`.
5. **Build the zip** — atomically writes `dist/whispers-foundry.zip` with all entries prefixed `whispers/` (matches the system id, so manual installs unpack into `Data/systems/whispers/`).
6. **Tag + push tag** — annotated tag `v<new>`, pushed to origin.
7. **Create GitHub release** — `gh release create v<new> system.json dist/whispers-foundry.zip --notes-file <path>`.
8. **Report** — prints the new version, tag, commit hash, release URL, and asset list.

## Versioning

- Source of truth for "current version" is the **latest GitHub release tag**, not `system.json`. The script writes `system.json`, never reads it for the new version.
- Default bump is patch. Use `--major` / `--minor` to override (mutually exclusive).
- Idempotency guards: aborts if `system.json` is already at the planned version, or ahead of the latest release; aborts if the planned tag already exists locally or remotely.

## What ships in the zip

The script's `INCLUDE_PATHS` allowlist (source of truth in `release.py`):

- `system.json`
- `template.json`
- `module/` — DataModels + sheets (Foundry-side JS)
- `templates/` — Handlebars
- `styles/` — system stylesheet
- `lang/` — localization
- `character-sheet/` — bundled SPA (used by the hybrid sheet's iframe)

Excluded by virtue of not being in the list: `.git/`, `vision.md`, `RELEASE.md`, `release.py`, `dist/`, `packs/` (built artifacts; source lives in `packs-src/`), `packs-src/`, `tools/`, `node_modules/`, anything else added to the repo root.

Inside the zip every entry is prefixed `whispers/` so users get a self-contained system folder when they extract.

## Pre-flight conditions (script-enforced)

- `git rev-parse --is-inside-work-tree` is true.
- Current branch is `main`.
- `git status --porcelain` is empty.
- `git rev-list --left-right --count origin/main...HEAD` is `0\t0`.
- `gh auth status` returns 0.
- `--notes-file` exists and is non-empty.

Any failure halts the script before any destructive action.

## Recovery when something goes wrong

The script can fail at different points. The remote state after a failure depends on where:

| Failure during | Remote state | Recovery |
|---|---|---|
| Pre-flight | unchanged | Fix the precondition, re-run. |
| Determining version / updating manifest | unchanged | Re-run. |
| Commit + push (step 4) | maybe a commit pushed | If `git status` shows the commit landed, the manifest is already bumped — re-running will hit the double-bump guard. Either revert the commit (`git revert HEAD && git push`) and re-run, or finish manually using the script's printed `gh release create` fallback. |
| Build zip (step 5) | manifest pushed | Re-run is not safe (double-bump guard). Build the zip manually and use the fallback `gh release create` command. |
| Tag + push tag (step 6) | manifest pushed, tag maybe pushed | If the tag pushed, finish with the fallback `gh release create` command. |
| Create release (step 7) | manifest pushed, tag pushed | The script prints the exact `gh release create` command to run. |

## Manual fallback

If the script is broken and you need to release anyway:

```bash
# 1. Edit system.json: bump "version" and update "download" URL to .../v<new>/whispers-foundry.zip
# 2. Commit and push
git add system.json
git commit -m "chore: release v<new>"
git push origin main

# 3. Build the zip with the prefix matching the system id
git archive --format=zip --prefix=whispers/ HEAD -o /tmp/whispers-foundry.zip

# 4. Tag and push
git tag -a v<new> -m "v<new>"
git push origin v<new>

# 5. Release
gh release create v<new> system.json /tmp/whispers-foundry.zip \
  --repo Gnolfo/whispers-foundry \
  --title "v<new>" \
  --notes-file /tmp/whispers-release-notes.md
```
