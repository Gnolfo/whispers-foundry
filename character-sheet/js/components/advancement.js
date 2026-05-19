// ═══════════════════════════════════════════════════════════════════════
//  ADVANCEMENT — layout rendering for the Advancement tab
// ═══════════════════════════════════════════════════════════════════════

function renderAdvancementCard(card, c, update) {
  switch (card.type) {
    case "ability": return <AbilityCard c={c} update={update} gained={card.slug} />;
    case "attribute": return <AttributeCard c={c} update={update} gained={card.slug} />;
    case "maxhits": return <MaxHitsCard c={c} update={update} gained={card.slug} amount={card.amount} />;
    case "attack-guard": return <AttackGuardCard c={c} update={update} gained={card.slug} />;
    case "damage-bonus": return <DamageBonusCard c={c} update={update} gained={card.slug} />;
    case "ancestry": return <AncestryCard c={c} update={update} />;
    case "class": return <ClassCard c={c} update={update} />;
    case "perk": return <PerkCard />;
    case "hdef": return <HdefCard />;
    default: return null;
  }
}

function PerkCard() {
  return (
    <CreationCard label="Perk" committed={true}>
      <div className="creation-stub">Not yet implemented!</div>
    </CreationCard>
  );
}
function HdefCard() {
  return (
    <CreationCard label="Hazard Defense" committed={true}>
      <div className="creation-stub">Not yet implemented!</div>
    </CreationCard>
  );
}

const cardTypeLabel = (t) => ({
  ability: "Ability", attribute: "Attribute", maxhits: "Max Hits",
  perk: "Perk", hdef: "Hazard Defense",
  ancestry: "Ancestry", class: "Class",
  "attack-guard": "Attack or Guard",
  "damage-bonus": "Damage Bonus",
}[t] || t);

function unavailableSublabel(card) {
  switch (card.type) {
    case "maxhits": return `+${card.amount || 1}`;
    case "ability": return "Rank 1";
    case "attribute": return "+1";
    case "attack-guard": return "+1 to either";
    case "damage-bonus": return "+1";
    case "perk": return "(not yet implemented)";
    case "hdef": return "(not yet implemented)";
    default: return null;
  }
}

function AdvancementCardSlot({ card, c, update, hideLabel, highlight }) {
  const inner = renderAdvancementCard(card, c, update);
  const showLabel = card.label && !hideLabel;
  const committed = isCardCommitted(c, card);
  const lockable = !card.auto_available && (!committed || isAutoCommittingType(card.type));
  if (!showLabel && !lockable && !highlight) return inner;
  const relock = () =>
    update({
      unlocked_slots: (c.unlocked_slots || []).filter((s) => s !== card.slug),
      ...clearCommittedDataPatch(c, card),
    });
  return (
    <div className={"advancement-slot" + (highlight ? " advancement-slot--highlight" : "")}>
      {(showLabel || lockable) && (
        <div className="advancement-slot__label-row">
          {showLabel && <div className="smcp advancement-slot__label">{card.label}</div>}
          {lockable && (
            <HoldButton className="advancement-slot__lock"
              onConfirm={relock}
              title="Hold to lock — returns this slot to unavailable">
              <svg viewBox="0 0 14 14" width="11" height="11" aria-hidden="true">
                <path fill="currentColor" d="M7 1a3 3 0 00-3 3v2H3a1 1 0 00-1 1v5a1 1 0 001 1h8a1 1 0 001-1V7a1 1 0 00-1-1h-1V4a3 3 0 00-3-3zm-2 5V4a2 2 0 114 0v2H5z" />
              </svg>
            </HoldButton>
          )}
        </div>
      )}
      {inner}
    </div>
  );
}

function UnavailableSlot({ card, onUnlock, hideLabel, canUnlock = true }) {
  const showLabel = card.label && !hideLabel;
  const showLabelRow = showLabel || canUnlock;
  return (
    <div className="advancement-slot advancement-slot--unavailable">
      {showLabelRow && (
        <div className="advancement-slot__label-row">
          {showLabel && <div className="smcp advancement-slot__label">{card.label}</div>}
          {canUnlock && (
            <HoldButton className="advancement-slot__unlock"
              onConfirm={onUnlock}
              title="Hold to unlock this slot">Unlock</HoldButton>
          )}
        </div>
      )}
      <div className="creation-card creation-card--unavailable">
        <div className="smcp creation-card__label">{cardTypeLabel(card.type)}</div>
        {unavailableSublabel(card) && (
          <div className="creation-card__sublabel">{unavailableSublabel(card)}</div>
        )}
      </div>
    </div>
  );
}

