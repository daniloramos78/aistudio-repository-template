import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDemoPage } from "./demo";
import { buildPdf } from "./pdf";
import { openWorkbookFile, savePdfFile, saveWorkbookFile } from "./platform";
import SheetGrid from "./SheetGrid";
import { isRedoKey, isUndoKey } from "./sheetKeys";
import type { Inverter, IsolationCriterion, TestRow, Workbook } from "./types";
import { DRAFT_KEY, RECENT_KEY } from "./types";
import {
  COLUMNS,
  DEFAULT_COLUMNS,
  GROUP_LABEL,
  SMALL_PLANT_COLUMNS,
  applyIsolationCoupling,
  groupSpan,
  normalizeColumns,
  visibleColumns,
  type ColumnConfig,
  type ColumnGroup,
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
  parseWorkbook,
  removeRow,
  serializeWorkbook,
  suggestedFileName,
} from "./workbook";
import { ISOLATION_OPTIONS, evaluateRow } from "./verdict";

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
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);

  const active = book.inverters.find((inv) => inv.id === book.activeInverterId)
    ?? book.inverters[0];

  const rememberBook = (current: Workbook) => {
    past.current.push(serializeWorkbook(current));
    if (past.current.length > 100) past.current.shift();
    future.current = [];
  };

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) {
      setStatus({ kind: "warn", text: "Nada para desfazer" });
      return;
    }
    setBook((current) => {
      future.current.push(serializeWorkbook(current));
      return parseWorkbook(prev);
    });
    setDirty(true);
    setStatus({ kind: "ok", text: "Desfeito" });
  }, []);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) {
      setStatus({ kind: "warn", text: "Nada para refazer" });
      return;
    }
    setBook((current) => {
      past.current.push(serializeWorkbook(current));
      return parseWorkbook(next);
    });
    setDirty(true);
    setStatus({ kind: "ok", text: "Refeito" });
  }, []);

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
      const target = event.target as HTMLElement | null;
      const inModal = Boolean(target?.closest(".modal"));
      const inHeader = Boolean(target?.closest(".meta"));
      const inSheet = Boolean(target?.closest("[data-sheet-cell]"));

      if (isUndoKey(event) && !inModal && !inHeader) {
        if (inSheet) return;
        event.preventDefault();
        undo();
        return;
      }
      if (isRedoKey(event) && !inModal && !inHeader) {
        if (inSheet) return;
        event.preventDefault();
        redo();
        return;
      }

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
    past.current = [];
    future.current = [];
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
    past.current = [];
    future.current = [];
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
      past.current = [];
      future.current = [];
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
      rememberBook(current);
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

  const replaceActiveRows = (
    mutate: (rows: TestRow[]) => TestRow[],
    recordHistory = true,
  ) => {
    setBook((current) => {
      const inverter =
        current.inverters.find((item) => item.id === current.activeInverterId)
        ?? current.inverters[0];
      const nextRows = mutate(inverter.rows);
      if (nextRows === inverter.rows) return current;
      if (recordHistory) rememberBook(current);
      return {
        ...current,
        inverters: current.inverters.map((item) =>
          item.id === inverter.id ? { ...item, rows: nextRows } : item,
        ),
      };
    });
    setDirty(true);
  };

  const submitMesa = () => {
    mutateActive(
      (inverter) => addMesa(inverter, mesaName, Number(mesaCount) || 2),
      "Mesa adicionada — linhas vazias para preencher",
    );
    setMesaOpen(false);
  };

  const addInverter = () => {
    const nextInv = emptyInverter(book.inverters.length + 1);
    mark((current) => {
      rememberBook(current);
      const created = emptyInverter(current.inverters.length + 1);
      return {
        ...current,
        inverters: [...current.inverters, created],
        activeInverterId: created.id,
      };
    }, `${nextInv.name} adicionado`);
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
  const verdicts = useMemo(
    () => active.rows.map((row) => evaluateRow(row, book, columns)),
    [active.rows, book, columns],
  );
  const stats = useMemo(() => {
    const rows = book.inverters.flatMap((inv) => inv.rows);
    const mesas = new Set(rows.map((row) => row.mesa.trim()).filter(Boolean)).size;
    const approved = book.inverters.flatMap((inv) =>
      inv.rows.map((row) => evaluateRow(row, book, columns)),
    );
    return {
      strings: rows.length,
      mesas,
      pass: approved.filter((item) => item === "pass").length,
      fail: approved.filter((item) => item === "fail").length,
    };
  }, [book, columns]);

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
        <label className="wide">
          Endereço
          <input
            value={book.endereco}
            placeholder="Usina, talhão, coordenadas…"
            onChange={(e) => patchHeader({ endereco: e.target.value })}
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
        <div className="criteria">
          <label>
            Voc esperada da string
            <input
              value={book.vocEsperada}
              placeholder="Ex.: 1000"
              onChange={(e) => patchHeader({ vocEsperada: e.target.value })}
            />
          </label>
          <label>
            Erro ± (%)
            <input
              value={book.erroPercentual}
              placeholder="Ex.: 5"
              inputMode="decimal"
              onChange={(e) => patchHeader({ erroPercentual: e.target.value })}
            />
          </label>
          <label>
            Tensão do módulo
            <input
              value={book.tensaoModulo}
              placeholder="Ex.: 45,6V"
              onChange={(e) => patchHeader({ tensaoModulo: e.target.value })}
            />
          </label>
          <label>
            Isolação
            <select
              value={book.criterioIsolacao}
              onChange={(e) =>
                patchHeader({ criterioIsolacao: e.target.value as IsolationCriterion })
              }
            >
              {ISOLATION_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
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
                "String vazia adicionada — clique na célula e digite",
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
              <th className="group result-h">Resultado</th>
              <th className="no-print" />
            </tr>
            <tr>
              {vis.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
              <th>Aprov.</th>
              <th className="no-print" />
            </tr>
          </thead>
          {active.rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={vis.length + 2} className="empty">
                  Nenhuma linha neste inversor. Clique em{" "}
                  <strong>{columns.mesa ? "Adicionar mesa" : "Adicionar string"}</strong>{" "}
                  para começar. As células entram vazias para você preencher no campo.
                </td>
              </tr>
            </tbody>
          ) : (
              <SheetGrid
                rows={active.rows}
                columns={vis.map((column) => column.id)}
                verdicts={verdicts}
                onRowsChange={replaceActiveRows}
                onRemove={(rowId) => mutateActive((inverter) => removeRow(inverter, rowId))}
                onUndo={undo}
                onRedo={redo}
              />
          )}
        </table>
      </div>

      <footer className="status no-print">
        <span className={status.kind}>{status.text}</span>
        <span>
          {dirty ? "Não salvo" : "Salvo"}
          {filePath ? ` · ${filePath}` : ` · ${suggestedFileName(book)}`}
        </span>
        <span>
          Total: {stats.mesas} mesas · {stats.strings} strings · Aprovadas {stats.pass}
          {stats.fail ? ` · Reprovadas ${stats.fail}` : ""}
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
              Por padrão todos os campos vêm ligados, menos TΩ. Desmarcar Tensão aplicada esconde
              também Tempo, MΩ, GΩ e TΩ.
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
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDraftColumns((current) => {
                          if (column.id === "tensaoAplicada" && !checked) {
                            return applyIsolationCoupling({ ...current, tensaoAplicada: false });
                          }
                          if (column.id === "tensaoAplicada" && checked) {
                            return {
                              ...current,
                              tensaoAplicada: true,
                              isolamentoTempo: true,
                              isolamentoMohm: true,
                              isolamentoGohm: true,
                            };
                          }
                          return { ...current, [column.id]: checked };
                        });
                      }}
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
                    (current) => {
                      rememberBook(current);
                      return { ...current, columns: normalizeColumns(draftColumns) };
                    },
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

