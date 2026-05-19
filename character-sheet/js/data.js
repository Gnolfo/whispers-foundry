const { useState, useRef, useEffect, useLayoutEffect, useContext, createContext } = React;

// ═══════════════════════════════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════════════════════════════

const ANCESTRY_ATTR_ZERO = { focus: 0, guile: 0, intensity: 0, precision: 0, resolve: 0 };
const ANCESTRIES = {
  "Clayder": {
    base_hits: 2, base_guard: 15, w1: 2, w2: 3, w3: 2, w4: 2, w5: 2, wound_die: 8,
    short_move: 4, medium_move: 5, long_move: 3,
    stagger: 0, dread: 0, surprise: 0, anguish: 0, disruption: 1,
    attributes: { ...ANCESTRY_ATTR_ZERO },
  },
  "Dwarf": {
    base_hits: 2, base_guard: 14, w1: 2, w2: 2, w3: 3, w4: 2, w5: 2, wound_die: 10,
    short_move: 5, medium_move: 4, long_move: 3,
    stagger: 0, dread: 0, surprise: 0, anguish: 1, disruption: 0,
    attributes: { ...ANCESTRY_ATTR_ZERO },
  },
  "Goblin": {
    base_hits: 2, base_guard: 13, w1: 2, w2: 2, w3: 3, w4: 2, w5: 2, wound_die: 6,
    short_move: 5, medium_move: 4, long_move: 3,
    stagger: 0, dread: 1, surprise: 1, anguish: 0, disruption: 0,
    attributes: { ...ANCESTRY_ATTR_ZERO },
  },
  "Human": {
    base_hits: 3, base_guard: 12, w1: 2, w2: 3, w3: 2, w4: 2, w5: 3, wound_die: 10,
    short_move: 4, medium_move: 3, long_move: 3,
    stagger: 0, dread: 1, surprise: 0, anguish: 0, disruption: 0,
    attributes: { ...ANCESTRY_ATTR_ZERO },
  },
  "Troll": {
    base_hits: 3, base_guard: 11, w1: 3, w2: 2, w3: 2, w4: 3, w5: 2, wound_die: 12,
    short_move: 4, medium_move: 2, long_move: 2,
    stagger: 1, dread: 0, surprise: 0, anguish: 0, disruption: 0,
    attributes: { ...ANCESTRY_ATTR_ZERO },
  },
};
const CLASSES = { warrior: "Warrior", rogue: "Rogue", warden: "Warden", champion: "Champion" };

const ATTRIBUTES = [
  { key: "focus", name: "Focus", short: "FO", desc: "Clarity, perception" },
  { key: "guile", name: "Guile", short: "GU", desc: "Cunning, deception, finesse of speech" },
  { key: "intensity", name: "Intensity", short: "IN", desc: "Raw force, ferocity, drive" },
  { key: "precision", name: "Precision", short: "PR", desc: "Accuracy, careful work" },
  { key: "resolve", name: "Resolve", short: "RE", desc: "Willpower, conviction" },
];

const PROF_TIERS = [
  { rank: 0, label: "Untrained", bonus: 0 },
  { rank: 1, label: "Trained", bonus: 2 },
  { rank: 2, label: "Expert", bonus: 4 },
  { rank: 3, label: "Master", bonus: 6 },
];

const SKILLS = [
  { key: "acrobatics", name: "Acrobatics", attr: "precision" },
  { key: "arcana", name: "Arcana", attr: "focus" },
  { key: "athletics", name: "Athletics", attr: "intensity" },
  { key: "craft", name: "Craft", attr: "precision" },
  { key: "deception", name: "Deception", attr: "guile" },
  { key: "diplomacy", name: "Diplomacy", attr: "guile" },
  { key: "history", name: "History", attr: "focus" },
  { key: "insight", name: "Insight", attr: "focus" },
  { key: "intimidate", name: "Intimidation", attr: "intensity" },
  { key: "medicine", name: "Medicine", attr: "precision" },
  { key: "nature", name: "Nature", attr: "focus" },
  { key: "perception", name: "Perception", attr: "focus" },
  { key: "performance", name: "Performance", attr: "guile" },
  { key: "religion", name: "Religion", attr: "resolve" },
  { key: "society", name: "Society", attr: "focus" },
  { key: "stealth", name: "Stealth", attr: "guile" },
  { key: "survival", name: "Survival", attr: "resolve" },
  { key: "thievery", name: "Thievery", attr: "precision" },
];

