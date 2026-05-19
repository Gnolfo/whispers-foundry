// ═══════════════════════════════════════════════════════════════════════
//  CARDS — card framework and creation/advancement card implementations
// ═══════════════════════════════════════════════════════════════════════

// Card layout context — components rendering inside an
// <CardLayoutContext.Provider value={{ compact: true }}> get a
// label-less, larger-content treatment for the right-column widget.
const CardLayoutContext = createContext({ compact: false, editing: false });

function CreationCard({ label, children, committed }) {
  const { compact } = useContext(CardLayoutContext);
  const [errMsg, setErrMsg] = useState(null);
  const [errSeq, setErrSeq] = useState(0);
  useEffect(() => {
    if (!errMsg) return;
    const t = setTimeout(() => setErrMsg(null), 5000);
    return () => clearTimeout(t);
  }, [errMsg, errSeq]);
  const showError = (msg) => {
    setErrMsg(msg);
    setErrSeq((n) => n + 1);
  };
  const stateClass = committed === true ? " is-committed"
    : committed === false ? " is-available"
      : "";
  return (
    <div className={"creation-card" + stateClass + (compact ? " creation-card--compact" : "")}>
      {!compact && <div className="smcp creation-card__label">{label}</div>}
      <div className="creation-card__body">
        {typeof children === "function" ? children({ showError }) : children}
      </div>
      {errMsg && (
        <div className="creation-card__error" key={errSeq}>{errMsg}</div>
      )}
    </div>
  );
}

function CommittableCard({ label, committed, onCommit, canCommit = true, children }) {
  const { editing } = useContext(CardLayoutContext);
  // In edit mode a committed card behaves like an uncommitted one: the
  // picker is live, the OK button is hidden. The lock affordance on the
  // outer row is the way to uncommit.
  const locked = committed && !editing;
  return (
    <CreationCard label={label} committed={committed}>
      <div className="creation-commit-row">
        <div className="creation-commit-row__body">
          {typeof children === "function" ? children(locked) : children}
        </div>
        {!committed && (
          <button className="creation-ok-btn"
            onClick={onCommit}
            disabled={!canCommit}
            title={canCommit ? "Commit value" : "Pick a value first"}>OK</button>
        )}
      </div>
    </CreationCard>
  );
}

