// src/ui/pages/AdvancedSettings.tsx
import React, { useEffect, useState } from "react";

/** Estrutura dos templates salvos no main */
type Templates = {
  useCustom: boolean;
  test: string;
  check: string;
  mend: string;
  backup: string;
  restore: string;
};

/**
 * Tela de Configurações (Templates avançado)
 * - Carrega/salva templates via IPC (window.api.*).
 * - Layout:
 *    .settings-wrapper  -> coluna principal (flex)
 *    .settings-scroll   -> só os campos rolam
 *    .settings-actions  -> barra fixa com os botões
 * Assim os botões nunca ficam encobertos, mesmo com janela menor.
 */
export default function AdvancedSettings({ onBack }: { onBack: () => void }) {
  // Estado dos templates
  const [tpl, setTpl] = useState<Templates>({
    useCustom: false,
    test: "",
    check: "",
    mend: "",
    backup: "",
    restore: "",
  });

  // Estados auxiliares
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  /** Carrega templates do main; se faltarem campos, o main faz merge com defaults */
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const data = await window.api.getTemplates();
        if (alive && data) setTpl(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /** Salva templates no disco (main -> settings.json) */
  const handleSave = async () => {
    setMsg("");
    const r = await window.api.saveTemplates(tpl);
    setMsg(r === "OK" ? "Salvo com sucesso." : r || "Falha ao salvar.");
  };

  /** Restaura templates padrão (main retorna os defaults já mesclados) */
  const handleRestore = async () => {
    const data = await window.api.restoreDefaults();
    setTpl(data);
    setMsg("Templates padrão restaurados.");
  };

  /** Helper pra atualizar campo de template */
  const up = (key: keyof Templates) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setTpl({ ...tpl, [key]: e.target.value });

  return (
    <div className="app">{/* usa layout vertical padrão da app */}
      {/* Titlebar custom (arrastável). Os botões dentro são no-drag via CSS. */}
      <div className="titlebar">
        <div className="title">Configurações — Templates (avançado)</div>
        <div className="titlebar-actions no-drag">
          <button className="winbtn" onClick={onBack}>Voltar</button>
        </div>
      </div>

      {/* Conteúdo com wrapper/scroll/ações para manter botões sempre visíveis */}
      <div className="content settings-wrapper">
        {/* Cabeçalho informativo (fica fixo) */}
        <div className="group">
          <div className="group-title">Templates (avançado)</div>

          <div className="note" style={{ marginTop: 2 }}>
            <strong>Placeholders disponíveis:</strong>{" "}
            {`{ISQL} {GFIX} {GBAK} {USER} {PASS} {DB_PATH} {OLD_DB} {NEW_DB} {FBK} {LOG_BKP} {LOG_RTR}`}
          </div>

          <label className="checkbox" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={tpl.useCustom}
              onChange={(e) => setTpl({ ...tpl, useCustom: e.target.checked })}
            />
            Usar templates personalizados
          </label>
        </div>

        {/* Somente os campos rolam — evita encobrir a barra de ações */}
        <div className="settings-scroll">
          <div className="group">
            <div className="group-title">Teste conexão (isql)</div>
            <textarea
              className="textarea"
              value={tpl.test}
              onChange={up("test")}
              spellCheck={false}
            />
          </div>

          <div className="group">
            <div className="group-title">Verificar (gfix -v -full)</div>
            <textarea
              className="textarea"
              value={tpl.check}
              onChange={up("check")}
              spellCheck={false}
            />
          </div>

          <div className="group">
            <div className="group-title">Reparar (gfix -mend)</div>
            <textarea
              className="textarea"
              value={tpl.mend}
              onChange={up("mend")}
              spellCheck={false}
            />
          </div>

          <div className="group">
            <div className="group-title">Backup (gbak -b)</div>
            <textarea
              className="textarea"
              value={tpl.backup}
              onChange={up("backup")}
              spellCheck={false}
            />
          </div>

          <div className="group" style={{ marginBottom: 8 }}>
            <div className="group-title">Restore (gbak -c)</div>
            <textarea
              className="textarea"
              value={tpl.restore}
              onChange={up("restore")}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Barra fixa de ações no final (nunca some) */}
        <div className="settings-actions">
          <div className="left">
            {loading ? <span>Carregando…</span> : msg ? <span>{msg}</span> : null}
          </div>
          <div className="right">
            <button className="btn" onClick={handleRestore}>Restaurar padrão</button>
            <button className="btn primary" onClick={handleSave}>Salvar</button>
            <button className="btn danger" onClick={onBack}>Voltar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
