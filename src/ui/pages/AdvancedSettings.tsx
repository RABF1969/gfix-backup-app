import React, { useEffect, useState } from "react";

type Templates = {
  useCustom: boolean;
  test: string;
  check: string;
  mend: string;
  backup: string;
  restore: string;
};

const AdvancedSettings: React.FC = () => {
  const [tpl, setTpl] = useState<Templates>({
    useCustom: false,
    test: "",
    check: "",
    mend: "",
    backup: "",
    restore: "",
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // Carrega templates (padrões ou os salvos)
  useEffect(() => {
    (async () => {
      try {
        const loaded = await window.api?.getTemplates?.();
        if (loaded) {
          setTpl({
            useCustom: !!loaded.useCustom,
            test: loaded.test ?? "",
            check: loaded.check ?? "",
            mend: loaded.mend ?? "",
            backup: loaded.backup ?? "",
            restore: loaded.restore ?? "",
          });
        }
      } catch (e) {
        console.error("Falha ao carregar templates:", e);
      }
    })();
  }, []);

  const handleChange =
    (key: keyof Templates) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        e.target instanceof HTMLInputElement && e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setTpl((prev) => ({ ...prev, [key]: value as any }));
    };

  const save = async () => {
    try {
      setSaving(true);
      setMsg("");
      const res = await window.api?.saveTemplates?.(tpl);
      setMsg(res === "OK" ? "Templates salvos com sucesso." : res || "Erro ao salvar.");
    } catch (e: any) {
      setMsg("Erro ao salvar: " + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  const restoreDefaults = async () => {
    try {
      setSaving(true);
      setMsg("");
      const restored = await window.api?.restoreDefaults?.();
      if (restored) {
        setTpl({
          useCustom: !!restored.useCustom,
          test: restored.test ?? "",
          check: restored.check ?? "",
          mend: restored.mend ?? "",
          backup: restored.backup ?? "",
          restore: restored.restore ?? "",
        });
        setMsg("Padrões restaurados.");
      }
    } catch (e: any) {
      setMsg("Erro ao restaurar: " + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="group">
        <div className="group-title">Templates de comandos</div>

        <div className="row" style={{ alignItems: "flex-start" }}>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={tpl.useCustom}
              onChange={handleChange("useCustom")}
            />
            Usar templates personalizados
          </label>
        </div>

        <div style={{ fontSize: 12, color: "#445", marginBottom: 8 }}>
          Você pode usar os placeholders:{" "}
          <code>{`{ISQL}`}</code>, <code>{`{GFIX}`}</code>, <code>{`{GBAK}`}</code>,{" "}
          <code>{`{USER}`}</code>, <code>{`{PASS}`}</code>, <code>{`{DB_PATH}`}</code>,{" "}
          <code>{`{OLD_DB}`}</code>, <code>{`{NEW_DB}`}</code>, <code>{`{FBK}`}</code>,{" "}
          <code>{`{LOG_BKP}`}</code>, <code>{`{LOG_RTR}`}</code>.
        </div>

        <Field
          label="Teste conexão (isql)"
          value={tpl.test}
          onChange={handleChange("test")}
          placeholder={`cmd /c "echo quit; | {ISQL} -user {USER} -password {PASS} "{DB_PATH}" -q -nod"`}
        />

        <Field
          label="Verificar (gfix -v -full)"
          value={tpl.check}
          onChange={handleChange("check")}
          placeholder={`{GFIX} -user {USER} -password {PASS} -v -full "{DB_PATH}"`}
        />

        <Field
          label="Reparar (gfix -mend)"
          value={tpl.mend}
          onChange={handleChange("mend")}
          placeholder={`{GFIX} -user {USER} -password {PASS} -mend "{DB_PATH}"`}
        />

        <Field
          label="Backup (gbak -b)"
          value={tpl.backup}
          onChange={handleChange("backup")}
          placeholder={`{GBAK} -backup -ignore -garbage -limbo -v -y "{LOG_BKP}" "{OLD_DB}" "{FBK}" -user {USER} -password {PASS}`}
        />

        <Field
          label="Restore (gbak -c)"
          value={tpl.restore}
          onChange={handleChange("restore")}
          placeholder={`{GBAK} -create -z -v -y "{LOG_RTR}" "{FBK}" "{NEW_DB}" -user {USER} -password {PASS}`}
        />

        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={restoreDefaults} disabled={saving}>
            Restaurar padrão
          </button>
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>

        {!!msg && (
          <div className="row" style={{ color: "#0a8a2a", fontWeight: 600 }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSettings;

/* -------------------- Componentes auxiliares -------------------- */

function Field(props: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="label" style={{ marginBottom: 4 }}>{props.label}</div>
      <textarea
        rows={3}
        className="input"
        style={{ width: "100%", fontFamily: "Consolas, ui-monospace, monospace" }}
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
      />
    </div>
  );
}
