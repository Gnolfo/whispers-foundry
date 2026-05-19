// ═══════════════════════════════════════════════════════════════════════
//  FOUNDRY BRIDGE  (postMessage to parent window when iframed)
// ═══════════════════════════════════════════════════════════════════════

const FoundryBridge = (() => {
  const embedded = window.parent !== window;
  console.log("[FoundryBridge] init, embedded =", embedded);
  let ctx = null;
  let parentOrigin = null;
  // Actor-backed library state, when running inside the whispers-foundry
  // module. `null` means we haven't received the initial `whispers:state` yet.
  let libraryState = null;
  const ctxListeners = new Set();
  const stateListeners = new Set();
  const stateReadyResolvers = [];
  let stateReadyPromise = embedded
    ? new Promise((resolve) => stateReadyResolvers.push(resolve))
    : Promise.resolve(null);
  const notify = (set) => set.forEach((fn) => { try { fn(); } catch (_) { /* noop */ } });
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || typeof d !== "object") return;
    if (d.type === "ias:context") {
      ctx = d; parentOrigin = e.origin;
      console.log("[FoundryBridge] context received from", e.origin, ctx);
      notify(ctxListeners);
    } else if (d.type === "whispers:state") {
      parentOrigin = e.origin;
      libraryState = d.library && typeof d.library === "object"
        ? d.library
        : { active: null, characters: {} };
      console.log("[FoundryBridge] whispers:state received, characters =",
        Object.keys(libraryState.characters || {}));
      // Resolve any pending readiness waiters, then swap the promise for a
      // resolved one so future awaits return immediately.
      if (stateReadyResolvers.length > 0) {
        const resolvers = stateReadyResolvers.splice(0);
        for (const r of resolvers) r(libraryState);
        stateReadyPromise = Promise.resolve(libraryState);
      } else {
        stateReadyPromise = Promise.resolve(libraryState);
      }
      notify(stateListeners);
    }
  });
  const send = (msg) => {
    if (!embedded) {
      console.log("[FoundryBridge] not embedded, would have sent:", msg);
      return false;
    }
    console.log("[FoundryBridge] posting to parent:", msg, "origin:", parentOrigin || "*");
    window.parent.postMessage(msg, parentOrigin || "*");
    return true;
  };
  // Ask the parent for context and actor state as soon as we're loaded (more
  // robust than relying on the parent's iframe `load` event, which may have
  // already fired).
  if (embedded) {
    try { window.parent.postMessage({ type: "ias:hello" }, "*"); } catch (e) { /* noop */ }
    try { window.parent.postMessage({ type: "whispers:hello" }, "*"); } catch (e) { /* noop */ }
  }
  return {
    isEmbedded: () => embedded,
    context: () => ctx,
    subscribe: (fn) => { ctxListeners.add(fn); return () => ctxListeners.delete(fn); },
    roll: (formula, flavor) => send({ type: "ias:roll", formula, flavor }),
    // Actor-backed library helpers — only meaningful when embedded.
    library: () => libraryState,
    hasLibrary: () => libraryState !== null,
    onLibrary: (fn) => { stateListeners.add(fn); return () => stateListeners.delete(fn); },
    awaitLibrary: () => stateReadyPromise,
    saveLibrary: (lib) => send({ type: "whispers:save", library: lib }),
  };
})();
window.FoundryBridge = FoundryBridge;

// ─── Persistence ────────────────────────────────────────────────────────
const LS_LEGACY_KEY = "whispers.character.v3";
const LS_LIBRARY_KEY = "whispers.library.v1";

