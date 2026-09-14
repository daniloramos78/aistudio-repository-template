import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDemoPage } from "./demo";
import { buildPdf } from "./pdf";
import { openWorkbookFile, savePdfFile, saveWorkbookFile } from "./platform";
import type { Inverter, TestRow, Workbook } from "./types";
import { DRAFT_KEY, RECENT_KEY } from "./types";
import {
  COLUMNS,
  DEFAULT_COLUMNS,
  GROUP_LABEL,
  SMALL_PLANT_COLUMNS,
  groupSpan,
  normalizeColumns,
  rowValue,
  visibleColumns,
  type ColumnConfig,
  type ColumnGroup,
  type ColumnId,
} from "./columns";
import {
  addMesa,
  addString,
  countMesas,
  createEmptyWorkbook,
  createExampleWorkbook,
  emptyInverter,
  fileTitle,
  inverterHasData,
  inverterNameFromNumber,
  inverterNumberFromName,
  isFirstOfMesa,
  parseWorkbook,
  removeRow,
  serializeWorkbook,
  suggestedFileName,
  updateRow,
} from "./workbook";

type Status = { kind: "ok" | "warn" | "err"; text: string };

const emptyDraft = createEmptyWorkbook();

export default function App() {
  const [book, setBook] = useState<Workbook>(emptyDraft);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({
    kind: "ok",
    text: "Novo teste. Os dados ficam neste computador.",
  });
  const [recent, setRecent] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [draftColumns, setDraftColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [mesaOpen, setMesaOpen] = useState(false);
  const [mesaName, setMesaName] = useState("");
  const [mesaCount, setMesaCount] = useState("2");
  const [demo] = useState(() => isDemoPage());
  const snapshot = useRef(serializeWorkbook(emptyDraft));

  const active = book.inverters.find((inv) => inv.id === book.activeInverterId)
    ?? book.inverters[0];

  const mark = useCallback((
    next: Workbook | ((current: Workbook) => Workbook),
    message?: string,
  ) => {
    setBook(next);
    setDirty(true);
    if (message) setStatus({ kind: "ok", text: message });
  }, []);

  useEffect(() => {
    const storedRecent = window.localStorage.getItem(RECENT_KEY);
    if (storedRecent) {
      try {
        setRecent(JSON.parse(storedRecent) as string[]);
      } catch {
        /* ignore */
      }
    }
    if (isDemoPage()) {
      const next = createExampleWorkbook();
      snapshot.current = serializeWorkbook(next);
      setBook(next);
      setDirty(false);
      setStatus({
        kind: "ok",
        text: "Página de teste — exemplo Manga G. 05. Pode editar, salvar JSON e gerar PDF.",
      });
      return;
    }
    const draft = window.localStorage.getItem(DRAFT_KEY);
    if (!draft) return;
    try {
      const recovered = parseWorkbook(draft);
      if (serializeWorkbook(recovered) === snapshot.current) return;
      if (window.confirm("Há um teste não salvo neste computador. Recuperar?")) {
        setBook(recovered);
        setDirty(true);
        setStatus({ kind: "warn", text: "Rascunho recuperado. Salve no disco para não perder." });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (demo) return;
    const handle = window.setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, serializeWorkbook(book));
    }, 400);
    return () => window.clearTimeout(handle);
  }, [book, demo]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const ctrl = event.ctrlKey || event.metaKey;
      if (!ctrl) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void persist(event.shiftKey);
      }
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        void openFile();
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        newTest();
      }
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const confirmDiscard = () => {
    if (!dirty) return true;
    return window.confirm("Há alterações não salvas. Continuar mesmo assim?");
  };

  const newTest = () => {
    if (!confirmDiscard()) return;
    const next = createEmptyWorkbook();
    snapshot.current = serializeWorkbook(next);
    setBook(next);
    setFilePath(null);
    setDirty(false);
    window.localStorage.removeItem(DRAFT_KEY);
    setStatus({ kind: "ok", text: "Novo teste em branco. Preencha os dados de campo e salve." });
  };

  const loadExample = () => {
    if (!confirmDiscard()) return;
    const next = createExampleWorkbook();
    snapshot.current = serializeWorkbook(next);
    setBook(next);
    setFilePath(null);
    setDirty(true);
    setStatus({ kind: "ok", text: "Exemplo Manga G. 05 carregado. Use Salvar para gravar no computador." });
  };

  const openFile = async () => {
    if (!confirmDiscard()) return;
    try {
      const opened = await openWorkbookFile();
      if (!opened) return;
      const next = parseWorkbook(opened.contents);
      snapshot.current = serializeWorkbook(next);
      setBook(next);
      setFilePath(opened.filePath);
      setDirty(false);
      remember(opened.filePath);
      window.localStorage.removeItem(DRAFT_KEY);
      setStatus({ kind: "ok", text: `Aberto: ${opened.filePath ?? suggestedFileName(next)}` });
    } catch (error) {
      setStatus({ kind: "err", text: error instanceof Error ? error.message : "Não foi possível abrir o arquivo." });
    }
  };

  const persist = async (saveAs = false) => {
    try {
      const contents = serializeWorkbook(book);
      const saved = await saveWorkbookFile(book, contents, filePath, saveAs || !filePath);
      if (!saved) return;
      snapshot.current = contents;
      setFilePath(saved);
      setDirty(false);
      remember(saved);
      window.localStorage.removeItem(DRAFT_KEY);
      setStatus({ kind: "ok", text: `Salvo em ${saved}` });
    } catch (error) {
      setStatus({ kind: "err", text: error instanceof Error ? error.message : "Falha ao salvar." });
    }
  };

  const exportPdf = async () => {
    try {
      const bytes = buildPdf(book);
      const saved = await savePdfFile(book, bytes);
      if (!saved) return;
      setStatus({ kind: "ok", text: `PDF gerado: ${saved}` });
    } catch (error) {
      setStatus({ kind: "err", text: error instanceof Error ? error.message : "Falha ao gerar PDF." });
    }
  };

  const remember = (path: string | null) => {
    if (!path) return;
    setRecent((current) => {
      const next = [path, ...current.filter((item) => item !== path)].slice(0, 6);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const patchHeader = (patch: Partial<Workbook>) => {
    mark((current) => ({ ...current, ...patch }));
  };

  const mutateActive = (fn: (inverter: Inverter) => Inverter, message?: string) => {
    mark((current) => {
      const inverter =
        current.inverters.find((item) => item.id === current.activeInverterId)
        ?? current.inverters[0];
      return {
        ...current,
        inverters: current.inverters.map((item) =>
          item.id === inverter.id ? fn(item) : item,
        ),
      };
    }, message);
  };

  const submitMesa = () => {
    mutateActive(
      (inverter) => addMesa(inverter, mesaName, Number(mesaCount) || 2),
      "Mesa adicionada — linhas vazias para preencher",
    );
    setMesaOpen(false);
  };

  const addInverter = () => {
    const next = emptyInverter(book.inverters.length + 1);
    mark({
      ...book,
      inverters: [...book.inverters, next],
      activeInverterId: next.id,
    }, `${next.name} adicionado`);
  };

  const removeInverter = (id: string) => {
    if (book.inverters.length === 1) {
      setStatus({ kind: "warn", text: "Mantenha pelo menos um inversor." });
      return false;
    }
    if (!window.confirm("Excluir este inversor e todas as linhas?")) return false;
    const inverters = book.inverters.filter((item) => item.id !== id);
    mark({
      ...book,
      inverters,
      activeInverterId: book.activeInverterId === id ? inverters[0].id : book.activeInverterId,
    }, "Inversor excluído");
    return true;
  };

  const openInverterEditor = (inv: Inverter) => {
    if (!inverterHasData(inv)) return;
    setBook((current) => ({ ...current, activeInverterId: inv.id }));
    setEditId(inv.id);
    setEditName(inv.name);
    setEditNumber(inverterNumberFromName(inv.name));
  };

  const saveInverterEditor = () => {
    if (!editId) return;
    const name = editName.trim() || inverterNameFromNumber(editNumber);
    mark({
      ...book,
      inverters: book.inverters.map((item) =>
        item.id === editId ? { ...item, name } : item,
      ),
    }, `${name} atualizado`);
    setEditId(null);
  };

  const editing = book.inverters.find((inv) => inv.id === editId) ?? null;

  const columns = book.columns ?? DEFAULT_COLUMNS;
  const vis = visibleColumns(columns);
  const stats = useMemo(() => {
    const rows = book.inverters.flatMap((inv) => inv.rows);
    const mesas = new Set(rows.map((row) => row.mesa.trim()).filter(Boolean)).size;
    const ok = rows.filter((row) => row.polaridade === "Ok").length;
    const nok = rows.filter((row) => row.polaridade === "Nok").length;
    return { strings: rows.length, mesas, ok, nok };
  }, [book]);

  return (
    <div className={demo ? "app demo" : "app"}>
      {demo && (
        <div className="demo-banner no-print">
          Página de teste com dados de exemplo (UFV Manga G. 05). Edite à vontade — nada é enviado
          para servidor.
        </div>
      )}
      <header className="toolbar no-print">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            ▦
          </span>
          <div>
            <strong>Planilha de Testes UFV</strong>
            <small>Testes de campo · salvar no PC · PDF · imprimir</small>
          </div>
        </div>
        <div className="actions">
          <button type="button" onClick={newTest}>Novo</button>
          <button type="button" onClick={() => void openFile()}>Abrir</button>
          <button type="button" className="primary" onClick={() => void persist(false)}>
            Salvar
          </button>
          <button type="button" onClick={() => void persist(true)}>Salvar como</button>
          <button type="button" onClick={() => void exportPdf()}>Salvar PDF</button>
          <button type="button" onClick={() => window.print()}>Imprimir</button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setDraftColumns(columns);
              setConfigOpen(true);
            }}
          >
            Configuração
          </button>
          <button type="button" className="ghost" onClick={loadExample}>
            Carregar exemplo
          </button>
        </div>
      </header>

      <section className="meta">
        <label>
          Data
          <input
            type="date"
            value={book.data}
            onChange={(e) => patchHeader({ data: e.target.value })}
          />
        </label>
        <label>
          Umidade (%)
          <input
            value={book.umidade}
            inputMode="decimal"
            placeholder="40.00"
            onChange={(e) => patchHeader({ umidade: e.target.value })}
          />
        </label>
        <label>
          Temperatura (°C)
          <input
            value={book.temperatura}
            inputMode="decimal"
            placeholder="33"
            onChange={(e) => patchHeader({ temperatura: e.target.value })}
          />
        </label>
        <label className="wide">
          UFV
          <input
            value={book.ufv}
            placeholder="Ex.: Manga G. 05"
            onChange={(e) => patchHeader({ ufv: e.target.value })}
          />
        </label>
        <label>
          Técnico
          <input
            value={book.tecnico}
            onChange={(e) => patchHeader({ tecnico: e.target.value })}
          />
        </label>
        <label className="wide">
          Observações
          <input
            value={book.observacoes}
            onChange={(e) => patchHeader({ observacoes: e.target.value })}
          />
        </label>
      </section>

      <nav className="tabs no-print">
        {book.inverters.map((inv) => (
          <div key={inv.id} className={inv.id === active.id ? "tab active" : "tab"}>
            <button
              type="button"
              onClick={() => mark({ ...book, activeInverterId: inv.id })}
            >
              {inv.name}
            </button>
            {inverterHasData(inv) && (
              <button
                type="button"
                className="tab-edit"
                onClick={() => openInverterEditor(inv)}
              >
                Editar
              </button>
            )}
          </div>
        ))}
        <button type="button" className="tab add" onClick={addInverter}>
          + Inversor
        </button>
      </nav>

      <section className="sheet-toolbar no-print">
        <div>
          <strong>{active.name}</strong>
          <span>
            {columns.mesa ? `${countMesas(active)} mesas · ` : ""}
            {active.rows.length} strings
          </span>
        </div>
        <div className="actions">
          {columns.mesa && (
            <button
              type="button"
              onClick={() => {
                setMesaName("");
                setMesaCount("2");
                setMesaOpen(true);
              }}
            >
              Adicionar mesa
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              mutateActive(
                (inverter) => addString(inverter, columns.mesa),
                "String vazia adicionada — clique na célula para preencher",
              )
            }
          >
            Adicionar string
          </button>
        </div>
      </section>

      <div className="sheet-wrap">
        <table className="sheet">
          <thead>
            <tr>
              {(["id", "float", "iso"] as ColumnGroup[]).map((group) => {
                const span = groupSpan(columns, group);
                if (!span) return null;
                return (
                  <th key={group} colSpan={span} className={`group ${group === "id" ? "blank" : group === "float" ? "float" : "iso"}`}>
                    {GROUP_LABEL[group]}
                  </th>
                );
              })}
              <th className="no-print" />
            </tr>
            <tr>
              {vis.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
              <th className="no-print" />
            </tr>
          </thead>
          <tbody>
            {active.rows.length === 0 ? (
              <tr>
                <td colSpan={vis.length + 1} className="empty">
                  Nenhuma linha neste inversor. Clique em{" "}
                  <strong>{columns.mesa ? "Adicionar mesa" : "Adicionar string"}</strong>{" "}
                  para começar. As células entram vazias para você preencher no campo.
                </td>
              </tr>
            ) : (
              active.rows.map((row, index) => (
                <GridRow
                  key={row.id}
                  row={row}
                  columns={vis.map((column) => column.id)}
                  first={isFirstOfMesa(active.rows, index)}
                  onChange={(patch) =>
                    mutateActive((inverter) => updateRow(inverter, row.id, patch))
                  }
                  onRemove={() => mutateActive((inverter) => removeRow(inverter, row.id))}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="status no-print">
        <span className={status.kind}>{status.text}</span>
        <span>
          {dirty ? "Não salvo" : "Salvo"}
          {filePath ? ` · ${filePath}` : ` · ${suggestedFileName(book)}`}
        </span>
        <span>
          Total: {stats.mesas} mesas · {stats.strings} strings · Polaridade Ok {stats.ok}
          {stats.nok ? ` · Nok ${stats.nok}` : ""}
        </span>
        {recent.length > 0 && (
          <span className="recent">Recentes: {recent.slice(0, 3).join(" · ")}</span>
        )}
      </footer>

      <section className="print-banner">
        <h1>Planilha de Testes UFV</h1>
        <p>
          {book.ufv || "UFV não informada"} · {fileTitle(book)}
        </p>
      </section>

      {editing && (
        <div className="modal-backdrop no-print" onClick={() => setEditId(null)}>
          <div
            className="modal"
            role="dialog"
            aria-labelledby="edit-inverter-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="edit-inverter-title">Editar {editing.name}</h2>
            <p className="modal-hint">
              Disponível porque este inversor já tem dados preenchidos.
            </p>
            <label>
              Editar valores (nome)
              <input
                autoFocus
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  const parsed = inverterNumberFromName(e.target.value);
                  if (parsed) setEditNumber(parsed);
                }}
              />
            </label>
            <label>
              Alterar numeração
              <input
                inputMode="numeric"
                value={editNumber}
                placeholder="01"
                onChange={(e) => {
                  const value = e.target.value.replaceAll(/\D+/g, "");
                  setEditNumber(value);
                  if (value) setEditName(inverterNameFromNumber(value));
                }}
              />
            </label>
            <p className="modal-preview">Vai ficar: {editName || inverterNameFromNumber(editNumber)}</p>
            <div className="modal-actions">
              <button type="button" className="primary" onClick={saveInverterEditor}>
                Salvar
              </button>
              <button type="button" onClick={() => setEditId(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (removeInverter(editing.id)) setEditId(null);
                }}
              >
                Excluir inversor
              </button>
            </div>
          </div>
        </div>
      )}

      {configOpen && (
        <div className="modal-backdrop no-print" onClick={() => setConfigOpen(false)}>
          <div
            className="modal modal-wide"
            role="dialog"
            aria-labelledby="config-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="config-title">Configuração da planilha</h2>
            <p className="modal-hint">
              Por padrão todos os campos vêm ligados. Desmarque o que não usar — usina pequena pode
              ficar sem mesa.
            </p>
            <div className="modal-actions" style={{ marginBottom: 12 }}>
              <button type="button" onClick={() => setDraftColumns({ ...DEFAULT_COLUMNS })}>
                Todos os campos
              </button>
              <button type="button" onClick={() => setDraftColumns({ ...SMALL_PLANT_COLUMNS })}>
                Usina pequena (sem mesa)
              </button>
            </div>
            {(["id", "float", "iso"] as ColumnGroup[]).map((group) => (
              <fieldset key={group} className="config-group">
                <legend>{GROUP_LABEL[group]}</legend>
                {COLUMNS.filter((column) => column.group === group).map((column) => (
                  <label key={column.id} className="check">
                    <input
                      type="checkbox"
                      checked={draftColumns[column.id]}
                      onChange={(e) =>
                        setDraftColumns((current) => ({
                          ...current,
                          [column.id]: e.target.checked,
                        }))
                      }
                    />
                    {column.label}
                  </label>
                ))}
              </fieldset>
            ))}
            <div className="modal-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  mark(
                    (current) => ({ ...current, columns: normalizeColumns(draftColumns) }),
                    "Configuração da planilha atualizada",
                  );
                  setConfigOpen(false);
                }}
              >
                Aplicar
              </button>
              <button type="button" onClick={() => setConfigOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {mesaOpen && (
        <div className="modal-backdrop no-print" onClick={() => setMesaOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-labelledby="mesa-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="mesa-title">Adicionar mesa</h2>
            <p className="modal-hint">As linhas entram vazias. Preencha os valores no campo.</p>
            <label>
              Nome da mesa (opcional)
              <input
                autoFocus
                value={mesaName}
                placeholder="Ex.: Mesa 01"
                onChange={(e) => setMesaName(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitMesa();
                  }
                }}
              />
            </label>
            <label>
              Quantidade de strings
              <input
                inputMode="numeric"
                value={mesaCount}
                onChange={(e) => setMesaCount(e.target.value.replaceAll(/\D+/g, ""))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitMesa();
                  }
                }}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="primary"
                onClick={submitMesa}
              >
                Adicionar
              </button>
              <button type="button" onClick={() => setMesaOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GridRow({
  row,
  columns,
  first,
  onChange,
  onRemove,
}: {
  row: TestRow;
  columns: ColumnId[];
  first: boolean;
  onChange: (patch: Partial<TestRow>) => void;
  onRemove: () => void;
}) {
  return (
    <tr>
      {columns.map((id) => (
        <GridCell key={id} id={id} row={row} first={first} onChange={onChange} />
      ))}
      <td className="no-print">
        <button type="button" className="row-x" onClick={onRemove} title="Excluir linha">
          ×
        </button>
      </td>
    </tr>
  );
}

function GridCell({
  id,
  row,
  first,
  onChange,
}: {
  id: ColumnId;
  row: TestRow;
  first: boolean;
  onChange: (patch: Partial<TestRow>) => void;
}) {
  if (id === "polaridade") {
    return (
      <td>
        <select
          value={row.polaridade}
          onChange={(e) => onChange({ polaridade: e.target.value as TestRow["polaridade"] })}
        >
          <option value="" />
          <option value="Ok">Ok</option>
          <option value="Nok">Nok</option>
        </select>
      </td>
    );
  }
  const className = id === "mesa" ? (first ? "mesa" : "mesa muted") : undefined;
  return (
    <td className={className}>
      <input
        value={rowValue(row, id)}
        autoComplete="off"
        spellCheck={false}
        aria-label={id}
        onChange={(e) => onChange({ [id]: e.target.value } as Partial<TestRow>)}
      />
    </td>
  );
}
