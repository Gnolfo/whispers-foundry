// ═══════════════════════════════════════════════════════════════════════
//  UI — generic primitives used throughout the app
// ═══════════════════════════════════════════════════════════════════════

function useFoundryConnection() {
  const snapshot = () => {
    const embedded = FoundryBridge.isEmbedded();
    const context = FoundryBridge.context();
    return { embedded, context, connected: embedded && context !== null };
  };
  const [state, setState] = useState(snapshot);
  useEffect(() => {
    if (typeof FoundryBridge.subscribe !== "function") return undefined;
    return FoundryBridge.subscribe(() => setState(snapshot()));
  }, []);
  return state;
}

function useViewportClamp(ref) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--clamp-x", "0px");
    el.style.setProperty("--clamp-y", "0px");
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let dx = 0;
    let dy = 0;
    if (rect.right > vw - margin) dx = (vw - margin) - rect.right;
    if (rect.left + dx < margin) dx = margin - rect.left;
    if (rect.bottom > vh - margin) dy = (vh - margin) - rect.bottom;
    if (rect.top + dy < margin) dy = margin - rect.top;
    if (dx) el.style.setProperty("--clamp-x", dx + "px");
    if (dy) el.style.setProperty("--clamp-y", dy + "px");
  });
}

function RollChip({ label, value, kind = "check", onRoll, big = false, mini = false, className = "" }) {
  const [flash, setFlash] = useState(0);
  const v = Number(value) || 0;
  const display = kind === "dc" ? `${10 + v}` : fmtMod(v);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        const d = rollD20();
        const total = d + v;
        setFlash((x) => x + 1);
        onRoll && onRoll({ label, d20: d, mod: v, total, kind });
      }}
      title={`Roll ${label}: d20 ${fmtMod(v)}`}
      className={"mono " + className}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: big ? 44 : (mini ? 24 : 32),
        height: big ? 32 : (mini ? 20 : 24),
        padding: "0 6px",
        borderRadius: 4,
        border: "1px solid var(--rule)",
        background: "var(--bg-2)",
        fontWeight: 500,
        fontSize: big ? 16 : (mini ? 11 : 13),
        lineHeight: 1,
        transition: "background 120ms, border-color 120ms, color 120ms",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rule)"; e.currentTarget.style.color = ""; }}
    >
      <span key={flash} className={flash ? "roll-flash" : ""} style={{ display: "inline-block", padding: "1px 3px", borderRadius: 3 }}>
        {display}
      </span>
    </button>
  );
}

function Section({ title, right, children, dense = false, titleAlign = "left", prominent = false, style = {}, onTitleClick, titleHint }) {
  const titleInner = onTitleClick ? (
    <button onClick={onTitleClick}
      className="section-title__btn"
      title={titleHint}>
      {title}
    </button>
  ) : title;
  const titleEl = (
    <h2 className={"smcp" + (prominent ? " section-title--prominent" : "")}
      style={{ margin: 0, color: prominent ? "var(--ink-2)" : "var(--ink-3)" }}>
      {titleInner}
    </h2>
  );
  const ruleStyle = { flex: 1, borderTop: "1px solid var(--rule)", transform: "translateY(-3px)" };
  return (
    <section style={{ marginBottom: 14, ...style }}>
      <header style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        {titleAlign === "left" && (<>{titleEl}<div style={ruleStyle} /></>)}
        {titleAlign === "center" && (<><div style={ruleStyle} />{titleEl}<div style={ruleStyle} /></>)}
        {titleAlign === "right" && (<><div style={ruleStyle} />{titleEl}</>)}
        {right && <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{right}</div>}
      </header>
      <div style={{ padding: dense ? 0 : "2px 0" }}>{children}</div>
    </section>
  );
}

