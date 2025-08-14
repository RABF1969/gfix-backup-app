// src/ui/pages/AdvancedSettings.tsx
import React, { useEffect, useState } from "react";

type Templates = {
  useCustom: boolean;
  test: string;
  check: string;
  mend: string;
  backup: string;
  restore: string;
};

export default function AdvancedSettings({ onBack }: { onBack: () => void }) {
  const [tpl, setTpl] = useState<Templates>({
    useCustom: false,
    test: "",
    check: "",
    mend: "",
    backup: "",
    restore: "",
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Carrega templates (se faltar algo, o main faz merge com default)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await window.api.getTemplates();
        if (alive) setTpl(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const save = async () => {
    setMsg("");
    const r = await window.api.saveTemplates(tpl);
    setMsg(r === "OK" ? "Salvo com sucesso." : r);
  };
  const restore = async () => {
    const data = await window.api.restoreDefaults();
    setTpl(data);
    setMsg("Templates padrão restaurados.");
  };

  return (
    <div className="window">
      {/* Barra de título (arrastável) */}
      <div className="titlebar">
        <div>Configurações — Templates (avançado)</div>
        <div className="titlebar-actions no-drag">
          <button className="winbtn" onClick={onBack}>Voltar</button>
        </div>
      </div>

      {/* Conteúdo com layout compacto:
          - Cabeçalho fixo com placeholders
          - Área rolável para os textareas
          - Barra de ações fixa ao final (sempre visível) */}
      <div className="content settings-wrapper">
        <div className="group">
          <div className="group-title">Templates (avançado)</div>
          <div className="note">
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

        {/* Área rolável apenas dos campos */}
        <div className="settings-scroll">
          <div className="group">
            <div className="group-title">Teste conexão (isql)</div>
            <textarea
              className="textarea"
              value={tpl.test}
              onChange={(e) => setTpl({ ...tpl, test: e.target.value })}
            />
          </div>

          <div className="group">
            <div className="group-title">Verificar (gfix -v -full)</div>
            <textarea
              className="textarea"
              value={tpl.check}
              onChange={(e) => setTpl({ ...tpl, check: e.target.value })}
            />
          </div>

          <div className="group">
            <div className="group-title">Reparar (gfix -mend)</div>
            <textarea
              className="textarea"
              value={tpl.mend}
              onChange={(e) => setTpl({ ...tpl, mend: e.target.value })}
            />
          </div>

          <div className="group">
            <div className="group-title">Backup (gbak -b)</div>
            <textarea
              className="textarea"
              value={tpl.backup}
              onChange={(e) => setTpl({ ...tpl, backup: e.target.value })}
            />
          </div>

          <div className="group">
            <div className="group-title">Restore (gbak -c)</div>
            <textarea
              className="textarea"
              value={tpl.restore}
              onChange={(e) => setTpl({ ...tpl, restore: e.target.value })}
            />
          </div>
        </div>

        {/* Barra de ações fixa — aparece sempre sem precisar redimensionar */}
        <div className="settings-actions">
          <div className="left">
            {loading ? <span>Carregando…</span> : msg ? <span>{msg}</span> : null}
          </div>
          <div className="right">
            <button className="btn" onClick={restore}>Restaurar padrão</button>
            <button className="btn primary" onClick={save}>Salvar</button>
            <button className="btn danger" onClick={onBack}>Voltar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
