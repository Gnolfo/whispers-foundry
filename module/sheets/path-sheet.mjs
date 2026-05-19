// Whispers — Path ItemSheet

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class PathSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["whispers", "sheet", "item", "path"],
    position: { width: 560, height: 640 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    main: { template: "systems/whispers/templates/item-path.hbs" },
  };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.item = this.item;
    ctx.system = this.item.system;
    return ctx;
  }
}
