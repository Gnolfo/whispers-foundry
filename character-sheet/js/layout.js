// ═══════════════════════════════════════════════════════════════════════
//  LAYOUT — advancement structure and card slot helpers
// ═══════════════════════════════════════════════════════════════════════

const LEVEL_MILESTONES = [
  {
    level: [
      { slug: "ancestry-creation", type: "ancestry" },
      { slug: "attribute-creation", type: "attribute" },
      { slug: "class-creation", type: "class" },
      { slug: "ability-creation", type: "ability" },
      { slug: "maxhits-test", type: "maxhits", amount: 2 },
    ],
    milestones: [],
  },
  {
    level: [{ type: "ability" }],
    milestones: [
      { type: "perk" },
      { type: "maxhits" },
      { type: "hdef" },
      { type: "ability" }
    ]
  },
  {
    level: [{ type: "attack-guard" }],
    milestones: [
      { type: "perk" },
      { type: "maxhits" },
      { type: "attribute" },
      { type: "ability" }
    ]
  },
  {
    level: [{ type: "ability" }],
    milestones: [
      { type: "perk" },
      { type: "maxhits" },
      { type: "hdef" },
      { type: "ability" }
    ]
  },
  {
    level: [{ type: "ability" }],
    milestones: [
      { type: "perk" },
      { type: "maxhits" },
      { type: "attribute" },
      { type: "ability" }
    ]
  }
];

const letter = (i) => String.fromCharCode(65 + i);

function expandLevelRows() {
  return LEVEL_MILESTONES.map((row, idx) => {
    const n = idx;
    const levelCards = (row.level || []).map((card, i) => ({
      ...card,
      slug: card.slug
        || (row.level.length === 1 ? `level-${n}` : `level-${n}-${letter(i)}`),
      auto_available: card.auto_available != null ? card.auto_available : (n <= 1),
    }));
    const milestoneCards = (row.milestones || []).map((card, i) => ({
      ...card,
      slug: card.slug || `level-${n}-milestone-${letter(i)}`,
      label: "Milestone",
    }));
    return { n, levelCards, milestoneCards };
  });
}

function allLayoutCards() {
  return expandLevelRows().flatMap((r) => [...r.levelCards, ...r.milestoneCards]);
}

function knownAbilityStubs() {
  return allLayoutCards().filter((card) => card.type === "ability").map((card) => card.slug);
}

function knownMaxHitsStubs() {
  return allLayoutCards().filter((card) => card.type === "maxhits").map((card) => card.slug);
}

function knownAttackGuardStubs() {
  return allLayoutCards().filter((card) => card.type === "attack-guard").map((card) => card.slug);
}

function knownDamageBonusStubs() {
  return allLayoutCards().filter((card) => card.type === "damage-bonus").map((card) => card.slug);
}

function isCardAvailable(c, card) {
  if (card.auto_available) return true;
  const unlocked = c.unlocked_slots || [];
  return unlocked.includes(card.slug);
}

function isStubType(type) {
  return type === "perk" || type === "hdef";
}

// Ability slots that are available (auto or unlocked) but don't yet hold a
// gained ability. Layout-order means the "first" slot is the earliest one
// the character is eligible to fill.
function availableUncommittedAbilitySlots(c) {
  return allLayoutCards().filter((card) =>
    card.type === "ability"
    && isCardAvailable(c, card)
    && !isCardCommitted(c, card));
}

function isAutoCommittingType(type) {
  return type === "maxhits" || type === "damage-bonus";
}

function clearCommittedDataPatch(c, card) {
  switch (card.type) {
    case "ability":
      return {
        abilities: (c.abilities || []).filter((a) => a.gained !== card.slug),
      };
    case "attribute":
      return {
        attribute_advancements: (c.attribute_advancements || []).filter((a) => a.gained !== card.slug),
      };
    case "maxhits":
      return {
        maxhits_advancements: (c.maxhits_advancements || []).filter((a) => a.gained !== card.slug),
      };
    case "attack-guard":
      return {
        attack_guard_advancements: (c.attack_guard_advancements || []).filter((a) => a.gained !== card.slug),
      };
    case "damage-bonus":
      return {
        damage_bonus_advancements: (c.damage_bonus_advancements || []).filter((a) => a.gained !== card.slug),
      };
    case "ancestry":
      return { committed: { ...(c.committed || {}), ancestry: false } };
    case "class":
      return { committed: { ...(c.committed || {}), class: false } };
    default:
      return {};
  }
}

function isAutoCommittedType(type) {
  return isAutoCommittingType(type) || isStubType(type);
}

function isCardCommitted(c, card) {
  switch (card.type) {
    case "ability":
      return (c.abilities || []).some((a) => a.gained === card.slug);
    case "attribute":
      return (c.attribute_advancements || []).some((a) => a.gained === card.slug);
    case "maxhits":
      return (c.maxhits_advancements || []).some((a) => a.gained === card.slug);
    case "attack-guard":
      return (c.attack_guard_advancements || []).some((a) => a.gained === card.slug);
    case "damage-bonus":
      return (c.damage_bonus_advancements || []).some((a) => a.gained === card.slug);
    case "ancestry":
      return !!(c.committed && c.committed.ancestry);
    case "class":
      return !!(c.committed && c.committed.class);
    case "perk":
    case "hdef":
      // Stubs auto-commit when available; locking the slot
      // (removing it from unlocked_slots) reverts them to uncommitted too.
      return isCardAvailable(c, card);
    default:
      return false;
  }
}
