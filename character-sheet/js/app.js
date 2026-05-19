// ═══════════════════════════════════════════════════════════════════════
//  APP — root component and bootstrap
// ═══════════════════════════════════════════════════════════════════════

function App() {
  const [library, setLibrary] = React.useState(() => loadLibrary());
  const [c, setC] = React.useState(() => {
    const initial = library.active && library.characters[library.active];
    return initial || DEFAULT_CHARACTER;
  });
  const [log, setLog] = React.useState([]);
  const [conditions, setConditions] = React.useState(new Set());
  const [activeTab, setActiveTab] = React.useState("equipment");
  const [inventoryFilter, setInventoryFilter] = React.useState("");
  const [skillFilter, setSkillFilter] = React.useState("");
  const foundry = useFoundryConnection();

  // Tracks the name under which the active character was last persisted, so
  // we can tell an in-place rename (move the entry) from a character switch
  // (leave the old entry alone). Handlers that switch `c` to a different
  // character bump this ref before calling setC.
  const prevNameRef = React.useRef(c.name);

  // When embedded in whispers-foundry, subscribe to actor-state pushes from
  // the parent. External edits (other clients, GM macros, the Foundry actor
  // directory) arrive as fresh libraries; we swap the active character to
  // match. We skip the swap when the only difference is something we just
  // wrote ourselves (avoids fighting the autosave effect).
  React.useEffect(() => {
    if (!FoundryBridge.isEmbedded()) return undefined;
    if (typeof FoundryBridge.onLibrary !== "function") return undefined;
    return FoundryBridge.onLibrary(() => {
      const lib = loadLibrary();
      setLibrary(lib);
      const target = lib.active && lib.characters[lib.active];
      if (target) {
        const serialized = JSON.stringify(target);
        // Only setC if the incoming character actually differs from local
        // state — prevents an external echo of our own save from clobbering
        // unsaved keystrokes.
        setC((prev) => (JSON.stringify(prev) === serialized ? prev : target));
        prevNameRef.current = target.name;
      }
    });
  }, []);

  // Autosave the active character into the library. On rename, remove the
  // prior-name entry first so a keystroke-by-keystroke rename collapses into
  // a single library entry under the final name. An empty/whitespace name is
  // treated as a transient state — we defer saving until the name is back.
  React.useEffect(() => {
    setLibrary((lib) => {
      const oldName = prevNameRef.current;
      const newName = c.name;
      if (!newName || !newName.trim()) return lib;
      let next = lib;
      if (oldName && oldName !== newName && lib.characters[oldName]) {
        next = removeCharacter(next, oldName);
      }
      next = upsertCharacter(next, c);
      saveLibrary(next);
      prevNameRef.current = newName;
      return next;
    });
  }, [c]);

  const handleSwitchTo = (name) => {
    const target = library.characters[name];
    if (!target) return;
    prevNameRef.current = target.name;
    setC(target);
    setConditions(new Set());
    setLog([]);
  };

  const handleSaveCurrent = () => {
    setLibrary((lib) => {
      const next = upsertCharacter(lib, c);
      saveLibrary(next);
      return next;
    });
  };

  const handleDownload = (name) => {
    const target = library.characters[name] || c;
    const blob = new Blob([JSON.stringify(target, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target.name || "character"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (name) => {
    setLibrary((lib) => {
      const next = removeCharacter(lib, name);
      saveLibrary(next);
      if (name === c.name) {
        const fallback = next.active && next.characters[next.active];
        const replacement = fallback || BLANK_CHARACTER;
        prevNameRef.current = replacement.name;
        setC(replacement);
        setConditions(new Set());
        setLog([]);
      }
      return next;
    });
  };

  const handleNew = () => {
    const base = PLACEHOLDER_NAMES[Math.floor(Math.random() * PLACEHOLDER_NAMES.length)];
    let name = base;
    let n = 2;
    while (library.characters[name]) name = `${base} (${n++})`;
    prevNameRef.current = name;
    setC({ ...BLANK_CHARACTER, name });
    setConditions(new Set());
    setLog([]);
  };

  const handleImport = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const imported = migrateCharacter(data);
        prevNameRef.current = imported.name;
        setC(imported);
        setConditions(new Set());
        setLog([]);
      } catch {
        alert("Could not parse character file.");
      }
    };
    reader.readAsText(file);
  };

  const pushRoll = (entry) => setLog((L) => [{ ...entry, id: Math.random().toString(36).slice(2), at: new Date() }, ...L].slice(0, 30));
  const update = (patch) => setC((c) => ({ ...c, ...patch }));

  const attrOf = (k) => deriveAttribute(c, k);
  const skillBonus = (s) => {
    const rank = c.skillRanks[s.key] || 0;
    const tier = PROF_TIERS.find((t) => t.rank === rank);
    return attrOf(s.attr) + tier.bonus + (rank > 0 ? c.profBonus : 0);
  };

  const toggleCond = (k) => setConditions((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const strikeWith = (slot, weapon, fightingStyle) => {
    if (!weapon || weapon === NONE) return;
    const attr = fightingStyle === "Ranged" ? "precision" : "intensity";
    const m = attrOf(attr) + (c.profBonus || 0);
    const d = rollD20();
    pushRoll({ kind: "attack", label: `${slot}: ${weapon} — to hit`, d20: d, mod: m, total: d + m });
  };

  const usePower = (idx) => {
    const p = c.powers[idx];
    pushRoll({ kind: "note", label: `Used ${p.name}`, total: 0 });
  };

  const totalWeight = c.inventory.reduce((s, i) => s + (i.wt || 0) * (i.qty || 1), 0);
  const carry = 30 + attrOf("intensity") * 5;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 22px 100px" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gridTemplateRows: "auto auto",
        columnGap: 24,
        alignItems: "start",
      }}>
        <div style={{ gridColumn: "1 / -1", gridRow: 1 }}>
          <Header
            c={c}
            update={update}
            library={library}
            onSwitchTo={handleSwitchTo}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onSaveCurrent={handleSaveCurrent}
            onNew={handleNew}
            onImport={handleImport}
          />
        </div>

        <div style={{ gridColumn: 1, gridRow: 2 }}>
          <TopStatBar c={c} update={update} attrOf={attrOf} />
          <SecondaryRibbon c={c} update={update} pushRoll={pushRoll} />
          <div style={{ marginTop: 24 }}>
            <PathsBlock c={c} update={update} />
            {/* SkillsBlock and PowersBlock intentionally unrendered for now. */}
          </div>
        </div>

        <div style={{
          gridColumn: 2,
          gridRow: 2,
          alignSelf: "stretch",
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
        }}>
          <AdvancementWidget c={c} update={update} />
          <ConditionsBlock conditions={conditions} toggleCond={toggleCond} />
          <RollLog log={log} clear={() => setLog([])} />
          {SHOW_REFS && <QuickReference />}
          <CombatMisc c={c} update={update} pushRoll={pushRoll} attrOf={attrOf} carry={carry} />
          <div style={{ flex: 1 }} />
          <img src="logo.png" alt="Whispers in the Roots" className="header-logo"
            title={foundry.connected ? "Click to roll 3d6 (test)" : foundry.embedded ? "Foundry: awaiting connection" : "Whispers in the Roots"}
            onClick={() => FoundryBridge.roll("3d6", `${c.name} — test roll`)} />
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <TabBar
          tabs={[
            { id: "equipment", label: "Equipment" },
            { id: "inventory", label: "Inventory", count: c.inventory.length },
            { id: "features", label: "Features & Traits", count: c.features.length },
            { id: "notes", label: "Notes" },
          ]}
          active={activeTab} onChange={setActiveTab} />
        {activeTab === "equipment" && <EquipmentBlock c={c} update={update} attrOf={attrOf} />}
        {activeTab === "inventory" && <InventoryBlock c={c} setC={setC} totalWeight={totalWeight} carry={carry} filter={inventoryFilter} setFilter={setInventoryFilter} />}
        {activeTab === "features" && <FeaturesBlock c={c} setC={setC} />}
        {activeTab === "notes" && <NotesBlock c={c} update={update} />}
      </div>

      <Footer onReset={() => {
        if (!confirm("Reset to default character?")) return;
        prevNameRef.current = DEFAULT_CHARACTER.name;
        setC(DEFAULT_CHARACTER);
        setConditions(new Set());
        setLog([]);
      }} />
    </div>
  );
}