const DIE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20"];

let PATHS = []; // populated by fetch('paths.json') in app.js

const HAZARD_FORMULAS = {
  stagger: { attrs: ["intensity", "precision"] },
  dread: { attrs: ["intensity", "guile"] },
  surprise: { attrs: ["guile", "resolve"] },
  anguish: { attrs: ["resolve", "focus"] },
  disruption: { attrs: ["focus", "precision"] },
};

const FIGHTING_STYLES = ["Dual-Wield", "One-Handed", "Free-Handed", "Ranged", "Shield", "Two-Handed"];

// ─── Fighting-style effect catalog ─────────────────────────────────────
// Edit this with source-of-truth data. Each entry has a summary and a
// list of effects; each effect is { kind: "stat" | "ability" | "rule",
// label?, name?, desc }. Rendered by EffectsPopup in ui.js.
const FIGHTING_STYLE_DETAILS = {
  "Two-Handed": {
    summary: "Wield a single heavy weapon in both hands for crushing force.",
    effects: [
      { kind: "stat", label: "Damage +1", desc: "Your weapon's heft adds bonus damage on every hit." },
      { kind: "grants", name: "Assess", type: "action", stamina: 2, desc: "Reset your Hits, clear one Guard Break. You gain an important insight for this fight (provided by the GM). Add advantage to your stamina roll." },
      { kind: "rule", desc: "You cannot wield a shield or off-hand weapon." },
    ],
  },
  "One-Handed": {
    summary: "Balanced approach — one weapon, free off hand.",
    effects: [
      { kind: "stat", label: "Attack +1", desc: "Familiar grip rewards precision." },
      { kind: "rule", desc: "Off hand is free for tools, gestures, or grappling." },
    ],
  },
  "Dual-Wield": {
    summary: "Two one-handed weapons for relentless pressure.",
    effects: [
      { kind: "ability", name: "Twin Strike", desc: "On a hit with your main hand, add 1d4 damage from your off-hand weapon." },
      { kind: "rule", desc: "Both hands must hold one-handed weapons." },
    ],
  },
  "Ranged": {
    summary: "A bow at full draw — distance as your weapon.",
    effects: [
      { kind: "rule", desc: "Strike attacks use Precision (PR), not Intensity (IN)." },
      { kind: "stat", label: "Reach 60 ft.", desc: "Short/medium range. Long range imposes disadvantage." },
      { kind: "rule", desc: "Disadvantage on Strike rolls against enemies within 5 ft." },
    ],
  },
  "Shield": {
    summary: "One weapon paired with a shield for defense.",
    effects: [
      { kind: "stat", label: "Guard +2", desc: "Shield raises your Guard against incoming Strikes." },
      { kind: "ability", name: "Block", desc: "Reaction: when hit, reduce damage by your shield die (d4)." },
    ],
  },
  "Free-Handed": {
    summary: "No weapon — hands and footwork are your tools.",
    effects: [
      { kind: "stat", label: "Parry +1", desc: "Empty hands make for fluid defense." },
      { kind: "ability", name: "Unarmed Strike", desc: "Deal 1d4 + Intensity damage with strikes, kicks, or grapples." },
    ],
  },
};