function StatBlock({ label, value, sub, onClick, accent = false, wide = false }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        flex: wide ? "1 1 0" : "0 0 auto",
        minWidth: wide ? 0 : 64,
        padding: "8px 10px",
        background: accent ? "var(--accent-bg)" : "var(--bg-2)",
        border: "1px solid " + (accent ? "var(--accent)" : "var(--rule)"),
        borderRadius: 4,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 2,
        cursor: onClick ? "pointer" : "default",
        textAlign: "center",
        transition: "background 120ms",
      }}
    >
      <div className="smcp" style={{ fontSize: 9, color: accent ? "var(--accent)" : "var(--ink-3)" }}>{label}</div>
      <div className="mono serif" style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.01em", color: accent ? "var(--accent)" : "var(--ink)" }}>{value}</div>
      {sub != null && <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{sub}</div>}
    </button>
  );
}

function PipCluster({ rank, max = 3, onClick }) {
  const r = Math.min(max, Math.max(0, rank | 0));
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
      title={`Proficiency: ${r}/${max} — click to cycle`}
      style={{ display: "inline-flex", gap: 3, cursor: onClick ? "pointer" : "default", padding: "2px 2px" }}
    >
      {Array.from({ length: max }).map((_, i) => (
        <span key={i}
          style={{
            width: 7, height: 7, transform: "rotate(45deg)",
            background: i < r ? "var(--accent)" : "transparent",
            border: "1px solid " + (i < r ? "var(--accent)" : "var(--rule-2)"),
          }}
        />
      ))}
    </span>
  );
}

function DieBadge({ die, size = "md", onClick, accent = true, title }) {
  const dims = size === "lg" ? { w: 48, h: 40, fs: 16 }
    : size === "sm" ? { w: 28, h: 22, fs: 10 }
      : { w: 38, h: 30, fs: 12 };
  const [flash, setFlash] = useState(0);
  return (
    <button
      onClick={(e) => { if (!onClick) return; e.stopPropagation(); setFlash((x) => x + 1); onClick(e); }}
      disabled={!onClick}
      title={title || `Roll ${die}`}
      className="mono"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: dims.w, height: dims.h, fontSize: dims.fs, fontWeight: 500,
        lineHeight: 1, letterSpacing: "0.02em",
        background: accent ? "var(--accent-bg)" : "var(--bg-2)",
        color: accent ? "var(--accent)" : "var(--ink)",
        border: "1px solid " + (accent ? "var(--accent)" : "var(--rule-2)"),
        clipPath: "polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 120ms",
        position: "relative",
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.transform = "scale(1.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span key={flash} className={flash ? "roll-flash" : ""} style={{ padding: "0 2px", borderRadius: 2 }}>{die}</span>
    </button>
  );
}

function Field({ label, v, set, w = 100 }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 1 }}>
      <span className="smcp" style={{ fontSize: 9 }}>{label}</span>
      <input value={v} onChange={(e) => set(e.target.value)} style={{ width: w, fontSize: 13 }} />
    </span>
  );
}
function BareSelect({ v, options, onChange, w = 120, disabled = false }) {
  const entries = Array.isArray(options)
    ? options.map((o) => [o, o])
    : Object.entries(options);
  return (
    <select value={v} onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={"bare-select" + (disabled ? " is-locked" : "")}
      style={{ width: w }}>
      {entries.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
    </select>
  );
}
function SelectField({ label, v, options, onChange, w = 120 }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 1 }}>
      <span className="smcp" style={{ fontSize: 9 }}>{label}</span>
      <BareSelect v={v} options={options} onChange={onChange} w={w} />
    </span>
  );
}

