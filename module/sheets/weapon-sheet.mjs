// Whispers — Weapon ItemSheet

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class WeaponSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["whispers", "sheet", "item", "weapon"],
    position: { width: 480, height: 480 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    main: { template: "systems/whispers/templates/item-weapon.hbs" },
  };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.item = this.item;
    ctx.system = this.item.system;
    return ctx;
  }
}
