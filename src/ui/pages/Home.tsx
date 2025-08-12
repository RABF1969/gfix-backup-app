import React, { useEffect, useState } from "react";

declare global {
  interface Window {
    electronAPI: {
      selectFDB: () => Promise<string>;
      selectBIN: () => Promise<string>;
      testConnection: (binPath: string, dbPath: string, user: string, password: string) => Promise<string>;
      checkDB: (binPath: string, dbPath: string, user: string, password: string) => Promise<string>;
      mendDB: (binPath: string, dbPath: string, user: string, password: string) => Promise<string>;
      backupRestore: (binPath: string, dbPath: string, user: string, password: string) => Promise<string>;
      confirmExit: () => Promise<boolean>;
      exitApp: () => void;
      getTemplates: () => Promise<any>;
      saveTemplates: (data: any) => Promise<string>;
      restoreDefaultTemplates: () => Promise<any>;
    };
  }
}

function appendLog(prev: string, line: string) {
  return prev ? `${prev}\n${line}` : line;
}

type TemplatesState = {
  useCustom: boolean;
  test: string;
  check: string;
  mend: string;
  backup: string;
  restore: string;
};

export function Home() {
  const [binPath, setBinPath] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [user, setUser] = useState("SYSDBA");
  const [password, setPassword] = useState("");
  const [useDefault, setUseDefault] = useState(false);
  const [status, setStatus] = useState<"Parado" | "Rodando" | "—">("—");
  const [log, setLog] = useState("");

  // config modal
  const [showConfig, setShowConfig] = useState(false);
  const [tpl, setTpl] = useState<TemplatesState>({
    useCustom: false, test: "", check: "", mend: "", backup: "", restore: ""
  });

  const effectiveUser = useDefault ? "SYSDBA" : user;
  const effectivePass = useDefault ? "masterkey" : password;

  useEffect(() => {
    (async () => {
      const t = await window.electronAPI.getTemplates();
      setTpl(t);
    })();
  }, []);

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

  /* ======= MODAL CONFIG ======= */
  function onOpenConfig() { setShowConfig(true); }
  function onCloseConfig() { setShowConfig(false); }

  async function onSaveTemplates() {
    const msg = await window.electronAPI.saveTemplates(tpl);
    setLog((l)=>appendLog(l, `Configurações salvas: ${msg}`));
    onCloseConfig();
  }
  async function onRestoreDefaults() {
    const restored = await window.electronAPI.restoreDefaultTemplates();
    setTpl(restored);
    setLog((l)=>appendLog(l, `Templates restaurados para o padrão.`));
  }

  return (
    <div>
      {/* Dados do servidor */}
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

      {/* Opções */}
      <div className="group">
        <div className="group-title">Opções</div>

        <div className="row" style={{ gap: 12 }}>
          <button className="btn primary" onClick={testConn}>Teste conexão</button>
          <button className="btn warn" onClick={verify}>Verifica</button>
          <button className="btn danger" onClick={mend}>Repara</button>
          <button className="btn" onClick={doBackupRestore}>Backup & Restore</button>
          <button className="btn" onClick={onOpenConfig}>Configurações</button>
          <button className="btn" onClick={exitApp}>Sair</button>
        </div>

        <div className="log" aria-label="log">
          {log || "Aguarde... Pronto para iniciar."}
        </div>
      </div>

      {/* Modal de Configurações */}
      {showConfig && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ width:'min(960px, 96vw)', maxHeight:'92vh', overflow:'auto', background:'#fff', border:'1px solid #c9d3df', borderRadius:8, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontWeight:800, fontSize:16 }}>Configurações — Templates de comandos</div>
              <button className="btn" onClick={onCloseConfig}>Fechar</button>
            </div>

            <div style={{ fontSize:13, marginBottom:12, color:'#334' }}>
              Os comandos abaixo são usados quando <b>“Usar templates personalizados”</b> estiver ligado.
              Variáveis: <code>{'{ISQL} {GFIX} {GBAK} {USER} {PASS} {DB_PATH} {BIN_PATH} {OLD_DB} {NEW_DB} {FBK} {LOG_BKP} {LOG_RTR}'}</code>.
            </div>

            <label className="checkbox" style={{ marginBottom:12 }}>
              <input type="checkbox" checked={tpl.useCustom} onChange={(e)=>setTpl({...tpl, useCustom: e.target.checked})} />
              Usar templates personalizados
            </label>

            {(['test','check','mend','backup','restore'] as const).map((key) => (
              <div className="group" key={key}>
                <div className="group-title">
                  {key === 'test' ? 'Teste conexão (isql)' :
                   key === 'check' ? 'Verificar (gfix -v -full)' :
                   key === 'mend' ? 'Reparar (gfix -mend)' :
                   key === 'backup' ? 'Backup (gbak -b)' :
                   'Restore (gbak -c)'}
                </div>
                <textarea
                  value={tpl[key]}
                  onChange={(e)=>setTpl({...tpl, [key]: e.target.value})}
                  style={{ width:'100%', minHeight:80, fontFamily:'Consolas, monospace', fontSize:12 }}
                />
              </div>
            ))}

            <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
              <button className="btn" onClick={onRestoreDefaults}>Restaurar padrão</button>
              <button className="btn primary" onClick={onSaveTemplates}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