function BtnSmall({ children, onClick, title }) {
  return (
    <button onClick={onClick} title={title}
      style={{
        padding: "3px 8px", border: "1px solid var(--rule)", borderRadius: 3,
        background: "var(--bg)", fontSize: 11, lineHeight: 1.2,
        display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rule)"; }}
    >{children}</button>
  );
}

function EffectsPopup({ title, summary, effects, onClose }) {
  const ref = useRef(null);
  useViewportClamp(ref);
  return (
    <div ref={ref} className="effects-popup">
      <div className="effects-popup__header">
        <div className="serif effects-popup__title">{title}</div>
        <button onClick={onClose} title="Close" className="effects-popup__close">×</button>
      </div>
      {summary && <div className="effects-popup__summary">{summary}</div>}
      <div className="effects-popup__list">
        {(effects || []).map((e, i) => (
          <div key={i} className="effects-popup__row">
            {e.kind === "grants" ? (
              <>
                <div className="smcp effects-popup__kind effects-popup__kind--grants">Grants</div>
                <div className="serif ability-popup__title">{e.name}</div>
                <div className="smcp ability-popup__meta">
                  {e.type === "reaction" ? "Reaction" : "Action"}
                </div>
                {e.stamina != null && (
                  <div className="ability-popup__stamina">
                    <span className="smcp ability-popup__stamina-label">Stamina</span>
                    <span className="mono ability-popup__stamina-value">{e.stamina}</span>
                  </div>
                )}
                {e.trigger && (
                  <div className="ability-popup__trigger">
                    <span className="smcp ability-popup__trigger-label">Trigger</span>
                    <span className="ability-popup__trigger-text">{e.trigger}</span>
                  </div>
                )}
                {e.desc && <div className="ability-popup__desc">{e.desc}</div>}
              </>
            ) : (
              <>
                <div className={"smcp effects-popup__kind effects-popup__kind--" + e.kind}>
                  {e.kind === "ability" ? (e.name || "Ability")
                    : e.kind === "stat" ? (e.label || "Stat")
                      : "Rule"}
                </div>
                <div className="effects-popup__desc">{e.desc}</div>
              </>
            )}
          </div>
        ))}
        {(!effects || effects.length === 0) && (
          <div className="effects-popup__empty">No effects defined yet.</div>
        )}
      </div>
    </div>
  );
}

function ExplanationPopup({ label, body, onClose }) {
  const ref = useRef(null);
  useViewportClamp(ref);
  return (
    <div ref={ref} className="derived-popup explanation-popup">
      <div className="derived-popup__header">
        <div className="serif derived-popup__title">{label}</div>
        <button onClick={onClose} title="Close" className="derived-popup__close">×</button>
      </div>
      <div className="explanation-popup__body">
        {body || <span className="explanation-popup__placeholder">No explanation written yet.</span>}
      </div>
    </div>
  );
}

function DerivationPopup({ label, parts, fmt, onClose }) {
  const ref = useRef(null);
  useViewportClamp(ref);
  return (
    <div ref={ref} className="derived-popup">
      <div className="derived-popup__header">
        <div className="serif derived-popup__title">{label}</div>
        <button onClick={onClose} title="Close" className="derived-popup__close">×</button>
      </div>
      <table className="derived-popup__table">
        <tbody>
          {parts.map((p) => (
            <tr key={p.label}>
              <td className="derived-popup__label">{p.label}</td>
              <td className="mono derived-popup__value">{fmt(p.value || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, v, onChange, readOnly, type = "text", w = 130, suffix }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dotted var(--rule)", paddingBottom: 3 }}>
      <span className="smcp" style={{ fontSize: 10 }}>{label}</span>
      <span style={{ display: "inline-flex", gap: 4, alignItems: "baseline" }}>
        {readOnly
          ? <span className="mono" style={{ color: "var(--ink-2)" }}>{v}</span>
          : <input type={type} value={v} onChange={(e) => onChange(e.target.value)} className="mono" style={{ width: w, textAlign: "right" }} />}
        {suffix && <span className="smcp" style={{ fontSize: 9 }}>{suffix}</span>}
      </span>
    </div>
  );
}

function HoldButton({ onConfirm, className = "", children, title, ...rest }) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef(null);

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
  };
  const start = (e) => {
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    setHolding(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setHolding(false);
      onConfirm();
    }, 2000);
  };
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const cls = `hold-btn ${holding ? "is-holding" : ""} ${className}`.trim();
  return (
    <button className={cls}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      title={title}
      {...rest}>
      {children}
    </button>
  );
}
