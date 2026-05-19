// Whispers — Character ActorSheet (v13 ApplicationV2)
//
// Phase 1 scaffold: renders a single placeholder template confirming the
// system loads. Phase 2 will add the hybrid layout: native header strip +
// iframe SPA, with the postMessage bridge wired through.

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["whispers", "sheet", "actor", "character"],
    position: { width: 1200, height: 1050 },
    window: { resizable: true },
    actions: {},
    form: {
      submitOnChange: false,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    placeholder: {
      template: "systems/whispers/templates/character-sheet.hbs",
    },
  };

  /** @override */
  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.actor = this.actor;
    ctx.system = this.actor.system;
    return ctx;
  }
}