// ─── Weapon catalog ────────────────────────────────────────────────────
// Keyed by weapon name (which currently doubles as weapon type — when
// per-instance weapons are introduced, add a separate WEAPON_TYPE_DETAILS
// keyed by category and resolve types from the weapon entry).
const WEAPON_DETAILS = {
  "Axe": {
    summary: "A bearded blade on a stout haft.",
    effects: [
      { kind: "stat", label: "1d8 slashing", desc: "Base damage die." },
      { kind: "ability", name: "Hew", desc: "On a crit, the target bleeds for 1d4 at the start of their next turn." },
    ],
  },
  "Mace": {
    summary: "A heavy head built for crushing.",
    effects: [
      { kind: "stat", label: "1d8 bludgeoning", desc: "Base damage die." },
      { kind: "ability", name: "Stun", desc: "On a crit, the target is dazed (disadvantage on its next Strike)." },
    ],
  },
  "Sword": {
    summary: "Straight, double-edged, versatile.",
    effects: [
      { kind: "stat", label: "1d8 slashing or piercing", desc: "Choose damage type at swing time." },
      { kind: "rule", desc: "Counts as a finesse weapon when wielded One-Handed." },
    ],
  },
  "Dagger": {
    summary: "A short, balanced blade for close work.",
    effects: [
      { kind: "stat", label: "1d4 piercing", desc: "Base damage die." },
      { kind: "rule", desc: "Finesse: you may attack with Guile (GU) instead of Intensity (IN)." },
      { kind: "ability", name: "Backstab", desc: "With advantage, add +1d6 damage on the first hit each round." },
    ],
  },
  "Bow": {
    summary: "A drawn string and a steady eye.",
    effects: [
      { kind: "stat", label: "1d8 piercing", desc: "Base damage die." },
      { kind: "stat", label: "Range 60 ft.", desc: "Beyond range, attacks have disadvantage." },
      { kind: "rule", desc: "Requires two hands to fire." },
    ],
  },
  "Shield": {
    summary: "Wood and steel between you and harm.",
    effects: [
      { kind: "stat", label: "Guard +2", desc: "Granted by the Shield fighting style." },
      { kind: "ability", name: "Shield Bash", desc: "Attack with the shield as a one-handed weapon: 1d4 bludgeoning." },
    ],
  },
  "Hand": {
    summary: "An empty hand — held ready for strike, grapple, or guard.",
    effects: [
      { kind: "stat", label: "1d4 bludgeoning", desc: "Unarmed strike damage." },
      { kind: "ability", name: "Grapple", desc: "Instead of damage, attempt to immobilize a target of your size or smaller (contested check)." },
      { kind: "rule", desc: "A free hand can hold tools, gesture spells, or catch thrown items." },
    ],
  },
};

// Patch builder for a fighting-style change — re-validates main/off hand
// selections against the new style's option lists. Used by both the
// Equipment Loadout block and the Offense edit popup so the cascade stays
// consistent across surfaces.
function fightingStylePatch(lo, newStyle) {
  const m = mainHandOptionsFor(newStyle);
  const o = offHandOptionsFor(newStyle);
  return {
    fightingStyle: newStyle,
    mainHand: m.disabled ? NONE : (m.options.includes(lo.mainHand) ? lo.mainHand : m.options[0]),
    offHand: o.disabled ? (o.fixed || NONE) : (o.options.includes(lo.offHand) ? lo.offHand : o.options[0]),
  };
}
const CORE_ARMOR = {
  "None": { max_hits: 0, w1: 0, w2: 0, w3: 0, w4: 0, w5: 0 },
  "Leather": { max_hits: 0, w1: 1, w2: 0, w3: 1, w4: 1, w5: 0 },
  "Mail": { max_hits: 1, w1: 1, w2: 1, w3: 0, w4: 1, w5: 0 },
  "Breastplate": { max_hits: 1, w1: 2, w2: 0, w3: 1, w4: 0, w5: 0 },
  "Full Plate": { max_hits: 2, w1: 2, w2: 1, w3: 0, w4: 1, w5: 0 },
};
const NONE = "—";

