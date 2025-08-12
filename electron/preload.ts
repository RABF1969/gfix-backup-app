import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // pickers
  selectFDB: () => ipcRenderer.invoke('select-fdb'),
  selectBIN: () => ipcRenderer.invoke('select-bin'),

  // ações
  testConnection: (binPath: string, dbPath: string, user: string, password: string) =>
    ipcRenderer.invoke('test-connection', binPath, dbPath, user, password),
  checkDB: (binPath: string, dbPath: string, user: string, password: string) =>
    ipcRenderer.invoke('check-db', binPath, dbPath, user, password),
  mendDB: (binPath: string, dbPath: string, user: string, password: string) =>
    ipcRenderer.invoke('mend-db', binPath, dbPath, user, password),
  backupRestore: (binPath: string, dbPath: string, user: string, password: string) =>
    ipcRenderer.invoke('backup-restore', binPath, dbPath, user, password),

  // sair com confirmação
  confirmExit: () => ipcRenderer.invoke('app:confirm-exit'),
  exitApp: () => ipcRenderer.send('app:exit'),

  // config/templates
  getTemplates: () => ipcRenderer.invoke('config:get-templates'),
  saveTemplates: (data: any) => ipcRenderer.invoke('config:save-templates', data),
  restoreDefaultTemplates: () => ipcRenderer.invoke('config:restore-defaults')
});
