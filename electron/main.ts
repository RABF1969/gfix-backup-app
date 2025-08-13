import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

let mainWindow: BrowserWindow | null = null;

/* ======= Modo Portable: salva dados ao lado do .exe ======= */
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  const portableDataDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
  try { fs.mkdirSync(portableDataDir, { recursive: true }); } catch {}
  app.setPath('userData', portableDataDir);
}

/* ======= Criação da Janela ======= */
let allowQuit = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    frame: true,                 // mantém a barra com X
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(null);

  // Confirmação ao clicar no X
  mainWindow.on('close', async (e) => {
    if (allowQuit) return;
    e.preventDefault();
    const r = await dialog.showMessageBox({
      type: 'question',
      title: 'Confirmar saída',
      message: 'Deseja realmente fechar o aplicativo?',
      buttons: ['Sim', 'Não'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (r.response === 0) {
      allowQuit = true;
      mainWindow?.destroy();
      app.quit();
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.on('closed', () => (mainWindow = null));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

/* ====================== SAIR (botão “Sair”) ====================== */
ipcMain.on('app:exit', async () => {
  if (!mainWindow) { app.quit(); return; }
  const r = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Confirmar saída',
    message: 'Deseja realmente fechar o aplicativo?',
    buttons: ['Sim', 'Não'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  });
  if (r.response === 0) {
    allowQuit = true;
    mainWindow.close();
  }
});

/* ====================== CONTROLES DA JANELA ====================== */
ipcMain.on('window:minimize', () => { mainWindow?.minimize(); });

/* ====================== EXEC HELPER ====================== */
function runCommandStr(command: string): Promise<string> {
  return new Promise((resolve) => {
    exec(command, { windowsHide: true }, (error, stdout, stderr) => {
      const out = `${stdout || ''}${stderr || ''}`.trim();
      if (error) resolve((out || error.message).trim());
      else resolve(out || 'OK');
    });
  });
}

/* ====================== CONFIG / TEMPLATES ====================== */
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

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}
function loadTemplates(): Templates {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      const json = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return { ...defaultTemplates, ...json };
    }
  } catch {}
  return { ...defaultTemplates };
}
function saveTemplates(data: Templates) {
  try {
    const p = getSettingsPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch { return false; }
}
function replacePlaceholders(tpl: string, ctx: Record<string, string>) {
  return tpl.replace(/\{([A-Z_]+)\}/g, (_m, key) => ctx[key] ?? '');
}

ipcMain.handle('config:get-templates', async () => loadTemplates());
ipcMain.handle('config:save-templates', async (_e, data: Templates) => saveTemplates(data) ? 'OK' : 'Erro ao salvar templates.');
ipcMain.handle('config:restore-defaults', async () => (saveTemplates({ ...defaultTemplates }) ? loadTemplates() : defaultTemplates));

/* ====================== PICKERS ====================== */
ipcMain.handle('select-fdb', async () => {
  const r = await dialog.showOpenDialog({
    title: 'Selecionar banco de dados (.FDB)',
    properties: ['openFile'],
    filters: [{ name: 'Firebird DB', extensions: ['fdb', 'gdb'] }, { name: 'Todos os arquivos', extensions: ['*'] }],
  });
  if (r.canceled || !r.filePaths?.[0]) return '';
  return r.filePaths[0];
});
ipcMain.handle('select-bin', async () => {
  const r = await dialog.showOpenDialog({
    title: 'Selecionar diretório BIN do Firebird 2.5',
    properties: ['openDirectory'],
  });
  if (r.canceled || !r.filePaths?.[0]) return '';
  return r.filePaths[0];
});

/* ====================== AÇÕES (aceita params como objeto OU separados) ====================== */
function unpackArgs(a: any[]): { bin: string; db: string; user: string; pass: string } {
  if (a.length === 1 && a[0] && typeof a[0] === 'object') {
    const { bin, db, user, pass } = a[0];
    return { bin, db, user, pass };
  }
  const [bin, db, user, pass] = a as [string, string, string, string];
  return { bin, db, user, pass };
}

ipcMain.handle('test-connection', async (_e, ...args: any[]) => {
  const { bin, db, user, pass } = unpackArgs(args);
  const t = loadTemplates();
  const isql = `"${path.join(bin, 'isql.exe')}"`;
  const ctx = { ISQL: isql, USER: user, PASS: pass, DB_PATH: db };
  const cmd = t.useCustom ? replacePlaceholders(t.test, ctx) : `cmd /c "echo quit; | ${isql} -user ${user} -password ${pass} "${db}" -q -nod"`;
  return runCommandStr(cmd);
});

ipcMain.handle('check-db', async (_e, ...args: any[]) => {
  const { bin, db, user, pass } = unpackArgs(args);
  const t = loadTemplates();
  const gfix = `"${path.join(bin, 'gfix.exe')}"`;
  const ctx = { GFIX: gfix, USER: user, PASS: pass, DB_PATH: db };
  const cmd = t.useCustom ? replacePlaceholders(t.check, ctx) : `${gfix} -user ${user} -password ${pass} -v -full "${db}"`;
  return runCommandStr(cmd);
});

ipcMain.handle('mend-db', async (_e, ...args: any[]) => {
  const { bin, db, user, pass } = unpackArgs(args);
  const t = loadTemplates();
  const gfix = `"${path.join(bin, 'gfix.exe')}"`;
  const ctx = { GFIX: gfix, USER: user, PASS: pass, DB_PATH: db };
  const cmd = t.useCustom ? replacePlaceholders(t.mend, ctx) : `${gfix} -user ${user} -password ${pass} -mend "${db}"`;
  return runCommandStr(cmd);
});

ipcMain.handle('backup-restore', async (_e, ...args: any[]) => {
  const { bin, db, user, pass } = unpackArgs(args);
  const t = loadTemplates();

  const gbak = `"${path.join(bin, 'gbak.exe')}"`;
  const dir = path.dirname(db);
  const base = path.basename(db).replace(/\.fdb$/i, '');
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');

  const tempDir = path.join(dir, 'TEMP');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const oldDb = path.join(dir, `${base}FFF.FDB`);
  const newDb = path.join(dir, `${base}FF.FDB`);
  const fbk   = path.join(dir, `${base}_${stamp}.FBK`);
  const logBkp = path.join(tempDir, `LOG_BKP_${stamp}.LOG`);
  const logRtr = path.join(tempDir, `LOG_RTR_${stamp}.LOG`);

  const services = ['FirebirdServerFB25', 'FirebirdServerDefaultInstance', 'FirebirdServer'];
  async function sc(cmd: 'stop'|'start') { for (const s of services) await runCommandStr(`sc ${cmd} ${s}`); }
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  async function renameWithRetry(src: string, dst: string, tries = 16, delayMs = 500) {
    for (let i = 0; i < tries; i++) {
      try { fs.renameSync(src, dst); return true; }
      catch (e: any) { if (e?.code !== 'EBUSY' && e?.code !== 'EPERM') throw e; await sleep(delayMs); }
    }
    return false;
  }

  try {
    if (!fs.existsSync(db)) return `Arquivo não encontrado: "${db}"`;
    await sc('stop');

    const renamed = await renameWithRetry(db, oldDb, 16, 500);
    if (!renamed) { await sc('start'); return `Falha ao renomear (arquivo em uso): ${db}`; }

    // BACKUP
    let backupCmd = `${gbak} -backup -ignore -garbage -limbo -v -y "${logBkp}" "${oldDb}" "${fbk}" -user ${user} -password ${pass}`;
    if (t.useCustom) {
      backupCmd = replacePlaceholders(t.backup, {
        GBAK: gbak, USER: user, PASS: pass,
        DB_PATH: db, OLD_DB: oldDb, NEW_DB: newDb, FBK: fbk,
        LOG_BKP: logBkp, LOG_RTR: logRtr
      });
    }
    let out = await runCommandStr(backupCmd);
    if (/error|failed|unable|cannot|sqlstate\s*=\s*\w+/i.test(out) && !/success|done|gbak:finishing/i.test(out)) {
      try { if (fs.existsSync(oldDb) && !fs.existsSync(db)) fs.renameSync(oldDb, db); } catch {}
      await sc('start');
      return `Falha no backup:\n${out}`;
    }

    // RESTORE
    let restoreCmd = `${gbak} -create -z -v -y "${logRtr}" "${fbk}" "${newDb}" -user ${user} -password ${pass}`;
    if (t.useCustom) {
      restoreCmd = replacePlaceholders(t.restore, {
        GBAK: gbak, USER: user, PASS: pass,
        DB_PATH: db, OLD_DB: oldDb, NEW_DB: newDb, FBK: fbk,
        LOG_BKP: logBkp, LOG_RTR: logRtr
      });
    }
    out = await runCommandStr(restoreCmd);
    if (/error|failed|unable|cannot|sqlstate\s*=\s*\w+/i.test(out) && !/success|done|gbak:finishing/i.test(out)) {
      try { if (fs.existsSync(oldDb) && !fs.existsSync(db)) fs.renameSync(oldDb, db); } catch {}
      try { if (fs.existsSync(newDb)) fs.unlinkSync(newDb); } catch {}
      await sc('start');
      return `Falha no restore:\n${out}`;
    }

    try { if (fs.existsSync(db)) fs.unlinkSync(db); } catch {}
    fs.renameSync(newDb, db);

    const oldHist = path.join(dir, `${base}_OLD_${stamp}.FDB`);
    try { fs.renameSync(oldDb, oldHist); } catch {}

    await sc('start');
    return `Backup & Restore concluído!\nFBK: ${fbk}\nLOGs:\n - ${logBkp}\n - ${logRtr}`;
  } catch (err: any) {
    try {
      const fff = path.join(dir, `${base}FFF.FDB`);
      if (fs.existsSync(fff) && !fs.existsSync(db)) fs.renameSync(fff, db);
    } catch {}
    try { await runCommandStr('sc start FirebirdServerFB25'); } catch {}
    return `Erro no processo: ${err?.message || String(err)}`;
  }
});
