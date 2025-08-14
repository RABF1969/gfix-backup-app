// src/ui/pages/Home.tsx
import React, { useEffect, useMemo, useState } from "react";
import AdvancedSettings from "./AdvancedSettings";
import Footer from "../../components/Footer";

type Status = "Rodando" | "Parado" | "—";

const Home: React.FC = () => {
  // ---------------- Form ----------------
  const [dbPath, setDbPath] = useState("");
  const [binPath, setBinPath] = useState("");
  const [user, setUser] = useState("SYSDBA");
  const [pass, setPass] = useState("");
  const [useDefault, setUseDefault] = useState(false);

  // --------------- Estado ---------------
  const [status, setStatus] = useState<Status>("—");
  const [consoleOut, setConsoleOut] = useState("Aguarde... Pronto para iniciar.");
  const [showSettings, setShowSettings] = useState(false);
  const canRun = useMemo(() => !!dbPath && !!binPath, [dbPath, binPath]);

  // Senha padrão
  useEffect(() => {
    if (useDefault) setPass("masterkey");
    else setPass((p) => (p === "masterkey" ? "" : p));
  }, [useDefault]);

  // Status do Firebird (polling 3s)
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const s = await window.api.getFirebirdStatus();
        if (alive) setStatus((s as Status) ?? "—");
      } catch {
        if (alive) setStatus("—");
      }
    }
    tick();
    const id = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Console helper (sempre zera)
  const showConsole = (action: string, text: string) => {
    setConsoleOut(`Ação: ${action}\n${text}`);
  };

  // Pickers
  async function pickFdb() { const p = await window.api.selectFdb(); if (p) setDbPath(p); }
  async function pickBin() { const p = await window.api.selectBin(); if (p) setBinPath(p); }

  // Ações DB
  async function testConnection() {
    if (!canRun) return showConsole("Erro", "Informe o BIN e o caminho do .FDB.");
    showConsole("Teste de Conexão", "Executando...");
    const out = await window.api.testConnection(binPath, dbPath, user, pass);
    showConsole("Teste de Conexão", out || "OK");
  }
  async function verify() {
    if (!canRun) return showConsole("Erro", "Informe o BIN e o caminho do .FDB.");
    showConsole("Verifica", "Executando...");
    const out = await window.api.checkDb(binPath, dbPath, user, pass);
    showConsole("Verifica", out || "OK");
  }
  async function mend() {
    if (!canRun) return showConsole("Erro", "Informe o BIN e o caminho do .FDB.");
    showConsole("Repara", "Executando...");
    const out = await window.api.mendDb(binPath, dbPath, user, pass);
    showConsole("Repara", out || "OK");
  }
  async function doBackupRestore() {
    if (!canRun) return showConsole("Erro", "Informe o BIN e o caminho do .FDB.");
    showConsole("Backup & Restore", "Executando...");
    const out = await window.api.backupRestore(binPath, dbPath, user, pass);
    showConsole("Backup & Restore", out || "OK");
  }

  // Janela
  const minimize = () => window.api.minimize();
  const maximize = () => window.api.maximize(); // toggle maximizar/restaurar
  const exitApp  = async () => { if (await window.api.confirmExit()) window.api.exit(); };

  if (showSettings) {
    return <AdvancedSettings onBack={() => setShowSettings(false)} />;
  }

  return (
    <div className="window">
      {/* Barra de título arrastável */}
      <div className="titlebar">
        <div>Firebird Recovery — Processo GFIX + Backup/Restore</div>
        <div className="titlebar-actions no-drag">
          <button className="winbtn" onClick={minimize} title="Minimizar">–</button>
          <button className="winbtn" onClick={maximize} title="Maximizar/Restaurar">▢</button>
          <button className="winbtn danger" onClick={exitApp} title="Fechar">X</button>
        </div>
      </div>

      <div className="content">
        {/* Dados do servidor */}
        <div className="group">
          <div className="group-title">Dados do servidor</div>

          <div className="row">
            <div className="label">Caminho do banco de dados</div>
            <input className="input" value={dbPath} onChange={(e) => setDbPath(e.target.value)} />
            <button className="btn" onClick={pickFdb}>📂</button>
          </div>

          <div className="row">
            <div className="label">Diretório BIN do Firebird</div>
            <input className="input" value={binPath} onChange={(e) => setBinPath(e.target.value)} />
            <button className="btn" onClick={pickBin}>📂</button>
          </div>

          <div className="row">
            <div className="label">Usuário</div>
            <input className="input" value={user} onChange={(e) => setUser(e.target.value)} />
            <div className="label" style={{ minWidth: 60 }}>Senha</div>
            <input className="password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>

          <label className="checkbox" style={{ marginTop: 4 }}>
            <input type="checkbox" checked={useDefault} onChange={(e) => setUseDefault(e.target.checked)} />
            Utilizar usuário e senha padrão
          </label>

          <div className="row" style={{ marginTop: 8 }}>
            <div className="label">Status Firebird:</div>
            <div className="status">
              {status === "Rodando" ? (
                <span className="link-green">Rodando</span>
              ) : status === "Parado" ? (
                <span style={{ color: "#b00020", fontWeight: 700 }}>Parado</span>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        {/* Opções */}
        <div className="group">
          <div className="group-title">Opções</div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn" onClick={testConnection}>Teste conexão</button>
            <button className="btn" onClick={verify}>Verifica</button>
            <button className="btn warn" onClick={mend}>Repara</button>
            <button className="btn" onClick={doBackupRestore}>Backup & Restore</button>
            <button className="btn" onClick={() => setShowSettings(true)}>Configurações</button>
            <button className="btn danger" onClick={exitApp}>Sair</button>
          </div>
        </div>

        {/* Console fixo (sem rolagem) */}
        <div className="group">
          <div className="group-title">Console</div>
          <pre className="log" style={{ overflow: "hidden", whiteSpace: "pre-wrap", height: 220 }}>
            {consoleOut}
          </pre>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Home;
