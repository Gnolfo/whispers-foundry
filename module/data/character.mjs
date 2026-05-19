// Whispers — Actor.character DataModel
//
// All stored character state lives here. Derived totals (attribute sums,
// hits.max, guard, attack bonus, damage, hit reduction, parry) are computed
// in prepareDerivedData and NOT stored.

const { fields } = foundry.data;

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // ─── Identity ────────────────────────────────────────────────────
      pronouns: new fields.StringField({ required: false, blank: true, initial: "" }),
      ancestry: new fields.StringField({ required: false, blank: true, initial: "" }),
      background: new fields.StringField({ blank: true, initial: "" }),
      // `class` is a JS reserved word — schema key is `cls`. The SPA<->actor
      // projection layer renames cls<->class so SPA code stays unchanged.
      cls: new fields.StringField({ blank: true, initial: "" }),
      subclass: new fields.StringField({ blank: true, initial: "" }),
      level: new fields.NumberField({ integer: true, initial: 1, min: 1, max: 5 }),
      xp: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
      xpNext: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
      deity: new fields.StringField({ blank: true, initial: "" }),
      alignment: new fields.StringField({ blank: true, initial: "" }),

      // ─── Stored bonus components (NOT derived totals) ─────────────────
      base_attack: new fields.NumberField({ integer: true, initial: 0 }),
      initiative: new fields.NumberField({ integer: true, initial: 0 }),
      equipment_hit_reduction: new fields.NumberField({ integer: true, initial: 0 }),
      equipment_parry: new fields.NumberField({ integer: true, initial: 0 }),

      // ─── Hits ─────────────────────────────────────────────────────────
      // value: current hits (player-edited / damage-applied)
      // max: recomputed in prepareDerivedData; stored only so it round-trips
      hits: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        max: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
      }),

      // ─── Character-creation commitments ───────────────────────────────
      committed: new fields.SchemaField({
        ancestry: new fields.BooleanField({ initial: false }),
        cls: new fields.BooleanField({ initial: false }),
      }),

      // ─── Skill ranks (proficiency tier 0–3 per skill) ─────────────────
      skillRanks: new fields.ObjectField({ initial: () => ({}) }),

      // ─── Advancement ledgers ──────────────────────────────────────────
      attribute_advancements: new fields.ArrayField(
        new fields.SchemaField({
          gained: new fields.StringField({ required: true, blank: false }),
          attribute: new fields.StringField({ required: true, blank: false }),
        }),
      ),
      maxhits_advancements: new fields.ArrayField(
        new fields.SchemaField({
          gained: new fields.StringField({ required: true, blank: false }),
          amount: new fields.NumberField({ integer: true, initial: 0 }),
        }),
      ),
      damage_bonus_advancements: new fields.ArrayField(
        new fields.SchemaField({
          gained: new fields.StringField({ required: true, blank: false }),
        }),
      ),
      hit_reduction_advancements: new fields.ArrayField(
        new fields.SchemaField({
          gained: new fields.StringField({ required: true, blank: false }),
        }),
      ),
      parry_advancements: new fields.ArrayField(
        new fields.SchemaField({
          gained: new fields.StringField({ required: true, blank: false }),
        }),
      ),
      attack_guard_advancements: new fields.ArrayField(
        new fields.SchemaField({
          gained: new fields.StringField({ required: true, blank: false }),
          choice: new fields.StringField({ required: true, choices: ["attack", "guard"] }),
        }),
      ),
      abilities: new fields.ArrayField(
        new fields.SchemaField({
          gained: new fields.StringField({ required: true, blank: false }),
          ability: new fields.StringField({ required: true, blank: false }),
          rank: new fields.NumberField({ integer: true, initial: 1, min: 1, max: 3 }),
        }),
      ),

      // ─── Path selection ───────────────────────────────────────────────
      paths: new fields.ArrayField(new fields.StringField()),
      considered_paths: new fields.ArrayField(new fields.StringField()),

      // ─── Hazards ──────────────────────────────────────────────────────
      hazards: new fields.ArrayField(
        new fields.SchemaField({
          key: new fields.StringField(),
          name: new fields.StringField(),
          offense: new fields.StringField(),
        }),
      ),
      hazard_ranks: new fields.ObjectField({ initial: () => ({}) }),

      // ─── Slot unlocks ─────────────────────────────────────────────────
      unlocked_slots: new fields.ArrayField(new fields.StringField()),

      // ─── Equipment ────────────────────────────────────────────────────
      loadouts: new fields.ArrayField(
        new fields.SchemaField({
          fightingStyle: new fields.StringField({ blank: true }),
          mainHand: new fields.StringField({ blank: true }),
          offHand: new fields.StringField({ blank: true }),
          equipped: new fields.BooleanField({ initial: false }),
        }),
      ),
      coreArmor: new fields.StringField({ blank: true, initial: "" }),

      // ─── Inline collections (intentionally untyped — flexible v1) ─────
      powers: new fields.ArrayField(new fields.ObjectField()),
      inventory: new fields.ArrayField(new fields.ObjectField()),
      features: new fields.ArrayField(new fields.ObjectField()),
      notes: new fields.HTMLField({ initial: "" }),
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // prepareDerivedData — runs every time the actor is read. Sets computed
  // properties on `this` for read-only consumption (sheets, token bars,
  // dice formulas). Mirrors the math in character-sheet/js/derived.js but
  // operates on the typed actor instead of the SPA blob.
  //
  // Stored fields stay as-is. Derived fields are added alongside them.
  // ────────────────────────────────────────────────────────────────────────
  prepareDerivedData() {
    // Attribute totals — count of advancements per attribute key + ancestry
    // baseline (which is 0 here; ancestry effects can be applied later via
    // active effects or in a follow-up DataModel field).
    const attrCount = {};
    for (const a of this.attribute_advancements ?? []) {
      attrCount[a.attribute] = (attrCount[a.attribute] || 0) + 1;
    }
    this.attributes = {
      focus: attrCount.focus || 0,
      guile: attrCount.guile || 0,
      intensity: attrCount.intensity || 0,
      precision: attrCount.precision || 0,
      resolve: attrCount.resolve || 0,
    };

    // Max hits = resolve attribute + sum of maxhits_advancements `amount`s.
    // (Ancestry base hits would be added by a future ancestry data lookup.)
    const maxHitsAdv = (this.maxhits_advancements ?? [])
      .reduce((s, e) => s + (e.amount || 0), 0);
    this.hits.max = this.attributes.resolve + maxHitsAdv;
    if (this.hits.value === 0 && this.hits.max > 0) {
      // Initialize current to max for a brand-new character.
      this.hits.value = this.hits.max;
    }

    // Attack / Guard advancement count, split by choice.
    let attackAdv = 0;
    let guardAdv = 0;
    for (const e of this.attack_guard_advancements ?? []) {
      if (e.choice === "attack") attackAdv += 1;
      else if (e.choice === "guard") guardAdv += 1;
    }
    this.attack = this.base_attack + attackAdv;
    this.guard = guardAdv; // ancestry base_guard added by future lookup

    // Damage bonus = Intensity + count of damage_bonus_advancements
    this.damage = this.attributes.intensity + (this.damage_bonus_advancements?.length ?? 0);

    // Hit Reduction = equipment + advancement count
    this.hit_reduction = this.equipment_hit_reduction + (this.hit_reduction_advancements?.length ?? 0);

    // Parry = equipment + advancement count
    this.parry = this.equipment_parry + (this.parry_advancements?.length ?? 0);
  }
}