function milestoneUnlocksOpen(c, row) {
  return row.levelCards.some((card) => isCardAvailable(c, card));
}

function levelCardPrereqsMet(c, rows, idx) {
  if (idx === 0) return true;
  const prev = rows[idx - 1];
  // Stubs (perk / hdef) don't gate progression — the player isn't required
  // to opt into not-yet-implemented features to advance.
  return prev.milestoneCards.every((card) =>
    isStubType(card.type) || isCardAvailable(c, card));
}

const unlockSlot = (update, c, slug) =>
  update({ unlocked_slots: [...(c.unlocked_slots || []), slug] });

function CreationRow({ row, c, update }) {
  return (
    <div className="advancement-section advancement-section--creation">
      <div className="smcp advancement-section-label">Character Creation</div>
      <div className="advancement-row"
        style={{ gridTemplateColumns: `repeat(${row.levelCards.length}, 1fr)` }}>
        {row.levelCards.map((card) =>
          <AdvancementCardSlot key={card.slug} card={card} c={c} update={update} />)}
      </div>
    </div>
  );
}

function LevelStackColumn({ n, cards, c, update, canUnlock }) {
  return (
    <div className="advancement-slot advancement-slot--highlight advancement-level-stack">
      <div className="advancement-slot__label-row">
        <div className="smcp advancement-slot__label">{`Level ${n}`}</div>
      </div>
      <div className="advancement-level-stack__cards">
        {cards.map((card) => {
          if (!isCardAvailable(c, card)) {
            return <UnavailableSlot key={card.slug} card={card} hideLabel
              canUnlock={canUnlock}
              onUnlock={() => unlockSlot(update, c, card.slug)} />;
          }
          return <AdvancementCardSlot key={card.slug} card={card}
            c={c} update={update} hideLabel />;
        })}
      </div>
    </div>
  );
}

function LevelRow({ row, c, update, levelCanUnlock, milestonesCanUnlock }) {
  const cols = 1 + row.milestoneCards.length;
  return (
    <div className="advancement-section advancement-section--milestones">
      <div className="advancement-row"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        <LevelStackColumn n={row.n} cards={row.levelCards} c={c} update={update}
          canUnlock={levelCanUnlock} />
        {row.milestoneCards.map((card) => {
          if (!isCardAvailable(c, card)) {
            return <UnavailableSlot key={card.slug} card={card}
              canUnlock={milestonesCanUnlock}
              onUnlock={() => unlockSlot(update, c, card.slug)} />;
          }
          return <AdvancementCardSlot key={card.slug} card={card} c={c} update={update} />;
        })}
      </div>
    </div>
  );
}

