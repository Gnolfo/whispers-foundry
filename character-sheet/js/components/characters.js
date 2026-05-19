// ═══════════════════════════════════════════════════════════════════════
//  CHARACTERS MENU — library of saved characters in the header dropdown
// ═══════════════════════════════════════════════════════════════════════

function CharactersMenu({
  currentName,
  library,
  onSwitchTo,
  onDownload,
  onDelete,
  onSaveCurrent,
  onNew,
  onImport,
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const rootRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setConfirmingDelete(null);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirmingDelete(null);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const names = Object.keys(library.characters || {}).sort((a, b) => {
    if (a === currentName) return -1;
    if (b === currentName) return 1;
    return a.localeCompare(b);
  });

  const trimmedName = (currentName || "").trim();
  const canSaveAsCurrent = trimmedName.length > 0;
  const saveLabel = canSaveAsCurrent
    ? `Save current as "${trimmedName}"`
    : "Save current (name required)";

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onImport(file);
    e.target.value = "";
  };

  return (
    <div className="characters-menu" ref={rootRef}>
      <button
        className="save-load-btn characters-menu__trigger"
        onClick={() => { setOpen((v) => !v); setConfirmingDelete(null); }}
        aria-expanded={open}
      >
        Characters <span className="characters-menu__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="characters-menu__panel">
          <div className="characters-menu__header">
            <span className="smcp">Library</span>
            <span className="characters-menu__count">{names.length}</span>
          </div>
          {names.length === 0 && (
            <div className="characters-menu__empty">No saved characters yet.</div>
          )}
          <ul className="characters-menu__list">
            {names.map((name) => {
              const ch = library.characters[name];
              const isCurrent = name === currentName;
              const isSelected = name === selected;
              const isConfirming = name === confirmingDelete;
              const subtitle = describeCharacter(ch);
              return (
                <li
                  key={name}
                  className={[
                    "characters-row",
                    isCurrent && "is-current",
                    isSelected && "is-selected",
                  ].filter(Boolean).join(" ")}
                >
                  <button
                    type="button"
                    className="characters-row__main"
                    onClick={() => {
                      setSelected((prev) => (prev === name ? null : name));
                      setConfirmingDelete(null);
                    }}
                  >
                    <span className="characters-row__name">
                      {isCurrent && <span className="characters-row__dot" aria-hidden="true">●</span>}
                      {name}
                    </span>
                    {subtitle && (
                      <span className="characters-row__subtitle">{subtitle}</span>
                    )}
                  </button>
                  {isSelected && !isConfirming && (
                    <div className="characters-row__actions">
                      <button
                        type="button"
                        className="characters-row__action"
                        disabled={isCurrent}
                        onClick={() => { onSwitchTo(name); setOpen(false); setSelected(null); }}
                      >
                        {isCurrent ? "Loaded" : "Load"}
                      </button>
                      <button
                        type="button"
                        className="characters-row__action"
                        onClick={() => onDownload(name)}
                      >
                        Download
                      </button>
                      <HoldButton
                        className="characters-row__action characters-row__action--danger"
                        onConfirm={() => setConfirmingDelete(name)}
                        title="Hold 2s to ask for delete confirmation"
                      >
                        Delete
                      </HoldButton>
                    </div>
                  )}
                  {isConfirming && (
                    <div className="characters-row__confirm">
                      <div className="characters-row__confirm-text">
                        Delete <strong>{name}</strong>? This can't be undone.
                      </div>
                      <div className="characters-row__confirm-actions">
                        <button
                          type="button"
                          className="characters-row__action"
                          onClick={() => setConfirmingDelete(null)}
                        >
                          Cancel
                        </button>
                        <HoldButton
                          className="characters-row__action characters-row__action--danger"
                          onConfirm={() => {
                            onDelete(name);
                            setConfirmingDelete(null);
                            setSelected(null);
                          }}
                          title="Hold 2s to confirm delete"
                        >
                          Hold to confirm
                        </HoldButton>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="characters-menu__footer">
            <button
              type="button"
              className="characters-menu__footer-btn"
              disabled={!canSaveAsCurrent}
              onClick={() => { onSaveCurrent(); setSelected(null); }}
            >
              {saveLabel}
            </button>
            <button
              type="button"
              className="characters-menu__footer-btn"
              onClick={() => { onNew(); setOpen(false); setSelected(null); setConfirmingDelete(null); }}
            >
              New character
            </button>
            <button
              type="button"
              className="characters-menu__footer-btn"
              onClick={handleImportClick}
            >
              Import from file…
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Short "Level N · Ancestry · Class" line for the row subtitle.
function describeCharacter(ch) {
  if (!ch) return "";
  const parts = [];
  if (ch.level) parts.push(`Level ${ch.level}`);
  if (ch.ancestry) parts.push(ch.ancestry);
  if (ch.class) parts.push(CLASSES[ch.class] || ch.class);
  return parts.join(" · ");
}
