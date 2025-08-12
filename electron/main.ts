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

/** Flag para permitir fechar de fato a janela */
let allowClose = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,

    // === FRAMELESS ===
    frame: false,                 // remove moldura/botões do Windows
    titleBarStyle: 'hidden',      // evita título nativo
    thickFrame: false,            // tira borda grossa do Windows
    resizable: false,
    minimizable: false,
    maximizable: false,

    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // remove totalmente menu
  Menu.setApplicationMenu(null);

  // bloqueia fechar pelo X/Alt+F4 — só "Sair" libera
  mainWindow.on('close', (e) => {
    if (!allowClose) {
      e.preventDefault(); // impede fechamento
      // opcional: avisar a UI se quiser mostrar algo
      // mainWindow?.webContents.send('ui:prevented-close');
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

/* ====================== SAIR COM CONFIRMAÇÃO ====================== */
ipcMain.handle('app:confirm-exit', async () => {
  const r = await dialog.showMessageBox({
    type: 'question',
    title: 'Confirmar saída',
    message: 'Deseja realmente fechar o aplicativo?',
    buttons: ['Sim', 'Não'],
    defaultId: 1,
    cancelId: 1,
    noLink: true
  });
  return r.response === 0;
});

ipcMain.on('app:exit', () => {
  allowClose = true;       // permite fechar
  // se quiser fechar a janela atual:
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  } else {
    app.quit();
  }
});

ipcMain.on('app:force-exit', () => { // opcional: saída sem pergunta
  allowClose = true;
  app.quit();
});

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
  restore: `{GBAK} -create -z -v -y "{LOG_RTR}" "{FBK}" "{NEW_DB}" -user {USER} -password {PASS}`
};

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadTemplates(): Templates {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const json = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      return { ...defaultTemplates, ...json };
    }
  } catch {}
  return { ...defaultTemplates };
}

function saveTemplates(data: Templates) {
  try {
    const settingsPath = getSettingsPath();
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

function replacePlaceholders(tpl: string, ctx: Record<string, string>) {
  return tpl.replace(/\{([A-Z_]+)\}/g, (_m, key) => ctx[key] ?? '');
}

/* IPC de configurações */
ipcMain.handle('config:get-templates', async () => loadTemplates());
ipcMain.handle('config:save-templates', async (_e, data: Templates) => saveTemplates(data) ? 'OK' : 'Erro ao salvar templates.');
ipcMain.handle('config:restore-defaults', async () => (saveTemplates({ ...defaultTemplates }) ? loadTemplates() : defaultTemplates));

/* ====================== PICKERS ====================== */
ipcMain.handle('select-fdb', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Selecionar banco de dados (.FDB)',
    properties: ['openFile'],
    filters: [{ name: 'Firebird DB', extensions: ['fdb', 'gdb'] }, { name: 'Todos os arquivos', extensions: ['*'] }]
  });
  if (res.canceled || !res.filePaths?.[0]) return '';
  return res.filePaths[0];
});

ipcMain.handle('select-bin', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Selecionar diretório BIN do Firebird 2.5',
    properties: ['openDirectory']
  });
  if (res.canceled || !res.filePaths?.[0]) return '';
  return res.filePaths[0];
});

/* ====================== AÇÕES ====================== */
// Testar conexão (isql)
ipcMain.handle('test-connection', async (_e, binPath: string, dbPath: string, user: string, password: string) => {
  const t = loadTemplates();
  const isql = `"${path.join(binPath, 'isql.exe')}"`;
  const ctx = { ISQL: isql, USER: user, PASS: password, DB_PATH: dbPath };
  const cmd = t.useCustom ? replacePlaceholders(t.test, ctx) : `cmd /c "echo quit; | ${isql} -user ${user} -password ${password} "${dbPath}" -q -nod"`;
  return await runCommandStr(cmd);
});

// Verificar banco (gfix -v -full)
ipcMain.handle('check-db', async (_e, binPath: string, dbPath: string, user: string, password: string) => {
  const t = loadTemplates();
  const gfix = `"${path.join(binPath, 'gfix.exe')}"`;
  const ctx = { GFIX: gfix, USER: user, PASS: password, DB_PATH: dbPath };
  const cmd = t.useCustom ? replacePlaceholders(t.check, ctx) : `${gfix} -user ${user} -password ${password} -v -full "${dbPath}"`;
  return await runCommandStr(cmd);
});

