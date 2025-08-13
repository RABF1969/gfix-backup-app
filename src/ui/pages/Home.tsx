// src/ui/pages/Home.tsx
import React, { useEffect, useMemo, useState } from "react";
import AdvancedSettings from "./AdvancedSettings"; // Tela de templates (já existente no projeto)
import Footer from "../../components/Footer";      // Rodapé em src/components/Footer.tsx

// Tipo do status do serviço
type Status = "rodando" | "parado" | "desconhecido";

/**
 * Home
 * - Janela custom sem frame: título com botões (min/max/fechar)
 * - Campos: caminho .FDB, pasta bin, usuário, senha e “usar padrão”
 * - Ações: Teste conexão, Verifica, Repara, Backup & Restore
 * - Console fixo: exibe apenas “Ação: …” + resultado (sem rolagem)
 * - Botão “Configurações” abre <AdvancedSettings/> e volta com “Voltar”
 */
const Home: React.FC = () => {
  // -------------------------- Estado UI --------------------------
  const [dbPath, setDbPath] = useState("");
  const [binPath, setBinPath] = useState("");
  const [user, setUser] = useState("SYSDBA");
  const [pass, setPass] = useState("");
  const [useDefault, setUseDefault] = useState(false);

  // Status do serviço Firebird mostrado ao usuário
  const [status, setStatus] = useState<Status>("desconhecido");

  // Console fixo (sem rolagem, sempre substitui pelo último comando)
  const [consoleText, setConsoleText] = useState<string>(
    "Aguarde... Pronto para iniciar."
  );

  // Alterna para tela de configurações
  const [showSettings, setShowSettings] = useState(false);

  // -------------------------- Efeitos ----------------------------
  // 1) Ajusta a senha quando “usar padrão” é marcado/desmarcado
  useEffect(() => {
    if (useDefault) setPass("masterkey");
    else setPass((p) => (p === "masterkey" ? "" : p));
  }, [useDefault]);

  // 2) Busca status do serviço Firebird ao montar
  useEffect(() => {
    let alive = true;
    window.api
      .getFirebirdStatus()
      .then((s) => alive && setStatus(s))
      .catch(() => alive && setStatus("desconhecido"));
    return () => {
      alive = false;
    };
  }, []);

  // -------------------------- Helpers ----------------------------
  // Atualiza o console com rótulo da ação + resultado
  const showResult = (acao: string, result: string) => {
    setConsoleText(`Ação: ${acao}\n${result || "OK"}`);
  };

  // Valida se BIN + FDB foram informados
  const canRun = useMemo(() => !!binPath && !!dbPath, [binPath, dbPath]);

  // ----------------------- File pickers --------------------------
  async function pickFdb() {
    const p = await window.api.selectFdb();
    if (p) setDbPath(p);
  }
  async function pickBin() {
    const p = await window.api.selectBin();
    if (p) setBinPath(p);
  }

  // -------------------------- Ações ------------------------------
  async function testConnection() {
    if (!canRun) return showResult("Teste de Conexão", "Informe o BIN e o .FDB.");
    // Limpa o console e roda
    setConsoleText("Ação: Teste de Conexão\nExecutando...");
    const out = await window.api.testConnection(binPath, dbPath, user, pass);
    showResult("Teste de Conexão", out);
    // (Opcional) Atualiza status do serviço após o teste
    try {
      const s = await window.api.getFirebirdStatus();
      setStatus(s);
    } catch {}
  }

  async function verify() {
    if (!canRun) return showResult("Verifica", "Informe o BIN e o .FDB.");
    setConsoleText("Ação: Verifica\nExecutando...");
    const out = await window.api.checkDb(binPath, dbPath, user, pass);
    showResult("Verifica", out);
  }

  async function mend() {
    if (!canRun) return showResult("Repara", "Informe o BIN e o .FDB.");
    setConsoleText("Ação: Repara\nExecutando...");
    const out = await window.api.mendDb(binPath, dbPath, user, pass);
    showResult("Repara", out);
  }

  async function doBackupRestore() {
    if (!canRun) return showResult("Backup & Restore", "Informe o BIN e o .FDB.");
    setConsoleText("Ação: Backup & Restore\nExecutando...");
    const out = await window.api.backupRestore(binPath, dbPath, user, pass);
    showResult("Backup & Restore", out);
  }

  // ---------------------- Controles de janela --------------------
  function handleMinimize() {
    window.api.minimize(); // sem confirmação
  }
  function handleMaximizeRestore() {
    window.api.maximizeToggle(); // alterna entre maximizado/restaurado
  }
  async function handleClose() {
    const ok = await window.api.confirmExit(); // confirma fechar
    if (ok) window.api.exit();
  }

  // -------------------- Tela de Configurações --------------------
  if (showSettings) {
    // O AdvancedSettings deve renderizar os templates; aqui apenas navega.
    return <AdvancedSettings onBack={() => setShowSettings(false)} />;
  }

  // ---------------------------- UI -------------------------------
  return (
    <div className="app">
      {/* Barra de título custom (frame=false); -webkit-app-region: drag via CSS */}
      <div className="titlebar">
        <div className="title">Firebird Recovery — Processo GFIX + Backup/Restore</div>

        {/* Botões da janela; precisam de .no-drag para clicarem normalmente */}
        <div className="win-controls">
          <button className="btn no-drag" title="Minimizar" onClick={handleMinimize}>
            –
          </button>
          <button
            className="btn no-drag"
            title="Restaurar/Maximizar"
            onClick={handleMaximizeRestore}
          >
            ☐
          </button>
          <button className="btn danger no-drag" title="Fechar" onClick={handleClose}>
            X
          </button>
        </div>
      </div>

      <div className="content">
        {/* Grupo: Dados do servidor */}
        <div className="group">
          <div className="group-title">Dados do servidor</div>

          <div className="row">
            <div className="label">Caminho do banco de dados</div>
            <input
              className="input"
              value={dbPath}
              onChange={(e) => setDbPath(e.target.value)}
              placeholder="Ex.: G:\PASTA\seu_banco.FDB"
            />
            <button className="btn no-drag" onClick={pickFdb} title="Escolher .FDB">
              📂
            </button>
          </div>

          <div className="row">
            <div className="label">Diretório BIN do Firebird</div>
            <input
              className="input"
              value={binPath}
              onChange={(e) => setBinPath(e.target.value)}
              placeholder='Ex.: C:\Program Files\Firebird\Firebird_2_5\bin'
            />
            <button className="btn no-drag" onClick={pickBin} title="Escolher pasta BIN">
              📂
            </button>
          </div>

          <div className="row">
            <div className="label">Usuário</div>
            <input className="input" value={user} onChange={(e) => setUser(e.target.value)} />
            <div className="label" style={{ minWidth: 60 }}>
              Senha
            </div>
            <input
              className="password"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          <label className="checkbox" style={{ marginTop: 4 }}>
            <input
              type="checkbox"
              checked={useDefault}
              onChange={(e) => setUseDefault(e.target.checked)}
            />
            Utilizar usuário e senha padrão
          </label>

          <div className="row" style={{ marginTop: 8 }}>
            <div className="label">Status Firebird:</div>
            <div className="status">
              {status === "rodando" ? (
                <span className="link-green">Rodando</span>
              ) : status === "parado" ? (
                <span className="link-red">Parado</span>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        {/* Grupo: Opções */}
        <div className="group">
          <div className="group-title">Opções</div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn no-drag" onClick={testConnection}>
              Teste conexão
            </button>
            <button className="btn no-drag" onClick={verify}>
              Verifica
            </button>
            <button className="btn warn no-drag" onClick={mend}>
              Repara
            </button>
            <button className="btn no-drag" onClick={doBackupRestore}>
              Backup & Restore
            </button>
            <button className="btn no-drag" onClick={() => setShowSettings(true)}>
              Configurações
            </button>
            <button className="btn danger no-drag" onClick={handleClose}>
              Sair
            </button>
          </div>
        </div>

        {/* Grupo: Console (fixo, sem rolagem; sempre substitui pela última ação) */}
        <div className="group">
          <div className="group-title">Console</div>
          <pre className="log" aria-live="polite">
            {consoleText}
          </pre>
        </div>

        {/* Rodapé padrão do projeto */}
        <Footer />
      </div>
    </div>
  );
};

export default Home;
