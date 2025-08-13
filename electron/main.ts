import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";

let mainWindow: BrowserWindow | null = null;

/* ------------------------------------------------------------------------------------------------
 * 1) Suporte a Portable: salva dados (userData) ao lado do executável
 * ------------------------------------------------------------------------------------------------ */
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  const portableDataDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, "data");
  try {
    fs.mkdirSync(portableDataDir, { recursive: true });
  } catch {}
  app.setPath("userData", portableDataDir);
}

/* ------------------------------------------------------------------------------------------------
 * 2) Helpers — exec e status do serviço do Firebird
 * ------------------------------------------------------------------------------------------------ */

/** Executa comando (sem lançar exceção). Retorna stdout+stderr. */
function run(command: string): Promise<string> {
  return new Promise((resolve) => {
    exec(command, { windowsHide: true }, (error, stdout, stderr) => {
      const out = `${stdout || ""}${stderr || ""}`.trim();
      if (error) return resolve(out || error.message);
      resolve(out || "OK");
    });
  });
}

/** Tenta descobrir se algum serviço de Firebird 2.5 está RUNNING. */
async function getFirebirdServiceStatus(): Promise<"rodando" | "parado" | "desconhecido"> {
  const candidates = ["FirebirdServerFB25", "FirebirdServerDefaultInstance", "FirebirdServer"];
  try {
    for (const name of candidates) {
      const out = await run(`sc query "${name}"`);
      if (/SERVICE_NAME/i.test(out)) {
        if (/STATE\s*:\s*\d+\s*RUNNING/i.test(out)) return "rodando";
        if (/STATE\s*:\s*\d+\s*STOPPED/i.test(out)) return "parado";
        return "desconhecido";
      }
    }
    return "desconhecido";
  } catch {
    return "desconhecido";
  }
}

/* ------------------------------------------------------------------------------------------------
 * 3) Templates — defaults + persistência em settings.json
 * ------------------------------------------------------------------------------------------------ */

type Templates = {
  useCustom: boolean;
  test: string;
  check: string;
  mend: string;
  backup: string;
  restore: string;
};

const defaultTemplates: Templates = {
  useCustom: false,
  // Teste de conexão (isql)
  test: `cmd /c "echo quit; | {ISQL} -user {USER} -password {PASS} "{DB_PATH}" -q -nod"`,
  // Verifica (gfix -v -full)
  check: `{GFIX} -user {USER} -password {PASS} -v -full "{DB_PATH}"`,
  // Repara (gfix -mend)
  mend: `{GFIX} -user {USER} -password {PASS} -mend "{DB_PATH}"`,
  // Backup (gbak -b) com logs
  backup: `{GBAK} -backup -ignore -garbage -limbo -v -y "{LOG_BKP}" "{OLD_DB}" "{FBK}" -user {USER} -password {PASS}`,
  // Restore (gbak -c) com logs
  restore: `{GBAK} -create -z -v -y "{LOG_RTR}" "{FBK}" "{NEW_DB}" -user {USER} -password {PASS}`,
};

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadTemplates(): Templates {
  try {
    const f = settingsPath();
    if (fs.existsSync(f)) {
      const json = JSON.parse(fs.readFileSync(f, "utf-8"));
      // Merge para garantir que não venha “zerado”
      return { ...defaultTemplates, ...json };
    }
  } catch {}
  return { ...defaultTemplates };
}

function saveTemplates(data: Templates): boolean {
  try {
    const f = settingsPath();
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------------------------------------
 * 4) Criação da janela — FRAMLESS, sem menu do Windows
 *    (mover a janela depende do CSS: .titlebar { -webkit-app-region: drag })
 * ------------------------------------------------------------------------------------------------ */

function createWindow() {
  // Remove menu nativo (File/Edit/View…)
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 980,
    minHeight: 640,
    // Sem barra nativa do Windows
    frame: false,
    // Melhor translucidez / integração (não é obrigatório no Windows, mas ajuda no visual)
    titleBarStyle: "hidden",
    backgroundColor: "#e9edf3",
    show: false, // mostra depois de pronto para evitar flicker
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Carrega URL do Vite (dev) ou index.html (prod)
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => (mainWindow = null));
}

/* ------------------------------------------------------------------------------------------------
 * 5) App lifecycle
 * ------------------------------------------------------------------------------------------------ */

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ------------------------------------------------------------------------------------------------
 * 6) IPC — Janela (min/max/fechar com confirmação)
 * ------------------------------------------------------------------------------------------------ */

