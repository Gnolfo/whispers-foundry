// ═══════════════════════════════════════════════════════════════════════
//  TABS — all tab panel content and the tab chrome
// ═══════════════════════════════════════════════════════════════════════

function SkillsBlock({ c, setC, skillBonus, pushRoll, filter, setFilter, dense }) {
  const cycle = (k) => setC((c) => ({ ...c, skillRanks: { ...c.skillRanks, [k]: (((c.skillRanks[k] || 0) + 1) % 4) } }));
  const list = SKILLS.filter((s) => !filter || s.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <Section title="Skills"
      right={<input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="filter…"
        style={{ border: "1px solid var(--rule)", borderRadius: 3, padding: "1px 6px", width: 100, fontSize: 11 }} />}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        {list.map((s) => {
          const rank = c.skillRanks[s.key] || 0;
          const tier = PROF_TIERS.find((t) => t.rank === rank);
          const attr = ATTRIBUTES.find((a) => a.key === s.attr);
          return (
            <div key={s.key} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 8, alignItems: "center", padding: dense ? "3px 0" : "5px 0", borderBottom: "1px solid var(--rule)" }}>
              <PipCluster rank={rank} onClick={() => cycle(s.key)} />
              <span style={{ color: rank > 0 ? "var(--ink)" : "var(--ink-2)" }}>{s.name}</span>
              <span className="smcp" style={{ fontSize: 9, color: rank > 0 ? "var(--ink-3)" : "var(--ink-4)" }}>{attr ? attr.short : ""}</span>
              {!dense && <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", width: 48, textAlign: "right" }}>{tier.label}</span>}
              {dense && <span />}
              <RollChip label={s.name} value={skillBonus(s)} onRoll={(x) => pushRoll(x)} />
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function WeaponLoadoutBlock({ c, update, attrOf }) {
  const updateRow = (i, patch) => update({
    loadouts: c.loadouts.map((lo, j) => j === i ? { ...lo, ...patch } : lo),
  });
  const toggleEquip = (i) => update({
    loadouts: c.loadouts.map((lo, j) => ({
      ...lo,
      equipped: j === i ? !lo.equipped : false,
    })),
  });

  return (
    <Section title="Loadout">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {c.loadouts.map((lo, i) => (
          <LoadoutRow key={i} lo={lo} i={i}
            onChange={(patch) => updateRow(i, patch)}
            onToggleEquip={() => toggleEquip(i)}
            attrOf={attrOf} profBonus={c.profBonus || 0} />
        ))}
      </div>
    </Section>
  );
}

function LoadoutRow({ lo, onChange, onToggleEquip, attrOf, profBonus }) {
  const mh = mainHandOptionsFor(lo.fightingStyle);
  const oh = offHandOptionsFor(lo.fightingStyle);
  const setStyle = (v) => onChange(fightingStylePatch(lo, v));
  const attrLabel = lo.fightingStyle === "Ranged" ? "PRE" : "INT";
  const hitMod = attrOf(lo.fightingStyle === "Ranged" ? "precision" : "intensity") + profBonus;
  const strikeNote = `strike via ${attrLabel} ${fmtMod(hitMod)}`;
  const eq = !!lo.equipped;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 8 }}>
        <button onClick={onToggleEquip} className="smcp"
          title={eq ? "Click to unequip" : "Click to equip"}
          style={{
            fontSize: 9, padding: "2px 9px", borderRadius: 3,
            border: "1px solid " + (eq ? "var(--accent)" : "var(--rule)"),
            color: eq ? "var(--accent)" : "var(--ink-3)",
            background: eq ? "var(--accent-bg)" : "transparent",
            letterSpacing: "0.1em",
          }}>
          {eq ? "Equipped" : "Equip"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "stretch" }}>
        <LoadoutSlot label="Fighting Style" value={lo.fightingStyle} options={FIGHTING_STYLES} onChange={setStyle} accent
          subnote={strikeNote} />
        <LoadoutSlot label="Main Hand" value={lo.mainHand} options={mh.options} onChange={(v) => onChange({ mainHand: v })}
          disabled={mh.disabled} placeholder={mh.placeholder} />
        <LoadoutSlot label="Off Hand" value={lo.offHand} options={oh.options} onChange={(v) => onChange({ offHand: v })}
          disabled={oh.disabled} fixed={oh.fixed} />
      </div>
    </div>
  );
}

function LoadoutSlot({ label, value, options, onChange, disabled, fixed, placeholder, accent, subnote }) {
  return (
    <div style={{
      padding: "5px 9px", background: disabled ? "var(--bg-sunken)" : "var(--bg-2)",
      border: "1px solid " + (accent ? "var(--accent)" : "var(--rule)"),
      borderRadius: 4, display: "flex", flexDirection: "column", gap: 3, opacity: disabled ? 0.7 : 1,
    }}>
      <div className="smcp" style={{ fontSize: 9, color: accent ? "var(--accent)" : "var(--ink-3)" }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || !!fixed}
        style={{
          fontFamily: "var(--serif)", fontSize: 14, fontWeight: 500, color: disabled ? "var(--ink-4)" : "var(--ink)",
          background: "transparent", border: 0, borderBottom: "1px solid var(--rule)",
          padding: "1px 0 2px", appearance: "none",
          backgroundImage: disabled ? "none" : "linear-gradient(45deg, transparent 50%, var(--ink-3) 50%), linear-gradient(135deg, var(--ink-3) 50%, transparent 50%)",
          backgroundPosition: `calc(100% - 8px) 60%, calc(100% - 4px) 60%`,
          backgroundSize: "4px 4px, 4px 4px", backgroundRepeat: "no-repeat",
          paddingRight: disabled ? 0 : 18,
        }}>
        {(disabled && fixed) ? <option value={fixed}>{fixed}</option> : options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {subnote && <div className="smcp" style={{ fontSize: 9, color: "var(--ink-4)" }}>{subnote}</div>}
      {placeholder && <div style={{ fontSize: 9, color: "var(--ink-4)", fontStyle: "italic" }}>{placeholder}</div>}
    </div>
  );
}

function PowersBlock({ c, usePower }) {
  return (
    <Section title="Powers">
      {c.powers.map((p, i) => (
        <div key={i} style={{ padding: "7px 0", borderBottom: "1px solid var(--rule)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <button onClick={() => usePower(i)} style={{ fontWeight: 500, color: "var(--ink)" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--ink)"}>
              {p.name}
            </button>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{p.tag} · {p.range} · {p.cost}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{p.desc}</div>
        </div>
      ))}
    </Section>
  );
}

function ConditionsBlock({ conditions, toggleCond }) {
  const [hover, setHover] = React.useState(null);
  return (
    <Section title="Conditions" right={<span className="smcp">{conditions.size} active</span>}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {CONDITIONS.map((cd) => {
          const on = conditions.has(cd.key);
          return (
            <button key={cd.key}
              onClick={() => toggleCond(cd.key)}
              onMouseEnter={() => setHover(cd.key)} onMouseLeave={() => setHover(null)}
              style={{
                padding: "3px 8px", fontSize: 11, borderRadius: 3,
                border: "1px solid " + (on ? "var(--accent)" : "var(--rule)"),
                background: on ? "var(--accent)" : "var(--bg-2)",
                color: on ? "var(--bg)" : "var(--ink-2)",
                fontWeight: on ? 500 : 400,
              }}>
              {cd.name}
            </button>
          );
        })}
      </div>
      {hover && (
        <div style={{ marginTop: 8, padding: "6px 8px", background: "var(--bg-2)", borderLeft: "2px solid var(--accent)", fontSize: 11, color: "var(--ink-2)" }}>
          <span style={{ fontWeight: 500 }}>{CONDITIONS.find((c) => c.key === hover).name}: </span>
          {CONDITIONS.find((c) => c.key === hover).desc}
        </div>
      )}
    </Section>
  );
}

function RollLog({ log, clear }) {
  return (
    <Section title="Roll Log" right={log.length > 0 && <button onClick={clear} className="smcp">clear</button>}>
      <div style={{ maxHeight: 220, overflow: "auto" }}>
        {log.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--ink-4)", fontStyle: "italic", padding: "8px 0" }}>
            Click any number or die to roll it.
          </div>
        )}
        {log.map((e) => (
          <div key={e.id} className="log-in" style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", padding: "4px 0", borderBottom: "1px solid var(--rule)" }}>
            <div style={{ fontSize: 12 }}>
              <div>{e.label}</div>
              {e.kind === "raw" ? (
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>[{e.rolls.join(", ")}]</div>
              ) : e.kind === "damage" ? (
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{e.dice} [{e.rolls.join(", ")}] {fmtMod(e.mod)}</div>
              ) : e.kind === "attack3d6" ? (
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                  3d6 [{e.rolls.map((r, i) => {
                    const kept = e.keepIdx && e.keepIdx.includes(i);
                    return (
                      <React.Fragment key={i}>
                        <span title={kept ? "kept" : "dropped"}
                          style={{
                            color: kept ? "var(--ink-2)" : "var(--ink-4)",
                            textDecoration: kept ? "none" : "line-through",
                          }}>{r}</span>
                        {i < e.rolls.length - 1 ? ", " : ""}
                      </React.Fragment>
                    );
                  })}] {fmtMod(e.mod)}
                </div>
              ) : e.kind === "note" ? null : (
                e.d20 != null && <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                  d20 [{e.d20}] {fmtMod(e.mod)}
                  {e.d20 === 20 && <span style={{ color: "var(--good)", marginLeft: 5 }}>CRIT</span>}
                  {e.d20 === 1 && <span style={{ color: "var(--accent)", marginLeft: 5 }}>FUMBLE</span>}
                </div>
              )}
            </div>
            <div className="mono serif" style={{ fontSize: 20, fontWeight: 500, color: (e.kind === "damage" || e.kind === "attack" || e.kind === "attack3d6") ? "var(--accent)" : "var(--ink)" }}>
              {e.kind === "note" && e.total > 0 ? `+${e.total}` : e.total}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function QuickReference() {
  return (
    <Section title="Quick Reference">
      <RefBlock title="Actions on your turn" lines={[
        "1 main action (strike, cast, dash)",
        "1 move action (stride your Short)",
        "1 free action (drop item, speak briefly)",
        "1 reaction (until start of next turn)",
      ]} />
      <RefBlock title="Movement bands" lines={[
        "Short — one action; full-speed",
        "Medium — two actions; can sprint",
        "Long  — full turn; line-of-sight only",
      ]} />
      <RefBlock title="Common DCs" lines={[
        "Easy 10  ·  Routine 12",
        "Hard 15  ·  Severe 18",
        "Heroic 22  ·  Legendary 28",
      ]} />
      <RefBlock title="Hazards" lines={[
        "Roll the offense die against target's Guard.",
        "To resist, target rolls vs. defense (DC).",
        "Higher dice mean broader / messier effects.",
      ]} />
    </Section>
  );
}
function RefBlock({ title, lines }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="smcp" style={{ fontSize: 9, marginBottom: 2 }}>{title}</div>
      <div className="mono" style={{ fontSize: 11, color: "var(--ink-2)", lineHeight: 1.5 }}>
        {lines.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--rule-2)", marginBottom: 10 }}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} className="smcp"
            style={{
              padding: "8px 14px",
              borderBottom: "2px solid " + (on ? "var(--accent)" : "transparent"),
              color: on ? "var(--ink)" : "var(--ink-3)",
              fontSize: 11, transform: "translateY(1px)",
            }}>
            {t.label}
            {t.count != null && <span className="mono" style={{ marginLeft: 6, color: "var(--ink-4)", fontWeight: 400 }}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function InventoryBlock({ c, setC, totalWeight, carry, filter, setFilter }) {
  const edit = (i, patch) => setC((c) => ({ ...c, inventory: c.inventory.map((it, j) => j === i ? { ...it, ...patch } : it) }));
  const remove = (i) => setC((c) => ({ ...c, inventory: c.inventory.filter((_, j) => j !== i) }));
  const add = () => setC((c) => ({ ...c, inventory: [...c.inventory, { name: "Item", qty: 1, wt: 0, bag: "Pack" }] }));
  const list = c.inventory.filter((it) => !filter || it.name.toLowerCase().includes(filter.toLowerCase()) || (it.bag || "").toLowerCase().includes(filter.toLowerCase()));
  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <input placeholder="search inventory…" value={filter} onChange={(e) => setFilter(e.target.value)}
          style={{ flex: "0 0 220px", border: "1px solid var(--rule)", borderRadius: 3, padding: "3px 8px" }} />
        <button onClick={add} className="smcp" style={{ color: "var(--accent)", border: "1px solid var(--rule)", padding: "3px 10px", borderRadius: 3 }}>+ Item</button>
        <div style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
          Weight <span style={{ color: "var(--ink)" }}>{totalWeight}</span> / {carry} lb
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2.2fr 0.6fr 0.6fr 0.8fr 1.5fr auto", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--rule-2)" }}>
        <span className="smcp">Item</span>
        <span className="smcp" style={{ textAlign: "right" }}>Qty</span>
        <span className="smcp" style={{ textAlign: "right" }}>Wt</span>
        <span className="smcp">Bag</span>
        <span className="smcp">Note</span>
        <span></span>
      </div>
      {list.map((it) => {
        const i = c.inventory.indexOf(it);
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2.2fr 0.6fr 0.6fr 0.8fr 1.5fr auto", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--rule)", alignItems: "center" }}>
            <input value={it.name} onChange={(e) => edit(i, { name: e.target.value })} style={{ width: "100%" }} />
            <input type="number" value={it.qty} onChange={(e) => edit(i, { qty: parseInt(e.target.value || "0", 10) })} className="mono" style={{ textAlign: "right" }} />
            <input type="number" value={it.wt} onChange={(e) => edit(i, { wt: parseFloat(e.target.value || "0") })} className="mono" style={{ textAlign: "right" }} />
            <input value={it.bag || ""} onChange={(e) => edit(i, { bag: e.target.value })} className="mono" style={{ fontSize: 11 }} />
            <input value={it.note || ""} onChange={(e) => edit(i, { note: e.target.value })} style={{ fontSize: 12, color: "var(--ink-2)" }} />
            <button onClick={() => remove(i)} style={{ color: "var(--ink-4)", padding: "2px 6px" }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

function FeaturesBlock({ c, setC }) {
  const edit = (i, patch) => setC((c) => ({ ...c, features: c.features.map((f, j) => j === i ? { ...f, ...patch } : f) }));
  const remove = (i) => setC((c) => ({ ...c, features: c.features.filter((_, j) => j !== i) }));
  const add = () => setC((c) => ({ ...c, features: [...c.features, { name: "New feature", src: "Class", desc: "Describe what this does." }] }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {c.features.map((f, i) => (
        <div key={i} style={{ padding: 10, border: "1px solid var(--rule)", borderRadius: 4, background: "var(--bg-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
            <input className="serif" value={f.name} onChange={(e) => edit(i, { name: e.target.value })}
              style={{ font: "500 16px/1.2 var(--serif)", flex: 1 }} />
            <input value={f.src} onChange={(e) => edit(i, { src: e.target.value })}
              className="smcp" style={{ width: 100, textAlign: "right", fontSize: 9 }} />
            <button onClick={() => remove(i)} style={{ color: "var(--ink-4)" }}>×</button>
          </div>
          <textarea value={f.desc} onChange={(e) => edit(i, { desc: e.target.value })}
            style={{
              width: "100%", marginTop: 6, border: "1px solid var(--rule)", borderRadius: 3,
              padding: "6px 8px", fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.5, color: "var(--ink-2)",
              minHeight: 60, resize: "vertical", background: "var(--bg)",
            }} />
        </div>
      ))}
      <button onClick={add} style={{ padding: 10, border: "1px dashed var(--rule-2)", borderRadius: 4, color: "var(--ink-3)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80 }}>
        + Add feature
      </button>
    </div>
  );
}

function NotesBlock({ c, update }) {
  return (
    <textarea value={c.notes} onChange={(e) => update({ notes: e.target.value })}
      style={{
        width: "100%", minHeight: 240, border: "1px solid var(--rule)", borderRadius: 4,
        padding: "10px 12px", fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.6,
        background: "var(--bg-2)", color: "var(--ink)", resize: "vertical",
      }} placeholder="Goals, leads, debts, secrets…" />
  );
}

function EquipmentBlock({ c, update, attrOf }) {
  return (
    <div>
      <WeaponLoadoutBlock c={c} update={update} attrOf={attrOf} />
      <Section title="Armor">
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end", padding: "4px 0" }}>
          <SelectField label="Core Armor" v={c.coreArmor} options={Object.keys(CORE_ARMOR)} onChange={(v) => update({ coreArmor: v })} w={150} />
        </div>
      </Section>
    </div>
  );
}
