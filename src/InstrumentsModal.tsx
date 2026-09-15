import FieldInput from "./FieldInput";
import type { TestInstrument } from "./types";
import { instrumentHasData } from "./workbook";

const FIELDS: Array<{
  key: keyof TestInstrument;
  label: string;
  placeholder?: string;
  type?: "text" | "date";
}> = [
  { key: "fabricanteModelo", label: "Fabricante e modelo", placeholder: "Marca e modelo" },
  { key: "numeroSerie", label: "Número de série", placeholder: "S/N" },
  { key: "patrimonio", label: "Código de patrimônio", placeholder: "Tag interna da empresa" },
  { key: "certificadoCalibracao", label: "Nº do certificado de calibração", placeholder: "RBC / Inmetro" },
  { key: "dataCalibracao", label: "Data da última calibração", type: "date" },
  { key: "validadeCalibracao", label: "Validade da calibração", type: "date" },
];

interface Props {
  open: boolean;
  showMultimeter: boolean;
  showMegohmmeter: boolean;
  multimetro: TestInstrument;
  megometro: TestInstrument;
  onClose: () => void;
  onChange: (which: "multimetro" | "megometro", patch: Partial<TestInstrument>) => void;
}

export default function InstrumentsModal({
  open,
  showMultimeter,
  showMegohmmeter,
  multimetro,
  megometro,
  onClose,
  onChange,
}: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div
        className="modal modal-instruments"
        role="dialog"
        aria-labelledby="instruments-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="instruments-title">Equipamentos de ensaio</h2>
        <p className="modal-hint">
          O multímetro/alicate entra quando há Voc, polaridade ou flutuação. O megômetro entra
          quando há teste de isolação. Os dados vão para o PDF.
        </p>
        {!showMultimeter && !showMegohmmeter ? (
          <p className="modal-hint">
            Nenhum desses testes está ligado. Em Configuração, marque Voc, polaridade, flutuação
            ou isolação para cadastrar o instrumento.
          </p>
        ) : (
          <div className={showMultimeter && showMegohmmeter ? "instrument-grid" : "instrument-grid single"}>
            {showMultimeter && (
              <InstrumentCard
                title="Multímetro / alicate amperímetro"
                filled={instrumentHasData(multimetro)}
                value={multimetro}
                onChange={(patch) => onChange("multimetro", patch)}
              />
            )}
            {showMegohmmeter && (
              <InstrumentCard
                title="Megômetro"
                filled={instrumentHasData(megometro)}
                value={megometro}
                onChange={(patch) => onChange("megometro", patch)}
              />
            )}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function InstrumentCard({
  title,
  filled,
  value,
  onChange,
}: {
  title: string;
  filled: boolean;
  value: TestInstrument;
  onChange: (patch: Partial<TestInstrument>) => void;
}) {
  return (
    <fieldset className="instrument-card">
      <legend>
        {title}
        {filled ? " · preenchido" : ""}
      </legend>
      {FIELDS.map((field) => (
        <label key={field.key}>
          {field.label}
          {field.type === "date" ? (
            <input
              type="date"
              value={value[field.key]}
              onChange={(event) => onChange({ [field.key]: event.target.value })}
            />
          ) : (
            <FieldInput
              value={value[field.key]}
              placeholder={field.placeholder}
              onChange={(next) => onChange({ [field.key]: next })}
            />
          )}
        </label>
      ))}
    </fieldset>
  );
}
