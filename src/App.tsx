import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDemoPage } from "./demo";
import { buildPdf } from "./pdf";
import { openWorkbookFile, savePdfFile, saveWorkbookFile } from "./platform";
import type { Inverter, TestRow, Workbook } from "./types";
import { DRAFT_KEY, RECENT_KEY } from "./types";
import {
  addMesa,
  addString,
  countMesas,
  createEmptyWorkbook,
  createExampleWorkbook,
  emptyInverter,
  fileTitle,
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
  const [renameId, setRenameId] = useState<string | null>(null);
  const [demo] = useState(() => isDemoPage());
  const snapshot = useRef(serializeWorkbook(emptyDraft));

  const active = book.inverters.find((inv) => inv.id === book.activeInverterId)
    ?? book.inverters[0];

  const mark = useCallback((next: Workbook, message?: string) => {
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

  const patchHeader = (patch: Partial<Workbook>) => mark({ ...book, ...patch });

  const patchActive = (inverter: Inverter, message?: string) => {
    mark({
      ...book,
      inverters: book.inverters.map((item) => (item.id === inverter.id ? inverter : item)),
    }, message);
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
      return;
    }
    if (!window.confirm("Excluir este inversor e todas as linhas?")) return;
    const inverters = book.inverters.filter((item) => item.id !== id);
    mark({
      ...book,
      inverters,
      activeInverterId: book.activeInverterId === id ? inverters[0].id : book.activeInverterId,
    }, "Inversor excluído");
  };

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
            {renameId === inv.id ? (
              <input
                autoFocus
                className="tab-rename"
                value={inv.name}
                onChange={(e) =>
                  mark({
                    ...book,
                    inverters: book.inverters.map((item) =>
                      item.id === inv.id ? { ...item, name: e.target.value } : item,
                    ),
                  })
                }
                onBlur={() => setRenameId(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setRenameId(null);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => mark({ ...book, activeInverterId: inv.id })}
                onDoubleClick={() => setRenameId(inv.id)}
              >
                {inv.name}
              </button>
            )}
            <button
              type="button"
              className="tab-x"
              title="Excluir inversor"
              onClick={() => removeInverter(inv.id)}
            >
              ×
            </button>
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
            {countMesas(active)} mesas · {active.rows.length} strings
          </span>
        </div>
        <div className="actions">
          <button
            type="button"
            onClick={() => {
              const label = window.prompt("Nome da mesa", `Mesa ${String(countMesas(active) + 1).padStart(2, "0")}`);
              if (label === null) return;
              patchActive(addMesa(active, label), "Mesa adicionada");
            }}
          >
            Adicionar mesa
          </button>
          <button type="button" onClick={() => patchActive(addString(active), "String adicionada")}>
            Adicionar string
          </button>
        </div>
      </section>

      <div className="sheet-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th colSpan={6} className="group blank">
                Identificação
              </th>
              <th colSpan={3} className="group float">
                Teste de Flutuação
              </th>
              <th colSpan={3} className="group iso">
                Teste de Isolação
              </th>
              <th className="no-print" />
            </tr>
            <tr>
              <th>Mesa</th>
              <th>String</th>
              <th>PV</th>
              <th>MPPT</th>
              <th>Tensão Voc</th>
              <th>Polaridade</th>
              <th>Positivo + T</th>
              <th>Negativo + T</th>
              <th>Tensão Aplicada</th>
              <th>Tempo</th>
              <th>MΩ</th>
              <th>GΩ</th>
              <th className="no-print" />
            </tr>
          </thead>
          <tbody>
            {active.rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="empty">
                  Nenhuma linha neste inversor. Clique em <strong>Adicionar mesa</strong> para
                  começar os testes de campo.
                </td>
              </tr>
            ) : (
              active.rows.map((row, index) => (
                <GridRow
                  key={row.id}
                  row={row}
                  first={isFirstOfMesa(active.rows, index)}
                  onChange={(patch) => patchActive(updateRow(active, row.id, patch))}
                  onRemove={() => patchActive(removeRow(active, row.id))}
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
    </div>
  );
}

function GridRow({
  row,
  first,
  onChange,
  onRemove,
}: {
  row: TestRow;
  first: boolean;
  onChange: (patch: Partial<TestRow>) => void;
  onRemove: () => void;
}) {
  return (
    <tr>
      <td className={first ? "mesa" : "mesa muted"}>
        <input value={row.mesa} onChange={(e) => onChange({ mesa: e.target.value })} />
      </td>
      <Cell value={row.stringNo} onChange={(stringNo) => onChange({ stringNo })} />
      <Cell value={row.pv} onChange={(pv) => onChange({ pv })} />
      <Cell value={row.mppt} onChange={(mppt) => onChange({ mppt })} />
      <Cell value={row.tensaoVoc} onChange={(tensaoVoc) => onChange({ tensaoVoc })} />
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
      <Cell value={row.flutPositivo} onChange={(flutPositivo) => onChange({ flutPositivo })} />
      <Cell value={row.flutNegativo} onChange={(flutNegativo) => onChange({ flutNegativo })} />
      <Cell value={row.tensaoAplicada} onChange={(tensaoAplicada) => onChange({ tensaoAplicada })} />
      <Cell value={row.isolamentoTempo} onChange={(isolamentoTempo) => onChange({ isolamentoTempo })} />
      <Cell value={row.isolamentoMohm} onChange={(isolamentoMohm) => onChange({ isolamentoMohm })} />
      <Cell value={row.isolamentoGohm} onChange={(isolamentoGohm) => onChange({ isolamentoGohm })} />
      <td className="no-print">
        <button type="button" className="row-x" onClick={onRemove} title="Excluir linha">
          ×
        </button>
      </td>
    </tr>
  );
}

function Cell({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <td>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </td>
  );
}