function mainHandOptionsFor(style) {
  switch (style) {
    case "Dual-Wield": return { options: ["Axe", "Mace", "Sword", "Dagger"], disabled: false };
    case "One-Handed": return { options: ["Axe", "Mace", "Sword", "Dagger"], disabled: false };
    case "Free-Handed": return { options: [NONE], disabled: true, placeholder: "unarmed" };
    case "Ranged": return { options: ["Bow"], disabled: false };
    case "Shield": return { options: ["Axe", "Mace", "Sword"], disabled: false };
    case "Two-Handed": return { options: ["Axe", "Mace", "Sword"], disabled: false };
    default: return { options: [NONE], disabled: true };
  }
}
function offHandOptionsFor(style) {
  switch (style) {
    case "Dual-Wield": return { options: ["Axe", "Mace", "Sword", "Dagger"], disabled: false };
    case "One-Handed": return { options: [NONE], disabled: true };
    case "Free-Handed": return { options: [NONE], disabled: true };
    case "Ranged": return { options: [NONE], disabled: true };
    case "Shield": return { options: ["Shield"], disabled: true, fixed: "Shield" };
    case "Two-Handed": return { options: [NONE], disabled: true };
    default: return { options: [NONE], disabled: true };
  }
}

const CONDITIONS = [
  { key: "bleeding", name: "Bleeding", desc: "Lose 1d4 vitality at the start of each turn." },
  { key: "blinded", name: "Blinded", desc: "Cannot see. Disadvantage on sight-based checks." },
  { key: "burning", name: "Burning", desc: "Take 1d6 fire damage at end of turn." },
  { key: "dazed", name: "Dazed", desc: "One fewer action this turn." },
  { key: "exposed", name: "Exposed", desc: "Attackers gain +2 against you." },
  { key: "frightened", name: "Frightened", desc: "Disadvantage while source of fear is in sight." },
  { key: "grappled", name: "Grappled", desc: "Movement becomes 0. Cannot benefit from speed bonuses." },
  { key: "hidden", name: "Hidden", desc: "Attackers must guess your square." },
  { key: "prone", name: "Prone", desc: "Crawl only. Disadvantage on melee attacks." },
  { key: "stunned", name: "Stunned", desc: "Skip turn. Automatic critical against you." },
];