function AdvancementBlock({ c, update }) {
  const rows = expandLevelRows();
  return (
    <div className="advancement">
      <CreationRow row={rows[0]} c={c} update={update} />
      {rows.slice(1).map((row, idx) => (
        <React.Fragment key={row.n}>
          <div className="advancement-separator" />
          <LevelRow row={row} c={c} update={update}
            levelCanUnlock={levelCardPrereqsMet(c, rows, idx + 1)}
            milestonesCanUnlock={milestoneUnlocksOpen(c, row)} />
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Compact widget (right-column variant) ─────────────────────────────
function levelLabel(n) {
  return n === 0 ? "Creation" : `Level ${n}`;
}

function wordStack(text) {
  const words = text.split(" ");
  return words.map((w, i) => (
    <React.Fragment key={i}>
      {w}
      {i < words.length - 1 && <br />}
    </React.Fragment>
  ));
}

function firstActionablePage(c, pages) {
  for (let i = 0; i < pages.length; i++) {
    const cards = [...pages[i].levelCards, ...pages[i].milestoneCards];
    if (cards.some((card) => isCardAvailable(c, card) && !isCardCommitted(c, card))) {
      return i;
    }
  }
  return 0;
}

function AdvancementWidget({ c, update }) {
  const pages = React.useMemo(() => expandLevelRows(), []);
  const [active, setActive] = useState(() => firstActionablePage(c, pages));
  const [popupOpen, setPopupOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  return (
    <div className="adv-widget">
      <AdvancementNavigator
        pages={pages} active={active} setActive={setActive}
        popupOpen={popupOpen} setPopupOpen={setPopupOpen}
        editing={editing} setEditing={setEditing} />
      <AdvancementPage page={pages[active]} c={c} update={update}
        editing={editing} />
    </div>
  );
}

function AdvancementNavigator({
  pages, active, setActive, popupOpen, setPopupOpen, editing, setEditing,
}) {
  const popupRef = useRef(null);
  useViewportClamp(popupRef);
  return (
    <div className="adv-nav">
      <div className="adv-nav__slot">
        {active > 0 && (
          <button className="adv-nav__arrow"
            onClick={() => setActive(active - 1)}
            title="Previous">◀</button>
        )}
      </div>
      <div className="adv-nav__slot">
        {active < pages.length - 1 && (
          <button className="adv-nav__arrow"
            onClick={() => setActive(active + 1)}
            title="Next">▶</button>
        )}
      </div>
      <button className={"adv-nav__label" + (popupOpen ? " is-open" : "")}
        onClick={() => setPopupOpen((o) => !o)}
        title="Jump to a page">
        {levelLabel(pages[active].n)}
      </button>
      <button
        className={"adv-nav__edit" + (editing ? " is-active" : "")}
        onClick={() => setEditing((e) => !e)}
        title={editing ? "Done editing" : "Edit committed advancements"}>
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <path d="M14.5 3.5 L16.5 5.5 L7 15 L4 16 L5 13 Z" />
        </svg>
      </button>
      {popupOpen && (
        <div className="adv-nav__popup" ref={popupRef}>
          {pages.map((p, i) => (
            <button key={i}
              className={"adv-nav__popup-item" + (i === active ? " is-active" : "")}
              onClick={() => { setActive(i); setPopupOpen(false); }}>
              {levelLabel(p.n)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AdvancementPage({ page, c, update, editing }) {
  const rows = expandLevelRows();
  const idx = rows.findIndex((r) => r.n === page.n);
  const levelCanUnlock = levelCardPrereqsMet(c, rows, idx);
  const milestonesCanUnlock = milestoneUnlocksOpen(c, page);
  return (
    <div className="adv-page">
      {page.levelCards.map((card) => (
        <AdvancementRow key={card.slug}
          card={card} c={c} update={update}
          highlight editing={editing}
          labelText={cardTypeLabel(card.type)}
          canUnlock={levelCanUnlock} />
      ))}
      {page.milestoneCards.map((card) => (
        <AdvancementRow key={card.slug}
          card={card} c={c} update={update}
          editing={editing}
          labelText={cardTypeLabel(card.type)}
          canUnlock={milestonesCanUnlock} />
      ))}
    </div>
  );
}

function AdvancementRow({ card, c, update, highlight, editing, labelText, canUnlock }) {
  const available = isCardAvailable(c, card);
  const committed = isCardCommitted(c, card);
  // Auto-available cards (creation + level-1 milestones) are *always* at
  // least available — locking has no meaningful target state, so the
  // affordance is suppressed entirely. Only manual slots are lockable.
  const lockable = !card.auto_available;
  const showLock = editing && lockable;

  const relock = () => update({
    unlocked_slots: (c.unlocked_slots || []).filter((s) => s !== card.slug),
    ...clearCommittedDataPatch(c, card),
  });

  const cls = [
    "adv-row",
    highlight && "adv-row--highlight",
    !available && "adv-row--unavailable",
  ].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      <div className="adv-row__label-cell">
        <div className="adv-row__label">{wordStack(labelText)}</div>
        {available && showLock && (
          <HoldButton className="adv-row__lock"
            onConfirm={relock}
            title="Hold to lock — returns this slot to available">
            <svg viewBox="0 0 14 14" width="11" height="11" aria-hidden="true">
              <path fill="currentColor" d="M7 1a3 3 0 00-3 3v2H3a1 1 0 00-1 1v5a1 1 0 001 1h8a1 1 0 001-1V7a1 1 0 00-1-1h-1V4a3 3 0 00-3-3zm-2 5V4a2 2 0 114 0v2H5z" />
            </svg>
          </HoldButton>
        )}
        {!available && canUnlock && (
          <HoldButton className="adv-row__unlock"
            onConfirm={() => unlockSlot(update, c, card.slug)}
            title="Hold to unlock this slot">Unlock</HoldButton>
        )}
      </div>
      <div className="adv-row__card">
        <CardLayoutContext.Provider value={{ compact: true, editing }}>
          {available
            ? renderAdvancementCard(card, c, update)
            : (
                <div className="creation-card creation-card--unavailable creation-card--compact">
                  {unavailableSublabel(card) && (
                    <div className="creation-card__sublabel">{unavailableSublabel(card)}</div>
                  )}
                </div>
              )}
        </CardLayoutContext.Provider>
      </div>
    </div>
  );
}
