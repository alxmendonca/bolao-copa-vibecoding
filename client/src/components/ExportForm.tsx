import { useState } from "react";
import { BOLAO_CONFIG } from "../config/bolao";
import type { MatchDef } from "../data/groupStage";
import { downloadBolaoExcel } from "../lib/exportExcel";
import type { ScoreInput } from "../lib/standings";

type Props = {
  matches: MatchDef[];
  scores: Record<string, ScoreInput>;
  participantName: string;
  onParticipantNameChange: (name: string) => void;
  filledCount: number;
};

export function ExportForm({
  matches,
  scores,
  participantName,
  onParticipantNameChange,
  filledCount,
}: Props) {
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const total = matches.length;
  const complete = filledCount === total;
  const nameOk = participantName.trim().length >= 2;

  function handleDownload() {
    setMessage("");

    if (!nameOk) {
      setStatus("err");
      setMessage("Informe seu nome (mínimo 2 caracteres).");
      return;
    }

    if (!complete) {
      setStatus("err");
      setMessage(
        `Preencha todos os ${total} jogos antes de baixar (${filledCount}/${total} completos).`,
      );
      return;
    }

    try {
      downloadBolaoExcel(matches, scores, participantName.trim());
      setStatus("ok");
      setMessage(
        `Planilha baixada. Envie o arquivo no WhatsApp do bolão até ${BOLAO_CONFIG.submissionDeadline}.`,
      );
    } catch {
      setStatus("err");
      setMessage("Não foi possível gerar a planilha. Tente de novo.");
    }
  }

  return (
    <section
      id="export-section"
      className="export-section"
      aria-labelledby="export-title"
    >
      <h2 id="export-title" className="section-title">
        Enviar palpites
      </h2>
      <p className="export-desc">
        Preencha seu nome, confira os {total} placares e baixe a planilha Excel.
        Depois envie o arquivo no WhatsApp do bolão.
      </p>

      <div className="export-form">
        <label className="export-label" htmlFor="export-name">
          Seu nome
        </label>
        <input
          id="export-name"
          type="text"
          className="export-input export-input--full"
          placeholder="Como você aparece no bolão"
          value={participantName}
          onChange={(e) => {
            onParticipantNameChange(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          autoComplete="name"
          maxLength={80}
        />

        <p
          className={`export-progress ${complete ? "export-progress--ok" : "export-progress--warn"}`}
        >
          {complete
            ? `Todos os ${total} jogos preenchidos — pronto para baixar.`
            : `${filledCount}/${total} jogos com placar completo — faltam ${total - filledCount}.`}
        </p>

        <div className="export-row">
          <button
            type="button"
            className="btn btn-primary btn-block-mobile"
            onClick={handleDownload}
            disabled={!complete || !nameOk}
          >
            Baixar planilha Excel
          </button>
        </div>

        <p className="export-instructions">
          Prazo para envio: {BOLAO_CONFIG.submissionDeadline}
        </p>

        {message ? (
          <p
            className={`export-feedback export-feedback--${status === "ok" ? "ok" : "err"}`}
            role="status"
          >
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