// Reparar banco (gfix -mend)
ipcMain.handle('mend-db', async (_e, binPath: string, dbPath: string, user: string, password: string) => {
  const t = loadTemplates();
  const gfix = `"${path.join(binPath, 'gfix.exe')}"`;
  const ctx = { GFIX: gfix, USER: user, PASS: password, DB_PATH: dbPath };
  const cmd = t.useCustom ? replacePlaceholders(t.mend, ctx) : `${gfix} -user ${user} -password ${password} -mend "${dbPath}"`;
  return await runCommandStr(cmd);
});

// Backup & Restore (gbak) com stop/start do serviço + rename retry
ipcMain.handle('backup-restore', async (_e, binPath: string, dbPath: string, user: string, password: string) => {
  const t = loadTemplates();
  const gbak = `"${path.join(binPath, 'gbak.exe')}"`;
  const dir = path.dirname(dbPath);
  const base = path.basename(dbPath).replace(/\.fdb$/i, '');
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
    if (!fs.existsSync(dbPath)) return `Arquivo não encontrado: "${dbPath}"`;
    await sc('stop');

    const renamed = await renameWithRetry(dbPath, oldDb, 16, 500);
    if (!renamed) { await sc('start'); return `Falha ao renomear (arquivo em uso): ${dbPath}`; }

    // BACKUP
    let backupCmd = `${gbak} -backup -ignore -garbage -limbo -v -y "${logBkp}" "${oldDb}" "${fbk}" -user ${user} -password ${password}`;
    if (t.useCustom) {
      backupCmd = replacePlaceholders(t.backup, {
        GBAK: gbak, USER: user, PASS: password,
        DB_PATH: dbPath, OLD_DB: oldDb, NEW_DB: newDb, FBK: fbk,
        LOG_BKP: logBkp, LOG_RTR: logRtr
      });
    }
    let out = await runCommandStr(backupCmd);
    if (/error|failed|unable|cannot|sqlstate\s*=\s*\w+/i.test(out) && !/success|done|gbak:finishing/i.test(out)) {
      try { if (fs.existsSync(oldDb) && !fs.existsSync(dbPath)) fs.renameSync(oldDb, dbPath); } catch {}
      await sc('start');
      return `Falha no backup:\n${out}`;
    }

    // RESTORE
    let restoreCmd = `${gbak} -create -z -v -y "${logRtr}" "${fbk}" "${newDb}" -user ${user} -password ${password}`;
    if (t.useCustom) {
      restoreCmd = replacePlaceholders(t.restore, {
        GBAK: gbak, USER: user, PASS: password,
        DB_PATH: dbPath, OLD_DB: oldDb, NEW_DB: newDb, FBK: fbk,
        LOG_BKP: logBkp, LOG_RTR: logRtr
      });
    }
    out = await runCommandStr(restoreCmd);
    if (/error|failed|unable|cannot|sqlstate\s*=\s*\w+/i.test(out) && !/success|done|gbak:finishing/i.test(out)) {
      try { if (fs.existsSync(oldDb) && !fs.existsSync(dbPath)) fs.renameSync(oldDb, dbPath); } catch {}
      try { if (fs.existsSync(newDb)) fs.unlinkSync(newDb); } catch {}
      await sc('start');
      return `Falha no restore:\n${out}`;
    }

    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch {}
    fs.renameSync(newDb, dbPath);

    const oldHist = path.join(dir, `${base}_OLD_${stamp}.FDB`);
    try { fs.renameSync(oldDb, oldHist); } catch {}

    await sc('start');
    return `Backup & Restore concluído!\nFBK: ${fbk}\nLOGs:\n - ${logBkp}\n - ${logRtr}`;
  } catch (err: any) {
    try {
      const fff = path.join(dir, `${base}FFF.FDB`);
      if (fs.existsSync(fff) && !fs.existsSync(dbPath)) fs.renameSync(fff, dbPath);
    } catch {}
    try { await runCommandStr('sc start FirebirdServerFB25'); } catch {}
    return `Erro no processo: ${err?.message || String(err)}`;
  }
});
