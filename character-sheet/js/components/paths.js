// ═══════════════════════════════════════════════════════════════════════
//  PATHS — path and ability selection
// ═══════════════════════════════════════════════════════════════════════

function PathsBlock({ c, update }) {
  const chosen = c.paths || [];
  const considered = (c.considered_paths || [])
    .map((p) => (typeof p === "string" ? p : p && p.path))
    .filter((p) => p && !chosen.includes(p));

  const [picker, setPicker] = useState(null);
  const [openAbility, setOpenAbility] = useState(null);

  const totalFilled = chosen.length + considered.length;
  const remaining = 4 - totalFilled;

  const replaceConsideredAt = (index, pathKey) => {
    const next = [...considered];
    next[index] = pathKey;
    update({ considered_paths: next });
    setPicker(null);
  };
  const clearConsideredAt = (index) => {
    update({ considered_paths: considered.filter((_, i) => i !== index) });
  };
  const addConsidered = (pathKey) => {
    if (totalFilled >= 4) return;
    update({ considered_paths: [...considered, pathKey] });
    setPicker(null);
  };

  const columns = [
    ...chosen.map((k) => ({ kind: "committed", pathKey: k })),
    ...considered.map((k) => ({ kind: "considered", pathKey: k })),
  ];

  const sideFor = (col) => (col < 2 ? "left" : "right");

  return (
    <Section title="Paths">
      <div className="paths-grid">
        {columns.map((col, i) => {
          const popupSide = sideFor(i);
          const path = PATHS.find((p) => p.key === col.pathKey);
          const gainedAbilities = c.abilities || [];
          const consideredIndex = col.kind === "considered" ? i - chosen.length : -1;
          return (
            <div key={i} className={"paths-col paths-col--" + col.kind}>
              {col.kind === "considered" && (
                <div className="paths-col__considering">
                  <button className="paths-col__considering-label"
                    onClick={() => setPicker({ mode: "change", index: consideredIndex })}>Considering…</button>
                  <button className="paths-col__cancel"
                    onClick={() => clearConsideredAt(consideredIndex)}
                    title="Clear consideration">×</button>
                </div>
              )}

              {col.kind === "committed" && (
                <div className="paths-col__name">{path ? path.name : col.pathKey}</div>
              )}
              {col.kind === "considered" && (
                <button className="paths-col__name paths-col__name--considered"
                  onClick={() => setPicker({ mode: "change", index: consideredIndex })}
                  title="Click to change considered path">
                  {path ? path.name : col.pathKey}
                </button>
              )}

              {path && path.abilities.map((a) => {
                const gained = gainedAbilities.find((ga) => ga.ability === a.key);
                const rank = gained ? (gained.rank ?? 1) : 0;
                const available = rank > 0;
                const isOpen = openAbility && openAbility.pathKey === path.key && openAbility.abilityKey === a.key;
                return (
                  <div key={a.key} style={{ position: "relative" }}>
                    <button onClick={() => setOpenAbility(isOpen ? null : { pathKey: path.key, abilityKey: a.key })}
                      title={available ? `${a.name} — rank ${rank}/3` : `${a.name} — unavailable`}
                      style={{
                        width: "100%",
                        padding: "6px 8px", borderRadius: 4,
                        border: "1px solid " + (isOpen ? "var(--accent)" : (available ? "var(--rule)" : "var(--rule-2)")),
                        background: available ? "var(--bg-2)" : "var(--bg-sunken)",
                        opacity: available ? 1 : 0.55,
                        display: "flex", flexDirection: "column", gap: 4, alignItems: "center",
                        cursor: "pointer", textAlign: "center",
                      }}>
                      <div className="serif" style={{ font: "500 13px/1.2 var(--serif)", color: available ? "var(--ink)" : "var(--ink-3)" }}>{a.name}</div>
                      <PipCluster rank={rank} max={3} />
                    </button>
                    {isOpen && <AbilityPopup ability={a} pathKey={path.key} pathName={path.name} side={popupSide}
                      c={c} update={update}
                      onClose={() => setOpenAbility(null)} />}
                  </div>
                );
              })}

              {picker && picker.mode === "change" && picker.index === consideredIndex && (
                <PathPickerPopup
                  c={c}
                  onPick={(key) => replaceConsideredAt(consideredIndex, key)}
                  onClose={() => setPicker(null)}
                  side={popupSide} />
              )}
            </div>
          );
        })}

        {remaining > 0 && (
          <div className="paths-col paths-col--placeholder"
            data-span={remaining}
            style={{ gridColumn: "span " + remaining }}>
            <button className="paths-col__placeholder"
              onClick={() => setPicker({ mode: "add" })}>
              Consider Path…
            </button>
            {picker && picker.mode === "add" && (
              <PathPickerPopup
                c={c}
                onPick={addConsidered}
                onClose={() => setPicker(null)}
                side={sideFor(totalFilled)} />
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

function AbilityPopup({ ability, pathKey, pathName, side, c, update, onClose }) {
  const ref = useRef(null);
  useViewportClamp(ref);
  const isReaction = ability.type === "reaction";
  const wrapCls = "ability-popup-wrap" + (side === "right" ? " is-right" : "");

  const chosen = c && c.paths ? c.paths : [];
  const considered = c && c.considered_paths ? c.considered_paths : [];
  const gained = c && c.abilities ? c.abilities : [];
  const freeSlots = c ? availableUncommittedAbilitySlots(c) : [];
  const alreadyGained = gained.some((a) => a.ability === ability.key);
  const pathIsChosen = chosen.includes(pathKey);
  const canPromote = !pathIsChosen && chosen.length < 4;
  const canGain = !alreadyGained && freeSlots.length > 0 && (pathIsChosen || canPromote);

  const onGain = () => {
    if (!canGain || !update) return;
    const firstSlot = freeSlots[0];
    const newAbility = { gained: firstSlot.slug, ability: ability.key, rank: 1 };
    if (pathIsChosen) {
      update({ abilities: [...gained, newAbility] });
      onClose();
      return;
    }
    const nextChosen = [...chosen, pathKey];
    let nextConsidered = considered.filter((k) => k !== pathKey);
    while (nextChosen.length + nextConsidered.length > 4) {
      nextConsidered = nextConsidered.slice(1);
    }
    update({
      paths: nextChosen,
      considered_paths: nextConsidered,
      abilities: [...gained, newAbility],
    });
    onClose();
  };

  return (
    <div ref={ref} className={wrapCls}>
      <div className="ability-popup">
        <div className="ability-popup__header">
          <div className="serif ability-popup__title">{ability.name}</div>
          <button onClick={onClose} title="Close" className="ability-popup__close">×</button>
        </div>
        <div className="smcp ability-popup__meta">
          {isReaction ? "Reaction" : "Action"} · {pathName}
        </div>
        <div className="ability-popup__stamina">
          <span className="mono ability-popup__stamina-value">{ability.stamina ?? 0}</span>
          <span className="smcp ability-popup__stamina-label">Stamina</span>
        </div>
        {isReaction && (
          <div className="ability-popup__trigger">
            <span className="smcp ability-popup__trigger-label">Trigger</span>
            <span className="ability-popup__trigger-text">{ability.trigger}</span>
          </div>
        )}
        {ability.desc && (
          <div className="ability-popup__desc">{ability.desc}</div>
        )}
      </div>
      {canGain && (
        <div className="ability-popup-gain">
          <div className="smcp ability-popup-gain__count">
            {freeSlots.length} {freeSlots.length === 1 ? "ability" : "abilities"} free
          </div>
          <HoldButton onConfirm={onGain}
            className="ability-popup-gain__btn"
            title="Hold 2s to gain this ability">
            Gain
          </HoldButton>
        </div>
      )}
    </div>
  );
}

function pathPickerLists(c) {
  const classCommitted = !!(c.committed && c.committed.class);
  const byName = (a, b) => a.name.localeCompare(b.name);
  const classPaths = [];
  const openPaths = [];
  for (const p of PATHS) {
    const universal = !p.classes || p.classes.length === 0;
    if (universal) openPaths.push(p);
    else if (classCommitted && p.classes.includes(c.class)) classPaths.push(p);
  }
  classPaths.sort((a, b) => {
    const sigA = a.classes.length === 1 ? 0 : 1;
    const sigB = b.classes.length === 1 ? 0 : 1;
    return sigA - sigB || byName(a, b);
  });
  openPaths.sort(byName);
  const disabled = [...(c.paths || []), ...(c.considered_paths || [])];
  return { classPaths, openPaths, disabled };
}

function PathPickerPopup({ c, onPick, onClose, side = "left" }) {
  const ref = useRef(null);
  useViewportClamp(ref);
  const { classPaths, openPaths, disabled } = pathPickerLists(c);
  const renderItem = (p) => {
    const isDisabled = disabled.includes(p.key);
    const isSignature = Array.isArray(p.classes) && p.classes.length === 1;
    const cls = "path-picker-popup__item"
      + (isDisabled ? " is-disabled" : "")
      + (isSignature ? " is-signature" : "");
    return (
      <button key={p.key} disabled={isDisabled}
        onClick={() => onPick(p.key)}
        className={cls}>
        {p.name}
      </button>
    );
  };
  return (
    <div ref={ref} className={"path-picker-popup" + (side === "right" ? " is-right" : "")}>
      <div className="path-picker-popup__header">
        <div className="serif path-picker-popup__title">Add a Path</div>
        <button onClick={onClose} className="path-picker-popup__close" title="Close">×</button>
      </div>
      {classPaths.length > 0 && (
        <div className="path-picker-popup__section">
          <div className="smcp path-picker-popup__section-label">Class Paths</div>
          <div className="path-picker-popup__grid">{classPaths.map(renderItem)}</div>
        </div>
      )}
      {openPaths.length > 0 && (
        <div className="path-picker-popup__section">
          <div className="smcp path-picker-popup__section-label">Open Paths</div>
          <div className="path-picker-popup__grid">{openPaths.map(renderItem)}</div>
        </div>
      )}
    </div>
  );
}

function AbilityPickerPopup({ path, chosenAbilities, onPick, onClose, side = "left" }) {
  const ref = useRef(null);
  useViewportClamp(ref);
  const taken = new Set((chosenAbilities || []).map((a) => a.ability));
  return (
    <div ref={ref} className={"path-picker-popup" + (side === "right" ? " is-right" : "")}>
      <div className="path-picker-popup__header">
        <div className="serif path-picker-popup__title">Pick an Ability</div>
        <button onClick={onClose} className="path-picker-popup__close" title="Close">×</button>
      </div>
      <div className="path-picker-popup__grid">
        {path.abilities.map((a) => {
          const isDisabled = taken.has(a.key);
          return (
            <button key={a.key} disabled={isDisabled}
              onClick={() => onPick(a.key)}
              className={"path-picker-popup__item" + (isDisabled ? " is-disabled" : "")}
              title={isDisabled ? "Already gained" : a.name}>
              {a.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AbilityCard({ c, update, gained }) {
  const { editing } = useContext(CardLayoutContext);
  const chosen = c.paths || [];
  const considered = c.considered_paths || [];
  const chosenAbilities = c.abilities || [];
  const myEntry = chosenAbilities.find((a) => a.gained === gained);

  const myPathKey = myEntry
    ? (PATHS.find((p) => p.abilities.some((a) => a.key === myEntry.ability)) || {}).key || null
    : null;

  const [selectedPathKey, setSelectedPathKey] = useState(myPathKey);
  const [provisionalPath, setProvisionalPath] = useState(null);
  const [selectedAbilityKey, setSelectedAbilityKey] = useState(myEntry ? myEntry.ability : "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [abilityPickerOpen, setAbilityPickerOpen] = useState(false);

  // When entering edit mode (or switching which entry this slot holds),
  // re-seed the picker state from myEntry so the user sees their current
  // selection pre-populated.
  useEffect(() => {
    if (editing && myEntry) {
      setSelectedPathKey(myPathKey);
      setSelectedAbilityKey(myEntry.ability);
      setProvisionalPath(null);
    }
  }, [editing, myEntry && myEntry.ability, myPathKey]);

  if (myEntry && !editing) {
    const committedPath = PATHS.find((p) => p.abilities.some((a) => a.key === myEntry.ability));
    const committedAbility = committedPath && committedPath.abilities.find((a) => a.key === myEntry.ability);
    const isReaction = committedAbility && committedAbility.type === "reaction";
    return (
      <CreationCard label="Ability" committed={true}>
        <div className="ability-popup ability-popup--inline">
          <div className="ability-popup__header">
            <div className="serif ability-popup__title">
              {committedAbility ? committedAbility.name : myEntry.ability}
            </div>
          </div>
          <div className="smcp ability-popup__meta">
            {isReaction ? "Reaction" : "Action"} · {(committedPath ? committedPath.name : "?")}
          </div>
          <div className="ability-popup__stamina">
            <span className="mono ability-popup__stamina-value">
              {committedAbility ? committedAbility.stamina ?? 0 : 0}
            </span>
            <span className="smcp ability-popup__stamina-label">Stamina</span>
          </div>
          {isReaction && committedAbility && committedAbility.trigger && (
            <div className="ability-popup__trigger">
              <span className="smcp ability-popup__trigger-label">Trigger</span>
              <span className="ability-popup__trigger-text">{committedAbility.trigger}</span>
            </div>
          )}
          {committedAbility && committedAbility.desc && (
            <div className="ability-popup__desc">{committedAbility.desc}</div>
          )}
        </div>
      </CreationCard>
    );
  }

  const activePathKey = provisionalPath || selectedPathKey;
  const activePath = activePathKey ? PATHS.find((p) => p.key === activePathKey) : null;
  const provisionalPathObj = provisionalPath ? PATHS.find((p) => p.key === provisionalPath) : null;

  const togglePath = (pathKey) => {
    setProvisionalPath(null);
    const next = selectedPathKey === pathKey ? null : pathKey;
    setSelectedPathKey(next);
    setSelectedAbilityKey("");
    setAbilityPickerOpen(false);
  };

  const cancelProvisional = () => {
    setProvisionalPath(null);
    setSelectedAbilityKey("");
    setAbilityPickerOpen(false);
  };

  const startAdd = (pathKey) => {
    if (chosen.includes(pathKey) || considered.includes(pathKey)) return;
    if (chosen.length >= 4) return;
    setProvisionalPath(pathKey);
    setSelectedPathKey(null);
    setSelectedAbilityKey("");
    setPickerOpen(false);
    setAbilityPickerOpen(false);
  };

  // Dup check excludes the entry we're currently editing — re-selecting the
  // same ability is a no-op, not a duplicate.
  const dupAbility = !!selectedAbilityKey
    && chosenAbilities.some((a) =>
      a.gained !== gained && a.ability === selectedAbilityKey);

  // Stateless add/replace — caller passes explicit path/ability so we don't
  // race React's state updates (the auto-apply branch in edit mode picks
  // an ability and immediately wants to write the new value).
  const performAdd = (pathKey, abilityKey, showError) => {
    if (!pathKey || !abilityKey) return;
    const activePathLocal = PATHS.find((p) => p.key === pathKey);
    if (!activePathLocal) return;
    if (chosenAbilities.some((a) => a.gained !== gained && a.ability === abilityKey)) {
      showError && showError("You already have this ability");
      return;
    }
    const isReplace = !!myEntry;
    let nextChosen = chosen;
    let nextConsidered = considered;
    if (!chosen.includes(pathKey)) {
      if (activePathLocal.classes && activePathLocal.classes.length > 0
        && !activePathLocal.classes.includes(c.class)) {
        showError && showError("That path isn't available to your class");
        return;
      }
      if (chosen.length >= 4) {
        showError && showError("No room — uncommit a path first");
        return;
      }
      nextChosen = [...chosen, pathKey];
      nextConsidered = considered.filter((k) => k !== pathKey);
      while (nextChosen.length + nextConsidered.length > 4) {
        nextConsidered = nextConsidered.slice(1);
      }
    }
    const nextAbilities = isReplace
      ? chosenAbilities.map((a) =>
          a.gained === gained ? { ...a, ability: abilityKey } : a)
      : [...chosenAbilities, { gained, ability: abilityKey, rank: 1 }];
    update({
      paths: nextChosen,
      considered_paths: nextConsidered,
      abilities: nextAbilities,
    });
  };

  const confirmAdd = (showError) =>
    performAdd(activePath && activePath.key, selectedAbilityKey, showError);

  const editingExisting = editing && !!myEntry;

  return (
    <CreationCard label="Ability" committed={!!myEntry}>
      {({ showError }) => (
        <>
          <div className="creation-paths">
            {chosen.map((pathKey) => {
              const path = PATHS.find((p) => p.key === pathKey);
              const isSelected = selectedPathKey === pathKey;
              return (
                <button key={pathKey}
                  className={"creation-path-btn" + (isSelected ? " is-selected" : "")}
                  onClick={() => togglePath(pathKey)}>
                  {path ? path.name : pathKey}
                </button>
              );
            })}
            {considered.map((pathKey) => {
              const path = PATHS.find((p) => p.key === pathKey);
              const isSelected = selectedPathKey === pathKey;
              return (
                <button key={"considered-" + pathKey}
                  className={"creation-path-btn is-considered" + (isSelected ? " is-selected" : "")}
                  onClick={() => togglePath(pathKey)}>
                  {path ? path.name : pathKey}
                </button>
              );
            })}
            {provisionalPath && (
              <button className="creation-path-btn is-selected is-provisional"
                onClick={cancelProvisional}>
                {provisionalPathObj ? provisionalPathObj.name : provisionalPath}
              </button>
            )}
            {!provisionalPath && chosen.length < 4 && (
              <span className="creation-path-add-wrap">
                <button className="creation-path-btn creation-path-btn--add"
                  onClick={() => setPickerOpen((o) => !o)}>[Add]</button>
                {pickerOpen && (
                  <PathPickerPopup
                    c={c}
                    onPick={startAdd} onClose={() => setPickerOpen(false)} />
                )}
              </span>
            )}
          </div>
          <div className="creation-ability-row">
            <span className="creation-ability-pick-wrap">
              <button className="creation-ability-pick"
                disabled={!activePath}
                onClick={() => setAbilityPickerOpen((o) => !o)}>
                {!activePath
                  ? "Choose a Path"
                  : selectedAbilityKey
                    ? (activePath.abilities.find((a) => a.key === selectedAbilityKey) || {}).name || "—"
                    : "Pick Ability…"}
              </button>
              {activePath && abilityPickerOpen && (
                <AbilityPickerPopup
                  path={activePath}
                  chosenAbilities={chosenAbilities}
                  onPick={(key) => {
                    setSelectedAbilityKey(key);
                    setAbilityPickerOpen(false);
                    if (editingExisting) {
                      performAdd(activePath.key, key, showError);
                    }
                  }}
                  onClose={() => setAbilityPickerOpen(false)} />
              )}
            </span>
            {activePath && !editingExisting && (
              <button className="creation-ok-btn"
                onClick={() => confirmAdd(showError)}
                disabled={!selectedAbilityKey}
                title={
                  dupAbility ? "You already have this ability — click to see why"
                    : selectedAbilityKey ? "Confirm path + ability"
                      : "Pick an ability first"
                }>
                OK
              </button>
            )}
          </div>
        </>
      )}
    </CreationCard>
  );
}