const DEFAULT_CHARACTER = {
  name: "Vera Ashwell",
  pronouns: "she/her",
  ancestry: "Human",
  background: "Wayfinder",
  class: "warrior",
  subclass: "Stormbound",
  level: 4,
  xp: 1420,
  xpNext: 2500,
  deity: "—",
  alignment: "Resolute",

  profBonus: 2,

  attribute_advancements: [
    { gained: "attribute-creation", attribute: "intensity" },
  ],

  maxhits_advancements: [],

  damage_bonus_advancements: [],

  equipment_hit_reduction: 0,
  hit_reduction_advancements: [],

  equipment_parry: 0,
  parry_advancements: [],

  unlocked_slots: [],

  paths: [],

  abilities: [],

  considered_paths: [],

  committed: { ancestry: true, class: true },

  base_attack: 0,

  attack_guard_advancements: [],

  initiative: 0,

  skillRanks: {
    athletics: 2, perception: 2, survival: 2, nature: 1,
    intimidate: 1, acrobatics: 1, insight: 1, medicine: 1,
  },

  hazards: [
    { key: "stagger", name: "Stagger", offense: "d8" },
    { key: "dread", name: "Dread", offense: "d8" },
    { key: "surprise", name: "Surprise", offense: "d8" },
    { key: "anguish", name: "Anguish", offense: "d8" },
    { key: "disruption", name: "Disruption", offense: "d8" },
  ],
  hazard_ranks: { stagger: 0, dread: 0, surprise: 0, anguish: 0, disruption: 0 },

  loadouts: [
    { fightingStyle: "Free-Handed", mainHand: NONE, offHand: NONE, equipped: true },
    { fightingStyle: "Free-Handed", mainHand: NONE, offHand: NONE, equipped: false },
    { fightingStyle: "Free-Handed", mainHand: NONE, offHand: NONE, equipped: false },
  ],
  coreArmor: "None",

  powers: [
    { name: "Thunder Strike", cost: "1 focus", range: "5 ft.", tag: "action", desc: "Melee attack. On hit, target is pushed 5 ft. and deafened until end of next turn." },
    { name: "Storm Stride", cost: "1 focus", range: "30 ft.", tag: "move", desc: "Move up to your Short distance. You don't provoke for this movement." },
    { name: "Rally the Line", cost: "2 focus", range: "Aura", tag: "action", desc: "Allies within 10 ft. gain temporary vitality equal to your level." },
    { name: "Stand Firm", cost: "reaction", range: "Self", tag: "reaction", desc: "When you would be moved against your will, reduce the distance by 10 ft." },
  ],

  inventory: [
    { name: "Stormbound Greataxe", qty: 1, wt: 7, bag: "Worn" },
    { name: "Hand Axe", qty: 2, wt: 2, bag: "Belt" },
    { name: "Wayfinder's Brigandine", qty: 1, wt: 20, bag: "Worn" },
    { name: "Traveler's Pack", qty: 1, wt: 5, bag: "Pack" },
    { name: "Rations (day)", qty: 6, wt: 1, bag: "Pack" },
    { name: "Waterskin", qty: 1, wt: 2, bag: "Belt" },
    { name: "Rope, silk (50 ft.)", qty: 1, wt: 3, bag: "Pack" },
    { name: "Tinderbox", qty: 1, wt: 1, bag: "Pack" },
    { name: "Healer's kit", qty: 1, wt: 3, bag: "Pack", note: "3 charges" },
    { name: "Bedroll", qty: 1, wt: 4, bag: "Pack" },
    { name: "Lantern, hooded", qty: 1, wt: 2, bag: "Belt" },
    { name: "Oil flask", qty: 3, wt: 1, bag: "Pack" },
    { name: "Signet ring of Ashwell", qty: 1, wt: 0, bag: "Worn", note: "Heirloom" },
    { name: "Coin (gp)", qty: 84, wt: 0, bag: "Purse" },
  ],

  features: [
    { name: "Adaptable", src: "Human", desc: "Once per scene, treat any single skill as Trained for one task." },
    { name: "Wayfinder", src: "Background", desc: "You are never lost while you can see the sky. Survival is trained." },
    { name: "Vanguard's Charge", src: "Warrior L1", desc: "When you move and Strike in the same turn, your strike deals +1d6 damage." },
    { name: "Stormbound Oath", src: "Warrior L3", desc: "Thunder Strike costs no focus once per encounter. Your weapons count as silver and magical." },
    { name: "Quick Recovery", src: "Warrior L4", desc: "Spend a recovery during a short rest to roll your wound die + Resolve to regain vitality." },
  ],

  notes: "Searching for the lost shrine of Mirelhand. Owe a favor to Captain Brennick of the Tinhorn Guard. Allergic to silver dust.",
};

const PLACEHOLDER_NAMES = [
  "Camillo Placeholder III",
  "John MainCharacter",
  "Unnamed Protagonist",
  "FIRSTNAME LASTNAME",
  "TBD McToBeDetermined",
  "Name Pending",
  "Player One",
  "Your Name Here",
];

