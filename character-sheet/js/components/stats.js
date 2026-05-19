// ═══════════════════════════════════════════════════════════════════════
//  STATS — top stat bar and all derived-stat display components
// ═══════════════════════════════════════════════════════════════════════

function TopStatBar({ c, update, attrOf }) {
  return (
    <div style={{ marginTop: 14, padding: 14, background: "var(--bg-2)", border: "1px solid var(--rule)", borderRadius: 6, display: "grid", gridTemplateColumns: "auto auto auto 1fr", gap: 16, alignItems: "end" }}>
      <AttributesRibbon c={c} attrOf={attrOf} />
      <MovementBlock c={c} />
      <DerivedStatBlock label="Initiative" parts={[
        { label: "Guile", value: attrOf("guile") },
        { label: "Base Initiative", value: c.initiative || 0 },
        { label: "Equipment", value: 0 },
      ]} />

      <div />
    </div>
  );
}

function SecondaryRibbon({ c, update, pushRoll }) {
  return (
    <div style={{
      marginTop: 14, padding: 14,
      display: "grid", gridTemplateColumns: "auto auto 1fr", gap: 24, alignItems: "start",
    }}>
      <DefensesBlock c={c} />
      <HazardsBlock c={c} pushRoll={pushRoll} style={HAZARD_STYLE} />
      <OffenseBlock c={c} update={update} pushRoll={pushRoll} />
    </div>
  );
}

function DefensesBlock({ c }) {
  const anc = ANCESTRIES[c.ancestry] || {};
  const arm = CORE_ARMOR[c.coreArmor] || {};
  const woundDie = deriveWoundDie(c);
  const woundThresholds = ["w1", "w2", "w3", "w4", "w5"].reduce((acc, k) => {
    const prev = acc.length ? acc[acc.length - 1] : 0;
    acc.push(prev + (anc[k] || 0) + (arm[k] || 0));
    return acc;
  }, []);
  return (
    <Section title="Defense" titleAlign="right" prominent>
      <div className="defenses-grid">
        <div className="defenses-grid__col">
          <div className="stat-cell--lg">
            <WoundThresholdsBlock anc={anc} arm={arm} thresholds={woundThresholds} />
          </div>
          <WoundDieBlock woundDie={woundDie} />
        </div>
        <div className="defenses-grid__col defenses-grid__col--stack">
          <DerivedStatBlock label="Guard" signed={false}
            parts={guardParts(c)} />
          <MaxHitsBlock c={c} />
          <DerivedStatBlock label="Parry" signed={false} zeroDash
            parts={parryParts(c)} />
          <DerivedStatBlock label="Hit Reduction"
            displayLabel={<>Hit<br />Reduction</>}
            signed={false} zeroDash
            parts={hitReductionParts(c)} />
        </div>
      </div>
    </Section>
  );
}

