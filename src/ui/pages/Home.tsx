import React, { useState } from "react";

type Props = {
  onOpenSettings: () => void;
};

const Home: React.FC<Props> = ({ onOpenSettings }) => {
  const [binPath, setBinPath] = useState("");
  const [dbPath,  setDbPath]  = useState("");

  const [user, setUser]           = useState("SYSDBA");
  const [password, setPassword]   = useState("masterkey");
  const [useDefault, setUseDefault] = useState(false);

  const [output, setOutput] = useState("Aguarde... Pronto para iniciar.");
  const [loading, setLoading] = useState(false);

  // Status Firebird: "—" (inicial), "Rodando" (verde) ou "Parado" (vermelho)
  const [fbStatus, setFbStatus] = useState<"—"|"Rodando"|"Parado">("—");

  const pickFdb = async () => {
    try {
      const p = await window.api?.selectFdb?.();
      if (p) setDbPath(p);
    } catch (e) { console.error(e); }
  };
  const pickBin = async () => {
    try {
      const p = await window.api?.selectBin?.();
      if (p) setBinPath(p);
    } catch (e) { console.error(e); }
  };

  const applyDefault = (checked: boolean) => {
    setUseDefault(checked);
    if (checked) { setUser("SYSDBA"); setPassword("masterkey"); }
  };

  const run = async (cmd: "test"|"check"|"mend"|"backup") => {
    if (!binPath || !dbPath) {
      setOutput("Selecione o caminho do BIN e do Banco antes.");
      return;
    }
    setLoading(true);
    try {
      let result = "";
      if (cmd === "test") {
        result = await window.api?.testConnection?.(binPath, dbPath, user, password) ?? "";
        // Heurística simples de sucesso/erro
        const ok = result && !/error|failed|sqlstate|not defined|cannot|unable/i.test(result);
        setFbStatus(ok ? "Rodando" : "Parado");
        if (!result.trim()) result = ok ? "Conexão OK." : "Falha na conexão.";
      } else if (cmd === "check") {
        result = await window.api?.checkDb?.(binPath, dbPath, user, password) ?? "";
      } else if (cmd === "mend") {
        result = await window.api?.mendDb?.(binPath, dbPath, user, password) ?? "";
      } else if (cmd === "backup") {
        result = await window.api?.backupRestore?.(binPath, dbPath, user, password) ?? "";
      }
      setOutput(result || "OK");
    } catch (e: any) {
      setOutput("Erro: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const sair = () => window.api?.exit?.();

  return (
    <div>
      {/* Dados do servidor */}
      <div className="group">
        <div className="group-title">Dados do servidor</div>

        <div className="row">
          <div className="label">Caminho do banco de dados</div>
          <input className="input" value={dbPath} onChange={e => setDbPath(e.target.value)} />
          <button className="btn" onClick={pickFdb} title="Escolher .FDB">📂</button>
        </div>

        <div className="row">
          <div className="label">Diretório BIN do Firebird</div>
          <input className="input" value={binPath} onChange={e => setBinPath(e.target.value)} />
          <button className="btn" onClick={pickBin} title="Escolher pasta BIN">📂</button>
        </div>

        <div className="row">
          <div className="label">Usuário</div>
          <input className="input" value={user} onChange={e => setUser(e.target.value)} disabled={useDefault} />
          <div className="label" style={{minWidth:80}}>Senha</div>
          <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} disabled={useDefault} />
        </div>

        <div className="row">
          <label className="checkbox">
            <input type="checkbox" checked={useDefault} onChange={(e)=>applyDefault(e.target.checked)} />
            Utilizar usuário e senha padrão
          </label>
        </div>

        <div className="row status">
          <span>Status Firebird:&nbsp;</span>
          {fbStatus === "Rodando" ? (
            <span className="link-green">Rodando</span>
          ) : fbStatus === "Parado" ? (
            <span style={{color:"#b00020", fontWeight:700}}>Parado</span>
          ) : (
            <span>—</span>
          )}
        </div>
      </div>

      {/* Opções */}
      <div className="group">
        <div className="group-title">Opções</div>
        <div className="row" style={{gap: 8, flexWrap: "wrap"}}>
          <button className="btn"        disabled={loading} onClick={() => run("test")}>Teste conexão</button>
          <button className="btn"        disabled={loading} onClick={() => run("check")}>Verifica</button>
          <button className="btn warn"   disabled={loading} onClick={() => run("mend")}>Repara</button>
          <button className="btn"        disabled={loading} onClick={() => run("backup")}>Backup & Restore</button>
          <button className="btn"        onClick={onOpenSettings}>Configurações</button>
          <button className="btn danger" onClick={sair}>Sair</button>
        </div>
      </div>

      {/* Console */}
      <div className="group">
        <div className="group-title">Console</div>
        <pre className="log">{loading ? "Processando..." : output}</pre>
      </div>
    </div>
  );
};

export default Home;