// Take a raw (post-JSON-parse) character object and produce a fully-migrated
// one. Applied both to legacy v3 reads and to characters loaded from a JSON
// file via the import flow, so import and reload behave identically.
function migrateCharacter(raw) {
  const merged = { ...DEFAULT_CHARACTER, ...raw };
  if (merged.class && !(merged.class in CLASSES)) {
    const found = Object.entries(CLASSES).find(([, label]) => label === merged.class);
    if (found) merged.class = found[0];
  }
  if (Array.isArray(merged.abilities)) {
    merged.abilities = merged.abilities.map((a) => ({ rank: 1, ...a }));
  }
  delete merged.pathRanks;
  delete merged.attributes;
  delete merged.guard;
  if (!Array.isArray(merged.loadouts)) {
    merged.loadouts = [{
      fightingStyle: merged.fightingStyle ?? "Two-Handed",
      mainHand: merged.mainHand ?? "Axe",
      offHand: merged.offHand ?? NONE,
      equipped: true,
    }];
  }
  merged.loadouts = merged.loadouts.map((lo) =>
    "equipped" in lo ? lo : { ...lo, equipped: true });
  merged.loadouts = merged.loadouts.map((lo) =>
    lo.fightingStyle === "Open Handed" ? { ...lo, fightingStyle: "Free-Handed" } : lo);
  // Three static slots: pad with Free-Handed defaults, trim any extras.
  const freeSlot = () => ({ fightingStyle: "Free-Handed", mainHand: NONE, offHand: NONE, equipped: false });
  while (merged.loadouts.length < 3) merged.loadouts.push(freeSlot());
  merged.loadouts = merged.loadouts.slice(0, 3);
  // At most one equipped after the slice.
  let sawEquipped = false;
  merged.loadouts = merged.loadouts.map((lo) => {
    if (!lo.equipped) return lo;
    if (sawEquipped) return { ...lo, equipped: false };
    sawEquipped = true;
    return lo;
  });
  delete merged.fightingStyle;
  delete merged.mainHand;
  delete merged.offHand;
  if (merged.creationAttribute) {
    const attr = ATTRIBUTES.find((a) => a.name === merged.creationAttribute);
    const list = Array.isArray(merged.attribute_advancements) ? merged.attribute_advancements : [];
    const claimed = list.some((e) => e.gained === "attribute-creation");
    if (attr && !claimed) {
      merged.attribute_advancements = [...list, { gained: "attribute-creation", attribute: attr.key }];
    }
    delete merged.creationAttribute;
  }
  {
    const renames = {
      "advancement-level-1": "level-1",
      "advancement-milestone-A": "level-1-milestone-A",
      "advancement-milestone-B": "level-1-milestone-B",
      "advancement-milestone-C": "level-1-milestone-C",
      "advancement-milestone-D": "level-1-milestone-D",
    };
    const renameGained = (list) =>
      Array.isArray(list)
        ? list.map((e) => (e && renames[e.gained] ? { ...e, gained: renames[e.gained] } : e))
        : list;
    merged.abilities = renameGained(merged.abilities);
    merged.attribute_advancements = renameGained(merged.attribute_advancements);
    merged.maxhits_advancements = renameGained(merged.maxhits_advancements);
    merged.damage_bonus_advancements = renameGained(merged.damage_bonus_advancements);
    if (Array.isArray(merged.unlocked_slots)) {
      merged.unlocked_slots = merged.unlocked_slots.map((s) => renames[s] || s);
    }
  }
  if (Array.isArray(merged.abilities) && merged.abilities.length > 0) {
    const slots = knownAbilityStubs();
    const occupied = new Set();
    const valid = [];
    const orphans = [];
    for (const a of merged.abilities) {
      if (a.gained && slots.includes(a.gained) && !occupied.has(a.gained)) {
        occupied.add(a.gained);
        valid.push(a);
      } else {
        orphans.push(a);
      }
    }
    for (const a of orphans) {
      const free = slots.find((s) => !occupied.has(s));
      if (!free) {
        console.warn("Dropping orphaned ability (no free slots):", a);
        continue;
      }
      occupied.add(free);
      valid.push({ ...a, gained: free });
    }
    merged.abilities = valid;
  }
  if (Array.isArray(merged.maxhits_advancements)) {
    const known = knownMaxHitsStubs();
    merged.maxhits_advancements = merged.maxhits_advancements
      .filter((entry) => entry && known.includes(entry.gained));
  }
  if (Array.isArray(merged.attack_guard_advancements)) {
    const known = knownAttackGuardStubs();
    merged.attack_guard_advancements = merged.attack_guard_advancements
      .filter((entry) => entry && known.includes(entry.gained));
  }
  if (Array.isArray(merged.damage_bonus_advancements)) {
    const known = knownDamageBonusStubs();
    merged.damage_bonus_advancements = merged.damage_bonus_advancements
      .filter((entry) => entry && known.includes(entry.gained));
  }
  if (!Array.isArray(merged.unlocked_slots)) merged.unlocked_slots = [];
  const allLayoutSlugs = allLayoutCards().map((card) => card.slug);
  const inferred = new Set(merged.unlocked_slots);
  for (const list of [merged.abilities, merged.attribute_advancements, merged.maxhits_advancements, merged.damage_bonus_advancements]) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (entry && entry.gained && allLayoutSlugs.includes(entry.gained)) {
        inferred.add(entry.gained);
      }
    }
  }
  merged.unlocked_slots = [...inferred].filter((slug) => allLayoutSlugs.includes(slug));
  return merged;
}

