// electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  // ---- Sistema / janela ----
  minimize: () => ipcRenderer.invoke("app:minimize").catch(() => {}),
  confirmExit: () => ipcRenderer.invoke("app:confirm-exit"),
  exit: () => ipcRenderer.send("app:exit"),

  // ---- Pickers ----
  selectFdb: (): Promise<string> => ipcRenderer.invoke("select-fdb"),
  selectBin: (): Promise<string> => ipcRenderer.invoke("select-bin"),

  // ---- Ações banco ----
  testConnection: (binPath: string, dbPath: string, user: string, pass: string) =>
    ipcRenderer.invoke("test-connection", binPath, dbPath, user, pass),
  checkDb: (binPath: string, dbPath: string, user: string, pass: string) =>
    ipcRenderer.invoke("check-db", binPath, dbPath, user, pass),
  mendDb: (binPath: string, dbPath: string, user: string, pass: string) =>
    ipcRenderer.invoke("mend-db", binPath, dbPath, user, pass),
  backupRestore: (binPath: string, dbPath: string, user: string, pass: string) =>
    ipcRenderer.invoke("backup-restore", binPath, dbPath, user, pass),

  // ---- Config (templates) ----
  getTemplates: () => ipcRenderer.invoke("config:get-templates"),
  saveTemplates: (data: any) => ipcRenderer.invoke("config:save-templates", data),
  restoreDefaults: () => ipcRenderer.invoke("config:restore-defaults"),
});
