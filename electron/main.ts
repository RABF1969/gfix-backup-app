// electron/main.ts
import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

let mainWindow: BrowserWindow | null = null;

/* Utilitário: roda comandos e retorna stdout+stderr */
function run(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      const out = `${stdout ?? ""}${stderr ?? ""}`.trim();
      if (err) resolve(out || err.message);
      else resolve(out || "OK");
    });
  });
}

/* Modo portable (salva userData ao lado do .exe) */
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  const portable = path.join(process.env.PORTABLE_EXECUTABLE_DIR, "data");
  try { fs.mkdirSync(portable, { recursive: true }); } catch {}
  app.setPath("userData", portable);
}

/* ----------------- Templates (config avançada) ----------------- */
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
  test: `cmd /c "echo quit; | {ISQL} -user {USER} -password {PASS} "{DB_PATH}" -q -nod"`,
  check: `{GFIX} -user {USER} -password {PASS} -v -full "{DB_PATH}"`,
  mend: `{GFIX} -user {USER} -password {PASS} -mend "{DB_PATH}"`,
  backup: `{GBAK} -backup -ignore -garbage -limbo -v -y "{LOG_BKP}" "{OLD_DB}" "{FBK}" -user {USER} -password {PASS}`,
  restore: `{GBAK} -create -z -v -y "{LOG_RTR}" "{FBK}" "{NEW_DB}" -user {USER} -password {PASS}`,
};

const settingsPath = () => path.join(app.getPath("userData"), "settings.json");

