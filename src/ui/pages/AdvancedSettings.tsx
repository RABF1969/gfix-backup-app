// src/ui/pages/AdvancedSettings.tsx
import React, { useEffect, useState } from "react";

type Props = {
  onBack: () => void;
};

type Templates = {
  useCustom: boolean;
  test: string;
  check: string;
  mend: string;
  backup: string;
  restore: string;
};

export default function AdvancedSettings({ onBack }: Props) {
  const [tpl, setTpl] = useState<Templates>({
    useCustom: false,
    test: "",
    check: "",
    mend: "",
    backup: "",
    restore: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const data = await window.api.getTemplates();
        setTpl(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set<K extends keyof Templates>(key: K, value: Templates[K]) {
    setTpl((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const r = await window.api.saveTemplates(tpl);
      setMsg(r === "OK" ? "Templates salvos com sucesso." : r);
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    setSaving(true);
    setMsg("");
    try {
      const data = await window.api.restoreDefaults();
      setTpl(data);
      setMsg("Templates padrão restaurados.");
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div>
      <div className="group">
        <div className="group-title">Templates (avançado)</div>

        <div style={{ fontSize: 13, marginBottom: 10, color: "#333" }}>
          Placeholders disponíveis: {"{ISQL} {GFIX} {GBAK} {USER} {PASS} {DB_PATH} {OLD_DB} {NEW_DB} {FBK} {LOG_BKP} {LOG_RTR}"}.
        </div>

        <label className="checkbox" style={{ marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={tpl.useCustom}
            onChange={(e) => set("useCustom", e.target.checked)}
          />
          Usar templates personalizados
        </label>

        <Field label="Teste conexão (isql)" value={tpl.test} onChange={(v) => set("test", v)} />
        <Field label="Verificar (gfix -v -full)" value={tpl.check} onChange={(v) => set("check", v)} />
        <Field label="Reparar (gfix -mend)" value={tpl.mend} onChange={(v) => set("mend", v)} />
        <Field label="Backup (gbak -b)" value={tpl.backup} onChange={(v) => set("backup", v)} />
        <Field label="Restore (gbak -c)" value={tpl.restore} onChange={(v) => set("restore", v)} />

        {msg && <div style={{ marginTop: 8, fontSize: 13, color: "#0a7e24" }}>{msg}</div>}

        <div className="row" style={{ marginTop: 10, gap: 10 }}>
          <button className="btn" onClick={handleRestore} disabled={saving}>Restaurar padrão</button>
          <button className="btn" onClick={handleSave} disabled={saving}>Salvar</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onBack} disabled={saving}>Voltar</button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, color: "#2c3e50", marginBottom: 6 }}>{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          minHeight: 90,
          padding: 8,
          border: "1px solid #b9c7d8",
          borderRadius: 4,
          fontFamily: "Consolas, ui-monospace, monospace",
          fontSize: 13,
          resize: "vertical",
        }}
      />
    </div>
  );
}
