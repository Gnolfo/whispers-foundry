# whispers-foundry

## Vision

A Foundry VTT module that bundles the Whispers character sheet SPA (from `src/whispers/character-sheet/`) and persists each character's state on its Foundry actor instead of in browser localStorage.

## Problem / Motivation

The Whispers character sheet currently runs as a standalone SPA and stores each character in the browser's localStorage under `whispers.library.v1`. That means:

- A character is trapped on whichever browser/device first created it — switching laptops loses it.
- The GM cannot see a player's sheet from their own client; localStorage is private to each browser.
- Clearing site data wipes the character; world backups don't include it.
- The existing generic `iframe-actor-sheet` module (`dev/iframe-actor-sheet/`) hangs the SPA in an iframe on a Foundry actor, but does nothing to share state — the actor is just a peg.

By making the Foundry actor the system of record, character data becomes multi-device, GM-visible, included in world exports/backups, and survives browser resets. This is the foundational unlock that makes every richer Foundry integration cheap to build later.

## Target Users

Foundry VTT users running *Whispers in the Roots* — both players (rendering and editing their own sheet) and GMs (viewing and editing any player's sheet from their own client).

## Key Concepts

**In scope for v1 — this project's actual goal:**

- Module packaging: bundle the entire `src/whispers/character-sheet/` SPA as Foundry module assets so the iframe loads from `modules/whispers-foundry/character.html` — no external hosting, air-gap-friendly install.
- Actor-backed persistence: character state lives on `actor.system.whispers`. The SPA's `loadLibrary`/`saveLibrary`/`upsertCharacter`/`removeCharacter` are replaced (when embedded) with `actor.update()` calls over the message bridge.
- Two-way sync at the storage layer: when the actor is updated from outside the iframe (another client, a GM macro, the Foundry actor directory), the module pushes the new state in and the SPA re-renders.
- Backward compatible standalone mode: when the SPA is opened outside Foundry, the localStorage library still works exactly as today. Only the embedded path changes.
- Per-actor routing: actor A's iframe shows character A; actor B's shows B. Resolved via the actor binding rather than localStorage.

**Out of scope for v1 — captured here so we don't lose them:**

These are the larger Foundry integrations a Whispers-specific module unlocks once persistence has moved to the actor. They are *not* part of this project's first milestone but should shape its architecture so they remain cheap to add later.

- **Bidirectional state sync beyond storage** — a structured patch protocol (`whispers:patch` style) so non-storage actor mutations (status effects, drag-dropped items, GM edits) flow into the SPA, and SPA edits validate before persisting.
- **Rules-aware rolls** — replace opaque `ias:roll` formulas with intent-shaped messages (`{type: "attack", targets, adv, bonus}`) that compute hit/miss vs. target Guard, attach "Apply damage" buttons that respect hit reduction and wound thresholds, and support GM-initiated saves pushed *to* players ("everyone roll a Disruption save"), blind/private rolls, group rolls, and resource consumption side-effects.
- **Combat & canvas integration** — feed Whispers initiative into Foundry's combat tracker; mirror SPA `conditions` to Foundry active effects so they appear on tokens and tick down with rounds; map Hits to the token HP bar; read targeting and adjacency from the canvas for attack setup.
- **Game data as a compendium** — ship `paths.json` content as a Foundry compendium pack of Path / Ability / Item documents so GMs can homebrew, players can drag-drop, and the SPA stops depending on its hosting origin for game data.
- **Real identity and permissions** — enforce `isOwner` / `isGM` for editability; observers get read-only views; GM can lock player sheets during specific phases.
- **Packaged distribution** — install via Foundry's package manager / manifest URL; module version pins SPA + data schema together; `migrateWorld` becomes the place schema migrations run, under GM control.

## Software Type

Foundry VTT module — a packaged extension installed into a Foundry world, providing both server-side (`module.json` + scripts that run in Foundry's client) and bundled iframe assets (the existing Whispers SPA). Functionally a hybrid of a Foundry plugin and a static-asset bundle.

## Tech Stack

- **Foundry VTT module conventions** — `module.json` manifest, Foundry hooks (`init`, `ready`, `updateActor`, `renderActorSheet`), `ApplicationV2` (or `FormApplication` v1 shim) for the host sheet, Handlebars (`.hbs`) for any module-side templates.
- **Vanilla JS** for the Foundry-side scripts (no build step, no bundler — matches the existing `iframe-actor-sheet` module's style).
- **Iframe payload** is the existing SPA stack as-is: React 18 + Babel Standalone, no bundler, globals on `window`. Bundling = copying the directory into `modules/whispers-foundry/character-sheet/`.
- **`postMessage` protocol** extending the existing `ias:` prefix (`ias:context`, `ias:roll`) with new Whispers-specific message types for actor-state sync.
- Reuse the existing generic `iframe-actor-sheet` (`dev/iframe-actor-sheet/`) as a reference implementation; this module replaces that integration for Whispers with deeper hooks.