// Read the library, migrating legacy v3 single-character storage on first
// access. Returns `{ active, characters }`; never throws.
//
// When the SPA is embedded in the whispers-foundry module, the actor is the
// system of record: we return the library the parent has pushed down (or an
// empty library if it hasn't arrived yet — the bootstrap awaits
// FoundryBridge.awaitLibrary() before mounting, so this fallback is only hit
// in edge cases like a manual reload of stale code).
function loadLibrary() {
  if (FoundryBridge.isEmbedded() && FoundryBridge.hasLibrary()) {
    const lib = FoundryBridge.library();
    const characters = {};
    const incoming = lib && lib.characters && typeof lib.characters === "object"
      ? lib.characters : {};
    for (const [name, ch] of Object.entries(incoming)) {
      const migrated = migrateCharacter(ch);
      characters[name] = { ...migrated, name };
    }
    const active = lib && typeof lib.active === "string" && characters[lib.active]
      ? lib.active
      : (Object.keys(characters)[0] || null);
    return { active, characters };
  }
  try {
    const raw = localStorage.getItem(LS_LIBRARY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const characters = {};
      const incoming = parsed && parsed.characters && typeof parsed.characters === "object"
        ? parsed.characters : {};
      for (const [name, ch] of Object.entries(incoming)) {
        const migrated = migrateCharacter(ch);
        // Trust the library key over a stale embedded `name` field — keeps
        // the map's invariant that characters[name].name === name.
        characters[name] = { ...migrated, name };
      }
      const active = parsed && typeof parsed.active === "string" && characters[parsed.active]
        ? parsed.active
        : (Object.keys(characters)[0] || null);
      return { active, characters };
    }
    const legacyRaw = localStorage.getItem(LS_LEGACY_KEY);
    if (legacyRaw) {
      const legacy = migrateCharacter(JSON.parse(legacyRaw));
      const name = legacy.name || "Unnamed";
      const lib = { active: name, characters: { [name]: { ...legacy, name } } };
      try {
        localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(lib));
        localStorage.removeItem(LS_LEGACY_KEY);
      } catch { /* noop */ }
      return lib;
    }
  } catch (e) {
    console.warn("loadLibrary failed; starting empty:", e);
  }
  return { active: null, characters: {} };
}

function saveLibrary(lib) {
  if (FoundryBridge.isEmbedded()) {
    FoundryBridge.saveLibrary(lib);
    return;
  }
  try { localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(lib)); } catch { /* noop */ }
}

// Upsert by name. The character's own `name` field is the canonical key.
function upsertCharacter(lib, c) {
  if (!c || typeof c.name !== "string" || !c.name.trim()) return lib;
  return {
    active: c.name,
    characters: { ...lib.characters, [c.name]: c },
  };
}

function removeCharacter(lib, name) {
  if (!(name in lib.characters)) return lib;
  const next = { ...lib.characters };
  delete next[name];
  let active = lib.active;
  if (active === name) {
    const remaining = Object.keys(next);
    active = remaining[0] || null;
  }
  return { active, characters: next };
}
