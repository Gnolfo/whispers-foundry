// Whispers — Item.armor DataModel
//
// Wound-reduction per wound tier (w1..w5) plus a max-hits penalty.

const { fields } = foundry.data;

export class ArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      key: new fields.StringField({ required: true, blank: false, initial: "" }),
      max_hits: new fields.NumberField({ integer: true, initial: 0 }),
      w1: new fields.NumberField({ integer: true, initial: 0 }),
      w2: new fields.NumberField({ integer: true, initial: 0 }),
      w3: new fields.NumberField({ integer: true, initial: 0 }),
      w4: new fields.NumberField({ integer: true, initial: 0 }),
      w5: new fields.NumberField({ integer: true, initial: 0 }),
    };
  }
}