const BLANK_CHARACTER = {
  ...DEFAULT_CHARACTER,
  name: PLACEHOLDER_NAMES[Math.floor(Math.random() * PLACEHOLDER_NAMES.length)],
  pronouns: "",
  ancestry: null,
  class: null,
  level: 1,
  xp: 0,
  xpNext: 0,
  committed: {},
  attribute_advancements: [],
  maxhits_advancements: [],
  damage_bonus_advancements: [],
  hit_reduction_advancements: [],
  parry_advancements: [],
  attack_guard_advancements: [],
  abilities: [],
  paths: [],
  considered_paths: [],
  unlocked_slots: [],
  skillRanks: {},
  powers: [],
  inventory: [],
  features: [],
  notes: "",
};

const HAZARD_STYLE = "spine";
const DENSE_SKILLS = false;
const SHOW_REFS = true;

// Short explanations of each derived/mechanic label, surfaced by clicking
// the label of any derived element. Keys match the `label` prop passed to
// the rendering component (DerivedStatBlock, MaxHitsBlock, etc.) so adding
// a new derived stat means adding one entry here.
const STAT_EXPLANATIONS = {
  // Attribute group + individuals
  "Attributes": "The five core attributes — Focus, Guile, Intensity, Precision, and Resolve. Each is your ancestry baseline plus any attribute advancements you've taken. They feed skill bonuses, hazard defenses, and several derived stats.",
  "Focus": "Mental sharpness, perception, and clarity of will. Contributes to Anguish defense and perception-leaning skill checks.",
  "Guile": "Cunning, agility, and quick thinking. Drives initiative and contributes to Surprise defense.",
  "Intensity": "Physical force and aggression. Adds to melee damage and sets your carry capacity; contributes to Stagger defense.",
  "Precision": "Fine motor control and accuracy. Drives ranged attacks and precision-leaning skill checks; contributes to Disruption defense.",
  "Resolve": "Endurance and willpower. Contributes to Max Hits and Dread defense.",

  // Top-level derived stats
  "Initiative": "Order-of-action bonus when a fight begins. Guile + your Base Initiative + any equipment contribution.",
  "Guard": "The DC an attacker must beat to land a hit on you. Ancestry baseline plus any Attack/Guard advancement picks that favored Guard.",
  "Max Hits": "How many hits you can take before falling. Ancestry base hits + Resolve + Max Hits advancements.",
  "Parry": "Reduces incoming attack rolls. Equipment baseline plus any Parry advancements written by external systems.",
  "Hit Reduction": "Subtracts from each successful hit's damage. Equipment baseline plus any Hit Reduction advancements.",
  "Attack": "Bonus added to your attack rolls. Your base attack plus the Attack-favored side of Attack/Guard advancements.",
  "Damage": "Bonus added to damage on a successful hit. Intensity plus any Damage Bonus advancements.",

  // Wounds
  "Wound Limits": "The cumulative hit totals at which you cross to the next wound severity. Each threshold stacks on the previous; ancestry and equipment add to each step.",
  "Wound Die": "The die you roll when you take a wound. Set by your class.",

  // Movement
  "Movement": "Distances you can travel on your turn, in squares. Short is your default move; Medium and Long stretch further but cost more.",
  "Short": "Your default move distance — the standard one-action move in squares.",
  "Med": "A medium move — costs more than a Short move and trades action economy for reach.",
  "Long": "A long move — the most reach, with the steepest action cost.",

  // Hazards
  "Hazards": "Five hazard categories — Stagger, Dread, Surprise, Anguish, Disruption. Each has an offense die you roll when attacking with it, and a derived defense DC opponents target to land it on you.",
  "Stagger": "Physical impact and shock. Defense is Intensity + Resolve + rank + ancestry.",
  "Dread": "Fear and existential pressure. Defense is Resolve + Focus + rank + ancestry.",
  "Surprise": "Reactive shock. Defense is Guile + Focus + rank + ancestry.",
  "Anguish": "Pain and suffering. Defense is Focus + Resolve + rank + ancestry.",
  "Disruption": "Loss of footing or action economy. Defense is Precision + Guile + rank + ancestry.",
};
