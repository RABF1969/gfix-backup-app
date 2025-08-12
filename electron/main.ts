import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
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

/** === Sair === */
ipcMain.on('app:exit', () => { app.quit(); });

/** Diálogo nativo de confirmação */
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
  return r.response === 0; // true se clicou "Sim"
});

/** === Helpers de processo === */
function runCommandStr(command: string): Promise<string> {
  return new Promise((resolve) => {
    exec(command, { windowsHide: true }, (error, stdout, stderr) => {
      const out = `${stdout || ''}${stderr || ''}`.trim();
      if (error) resolve((out || error.message).trim());
      else resolve(out || 'OK');
    });
  });
}

/* ---------- PICKERS ---------- */
ipcMain.handle('select-fdb', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Selecionar banco de dados (.FDB)',
    properties: ['openFile'],
    filters: [
      { name: 'Firebird DB', extensions: ['fdb', 'gdb'] },
      { name: 'Todos os arquivos', extensions: ['*'] }
    ]
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

/* ---------- AÇÕES ---------- */
ipcMain.handle('test-connection', async (_e, binPath: string, dbPath: string, user: string, password: string) => {
  const isql = `"${path.join(binPath, 'isql.exe')}"`;
  const cmd = `cmd /c "echo quit; | ${isql} -user ${user} -password ${password} "${dbPath}" -q -nod"`;
  return await runCommandStr(cmd);
});

ipcMain.handle('check-db', async (_e, binPath: string, dbPath: string, user: string, password: string) => {
  const gfix = `"${path.join(binPath, 'gfix.exe')}"`;
  const cmd = `${gfix} -user ${user} -password ${password} -v -full "${dbPath}"`;
  return await runCommandStr(cmd);
});

ipcMain.handle('mend-db', async (_e, binPath: string, dbPath: string, user: string, password: string) => {
  const gfix = `"${path.join(binPath, 'gfix.exe')}"`;
  const cmd = `${gfix} -user ${user} -password ${password} -mend "${dbPath}"`;
  return await runCommandStr(cmd);
});

ipcMain.handle('backup-restore', async (_e, binPath: string, dbPath: string, user: string, password: string) => {
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
  async function sc(cmd: 'stop'|'start') {
    for (const s of services) await runCommandStr(`sc ${cmd} ${s}`);
  }
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

    let cmd = `${gbak} -backup -ignore -garbage -limbo -v -y "${logBkp}" "${oldDb}" "${fbk}" -user ${user} -password ${password}`;
    let out = await runCommandStr(cmd);
    if (/error|failed|unable|cannot|sqlstate\s*=\s*\w+/i.test(out) && !/success|done|gbak:finishing/i.test(out)) {
      try { if (fs.existsSync(oldDb) && !fs.existsSync(dbPath)) fs.renameSync(oldDb, dbPath); } catch {}
      await sc('start');
      return `Falha no backup:\n${out}`;
    }

    cmd = `${gbak} -create -z -v -y "${logRtr}" "${fbk}" "${newDb}" -user ${user} -password ${password}`;
    out = await runCommandStr(cmd);
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
