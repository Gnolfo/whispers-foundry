// Whispers in the Roots — Foundry VTT system entry point
//
// Registers DataModels and sheets at `init`. Other hooks (setup, ready) are
// reserved for Phase 2+ work (sheet bridge wiring, derived UI state).

import { CharacterData } from "./data/character.mjs";
import { NpcData } from "./data/npc.mjs";
import { PathData } from "./data/path.mjs";
import { WeaponData } from "./data/weapon.mjs";
import { ArmorData } from "./data/armor.mjs";

import { CharacterSheet } from "./sheets/character-sheet.mjs";
import { NpcSheet } from "./sheets/npc-sheet.mjs";
import { PathSheet } from "./sheets/path-sheet.mjs";
import { WeaponSheet } from "./sheets/weapon-sheet.mjs";
import { ArmorSheet } from "./sheets/armor-sheet.mjs";

const SYSTEM_ID = "whispers";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | init`);

  // ─── DataModels ────────────────────────────────────────────────────────
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.npc = NpcData;
  CONFIG.Item.dataModels.path = PathData;
  CONFIG.Item.dataModels.weapon = WeaponData;
  CONFIG.Item.dataModels.armor = ArmorData;

  // ─── Sheets ────────────────────────────────────────────────────────────
  const { Actors, Items } = foundry.documents.collections;
  const { ActorSheet, ItemSheet } = foundry.appv1?.sheets ?? {};

  // Unregister Foundry's default sheets, then register ours per-type.
  Actors.unregisterSheet?.("core", ActorSheet);
  Items.unregisterSheet?.("core", ItemSheet);

  foundry.documents.collections.Actors.registerSheet(SYSTEM_ID, CharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "WHISPERS.Actor.character",
  });
  foundry.documents.collections.Actors.registerSheet(SYSTEM_ID, NpcSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "WHISPERS.Actor.npc",
  });
  foundry.documents.collections.Items.registerSheet(SYSTEM_ID, PathSheet, {
    types: ["path"],
    makeDefault: true,
    label: "WHISPERS.Item.path",
  });
  foundry.documents.collections.Items.registerSheet(SYSTEM_ID, WeaponSheet, {
    types: ["weapon"],
    makeDefault: true,
    label: "WHISPERS.Item.weapon",
  });
  foundry.documents.collections.Items.registerSheet(SYSTEM_ID, ArmorSheet, {
    types: ["armor"],
    makeDefault: true,
    label: "WHISPERS.Item.armor",
  });

  console.log(`${SYSTEM_ID} | registered`);
});

Hooks.once("ready", () => {
  console.log(`${SYSTEM_ID} | ready`);
});
