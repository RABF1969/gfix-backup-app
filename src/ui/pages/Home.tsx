import React, { useState } from "react";

declare global {
  interface Window {
    electronAPI: {
      selectFDB: () => Promise<string>;
      selectBIN: () => Promise<string>;
      testConnection: (binPath: string, dbPath: string, user: string, password: string) => Promise<string>;
      checkDB: (binPath: string, dbPath: string, user: string, password: string) => Promise<string>;
      mendDB: (binPath: string, dbPath: string, user: string, password: string) => Promise<string>;
      backupRestore: (binPath: string, dbPath: string, user: string, password: string) => Promise<string>;
      exitApp: () => void;
      confirmExit: () => Promise<boolean>;
    };
  }
}

function appendLog(prev: string, line: string) {
  return prev ? `${prev}\n${line}` : line;
}

export function Home() {
  const [binPath, setBinPath] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [user, setUser] = useState("SYSDBA");
  const [password, setPassword] = useState("");
  const [useDefault, setUseDefault] = useState(false);
  const [status, setStatus] = useState<"Parado" | "Rodando" | "—">("—");
  const [log, setLog] = useState("");

  const effectiveUser = useDefault ? "SYSDBA" : user;
  const effectivePass = useDefault ? "masterkey" : password;

  async function chooseDbFile() {
    const p = await window.electronAPI.selectFDB();
    if (p) setDbPath(p);
  }
  async function chooseBinFolder() {
    const p = await window.electronAPI.selectBIN();
    if (p) setBinPath(p);
  }

  async function testConn() {
    if (!binPath || !dbPath) { setLog((l)=>appendLog(l,"Informe o BIN e o caminho do .FDB.")); return; }
    setLog((l)=>appendLog(l,"Aguarde... Testando conexão."));
    const out = await window.electronAPI.testConnection(binPath, dbPath, effectiveUser, effectivePass);
    setLog((l)=>appendLog(l,out));
    if (/SQLSTATE\s*=\s*28000|not defined|password|error|failed/i.test(out)) setStatus("Parado");
    else setStatus("Rodando");
  }

  async function verify() {
    if (!binPath || !dbPath) { setLog((l)=>appendLog(l,"Preencha BIN e .FDB.")); return; }
    setLog((l)=>appendLog(l,"Aguarde... Processo iniciado (Verifica)."));
    const out = await window.electronAPI.checkDB(binPath, dbPath, effectiveUser, effectivePass);
    setLog((l)=>appendLog(l,out || "Verificação concluída."));
  }

  async function mend() {
    if (!binPath || !dbPath) { setLog((l)=>appendLog(l,"Preencha BIN e .FDB.")); return; }
    setLog((l)=>appendLog(l,"Aguarde... Processo iniciado (Repara)."));
    const out = await window.electronAPI.mendDB(binPath, dbPath, effectiveUser, effectivePass);
    setLog((l)=>appendLog(l, out || "Reparo concluído."));
  }

  async function doBackupRestore() {
    if (!binPath || !dbPath) { setLog((l)=>appendLog(l,"Preencha BIN e .FDB.")); return; }
    setLog((l)=>appendLog(l,"Aguarde... Processo de Backup & Restore iniciado."));
    const out = await window.electronAPI.backupRestore(binPath, dbPath, effectiveUser, effectivePass);
    setLog((l)=>appendLog(l,out));
  }

  async function exitApp() {
    const ok = await window.electronAPI.confirmExit();
    if (ok) window.electronAPI.exitApp();
  }

  return (
    <div>
      <div className="group">
        <div className="group-title">Dados do servidor</div>

        <div className="row">
          <div className="label">Caminho do banco de dados</div>
          <input className="input" value={dbPath} onChange={(e)=>setDbPath(e.target.value)} placeholder="G:\CIECD\DB_10\DBCIECF.FDB" />
          <button className="btn" onClick={chooseDbFile} title="Selecionar .FDB">📂</button>
        </div>

        <div className="row">
          <div className="label">Diretório BIN do Firebird</div>
          <input className="input" value={binPath} onChange={(e)=>setBinPath(e.target.value)} placeholder="C:\Program Files\Firebird\Firebird_2_5\bin" />
          <button className="btn" onClick={chooseBinFolder} title="Selecionar pasta BIN">📁</button>
        </div>

        <div className="row">
          <div className="label">Usuário</div>
          <input className="input" value={user} onChange={(e)=>setUser(e.target.value)} disabled={useDefault} />
          <div className="label">Senha</div>
          <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} disabled={useDefault} />
          <label className="checkbox">
            <input type="checkbox" checked={useDefault} onChange={(e)=>setUseDefault(e.target.checked)} />
            Utilizar usuário e senha padrão
          </label>
        </div>

        <div className="row status">
          <div className="label">Status Firebird:</div>
          <div>{status === "Rodando" ? <span className="link-green">Rodando</span> : status}</div>
        </div>
      </div>

      <div className="group">
        <div className="group-title">Opções</div>

        <div className="row" style={{ gap: 12 }}>
          <button className="btn primary" onClick={testConn}>Teste conexão</button>
          <button className="btn warn" onClick={verify}>Verifica</button>
          <button className="btn danger" onClick={mend}>Repara</button>
          <button className="btn" onClick={doBackupRestore}>Backup & Restore</button>
          <button className="btn" onClick={exitApp}>Sair</button>
        </div>

        <div className="log" aria-label="log">
          {log || "Aguarde... Pronto para iniciar."}
        </div>
      </div>
    </div>
  );
}

export default Home;
