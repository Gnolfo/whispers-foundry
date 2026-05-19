// Whispers — Item.weapon DataModel

const { fields } = foundry.data;

export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      key: new fields.StringField({ required: true, blank: false, initial: "" }),
      summary: new fields.HTMLField({ initial: "" }),
      effects: new fields.ArrayField(
        new fields.SchemaField({
          kind: new fields.StringField({ blank: true, initial: "" }),
          label: new fields.StringField({ blank: true, initial: "" }),
          desc: new fields.HTMLField({ initial: "" }),
        }),
      ),
    };
  }
}