ipcMain.on("win:minimize", (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  w?.minimize();
});

ipcMain.on("win:maximize", (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  if (w.isMaximized()) w.unmaximize();
  else w.maximize();
});

ipcMain.handle("app:confirm-exit", async () => {
  const r = await dialog.showMessageBox({
    type: "question",
    title: "Confirmar saída",
    message: "Deseja realmente fechar o aplicativo?",
    buttons: ["Sim", "Não"],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  });
  return r.response === 0;
});

ipcMain.on("app:exit", () => app.quit());

/* ------------------------------------------------------------------------------------------------
 * 7) IPC — Status do Firebird
 * ------------------------------------------------------------------------------------------------ */
ipcMain.handle("status:firebird", async () => getFirebirdServiceStatus());

/* ------------------------------------------------------------------------------------------------
 * 8) IPC — Pickers
 * ------------------------------------------------------------------------------------------------ */

ipcMain.handle("select-fdb", async () => {
  const res = await dialog.showOpenDialog({
    title: "Selecionar banco de dados (.FDB)",
    properties: ["openFile"],
    filters: [
      { name: "Firebird DB", extensions: ["fdb", "gdb"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
  });
  if (res.canceled || !res.filePaths?.[0]) return "";
  return res.filePaths[0];
});

ipcMain.handle("select-bin", async () => {
  const res = await dialog.showOpenDialog({
    title: "Selecionar diretório BIN do Firebird 2.5",
    properties: ["openDirectory"],
  });
  if (res.canceled || !res.filePaths?.[0]) return "";
  return res.filePaths[0];
});

/* ------------------------------------------------------------------------------------------------
 * 9) IPC — Configurações (templates)
 * ------------------------------------------------------------------------------------------------ */
ipcMain.handle("config:get-templates", async () => loadTemplates());
ipcMain.handle("config:save-templates", async (_e, data: Templates) => {
  return saveTemplates(data) ? "OK" : "Erro ao salvar templates.";
});
ipcMain.handle("config:restore-defaults", async () => {
  const ok = saveTemplates({ ...defaultTemplates });
  return ok ? loadTemplates() : defaultTemplates;
});

/* ------------------------------------------------------------------------------------------------
 * 10) IPC — Ações GFIX/ISQL/GBAK
 * ------------------------------------------------------------------------------------------------ */

function replacePlaceholders(tpl: string, ctx: Record<string, string>) {
  return tpl.replace(/\{([A-Z_]+)\}/g, (_m, key) => ctx[key] ?? "");
}

// Testar conexão (isql)
ipcMain.handle("test-connection", async (_e, binPath: string, dbPath: string, user: string, pass: string) => {
  const t = loadTemplates();
  const isql = `"${path.join(binPath, "isql.exe")}"`;
  const ctx = { ISQL: isql, USER: user, PASS: pass, DB_PATH: dbPath };
  const cmd = t.useCustom
    ? replacePlaceholders(t.test, ctx)
    : `cmd /c "echo quit; | ${isql} -user ${user} -password ${pass} "${dbPath}" -q -nod"`;
  return await run(cmd);
});

// Verificar (gfix -v -full)
ipcMain.handle("check-db", async (_e, binPath: string, dbPath: string, user: string, pass: string) => {
  const t = loadTemplates();
  const gfix = `"${path.join(binPath, "gfix.exe")}"`;
  const ctx = { GFIX: gfix, USER: user, PASS: pass, DB_PATH: dbPath };
  const cmd = t.useCustom ? replacePlaceholders(t.check, ctx) : `${gfix} -user ${user} -password ${pass} -v -full "${dbPath}"`;
  return await run(cmd);
});

// Reparar (gfix -mend)
ipcMain.handle("mend-db", async (_e, binPath: string, dbPath: string, user: string, pass: string) => {
  const t = loadTemplates();
  const gfix = `"${path.join(binPath, "gfix.exe")}"`;
  const ctx = { GFIX: gfix, USER: user, PASS: pass, DB_PATH: dbPath };
  const cmd = t.useCustom ? replacePlaceholders(t.mend, ctx) : `${gfix} -user ${user} -password ${pass} -mend "${dbPath}"`;
  return await run(cmd);
});

// Backup & Restore (gbak) com stop/start do serviço + rename seguro
ipcMain.handle("backup-restore", async (_e, binPath: string, dbPath: string, user: string, pass: string) => {
  const t = loadTemplates();

  const gbak = `"${path.join(binPath, "gbak.exe")}"`;
  const dir = path.dirname(dbPath);
  const base = path.basename(dbPath).replace(/\.fdb$/i, "");
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");

  const tempDir = path.join(dir, "TEMP");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const oldDb = path.join(dir, `${base}FFF.FDB`);
  const newDb = path.join(dir, `${base}FF.FDB`);
  const fbk = path.join(dir, `${base}_${stamp}.FBK`);
  const logBkp = path.join(tempDir, `LOG_BKP_${stamp}.LOG`);
  const logRtr = path.join(tempDir, `LOG_RTR_${stamp}.LOG`);

  const services = ["FirebirdServerFB25", "FirebirdServerDefaultInstance", "FirebirdServer"];
  async function sc(cmd: "stop" | "start") {
    for (const s of services) await run(`sc ${cmd} ${s}`);
  }
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  async function renameWithRetry(src: string, dst: string, tries = 16, delayMs = 500) {
    for (let i = 0; i < tries; i++) {
      try {
        fs.renameSync(src, dst);
        return true;
      } catch (e: any) {
        if (e?.code !== "EBUSY" && e?.code !== "EPERM") throw e;
        await sleep(delayMs);
      }
    }
    return false;
  }

  try {
    if (!fs.existsSync(dbPath)) return `Arquivo não encontrado: "${dbPath}"`;
    await sc("stop");

    const renamed = await renameWithRetry(dbPath, oldDb, 16, 500);
    if (!renamed) {
      await sc("start");
      return `Falha ao renomear (arquivo em uso): ${dbPath}`;
    }

    // BACKUP
    let backupCmd = `${gbak} -backup -ignore -garbage -limbo -v -y "${logBkp}" "${oldDb}" "${fbk}" -user ${user} -password ${pass}`;
    if (t.useCustom) {
      backupCmd = replacePlaceholders(t.backup, {
        GBAK: gbak, USER: user, PASS: pass,
        DB_PATH: dbPath, OLD_DB: oldDb, NEW_DB: newDb, FBK: fbk,
        LOG_BKP: logBkp, LOG_RTR: logRtr,
      });
    }
    let out = await run(backupCmd);
    if (/error|failed|unable|cannot|sqlstate\s*=\s*\w+/i.test(out) && !/success|done|gbak:finishing/i.test(out)) {
      try { if (fs.existsSync(oldDb) && !fs.existsSync(dbPath)) fs.renameSync(oldDb, dbPath); } catch {}
      await sc("start");
      return `Falha no backup:\n${out}`;
    }

    // RESTORE
    let restoreCmd = `${gbak} -create -z -v -y "${logRtr}" "${fbk}" "${newDb}" -user ${user} -password ${pass}`;
    if (t.useCustom) {
      restoreCmd = replacePlaceholders(t.restore, {
        GBAK: gbak, USER: user, PASS: pass,
        DB_PATH: dbPath, OLD_DB: oldDb, NEW_DB: newDb, FBK: fbk,
        LOG_BKP: logBkp, LOG_RTR: logRtr,
      });
    }
    out = await run(restoreCmd);
    if (/error|failed|unable|cannot|sqlstate\s*=\s*\w+/i.test(out) && !/success|done|gbak:finishing/i.test(out)) {
      try { if (fs.existsSync(oldDb) && !fs.existsSync(dbPath)) fs.renameSync(oldDb, dbPath); } catch {}
      try { if (fs.existsSync(newDb)) fs.unlinkSync(newDb); } catch {}
      await sc("start");
      return `Falha no restore:\n${out}`;
    }

    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch {}
    fs.renameSync(newDb, dbPath);

    const oldHist = path.join(dir, `${base}_OLD_${stamp}.FDB`);
    try { fs.renameSync(oldDb, oldHist); } catch {}

    await sc("start");
    return `Backup & Restore concluído!\nFBK: ${fbk}\nLOGs:\n - ${logBkp}\n - ${logRtr}`;
  } catch (err: any) {
    try {
      const fff = path.join(dir, `${base}FFF.FDB`);
      if (fs.existsSync(fff) && !fs.existsSync(dbPath)) fs.renameSync(fff, dbPath);
    } catch {}
    try { await run("sc start FirebirdServerFB25"); } catch {}
    return `Erro no processo: ${err?.message || String(err)}`;
  }
});
