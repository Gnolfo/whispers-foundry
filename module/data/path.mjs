// Whispers — Item.path DataModel
//
// Paths bundle abilities. Each Path Item carries its own ability list inline
// (instead of separate Ability Items) so giving a character a Path means
// giving them every ability of that Path at once.

const { fields } = foundry.data;

export class PathData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      key: new fields.StringField({ required: true, blank: false, initial: "" }),
      classes: new fields.ArrayField(new fields.StringField()),
      description: new fields.HTMLField({ initial: "" }),

      abilities: new fields.ArrayField(
        new fields.SchemaField({
          key: new fields.StringField({ required: true, blank: false }),
          name: new fields.StringField({ required: true, blank: false }),
          type: new fields.StringField({
            required: true,
            choices: ["action", "reaction"],
            initial: "action",
          }),
          stamina: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
          trigger: new fields.StringField({ blank: true, initial: "" }),
          description: new fields.HTMLField({ initial: "" }),
        }),
      ),
    };
  }
}
