// Whispers in the Roots — Foundry VTT module
//
// Bundles the Whispers character-sheet SPA as module assets and persists each
// character's state on the Foundry actor (`actor.system.whispers`) instead of
// the SPA's browser localStorage. The SPA still runs in an iframe; the bridge
// over `postMessage` exchanges state both directions.
//
// Message protocol (extending `ias:` from iframe-actor-sheet):
//   parent -> iframe:
//     ias:context           — actor/user identity (existing)
//     whispers:state        — { library: { active, characters }, sourceActorId }
//   iframe -> parent:
//     ias:hello             — request context (existing)
//     ias:roll              — generic roll (existing)
//     whispers:hello        — request initial actor state
//     whispers:save         — { library, oldName?, newName? } persist to actor

const MODULE_ID = "whispers-foundry";
const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/sheet.hbs`;
const IAS_PREFIX = "ias:";
const WHISPERS_PREFIX = "whispers:";
const STATE_KEY = "system.whispers";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "defaultWidth", {
    name: "Default Width",
    hint: "Initial window width (pixels). Applied on every open, overriding Foundry's cached per-actor size.",
    scope: "world",
    config: true,
    type: Number,
    default: 1200,
  });

  game.settings.register(MODULE_ID, "defaultHeight", {
    name: "Default Height",
    hint: "Initial window height (pixels). Applied on every open, overriding Foundry's cached per-actor size.",
    scope: "world",
    config: true,
    type: Number,
    default: 900,
  });

  Actors.registerSheet(game.system.id, WhispersActorSheet, {
    label: "Whispers Sheet",
    makeDefault: false,
  });
  console.log(`${MODULE_ID} | registered`);
});

// Project the raw actor.system.whispers value into the SPA's library shape.
// The SPA expects { active, characters: { [name]: characterObject } }.
// Actor name is the source of truth for the character key.
function libraryFromActor(actor) {
  const name = actor?.name || "Unnamed";
  const raw = foundry.utils.getProperty(actor ?? {}, STATE_KEY);
  const character = raw && typeof raw === "object" ? { ...raw, name } : null;
  if (!character) {
    return { active: null, characters: {} };
  }
  return { active: name, characters: { [name]: character } };
}

// Pull the single character object out of a library payload sent by the SPA.
// The SPA may rename a character (changes both the key and the inner `.name`);
// we honour whichever name is most current in the payload.
function characterFromLibrary(lib) {
  if (!lib || typeof lib !== "object") return null;
  const characters = lib.characters && typeof lib.characters === "object" ? lib.characters : {};
  const keys = Object.keys(characters);
  if (keys.length === 0) return null;
  const activeKey = typeof lib.active === "string" && characters[lib.active] ? lib.active : keys[0];
  return characters[activeKey] || null;
}

class WhispersActorSheet extends ActorSheet {
  static get defaultOptions() {
    const width = Number(game.settings?.get?.(MODULE_ID, "defaultWidth")) || 1200;
    const height = Number(game.settings?.get?.(MODULE_ID, "defaultHeight")) || 900;
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["whispers-foundry"],
      template: TEMPLATE_PATH,
      width,
      height,
      resizable: true,
      submitOnChange: false,
      submitOnClose: false,
      closeOnSubmit: false,
    });
  }

  getData(options) {
    const data = super.getData(options);
    data.moduleId = MODULE_ID;
    return data;
  }

  // Skip data-driven re-renders so the iframe doesn't reload on every actor
  // update — we push state through postMessage instead. On a real render,
  // re-apply the configured default size after super._render so the module
  // defaults override Foundry's per-actor position cache.
  async _render(force, options) {
    if (this.rendered && !force) return this;
    const result = await super._render(force, options);
    const width = Number(game.settings.get(MODULE_ID, "defaultWidth")) || 1200;
    const height = Number(game.settings.get(MODULE_ID, "defaultHeight")) || 900;
    this.setPosition({ width, height });
    return result;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root =
      (html instanceof Element ? html : html?.[0]) ??
      (this.element instanceof Element ? this.element : this.element?.[0]);
    const iframe = root?.tagName === "IFRAME" ? root : root?.querySelector?.("iframe");
    if (!iframe) {
      console.warn(`${MODULE_ID} | activateListeners: iframe element not found`);
      return;
    }
    this._iframe = iframe;

    let iframeOrigin;
    try { iframeOrigin = new URL(iframe.src, window.location.href).origin; }
    catch { console.warn(`${MODULE_ID} | activateListeners: invalid iframe.src`, iframe.src); return; }
    this._iframeOrigin = iframeOrigin;

    console.log(`${MODULE_ID} | listening for messages from`, iframeOrigin);

    // On every iframe load (initial + any navigation), push both context and
    // current actor state. The SPA also requests them via hello messages, so
    // either path establishes the bridge.
    iframe.addEventListener("load", () => {
      this._sendContext();
      this._sendState();
    });

    this._onMessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      const t = msg.type;
      if (typeof t !== "string") return;
      if (!t.startsWith(IAS_PREFIX) && !t.startsWith(WHISPERS_PREFIX)) return;

      if (event.origin !== iframeOrigin) {
        console.warn(`${MODULE_ID} | origin mismatch — dropping`, event.origin, "expected", iframeOrigin);
        return;
      }
      this._dispatch(msg, event.source);
    };
    window.addEventListener("message", this._onMessage);

    // Listen for outside-the-iframe actor updates (GM edits, other clients,
    // direct API calls). Push the new state into the iframe so the SPA
    // re-renders. We compare actor ids to avoid cross-actor leaks when
    // multiple Whispers sheets are open.
    this._onUpdateActor = (actor, changes, options, userId) => {
      if (!actor || actor.id !== this.actor.id) return;
      // Skip pushes that originated from this very sheet (we just wrote them);
      // the iframe already has the current value.
      if (options?.whispersSource === this.appId) return;
      this._sendState();
    };
    Hooks.on("updateActor", this._onUpdateActor);
  }

  async close(options) {
    if (this._onMessage) {
      window.removeEventListener("message", this._onMessage);
      this._onMessage = null;
    }
    if (this._onUpdateActor) {
      Hooks.off("updateActor", this._onUpdateActor);
      this._onUpdateActor = null;
    }
    return super.close(options);
  }

  _dispatch(msg, source) {
    switch (msg.type) {
      case `${IAS_PREFIX}hello`:
        this._sendContext(source);
        this._sendState(source);
        return;
      case `${IAS_PREFIX}roll`:
        return this._handleRoll(msg);
      case `${WHISPERS_PREFIX}hello`:
        this._sendState(source);
        return;
      case `${WHISPERS_PREFIX}save`:
        return this._handleSave(msg);
      default:
        console.debug(`${MODULE_ID} | unhandled message type`, msg.type);
    }
  }

  _post(target, payload) {
    const win = target ?? this._iframe?.contentWindow;
    if (!win) return;
    try { win.postMessage(payload, this._iframeOrigin || "*"); }
    catch (err) { console.warn(`${MODULE_ID} | postMessage failed`, err); }
  }

  _sendContext(target) {
    this._post(target, {
      type: `${IAS_PREFIX}context`,
      actorId: this.actor.id,
      actorName: this.actor.name,
      userId: game.user.id,
      worldId: game.world.id,
      systemId: game.system.id,
      isOwner: this.actor.isOwner,
      isGM: game.user.isGM,
    });
  }

  _sendState(target) {
    this._post(target, {
      type: `${WHISPERS_PREFIX}state`,
      sourceActorId: this.actor.id,
      library: libraryFromActor(this.actor),
    });
  }

  async _handleSave(msg) {
    if (!this.actor.isOwner && !game.user.isGM) {
      console.warn(`${MODULE_ID} | save: user lacks owner permission on actor`);
      return;
    }
    const character = characterFromLibrary(msg.library);
    if (!character) {
      console.warn(`${MODULE_ID} | save: empty library payload, ignoring`);
      return;
    }
    const update = { [STATE_KEY]: character };
    // Keep the actor's display name in sync with the character name so the
    // Foundry directory and tokens reflect what the player typed.
    if (typeof character.name === "string" && character.name.trim() && character.name !== this.actor.name) {
      update.name = character.name;
    }
    try {
      await this.actor.update(update, { whispersSource: this.appId });
    } catch (err) {
      console.error(`${MODULE_ID} | actor.update failed`, err);
    }
  }

  async _handleRoll({ formula, flavor }) {
    if (typeof formula !== "string" || !formula.trim()) {
      console.warn(`${MODULE_ID} | roll: bad formula`, formula);
      return;
    }
    if (!this.actor.isOwner && !game.user.isGM) {
      console.warn(`${MODULE_ID} | roll: user lacks owner permission on actor`);
      return;
    }
    try {
      const rollData = this.actor.getRollData?.() ?? {};
      const roll = await new Roll(formula, rollData).evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: typeof flavor === "string" ? flavor : undefined,
      });
    } catch (err) {
      console.error(`${MODULE_ID} | roll failed`, err);
      ui.notifications?.warn(`Whispers sheet: invalid roll formula "${formula}"`);
    }
  }
}
