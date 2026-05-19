// ═══════════════════════════════════════════════════════════════════════
//  DERIVED — formatting, dice, and stat derivations
// ═══════════════════════════════════════════════════════════════════════

const fmtMod = (m) => (m > 0 ? `+${m}` : m < 0 ? `${m}` : "-");

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function rollD20() { return 1 + Math.floor(Math.random() * 20); }
function rollDice(n, sides) {
  let total = 0; const rolls = [];
  for (let i = 0; i < n; i++) { const r = 1 + Math.floor(Math.random() * sides); rolls.push(r); total += r; }
  return { total, rolls };
}
function parseDamage(str) {
  const m = String(str).match(/(\d+)d(\d+)\s*([+\-]\s*\d+)?\s*(.*)/i);
  if (!m) return null;
  return {
    n: parseInt(m[1], 10), sides: parseInt(m[2], 10),
    flat: m[3] ? parseInt(m[3].replace(/\s+/g, ""), 10) : 0,
    tag: (m[4] || "").trim(),
  };
}
function rollDieByName(die) {
  const m = String(die).match(/d(\d+)/i);
  if (!m) return { total: 0, rolls: [] };
  return rollDice(1, parseInt(m[1], 10));
}

function maxHitsAncestryValue(c) {
  const anc = ANCESTRIES[c.ancestry] || {};
  const ancCommitted = !!(c.committed && c.committed.ancestry);
  return ancCommitted ? (anc.base_hits || 0) : 0;
}
function maxHitsAdvancementCount(c) {
  return (c.maxhits_advancements || []).reduce((sum, e) => sum + (e.amount || 1), 0);
}
function deriveMaxHits(c) {
  return maxHitsAncestryValue(c) + deriveAttribute(c, "resolve") + maxHitsAdvancementCount(c);
}
function maxHitsParts(c) {
  return [
    { label: "Ancestry", value: maxHitsAncestryValue(c) },
    { label: "Resolve", value: deriveAttribute(c, "resolve") },
    { label: "Advancement", value: maxHitsAdvancementCount(c) },
  ];
}
function deriveWoundDie(c) {
  return { warrior: "d10", champion: "d8", rogue: "d6" }[c.class] || "d8";
}

function attributeAncestryValue(c, k) {
  const anc = ANCESTRIES[c.ancestry] || {};
  const ancCommitted = !!(c.committed && c.committed.ancestry);
  return ancCommitted ? ((anc.attributes && anc.attributes[k]) || 0) : 0;
}
function attributeAdvancementCount(c, k) {
  return (c.attribute_advancements || []).filter((a) => a.attribute === k).length;
}
function deriveAttribute(c, k) {
  return attributeAncestryValue(c, k) + attributeAdvancementCount(c, k);
}
function attributeParts(c, k) {
  return [
    { label: "Ancestry", value: attributeAncestryValue(c, k) },
    { label: "Advancement", value: attributeAdvancementCount(c, k) },
  ];
}

function guardAncestryValue(c) {
  const anc = ANCESTRIES[c.ancestry] || {};
  const ancCommitted = !!(c.committed && c.committed.ancestry);
  return ancCommitted ? (anc.base_guard || 0) : 0;
}
function attackGuardAdvancementCount(c, choice) {
  return (c.attack_guard_advancements || []).filter((a) => a.choice === choice).length;
}
function deriveGuard(c) {
  return guardAncestryValue(c) + attackGuardAdvancementCount(c, "guard");
}
function guardParts(c) {
  return [
    { label: "Ancestry", value: guardAncestryValue(c) },
    { label: "Advancement", value: attackGuardAdvancementCount(c, "guard") },
  ];
}
function deriveAttackBonus(c) {
  return (c.base_attack || 0) + attackGuardAdvancementCount(c, "attack");
}
function attackBonusParts(c) {
  return [
    { label: "Base", value: c.base_attack || 0 },
    { label: "Advancement", value: attackGuardAdvancementCount(c, "attack") },
  ];
}

function damageBonusAdvancementCount(c) {
  return (c.damage_bonus_advancements || []).length;
}
function deriveDamageBonus(c) {
  return deriveAttribute(c, "intensity") + damageBonusAdvancementCount(c);
}
function damageBonusParts(c) {
  return [
    { label: "Intensity", value: deriveAttribute(c, "intensity") },
    { label: "Advancement", value: damageBonusAdvancementCount(c) },
  ];
}

function hitReductionAdvancementCount(c) {
  return (c.hit_reduction_advancements || []).length;
}
function deriveHitReduction(c) {
  return (c.equipment_hit_reduction || 0) + hitReductionAdvancementCount(c);
}
function hitReductionParts(c) {
  return [
    { label: "Equipment", value: c.equipment_hit_reduction || 0 },
    { label: "Advancement", value: hitReductionAdvancementCount(c) },
  ];
}

function parryAdvancementCount(c) {
  return (c.parry_advancements || []).length;
}
function deriveParry(c) {
  return (c.equipment_parry || 0) + parryAdvancementCount(c);
}
function parryParts(c) {
  return [
    { label: "Equipment", value: c.equipment_parry || 0 },
    { label: "Advancement", value: parryAdvancementCount(c) },
  ];
}