function OffenseBlock({ c, update, pushRoll }) {
  const [bonus, setBonus] = useState(0);
  const [adv, setAdv] = useState(0);
  const [locked, setLocked] = useState(false);
  const toggleEquip = (i) => update({
    loadouts: c.loadouts.map((lo, j) => ({
      ...lo,
      equipped: j === i ? !lo.equipped : false,
    })),
  });
  const updateRow = (i, patch) => update({
    loadouts: c.loadouts.map((lo, j) => j === i ? { ...lo, ...patch } : lo),
  });

  const attackTotal = attackBonusParts(c).reduce((s, p) => s + (p.value || 0), 0);
  const rollAttack = () => {
    const N = Math.abs(adv);
    const numDice = 3 + N;
    const mod = attackTotal + bonus;
    const advLabel = adv > 0 ? ` (adv ×${adv})` : adv < 0 ? ` (dis ×${-adv})` : "";

    if (FoundryBridge.isEmbedded()) {
      let formula = `${numDice}d6`;
      if (adv > 0) formula += "kh3";
      else if (adv < 0) formula += "kl3";
      if (mod > 0) formula += ` + ${mod}`;
      else if (mod < 0) formula += ` - ${-mod}`;
      FoundryBridge.roll(formula, `${c.name} — Attack${advLabel}`);
    } else if (pushRoll) {
      const all = [];
      for (let i = 0; i < numDice; i++) all.push(1 + Math.floor(Math.random() * 6));
      const sortedIdx = all
        .map((v, i) => ({ v, i }))
        .sort((a, b) => adv >= 0 ? b.v - a.v : a.v - b.v);
      const keepIdx = new Set(sortedIdx.slice(0, 3).map((x) => x.i));
      const kept = all.filter((_, i) => keepIdx.has(i));
      const diceTotal = kept.reduce((s, n) => s + n, 0);
      pushRoll({
        kind: "attack3d6",
        label: `Attack — 3d6${fmtMod(mod)}${advLabel}`,
        rolls: all, keepIdx: Array.from(keepIdx), kept, mod, diceTotal, total: diceTotal + mod,
      });
    }

    if (!locked) { setBonus(0); setAdv(0); }
  };

  return (
    <Section title="Offense" prominent>
      <div className="offense-block">
        <div className="offense-stats">
          <div className="offense-stats__col">
            <div className="stat-cell--lg">
              <DerivedStatBlock label="Attack" signed={true}
                parts={attackBonusParts(c)} />
            </div>
            <DerivedStatBlock label="Damage" signed={true}
              parts={damageBonusParts(c)} />
          </div>
          <AttackRollCalculator
            attackTotal={attackTotal}
            bonus={bonus} setBonus={setBonus}
            adv={adv} setAdv={setAdv}
            locked={locked} setLocked={setLocked}
            onRoll={rollAttack} />
        </div>
        <div className="offense-loadouts">
          <div className="smcp offense-loadouts__label">Loadouts</div>
          {c.loadouts.map((lo, i) => (
            <LoadoutSummaryLine key={i} lo={lo}
              onToggleEquip={() => toggleEquip(i)}
              onChange={(patch) => updateRow(i, patch)} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function AttackRollCalculator({ attackTotal, bonus, setBonus, adv, setAdv, locked, setLocked, onRoll }) {
  const total = attackTotal + bonus;
  const advText = adv > 0 ? `+${adv} adv` : adv < 0 ? `${-adv} dis` : "—";
  return (
    <div className="atk-calc">
      <button className="atk-calc__roll" onClick={onRoll}
        title="Roll 3d6 + Attack + Bonus, applying adv/disadv">
        <span className="smcp atk-calc__roll-label">Roll Attack</span>
        <span className="mono serif atk-calc__roll-expr">{total === 0 ? "3d6" : `3d6 ${fmtMod(total)}`}</span>
      </button>
      <div className="atk-calc__controls">
        <Stepper label="Bonus"
          onDec={() => setBonus((x) => x - 1)} onInc={() => setBonus((x) => x + 1)}
          display={fmtMod(bonus)} />
        <Stepper label="Adv"
          onDec={() => setAdv((x) => x - 1)} onInc={() => setAdv((x) => x + 1)}
          display={advText} />
      </div>
      <button className={"atk-calc__lock" + (locked ? " is-locked" : "")}
        onClick={() => setLocked((x) => !x)}
        title={locked ? "Locked — bonus and adv persist between rolls" : "Unlocked — bonus and adv reset after each roll"}>
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          {locked
            ? <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            : <path d="M8 11V8a4 4 0 0 1 8 0" />}
        </svg>
      </button>
    </div>
  );
}

function Stepper({ label, onDec, onInc, display }) {
  return (
    <div className="atk-calc__stepper">
      <span className="smcp atk-calc__stepper-label">{label}</span>
      <div className="atk-calc__stepper-row">
        <button className="atk-calc__step-btn" onClick={onDec}>−</button>
        <span className="mono atk-calc__stepper-val">{display}</span>
        <button className="atk-calc__step-btn" onClick={onInc}>+</button>
      </div>
    </div>
  );
}

function LoadoutSummaryLine({ lo, onToggleEquip, onChange }) {
  const [popup, setPopup] = useState(null);
  const eq = !!lo.equipped;
  const style = lo.fightingStyle;
  const merged = style === "Two-Handed" || style === "Ranged" || style === "Free-Handed";
  const offHasWeapon = lo.offHand && lo.offHand !== NONE;
  const close = () => setPopup(null);
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "80px minmax(0, 1fr) minmax(0, 1fr) auto",
      gap: 8,
      alignItems: "center",
      padding: "3px 0 3px 8px",
      borderLeft: "2px solid " + (eq ? "var(--accent)" : "transparent"),
    }}>
      <button onClick={() => setPopup(popup === "style" ? null : "style")}
        title={`${style} — click for details`}
        className="smcp"
        style={{
          fontSize: 9, letterSpacing: "0.1em", textAlign: "left",
          color: eq ? "var(--accent)" : "var(--ink-3)",
          padding: "2px 0", borderRadius: 2,
          position: "relative",
        }}>
        {style}
        {popup === "style" && (
          <EffectsPopup title={style}
            summary={(FIGHTING_STYLE_DETAILS[style] || {}).summary}
            effects={(FIGHTING_STYLE_DETAILS[style] || {}).effects}
            onClose={close} />
        )}
      </button>

      {merged ? (
        <MergedHandCell style={style} lo={lo} eq={eq}
          open={popup === "main"} onOpen={() => setPopup(popup === "main" ? null : "main")}
          onClose={close} />
      ) : (
        <>
          <HandCell display={lo.mainHand} weaponKey={lo.mainHand} bordered eq={eq}
            open={popup === "main"} onOpen={() => setPopup(popup === "main" ? null : "main")}
            onClose={close} />
          <HandCell display={offHasWeapon ? lo.offHand : "Free Hand"}
            weaponKey={offHasWeapon ? lo.offHand : "Hand"}
            italic={!offHasWeapon}
            bordered={offHasWeapon} eq={eq}
            open={popup === "off"} onOpen={() => setPopup(popup === "off" ? null : "off")}
            onClose={close} />
        </>
      )}

      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <IconButton title="Edit loadout"
          active={popup === "edit"}
          onClick={() => setPopup(popup === "edit" ? null : "edit")}>
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          {popup === "edit" && (
            <LoadoutEditPopup lo={lo} onChange={onChange} onClose={close} />
          )}
        </IconButton>
        <IconButton title={eq ? "Click to unequip" : "Click to equip"}
          highlighted={eq}
          pressed={eq}
          onClick={onToggleEquip}>
          <svg viewBox="0 0 24 24" width="14" height="14"
            stroke="currentColor" strokeWidth="2" fill="none"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            {eq && <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />}
          </svg>
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({ title, active, highlighted, pressed, onClick, children }) {
  const isOn = !!highlighted;
  const isOpen = !!active;
  return (
    <button onClick={onClick} title={title} aria-pressed={pressed}
      style={{
        width: 22, height: 22, borderRadius: 3,
        border: "1px solid " + (isOn || isOpen ? "var(--accent)" : "var(--rule)"),
        background: isOn || isOpen ? "var(--accent-bg)" : "transparent",
        color: isOn || isOpen ? "var(--accent)" : "var(--ink-3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (isOn || isOpen) return;
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        if (isOn || isOpen) return;
        e.currentTarget.style.borderColor = "var(--rule)";
        e.currentTarget.style.color = "var(--ink-3)";
      }}>
      {children}
    </button>
  );
}

function HandCell({ display, weaponKey, italic, bordered, eq, open, onOpen, onClose }) {
  return (
    <div style={{
      position: "relative",
      padding: bordered ? "5px 8px" : "5px 4px",
      background: bordered ? "var(--bg-2)" : "transparent",
      border: "1px solid " + (bordered ? "var(--rule)" : "transparent"),
      borderRadius: 3,
      textAlign: "center",
    }}>
      <button onClick={onOpen}
        title={`${weaponKey} — click for details`}
        className="serif"
        style={{
          fontSize: 13, lineHeight: 1.1, padding: 0,
          color: italic ? "var(--ink-4)" : (eq ? "var(--ink)" : "var(--ink-3)"),
          fontStyle: italic ? "italic" : "normal",
        }}>
        {display}
      </button>
      {open && (
        <EffectsPopup title={weaponKey}
          summary={(WEAPON_DETAILS[weaponKey] || {}).summary}
          effects={(WEAPON_DETAILS[weaponKey] || {}).effects}
          onClose={onClose} />
      )}
    </div>
  );
}

function MergedHandCell({ style, lo, open, onOpen, onClose, eq }) {
  const isFree = style === "Free-Handed";
  const display = isFree ? "Free Hands" : (lo.mainHand || "—");
  const weaponKey = isFree ? "Hand" : lo.mainHand;
  return (
    <div style={{
      gridColumn: "2 / span 2",
      position: "relative",
      padding: isFree ? "5px 4px" : "5px 8px",
      background: isFree ? "transparent" : "var(--bg-2)",
      border: "1px solid " + (isFree ? "transparent" : "var(--rule)"),
      borderRadius: 3,
      textAlign: "center",
    }}>
      <button onClick={onOpen}
        title={`${weaponKey} — click for details`}
        className="serif"
        style={{
          fontSize: 13, lineHeight: 1.1, padding: 0,
          color: isFree ? "var(--ink-4)" : (eq ? "var(--ink)" : "var(--ink-3)"),
          fontStyle: isFree ? "italic" : "normal",
        }}>
        {display}
      </button>
      {open && (
        <EffectsPopup title={weaponKey}
          summary={(WEAPON_DETAILS[weaponKey] || {}).summary}
          effects={(WEAPON_DETAILS[weaponKey] || {}).effects}
          onClose={onClose} />
      )}
    </div>
  );
}

function LoadoutEditPopup({ lo, onChange, onClose }) {
  const ref = useRef(null);
  useViewportClamp(ref);
  const mh = mainHandOptionsFor(lo.fightingStyle);
  const oh = offHandOptionsFor(lo.fightingStyle);
  const offOptions = oh.fixed ? [oh.fixed] : oh.options;
  return (
    <div ref={ref} className="effects-popup" onClick={(e) => e.stopPropagation()}>
      <div className="effects-popup__header">
        <div className="serif effects-popup__title">Edit Loadout</div>
        <button onClick={onClose} title="Close" className="effects-popup__close">×</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <EditRow label="Fighting Style">
          <select value={lo.fightingStyle}
            onChange={(e) => onChange(fightingStylePatch(lo, e.target.value))}
            className="bare-select" style={{ width: "100%" }}>
            {FIGHTING_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </EditRow>
        <EditRow label="Main Hand">
          <select value={lo.mainHand}
            onChange={(e) => onChange({ mainHand: e.target.value })}
            disabled={mh.disabled}
            className={"bare-select" + (mh.disabled ? " is-locked" : "")} style={{ width: "100%" }}>
            {mh.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </EditRow>
        <EditRow label="Off Hand">
          <select value={lo.offHand}
            onChange={(e) => onChange({ offHand: e.target.value })}
            disabled={oh.disabled || !!oh.fixed}
            className={"bare-select" + (oh.disabled || oh.fixed ? " is-locked" : "")} style={{ width: "100%" }}>
            {offOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </EditRow>
      </div>
    </div>
  );
}

function EditRow({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span className="smcp" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>{label}</span>
      {children}
    </label>
  );
}

function MaxHitsBlock({ c }) {
  const [open, setOpen] = useState(null); // null | "explain" | "derive"
  const value = deriveMaxHits(c);
  const toggle = (kind) => setOpen((x) => (x === kind ? null : kind));
  return (
    <div className="maxhits-block">
      <button onClick={() => toggle("explain")}
        className="maxhits-block__label-btn"
        title="Max Hits — click for explanation">
        <span className="smcp maxhits-block__label">Max Hits</span>
      </button>
      <button onClick={() => toggle("derive")}
        className={"serif mono maxhits-block__value" + (open === "derive" ? " is-open" : "")}
        title="Max Hits — click for breakdown">
        {value}
      </button>
      {open === "explain" && (
        <ExplanationPopup label="Max Hits" body={STAT_EXPLANATIONS["Max Hits"]}
          onClose={() => setOpen(null)} />
      )}
      {open === "derive" && (
        <DerivationPopup label="Max Hits" parts={maxHitsParts(c)}
          fmt={(n) => `${n}`} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

function WoundThresholdsBlock({ anc, arm, thresholds }) {
  const [openIdx, setOpenIdx] = useState(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const partsFor = (i) => {
    const ancVal = anc[`w${i + 1}`] || 0;
    const armVal = arm[`w${i + 1}`] || 0;
    const list = [];
    if (i > 0) list.push({ label: "Previous", value: thresholds[i - 1] });
    if (ancVal) list.push({ label: "Ancestry", value: ancVal });
    if (armVal) list.push({ label: "Equipment", value: armVal });
    return list;
  };
  return (
    <div className="wound-thresholds">
      <button onClick={() => setExplainOpen((x) => !x)}
        className="wound-thresholds__label-btn"
        title="Wound Limits — click for explanation">
        <span className="smcp wound-thresholds__label">Wound<br />Limits</span>
      </button>
      {explainOpen && (
        <ExplanationPopup label="Wound Limits" body={STAT_EXPLANATIONS["Wound Limits"]}
          onClose={() => setExplainOpen(false)} />
      )}
      <div className="wound-thresholds__row">
        {thresholds.map((v, i) => (
          <div key={i} className="wound-threshold">
            <div className="smcp wound-threshold__idx">{ordinal(i + 1)}</div>
            <button
              className={"wound-threshold__btn" + (openIdx === i ? " is-open" : "")}
              onClick={() => setOpenIdx((x) => x === i ? null : i)}
              title={`Wound ${i + 1} — click for breakdown`}>
              <span className="serif mono">{v}</span>
            </button>
            {openIdx === i && (
              <DerivationPopup label={`Wound ${i + 1}`} parts={partsFor(i)}
                fmt={(n) => `${n}`} onClose={() => setOpenIdx(null)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DerivedStatBlock({ label, displayLabel, parts, signed = true, sub, zeroDash = false }) {
  const [open, setOpen] = useState(null); // null | "explain" | "derive"
  const total = parts.reduce((a, p) => a + (p.value || 0), 0);
  const fmt = signed
    ? fmtMod
    : (n) => (zeroDash && n === 0 ? "-" : `${n}`);
  const toggle = (kind) => setOpen((x) => (x === kind ? null : kind));
  return (
    <div className="derived-stat">
      <div className={"derived-stat__btn" + (open ? " is-open" : "")}>
        <button onClick={() => toggle("explain")}
          className="derived-stat__label-btn"
          title={`${label} — click for explanation`}>
          <span className="smcp derived-stat__label">{displayLabel || label}</span>
        </button>
        <button onClick={() => toggle("derive")}
          className={"derived-stat__value-btn" + (open === "derive" ? " is-open" : "")}
          title={`${label} — click for breakdown`}>
          <span className="mono serif derived-stat__value">{fmt(total)}</span>
          {sub && <span className="smcp derived-stat__sub">{sub}</span>}
        </button>
      </div>
      {open === "explain" && (
        <ExplanationPopup label={label} body={STAT_EXPLANATIONS[label]}
          onClose={() => setOpen(null)} />
      )}
      {open === "derive" && (
        <DerivationPopup label={label} parts={parts} fmt={fmt}
          onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

function WoundDieBlock({ woundDie }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      position: "relative",
      padding: "8px 12px", background: "var(--bg-2)", border: "1px solid var(--rule)", borderRadius: 4,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 80,
    }}>
      <button onClick={() => setOpen((x) => !x)}
        className="wound-die__label-btn"
        title="Wound Die — click for explanation">
        <span className="smcp" style={{ fontSize: 9 }}>Wound Die</span>
      </button>
      <DieBadge die={woundDie} size="lg" />
      <div className="smcp" style={{ fontSize: 9, color: "var(--ink-4)" }}>derived</div>
      {open && (
        <ExplanationPopup label="Wound Die" body={STAT_EXPLANATIONS["Wound Die"]}
          onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

function MovementBlock({ c }) {
  const anc = ANCESTRIES[c.ancestry] || {};
  // open is { kind: "derive"|"explain", key: "short"|"medium"|"long"|"group" } | null
  const [open, setOpen] = useState(null);
  const isOpen = (kind, key) => open && open.kind === kind && open.key === key;
  const toggle = (kind, key) => setOpen((x) =>
    x && x.kind === kind && x.key === key ? null : { kind, key });
  const cell = (label, key, fieldKey, accent) => {
    const value = anc[fieldKey] || 0;
    const deriveOpen = isOpen("derive", key);
    const explainOpen = isOpen("explain", key);
    return (
      <div className="movement__cell">
        <button onClick={() => toggle("derive", key)}
          className={"movement__btn" + (accent ? " is-accent" : "") + (deriveOpen ? " is-open" : "")}
          title={`${label} — click for breakdown`}>
          <span className="serif mono movement__value">{value}</span>
        </button>
        <button onClick={() => toggle("explain", key)}
          className="movement__label-btn"
          title={`${label} — click for explanation`}>
          <span className="smcp movement__label">{label}</span>
        </button>
        {deriveOpen && (
          <DerivationPopup
            label={label}
            parts={[{ label: "Ancestry", value }]}
            fmt={(n) => `${n}`}
            onClose={() => setOpen(null)} />
        )}
        {explainOpen && (
          <ExplanationPopup label={label} body={STAT_EXPLANATIONS[label]}
            onClose={() => setOpen(null)} />
        )}
      </div>
    );
  };
  const headingOpen = isOpen("explain", "group");
  return (
    <div className="movement">
      <button onClick={() => toggle("explain", "group")}
        className="movement__heading-btn"
        title="Movement — click for explanation">
        <span className="smcp movement__heading">Movement <span className="movement__unit">· sq</span></span>
      </button>
      {headingOpen && (
        <ExplanationPopup label="Movement" body={STAT_EXPLANATIONS["Movement"]}
          onClose={() => setOpen(null)} />
      )}
      <div className="movement__row">
        {cell("Short", "short", "short_move", true)}
        <span className="movement__sep" />
        {cell("Med", "medium", "medium_move", false)}
        {cell("Long", "long", "long_move", false)}
      </div>
    </div>
  );
}

function AttributesRibbon({ c, attrOf }) {
  // open is { kind: "derive"|"explain", key: "group"|attrKey } | null
  const [open, setOpen] = useState(null);
  const isOpen = (kind, key) => open && open.kind === kind && open.key === key;
  const toggle = (kind, key) => setOpen((x) =>
    x && x.kind === kind && x.key === key ? null : { kind, key });
  const groupOpen = isOpen("explain", "group");
  return (
    <div className="attr-ribbon">
      <div className="attr-ribbon__heading">
        <span className="attr-ribbon__heading-rule" />
        <button onClick={() => toggle("explain", "group")}
          className="attr-ribbon__heading-btn"
          title="Attributes — click for explanation">
          Attributes
        </button>
        <span className="attr-ribbon__heading-rule" />
        {groupOpen && (
          <ExplanationPopup label="Attributes" body={STAT_EXPLANATIONS["Attributes"]}
            onClose={() => setOpen(null)} />
        )}
      </div>
      <div className="attr-ribbon__row">
        {ATTRIBUTES.map((a) => {
          const v = attrOf(a.key);
          const deriveOpen = isOpen("derive", a.key);
          const explainOpen = isOpen("explain", a.key);
          return (
            <div key={a.key} className="attr-card">
              <button onClick={() => toggle("explain", a.key)}
                className="attr-card__name-btn"
                title={`${a.name} — click for explanation`}>
                <span className="attr-card__name">{a.name}</span>
              </button>
              <button onClick={() => toggle("derive", a.key)}
                title={`${a.name} — click for breakdown`}
                className={"serif mono attr-card__value" + (deriveOpen ? " is-open" : "")}>
                {v === 0 ? "-" : v}
              </button>
              <div className="smcp attr-card__short">{a.short}</div>
              {deriveOpen && (
                <DerivationPopup label={a.name} parts={attributeParts(c, a.key)}
                  fmt={fmtMod} onClose={() => setOpen(null)} />
              )}
              {explainOpen && (
                <ExplanationPopup label={a.name} body={STAT_EXPLANATIONS[a.name]}
                  onClose={() => setOpen(null)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HazardsBlock({ c, pushRoll, style }) {
  const anc = ANCESTRIES[c.ancestry] || {};
  const ancCommitted = !!(c.committed && c.committed.ancestry);
  const ranks = c.hazard_ranks || {};
  const attrOf = (k) => deriveAttribute(c, k);
  const [groupExplain, setGroupExplain] = useState(false);

  const hazards = c.hazards.map((h) => {
    const formula = HAZARD_FORMULAS[h.key] || { attrs: [] };
    const parts = formula.attrs.map((k) => {
      const a = ATTRIBUTES.find((aa) => aa.key === k);
      return { label: a ? a.name : k, value: attrOf(k) };
    });
    parts.push({ label: "Rank", value: ranks[h.key] || 0 });
    parts.push({ label: "Ancestry", value: ancCommitted ? (anc[h.key] || 0) : 0 });
    const defense = parts.reduce((sum, p) => sum + (p.value || 0), 0);
    return { ...h, defense, parts };
  });

  return (
    <Section title="Hazards" titleAlign="center" prominent
      onTitleClick={() => setGroupExplain((x) => !x)}
      titleHint="Hazards — click for explanation">
      <div style={{ position: "relative" }}>
        {groupExplain && (
          <ExplanationPopup label="Hazards" body={STAT_EXPLANATIONS["Hazards"]}
            onClose={() => setGroupExplain(false)} />
        )}
      </div>
      {style === "spine" && <HazardSpine hazards={hazards} />}
      {style === "cards" && <HazardCards hazards={hazards} />}
      {style === "compact" && <HazardCompact hazards={hazards} />}
      {(!style || style === "rows") && <HazardRows hazards={hazards} />}
    </Section>
  );
}

function HazardSpine({ hazards }) {
  // open is { kind: "derive"|"explain", key } | null
  const [open, setOpen] = useState(null);
  const isOpen = (kind, key) => open && open.kind === kind && open.key === key;
  const toggle = (kind, key) => setOpen((x) =>
    x && x.kind === kind && x.key === key ? null : { kind, key });
  return (
    <div className="hazard-spine">
      {hazards.map((h) => {
        const deriveOpen = isOpen("derive", h.key);
        const explainOpen = isOpen("explain", h.key);
        return (
          <div key={h.key} className="hazard-spine__row">
            <button onClick={() => toggle("derive", h.key)}
              className={"hazard-spine__defense" + (deriveOpen ? " is-open" : "")}
              title={`${h.name} Defense — click for breakdown`}>
              <span className="serif mono hazard-spine__defense-value">{h.defense === 0 ? "-" : h.defense}</span>
            </button>
            <button onClick={() => toggle("explain", h.key)}
              className="hazard-spine__name-btn"
              title={`${h.name} — click for explanation`}>
              <span className="smcp hazard-spine__name">{h.name}</span>
            </button>
            <div className="mono hazard-spine__offense">{String(h.offense).toUpperCase()}</div>
            {deriveOpen && (
              <DerivationPopup label={h.name + " Defense"} parts={h.parts}
                fmt={(n) => `${n}`} onClose={() => setOpen(null)} />
            )}
            {explainOpen && (
              <ExplanationPopup label={h.name} body={STAT_EXPLANATIONS[h.name]}
                onClose={() => setOpen(null)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function HazardRows({ hazards }) {
  return (
    <div>
      {hazards.map((h) => (
        <div key={h.key} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>
          <DieBadge die={h.offense} size="md" />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontWeight: 500 }}>{h.name}</span>
            <span className="smcp" style={{ fontSize: 9, color: "var(--ink-4)" }}>offense · defense</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0 }}>
            <span className="serif mono" style={{ font: "500 22px/1 var(--serif)", width: 44, textAlign: "right", color: "var(--ink)" }}>{h.defense === 0 ? "-" : h.defense}</span>
            <span className="smcp" style={{ fontSize: 9, color: "var(--ink-4)" }}>Defense</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function HazardCompact({ hazards }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: "var(--ink-3)" }}>
          <th className="smcp" style={{ textAlign: "left", padding: "4px 0", fontSize: 9 }}>Hazard</th>
          <th className="smcp" style={{ textAlign: "center", padding: "4px 0", fontSize: 9 }}>Off</th>
          <th className="smcp" style={{ textAlign: "right", padding: "4px 0", fontSize: 9 }}>Defense</th>
        </tr>
      </thead>
      <tbody>
        {hazards.map((h) => (
          <tr key={h.key} style={{ borderTop: "1px solid var(--rule)" }}>
            <td style={{ padding: "5px 0" }}>{h.name}</td>
            <td style={{ padding: "5px 0", textAlign: "center" }}>
              <DieBadge die={h.offense} size="sm" />
            </td>
            <td style={{ padding: "5px 0", textAlign: "right" }}>
              <span className="mono" style={{ fontSize: 15, fontWeight: 500 }}>{h.defense === 0 ? "-" : h.defense}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HazardCards({ hazards }) {
  // open is { kind: "derive"|"explain", key } | null
  const [open, setOpen] = useState(null);
  const isOpen = (kind, key) => open && open.kind === kind && open.key === key;
  const toggle = (kind, key) => setOpen((x) =>
    x && x.kind === kind && x.key === key ? null : { kind, key });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {hazards.map((h) => {
        const deriveOpen = isOpen("derive", h.key);
        const explainOpen = isOpen("explain", h.key);
        return (
          <div key={h.key} className="hazard-card">
            <button onClick={() => toggle("explain", h.key)}
              className="hazard-card__name-btn"
              title={`${h.name} — click for explanation`}>
              <span className="smcp hazard-card__name">{h.name}</span>
            </button>
            <DieBadge die={h.offense} size="md" />
            <button onClick={() => toggle("derive", h.key)}
              className={"hazard-card__defense" + (deriveOpen ? " is-open" : "")}
              title={`${h.name} Defense — click for breakdown`}>
              <span className="smcp hazard-card__defense-label">Defense</span>
              <span className="serif mono hazard-card__defense-value">{h.defense === 0 ? "-" : h.defense}</span>
            </button>
            {deriveOpen && (
              <DerivationPopup label={h.name + " Defense"} parts={h.parts}
                fmt={(n) => `${n}`} onClose={() => setOpen(null)} />
            )}
            {explainOpen && (
              <ExplanationPopup label={h.name} body={STAT_EXPLANATIONS[h.name]}
                onClose={() => setOpen(null)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CombatMisc({ c, update, pushRoll, attrOf, carry }) {
  return (
    <Section title="Field Notes">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Row label="Armor" v={c.armor || ""} onChange={(v) => update({ armor: v })} />
        <Row label="Carry" v={`${carry} lb`} readOnly />
        <Row label="Prof. Bonus" v={c.profBonus} type="number" w={50} onChange={(v) => update({ profBonus: parseInt(v || "0", 10) })} />
        <Row label="Base Initiative" v={c.initiative} type="number" w={50} onChange={(v) => update({ initiative: parseInt(v || "0", 10) })} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <BtnSmall onClick={() => { const r = rollDice(1, 20); pushRoll({ kind: "raw", label: "d20", rolls: r.rolls, total: r.total }); }}>d20</BtnSmall>
        <BtnSmall onClick={() => { const r = rollDice(2, 20); pushRoll({ kind: "raw", label: "2d20", rolls: r.rolls, total: r.total }); }}>2d20</BtnSmall>
        <BtnSmall onClick={() => { const r = rollDice(1, 100); pushRoll({ kind: "raw", label: "d100", rolls: r.rolls, total: r.total }); }}>d100</BtnSmall>
      </div>
    </Section>
  );
}