function Header({ c, update, library, onSwitchTo, onDownload, onDelete, onSaveCurrent, onNew, onImport }) {
  const pathNames = (c.paths || [])
    .map((k) => (PATHS.find((p) => p.key === k) || {}).name || k);
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 14, borderBottom: "1px solid var(--rule-2)" }}>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <input className="serif" value={c.name} onChange={(e) => update({ name: e.target.value })}
            style={{ font: "500 36px/1 var(--serif)", letterSpacing: "-0.02em", width: "min(440px, 60vw)", border: 0 }} />
          <span className="smcp" style={{ color: "var(--ink-3)" }}>
            <input value={c.pronouns} onChange={(e) => update({ pronouns: e.target.value })} style={{ width: 60, textAlign: "left" }} />
          </span>
        </div>
        <div className="serif" style={{ marginTop: 8, color: "var(--ink-2)", fontSize: 16, letterSpacing: "0.01em" }}>
          Level {c.level} {c.ancestry} {CLASSES[c.class] || c.class}
        </div>
        {pathNames.length > 0 && (
          <div className="serif" style={{ marginTop: 2, color: "var(--ink-3)", fontSize: 13, letterSpacing: "0.01em" }}>
            {pathNames.join(" · ")}
          </div>
        )}
      </div>
      <div className="save-load-bar">
        <CharactersMenu
          currentName={c.name}
          library={library}
          onSwitchTo={onSwitchTo}
          onDownload={onDownload}
          onDelete={onDelete}
          onSaveCurrent={onSaveCurrent}
          onNew={onNew}
          onImport={onImport}
        />
      </div>
    </header>
  );
}

function Footer({ onReset }) {
  return (
    <footer style={{ marginTop: 32, paddingTop: 14, borderTop: "1px solid var(--rule-2)", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--ink-3)", fontSize: 11 }}>
      <span className="smcp">Whispers — Character Sheet (Alpha)</span>
      <span style={{ display: "flex", gap: 12 }}>
        <span className="mono">autosaves locally</span>
        <button onClick={onReset} className="smcp" style={{ color: "var(--ink-3)" }}>Reset to default</button>
      </span>
    </footer>
  );
}

// Bootstrap: load PATHS from paths.json, then (if embedded) await the parent's
// initial actor state, then mount the app. On fetch error we still mount with
// empty PATHS so the rest of the sheet is usable. The embedded await prevents
// the SPA from rendering an empty/default library and then immediately
// trampling it with whatever the actor actually contains.
fetch("paths.json", { cache: "no-store" })
  .then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  })
  .then((data) => {
    PATHS = data;
    console.info("paths.json loaded:", data.length, "paths");
  })
  .catch((e) => { console.error("Failed to load paths.json:", e); })
  .then(() => (FoundryBridge.isEmbedded() ? FoundryBridge.awaitLibrary() : null))
  .finally(() => {
    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  });
