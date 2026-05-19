#!/usr/bin/env python3
"""Release tool for the whispers-foundry Foundry VTT module.

Determines the next version from the latest GitHub release, updates module.json
(version + download URL), commits and pushes, builds the asset zip from an
explicit allowlist, tags, pushes the tag, and creates the GitHub release with
the manifest and zip as assets.

The agent must supply release notes via --notes-file. Version is never taken
from agent input — only the bump kind (--major / --minor / default patch).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path

REPO_SLUG = "Gnolfo/whispers-foundry"
MAIN_BRANCH = "main"
MANIFEST_PATH = Path("system.json")
ZIP_NAME = "whispers-foundry.zip"
ZIP_PREFIX = "whispers"  # matches `system.json["id"]`, becomes Data/systems/whispers/
DIST_DIR = Path("dist")
INCLUDE_PATHS = [
    "system.json",
    "template.json",
    "module",          # Foundry-side ES modules (DataModels + sheets)
    "templates",       # Handlebars templates
    "styles",
    "lang",
    "character-sheet", # bundled SPA, loaded by the iframe in Phase 2
]
SKIP_NAMES = {"__pycache__", ".DS_Store"}
SEMVER_RE = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")


@dataclass(frozen=True)
class Version:
    major: int
    minor: int
    patch: int

    @classmethod
    def parse(cls, tag_or_version: str) -> "Version":
        s = tag_or_version.lstrip("v")
        parts = s.split(".")
        if len(parts) != 3 or not all(p.isdigit() for p in parts):
            raise ValueError(f"not a semver: {tag_or_version!r}")
        return cls(int(parts[0]), int(parts[1]), int(parts[2]))

    def bump(self, kind: str) -> "Version":
        if kind == "major":
            return Version(self.major + 1, 0, 0)
        if kind == "minor":
            return Version(self.major, self.minor + 1, 0)
        if kind == "patch":
            return Version(self.major, self.minor, self.patch + 1)
        raise ValueError(f"unknown bump kind: {kind!r}")

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"

    @property
    def tag(self) -> str:
        return f"v{self}"

    def __lt__(self, other: "Version") -> bool:
        return (self.major, self.minor, self.patch) < (other.major, other.minor, other.patch)

    def __le__(self, other: "Version") -> bool:
        return (self.major, self.minor, self.patch) <= (other.major, other.minor, other.patch)


class ReleaseError(RuntimeError):
    """Anything that should halt the release. Always carries a human message."""


# ─── Shell helpers ──────────────────────────────────────────────────────────

def run(cmd: list[str], *, capture: bool = False, check: bool = True) -> subprocess.CompletedProcess:
    """Thin wrapper around subprocess.run. Always prints what it runs."""
    print(f"  $ {' '.join(cmd)}")
    return subprocess.run(
        cmd,
        check=check,
        text=True,
        capture_output=capture,
    )


def run_capture(cmd: list[str]) -> str:
    proc = run(cmd, capture=True)
    return proc.stdout.strip()


# ─── Pre-flight ─────────────────────────────────────────────────────────────

def preflight(notes_file: Path) -> None:
    print("→ Pre-flight checks")
    if not notes_file.exists():
        raise ReleaseError(f"notes file not found: {notes_file}")
    if notes_file.stat().st_size == 0:
        raise ReleaseError(f"notes file is empty: {notes_file}")
    if run_capture(["git", "rev-parse", "--is-inside-work-tree"]) != "true":
        raise ReleaseError("not inside a git work tree")
    branch = run_capture(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    if branch != MAIN_BRANCH:
        raise ReleaseError(f"must release from {MAIN_BRANCH!r}, on {branch!r}")
    status = run_capture(["git", "status", "--porcelain"])
    if status:
        raise ReleaseError(
            "working tree is dirty; commit or stash first:\n" + status
        )
    run(["git", "fetch", "origin", "--tags"])
    ahead_behind = run_capture(
        ["git", "rev-list", "--left-right", "--count", f"origin/{MAIN_BRANCH}...HEAD"]
    )
    behind, ahead = (int(x) for x in ahead_behind.split())
    if behind != 0:
        raise ReleaseError(
            f"local {MAIN_BRANCH} is behind origin by {behind} commit(s); pull first"
        )
    if ahead != 0:
        raise ReleaseError(
            f"local {MAIN_BRANCH} is ahead of origin by {ahead} commit(s); push first"
        )
    proc = subprocess.run(["gh", "auth", "status"], capture_output=True, text=True)
    if proc.returncode != 0:
        raise ReleaseError(
            "gh CLI not authenticated; run `gh auth login` first\n" + proc.stderr
        )
    print("  ok: clean tree, on main, up to date with origin, gh authed, notes present")


# ─── Version logic ──────────────────────────────────────────────────────────

def fetch_latest_release_version() -> Version | None:
    out = run_capture([
        "gh", "release", "list",
        "--repo", REPO_SLUG,
        "--limit", "50",
        "--json", "tagName",
    ])
    items = json.loads(out) if out else []
    versions: list[Version] = []
    for item in items:
        tag = item.get("tagName", "")
        if SEMVER_RE.match(tag):
            versions.append(Version.parse(tag))
    if not versions:
        return None
    return max(versions, key=lambda v: (v.major, v.minor, v.patch))


def determine_next_version(bump_kind: str) -> tuple[Version, Version | None]:
    """Returns (new_version, previous_version_or_None)."""
    latest = fetch_latest_release_version()
    base = latest if latest is not None else Version(0, 0, 0)
    new_version = base.bump(bump_kind)
    return new_version, latest


def remote_tag_exists(tag: str) -> bool:
    out = run_capture(["git", "ls-remote", "--tags", "origin", f"refs/tags/{tag}"])
    return bool(out.strip())


def local_tag_exists(tag: str) -> bool:
    proc = subprocess.run(
        ["git", "rev-parse", "--verify", "--quiet", f"refs/tags/{tag}"],
        capture_output=True,
    )
    return proc.returncode == 0


# ─── Manifest ───────────────────────────────────────────────────────────────

def read_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text())


def write_manifest(data: dict) -> None:
    MANIFEST_PATH.write_text(json.dumps(data, indent=2) + "\n")


def update_manifest(new_version: Version) -> dict:
    data = read_manifest()
    data["version"] = str(new_version)
    data["download"] = (
        f"https://github.com/{REPO_SLUG}/releases/download/"
        f"{new_version.tag}/{ZIP_NAME}"
    )
    write_manifest(data)
    # Round-trip sanity check.
    reloaded = read_manifest()
    if reloaded["version"] != str(new_version):
        raise ReleaseError("manifest version round-trip mismatch")
    if reloaded["download"] != data["download"]:
        raise ReleaseError("manifest download round-trip mismatch")
    return reloaded


# ─── Zip building ───────────────────────────────────────────────────────────

def iter_zip_entries() -> list[Path]:
    """Return the list of files (not directories) to include, sorted."""
    files: list[Path] = []
    for entry in INCLUDE_PATHS:
        p = Path(entry)
        if not p.exists():
            raise ReleaseError(f"include path missing: {entry}")
        if p.is_file():
            files.append(p)
        else:
            for sub in p.rglob("*"):
                if sub.is_dir():
                    continue
                if any(part in SKIP_NAMES for part in sub.parts):
                    continue
                files.append(sub)
    files.sort()
    return files


def build_zip(out_path: Path) -> list[str]:
    """Build the release zip atomically. Returns the list of arcnames."""
    entries = iter_zip_entries()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        suffix=".zip", delete=False, dir=out_path.parent
    ) as tmp:
        tmp_path = Path(tmp.name)
    arcnames: list[str] = []
    try:
        with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in entries:
                arcname = f"{ZIP_PREFIX}/{f.as_posix()}"
                zf.write(f, arcname=arcname)
                arcnames.append(arcname)
        # Verify by re-reading.
        with zipfile.ZipFile(tmp_path, "r") as zf:
            names = zf.namelist()
            if names != arcnames:
                raise ReleaseError("zip verify: arcname list mismatch")
        os.replace(tmp_path, out_path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise
    return arcnames


# ─── Git / GH actions ───────────────────────────────────────────────────────

def commit_and_push_manifest(new_tag: str) -> str:
    run(["git", "add", str(MANIFEST_PATH)])
    run(["git", "commit", "-m", f"chore: release {new_tag}"])
    run(["git", "push", "origin", MAIN_BRANCH])
    return run_capture(["git", "rev-parse", "HEAD"])


def tag_and_push(new_tag: str) -> None:
    run(["git", "tag", "-a", new_tag, "-m", new_tag])
    run(["git", "push", "origin", new_tag])


def create_github_release(new_tag: str, notes_file: Path, zip_path: Path) -> str:
    proc = run(
        [
            "gh", "release", "create", new_tag,
            str(MANIFEST_PATH),
            str(zip_path),
            "--repo", REPO_SLUG,
            "--title", new_tag,
            "--notes-file", str(notes_file),
        ],
        capture=True,
    )
    url = proc.stdout.strip().splitlines()[-1] if proc.stdout else ""
    return url


# ─── Main ──────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--notes-file", required=True, type=Path,
                   help="Path to a markdown file containing release notes.")
    bump = p.add_mutually_exclusive_group()
    bump.add_argument("--major", action="store_true", help="Bump the major version.")
    bump.add_argument("--minor", action="store_true", help="Bump the minor version.")
    p.add_argument("--dry-run", action="store_true",
                   help="Print actions but do not modify the repo, push, tag, or release.")
    return p.parse_args()


def bump_kind(args: argparse.Namespace) -> str:
    if args.major:
        return "major"
    if args.minor:
        return "minor"
    return "patch"


def main() -> int:
    args = parse_args()

    # Always run relative to the script's directory so commands behave the same
    # whether invoked from /workspace or from the project root.
    script_dir = Path(__file__).resolve().parent
    os.chdir(script_dir)

    try:
        preflight(args.notes_file)

        print("→ Determining next version")
        kind = bump_kind(args)
        new_version, latest = determine_next_version(kind)
        manifest_version = Version.parse(read_manifest()["version"])
        print(f"  latest release: {latest.tag if latest else '(none)'}")
        print(f"  manifest currently: v{manifest_version}")
        print(f"  bump kind: {kind}")
        print(f"  next version: {new_version.tag}")

        if latest is not None and not (manifest_version <= latest):
            raise ReleaseError(
                f"module.json version (v{manifest_version}) is already ahead of the "
                f"latest release ({latest.tag}); looks like a release was already "
                "prepared. Revert the manifest bump or finish the release manually."
            )
        if manifest_version == new_version:
            raise ReleaseError(
                f"module.json already at {new_version.tag}; refusing to double-bump."
            )
        if local_tag_exists(new_version.tag):
            raise ReleaseError(f"local tag {new_version.tag} already exists")
        if remote_tag_exists(new_version.tag):
            raise ReleaseError(f"remote tag {new_version.tag} already exists")

        if args.dry_run:
            print("→ Dry run: planning only, no changes will be made")

        print("→ Updating module.json")
        if args.dry_run:
            preview = read_manifest()
            preview["version"] = str(new_version)
            preview["download"] = (
                f"https://github.com/{REPO_SLUG}/releases/download/"
                f"{new_version.tag}/{ZIP_NAME}"
            )
            print(f"  would set version → {preview['version']}")
            print(f"  would set download → {preview['download']}")
        else:
            updated = update_manifest(new_version)
            print(f"  version → {updated['version']}")
            print(f"  download → {updated['download']}")

        commit_hash = "(dry-run)"
        if not args.dry_run:
            print("→ Committing and pushing manifest")
            commit_hash = commit_and_push_manifest(new_version.tag)

        print("→ Building release zip")
        zip_path = DIST_DIR / ZIP_NAME
        if args.dry_run:
            entries = iter_zip_entries()
            print(f"  would include {len(entries)} files under {ZIP_PREFIX}/")
            for f in entries[:5]:
                print(f"    {ZIP_PREFIX}/{f.as_posix()}")
            if len(entries) > 5:
                print(f"    … and {len(entries) - 5} more")
        else:
            arcnames = build_zip(zip_path)
            print(f"  wrote {zip_path} ({len(arcnames)} entries)")
            for name in arcnames[:5]:
                print(f"    {name}")
            if len(arcnames) > 5:
                print(f"    … and {len(arcnames) - 5} more")

        release_url = "(dry-run)"
        if not args.dry_run:
            print("→ Tagging and pushing tag")
            tag_and_push(new_version.tag)

            print("→ Creating GitHub release")
            try:
                release_url = create_github_release(
                    new_version.tag, args.notes_file, zip_path,
                )
            except subprocess.CalledProcessError as exc:
                raise ReleaseError(
                    "gh release create failed. The commit and tag are already pushed.\n"
                    "Finish the release manually with:\n"
                    f"  gh release create {new_version.tag} \\\n"
                    f"    {MANIFEST_PATH} {zip_path} \\\n"
                    f"    --repo {REPO_SLUG} --title {new_version.tag} \\\n"
                    f"    --notes-file {args.notes_file}\n"
                    f"Underlying error: {exc}"
                ) from exc

        print()
        print("─────────────────────────────────────────────")
        if args.dry_run:
            print("DRY RUN COMPLETE — no changes made")
        else:
            print("RELEASE COMPLETE")
        print(f"  project: whispers-foundry")
        print(f"  version: {new_version}")
        print(f"  tag:     {new_version.tag}")
        print(f"  commit:  {commit_hash}")
        print(f"  release: {release_url}")
        print(f"  assets:  {MANIFEST_PATH}, {zip_path}")
        print("─────────────────────────────────────────────")
        return 0

    except ReleaseError as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as e:
        print(f"\nERROR: command failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