function AncestryPickerPopup({ current, onPick, onClose }) {
  const ref = useRef(null);
  useViewportClamp(ref);
  return (
    <div ref={ref} className="path-picker-popup">
      <div className="path-picker-popup__header">
        <div className="serif path-picker-popup__title">Choose Ancestry</div>
        <button onClick={onClose} className="path-picker-popup__close" title="Close">×</button>
      </div>
      <div className="path-picker-popup__grid">
        {Object.keys(ANCESTRIES).map((name) => (
          <button key={name}
            onClick={() => onPick(name)}
            className={"path-picker-popup__item" + (name === current ? " is-current" : "")}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function AncestryCard({ c, update }) {
  const cm = c.committed || {};
  const [open, setOpen] = useState(false);
  const picked = !!c.ancestry;

  const handlePick = (name) => {
    update({ ancestry: name });
    setOpen(false);
  };

  return (
    <CommittableCard label="Ancestry"
      committed={!!cm.ancestry}
      onCommit={() => update({ committed: { ...cm, ancestry: true } })}>
      {(locked) =>
        locked ? (
          <span className="ancestry-committed-value">{c.ancestry}</span>
        ) : (
          <div style={{ position: "relative" }}>
            <button
              className={"ancestry-choose-btn" + (picked ? " has-value" : "")}
              onClick={() => setOpen((o) => !o)}>
              {picked ? c.ancestry : "Choose…"}
            </button>
            {open && (
              <AncestryPickerPopup
                current={picked ? c.ancestry : null}
                onPick={handlePick}
                onClose={() => setOpen(false)} />
            )}
          </div>
        )
      }
    </CommittableCard>
  );
}

function ClassPickerPopup({ current, onPick, onClose }) {
  const ref = useRef(null);
  useViewportClamp(ref);
  return (
    <div ref={ref} className="path-picker-popup">
      <div className="path-picker-popup__header">
        <div className="serif path-picker-popup__title">Choose Class</div>
        <button onClick={onClose} className="path-picker-popup__close" title="Close">×</button>
      </div>
      <div className="path-picker-popup__grid">
        {Object.entries(CLASSES).map(([key, name]) => (
          <button key={key}
            onClick={() => onPick(key)}
            className={"path-picker-popup__item" + (key === current ? " is-current" : "")}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClassCard({ c, update }) {
  const cm = c.committed || {};
  const [open, setOpen] = useState(false);
  const picked = !!c.class;
  const display = picked ? (CLASSES[c.class] || c.class) : null;
  const setClass = (newClass) => {
    const next = (c.considered_paths || []).filter((k) => {
      const p = PATHS.find((pp) => pp.key === k);
      if (!p) return true;
      return !p.classes || p.classes.length === 0 || p.classes.includes(newClass);
    });
    update({ class: newClass, considered_paths: next });
    setOpen(false);
  };
  return (
    <CommittableCard label="Class"
      committed={!!cm.class}
      canCommit={picked}
      onCommit={() => update({ committed: { ...cm, class: true } })}>
      {(locked) =>
        locked ? (
          <span className="ancestry-committed-value">{display}</span>
        ) : (
          <div style={{ position: "relative" }}>
            <button
              className={"ancestry-choose-btn" + (picked ? " has-value" : "")}
              onClick={() => setOpen((o) => !o)}>
              {picked ? display : "Choose…"}
            </button>
            {open && (
              <ClassPickerPopup
                current={picked ? c.class : null}
                onPick={setClass}
                onClose={() => setOpen(false)} />
            )}
          </div>
        )
      }
    </CommittableCard>
  );
}

function AttributePickerPopup({ current, onPick, onClose }) {
  const ref = useRef(null);
  useViewportClamp(ref);
  return (
    <div ref={ref} className="path-picker-popup">
      <div className="path-picker-popup__header">
        <div className="serif path-picker-popup__title">Choose Attribute</div>
        <button onClick={onClose} className="path-picker-popup__close" title="Close">×</button>
      </div>
      <div className="path-picker-popup__grid">
        {ATTRIBUTES.map((a) => (
          <button key={a.key}
            onClick={() => onPick(a.key)}
            className={"path-picker-popup__item" + (a.key === current ? " is-current" : "")}>
            {a.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function AttributeCard({ c, update, gained }) {
  const { editing } = useContext(CardLayoutContext);
  const advancements = c.attribute_advancements || [];
  const myEntry = advancements.find((a) => a.gained === gained);
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState(null);

  if (myEntry) {
    const attr = ATTRIBUTES.find((a) => a.key === myEntry.attribute);
    const currentName = attr ? attr.name : myEntry.attribute;
    if (!editing) {
      return (
        <CreationCard label="Attribute" committed={true}>
          <span className="ancestry-committed-value">{currentName}</span>
        </CreationCard>
      );
    }
    const setAttr = (key) => {
      update({
        attribute_advancements: advancements.map((a) =>
          a.gained === gained ? { ...a, attribute: key } : a),
      });
      setOpen(false);
    };
    return (
      <CreationCard label="Attribute" committed={true}>
        <div style={{ position: "relative" }}>
          <button
            className="ancestry-choose-btn has-value"
            onClick={() => setOpen((o) => !o)}>
            {currentName}
          </button>
          {open && (
            <AttributePickerPopup
              current={myEntry.attribute}
              onPick={setAttr}
              onClose={() => setOpen(false)} />
          )}
        </div>
      </CreationCard>
    );
  }

  const pendingObj = pendingKey ? ATTRIBUTES.find((a) => a.key === pendingKey) : null;
  const confirmAdd = () => {
    if (!pendingKey) return;
    update({
      attribute_advancements: [...advancements, { gained, attribute: pendingKey }],
    });
  };

  return (
    <CommittableCard label="Attribute" committed={false}
      canCommit={!!pendingKey} onCommit={confirmAdd}>
      {() => (
        <div style={{ position: "relative" }}>
          <button
            className={"ancestry-choose-btn" + (pendingObj ? " has-value" : "")}
            onClick={() => setOpen((o) => !o)}>
            {pendingObj ? pendingObj.name : "Choose…"}
          </button>
          {open && (
            <AttributePickerPopup
              current={pendingKey}
              onPick={(key) => { setPendingKey(key); setOpen(false); }}
              onClose={() => setOpen(false)} />
          )}
        </div>
      )}
    </CommittableCard>
  );
}

function AttackGuardCard({ c, update, gained }) {
  const { editing } = useContext(CardLayoutContext);
  const ledger = c.attack_guard_advancements || [];
  const myEntry = ledger.find((a) => a.gained === gained);
  const [pendingChoice, setPendingChoice] = useState(null);

  if (myEntry) {
    const label = myEntry.choice === "attack" ? "+1 Attack" : "+1 Guard";
    if (!editing) {
      return (
        <CreationCard label="Attack / Guard" committed={true}>
          <div className="creation-commit-row">
            <div className="creation-commit-row__body">
              <span className="attack-guard-choice">{label}</span>
            </div>
          </div>
        </CreationCard>
      );
    }
    const setChoice = (choice) =>
      update({
        attack_guard_advancements: ledger.map((a) =>
          a.gained === gained ? { ...a, choice } : a),
      });
    return (
      <CreationCard label="Attack / Guard" committed={true}>
        <div className="attack-guard-picker">
          <div className="attack-guard-picker__btns">
            <button
              className={"attack-guard-btn" + (myEntry.choice === "attack" ? " is-selected" : "")}
              onClick={() => setChoice("attack")}>
              +1 Attack
            </button>
            <button
              className={"attack-guard-btn" + (myEntry.choice === "guard" ? " is-selected" : "")}
              onClick={() => setChoice("guard")}>
              +1 Guard
            </button>
          </div>
        </div>
      </CreationCard>
    );
  }

  const confirmAdd = () => {
    if (!pendingChoice) return;
    update({ attack_guard_advancements: [...ledger, { gained, choice: pendingChoice }] });
  };

  return (
    <CreationCard label="Attack / Guard" committed={false}>
      <div className="attack-guard-picker">
        <span className="smcp attack-guard-picker__prompt">Choose</span>
        <div className="attack-guard-picker__btns">
          <button
            className={"attack-guard-btn" + (pendingChoice === "attack" ? " is-selected" : "")}
            onClick={() => setPendingChoice((p) => p === "attack" ? null : "attack")}>
            +1 Attack
          </button>
          <button
            className={"attack-guard-btn" + (pendingChoice === "guard" ? " is-selected" : "")}
            onClick={() => setPendingChoice((p) => p === "guard" ? null : "guard")}>
            +1 Guard
          </button>
        </div>
        <button className="creation-ok-btn" onClick={confirmAdd}
          disabled={!pendingChoice}
          title={pendingChoice ? "Confirm pick" : "Pick one first"}>OK</button>
      </div>
    </CreationCard>
  );
}

function MaxHitsCard({ c, update, gained, amount = 1 }) {
  const list = c.maxhits_advancements || [];
  const existing = list.find((a) => a.gained === gained);
  const currentAmount = existing ? existing.amount : null;
  useEffect(() => {
    if (currentAmount === amount) return;
    const next = list.filter((a) => a.gained !== gained);
    update({ maxhits_advancements: [...next, { gained, amount }] });
  }, [currentAmount, amount]);
  return (
    <CreationCard label="Max Hits" committed={true}>
      <div className="maxhits-card__body">
        <span className="serif maxhits-card__bump">+{amount}</span>
      </div>
    </CreationCard>
  );
}

function DamageBonusCard({ c, update, gained }) {
  const list = c.damage_bonus_advancements || [];
  const existing = list.find((a) => a.gained === gained);
  useEffect(() => {
    if (existing) return;
    update({ damage_bonus_advancements: [...list, { gained }] });
  }, [!!existing]);
  return (
    <CreationCard label="Damage Bonus" committed={true}>
      <div className="maxhits-card__body">
        <span className="serif maxhits-card__bump">+1</span>
      </div>
    </CreationCard>
  );
}
