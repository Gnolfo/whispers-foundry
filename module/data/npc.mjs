// Whispers — Actor.npc DataModel
//
// NPCs / foes. Carries enough state to run a simple combatant plus the
// Whispers hazard-offense profile (5 categories) and ancestry-style traits.

const { fields } = foundry.data;

export class NpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // ─── Identity ────────────────────────────────────────────────────
      ancestry: new fields.StringField({ blank: true, initial: "" }),

      // ─── Hits ─────────────────────────────────────────────────────────
      hits: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        max: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
      }),

      // ─── Combat stats ─────────────────────────────────────────────────
      base_attack: new fields.NumberField({ integer: true, initial: 0 }),
      base_guard: new fields.NumberField({ integer: true, initial: 0 }),
      wound_die: new fields.StringField({ blank: true, initial: "d8" }),

      // ─── Attacks ──────────────────────────────────────────────────────
      attacks: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true, blank: false }),
          dice: new fields.StringField({ required: true, blank: false }),
          flavor: new fields.StringField({ blank: true, initial: "" }),
        }),
      ),

      // ─── Hazard offense dice (one die per hazard category) ────────────
      hazards: new fields.SchemaField({
        stagger: new fields.StringField({ blank: true, initial: "" }),
        dread: new fields.StringField({ blank: true, initial: "" }),
        surprise: new fields.StringField({ blank: true, initial: "" }),
        anguish: new fields.StringField({ blank: true, initial: "" }),
        disruption: new fields.StringField({ blank: true, initial: "" }),
      }),

      // ─── Traits (ancestry abilities, special features) ────────────────
      traits: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true, blank: false }),
          desc: new fields.HTMLField({ initial: "" }),
        }),
      ),

      // ─── Notes (freeform) ────────────────────────────────────────────
      notes: new fields.HTMLField({ initial: "" }),
    };
  }

  prepareDerivedData() {
    if (this.hits.value === 0 && this.hits.max > 0) {
      this.hits.value = this.hits.max;
    }
  }
}
