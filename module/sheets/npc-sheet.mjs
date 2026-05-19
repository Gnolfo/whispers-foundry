// Whispers — NPC ActorSheet (v13 ApplicationV2)

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class NpcSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["whispers", "sheet", "actor", "npc"],
    position: { width: 560, height: 720 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    main: { template: "systems/whispers/templates/npc-sheet.hbs" },
  };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.actor = this.actor;
    ctx.system = this.actor.system;
    return ctx;
  }
}