function loadTemplates(): Templates {
  try {
    if (fs.existsSync(settingsPath())) {
      const saved = JSON.parse(fs.readFileSync(settingsPath(), "utf-8"));
      return { ...defaultTemplates, ...saved };
    }
  } catch {}
  return { ...defaultTemplates };
}
function saveTemplates(tpls: Templates) {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(tpls, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}
function fill(tpl: string, ctx: Record<string,string>) {
  return tpl.replace(/\{([A-Z_]+)\}/g, (_, k) => ctx[k] ?? "");
}

/* ----------------- Janela (frameless + sem menu) ----------------- */
function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    frame: false,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#e9edf3",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));

  mainWindow.on("closed", () => (mainWindow = null));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

/* ----------------- IPC: Controles de janela ----------------- */
ipcMain.handle("win:minimize", () => BrowserWindow.getFocusedWindow()?.minimize());
ipcMain.handle("win:maximize", () => {
  const w = BrowserWindow.getFocusedWindow();
  if (!w) return;
  w.isMaximized() ? w.unmaximize() : w.maximize();
});
ipcMain.handle("app:confirm-exit", async () => {
  const res = await dialog.showMessageBox({
    type: "question", buttons: ["Sim", "Não"], defaultId: 1, cancelId: 1,
    title: "Confirmar saída", message: "Deseja realmente fechar o aplicativo?", noLink: true,
  });
  return res.response === 0;
});
ipcMain.on("app:exit", () => app.quit());

/* ----------------- IPC: Pickers ----------------- */
ipcMain.handle("select-fdb", async () => {
  const res = await dialog.showOpenDialog({
    title: "Selecionar banco de dados (.FDB)",
    properties: ["openFile"],
    filters: [{ name: "Firebird DB", extensions: ["fdb","gdb"] }, { name: "Todos", extensions: ["*"] }],
  });
  return res.canceled ? "" : (res.filePaths[0] ?? "");
});
ipcMain.handle("select-bin", async () => {
  const res = await dialog.showOpenDialog({
    title: "Selecionar diretório BIN do Firebird 2.5",
    properties: ["openDirectory"],
  });
  return res.canceled ? "" : (res.filePaths[0] ?? "");
});

/* ----------------- IPC: Status do Firebird -----------------
 * Reconhece tanto inglês (STATE: 4 RUNNING) quanto PT-BR (ESTADO : 4  EM EXECUÇÃO).
 * Se QUALQUER serviço esperado estiver rodando => "Rodando".
 * Se encontramos pelo menos um parado e nenhum rodando => "Parado".
 * Em erro => "—".
 * ----------------------------------------------------------- */
ipcMain.handle("get-firebird-status", async () => {
  try {
    const services = ["FirebirdServerFB25", "FirebirdServerDefaultInstance", "FirebirdServer", "FirebirdGuardianDefaultInstance"];
    let seenStopped = false;
    for (const svc of services) {
      const out = await run(`sc query ${svc}`);
      if (/(STATE|ESTADO)\s*:\s*4\s+(RUNNING|EM\s+EXECUÇÃO)/i.test(out)) return "Rodando";
      if (/(STATE|ESTADO)\s*:\s*1\s+(STOPPED|PARADO)/i.test(out)) seenStopped = true;
      // se "does not exist" apenas tenta o próximo
    }
    return seenStopped ? "Parado" : "—";
  } catch {
    return "—";
  }
});

/* ----------------- IPC: Ações DB ----------------- */
ipcMain.handle("test-connection", async (_e, bin: string, db: string, user: string, pass: string) => {
  const isql = `"${path.join(bin, "isql.exe")}"`;
  return await run(`cmd /c "echo quit; | ${isql} -user ${user} -password ${pass} "${db}" -q -nod"`);
});
ipcMain.handle("check-db", async (_e, bin: string, db: string, user: string, pass: string) => {
  const gfix = `"${path.join(bin, "gfix.exe")}"`;
  const tpl = loadTemplates();
  const cmd = tpl.useCustom ? fill(tpl.check, { GFIX: gfix, USER: user, PASS: pass, DB_PATH: db })
                            : `${gfix} -user ${user} -password ${pass} -v -full "${db}"`;
  return await run(cmd);
});
ipcMain.handle("mend-db", async (_e, bin: string, db: string, user: string, pass: string) => {
  const gfix = `"${path.join(bin, "gfix.exe")}"`;
  const tpl = loadTemplates();
  const cmd = tpl.useCustom ? fill(tpl.mend, { GFIX: gfix, USER: user, PASS: pass, DB_PATH: db })
                            : `${gfix} -user ${user} -password ${pass} -mend "${db}"`;
  return await run(cmd);
});
ipcMain.handle("backup-restore", async (_e, bin: string, db: string, user: string, pass: string) => {
  const gbak = `"${path.join(bin, "gbak.exe")}"`;
  const dir = path.dirname(db);
  const base = path.basename(db).replace(/\.fdb$/i, "");
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const tempDir = path.join(dir, "TEMP"); try { fs.mkdirSync(tempDir, { recursive: true }); } catch {}

  const oldDb = path.join(dir, `${base}_OLD_${stamp}.FDB`);
  const newDb = path.join(dir, `${base}_TEMP_${stamp}.FDB`);
  const fbk   = path.join(dir, `${base}_${stamp}.FBK`);
  const logB  = path.join(tempDir, `LOG_BKP_${stamp}.LOG`);
  const logR  = path.join(tempDir, `LOG_RTR_${stamp}.LOG`);
  const tpl   = loadTemplates();

  const bkp = tpl.useCustom
    ? fill(tpl.backup,  { GBAK: gbak, USER: user, PASS: pass, DB_PATH: db, OLD_DB: oldDb, NEW_DB: newDb, FBK: fbk, LOG_BKP: logB, LOG_RTR: logR })
    : `${gbak} -backup -ignore -garbage -limbo -v -y "${logB}" "${db}" "${fbk}" -user ${user} -password ${pass}`;

  let out = await run(bkp);

  const rtr = tpl.useCustom
    ? fill(tpl.restore, { GBAK: gbak, USER: user, PASS: pass, DB_PATH: db, OLD_DB: oldDb, NEW_DB: newDb, FBK: fbk, LOG_BKP: logB, LOG_RTR: logR })
    : `${gbak} -create -z -v -y "${logR}" "${fbk}" "${newDb}" -user ${user} -password ${pass}`;

  out += `\n\n` + (await run(rtr));

  try {
    if (fs.existsSync(db)) fs.renameSync(db, oldDb);
    if (fs.existsSync(newDb)) fs.renameSync(newDb, db);
  } catch (e: any) {
    out += `\n\nFalha ao renomear arquivos: ${e?.message ?? e}`;
  }

  out += `\n\nFBK: ${fbk}\nLOGs:\n - ${logB}\n - ${logR}`;
  return out;
});

/* ----------------- IPC: Configurações ----------------- */
ipcMain.handle("config:get-templates", () => loadTemplates());
ipcMain.handle("config:save-templates", (_e, data: Templates) => saveTemplates(data) ? "OK" : "Erro ao salvar.");
ipcMain.handle("config:restore-defaults", () => { const t = { ...defaultTemplates }; saveTemplates(t); return t; });
