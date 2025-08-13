// electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";

/**
 * Exponho UMA API estável pro renderer.
 * - Métodos que pedem retorno usam ipcRenderer.invoke (promessa)
 * - Ações simples de janela usam ipcRenderer.send
 */
contextBridge.exposeInMainWorld("api", {
  // File pickers
  selectFdb: () => ipcRenderer.invoke("select-fdb"),
  selectBin: () => ipcRenderer.invoke("select-bin"),

  // Ações Firebird
  testConnection: (binPath: string, dbPath: string, user: string, pass: string) =>
    ipcRenderer.invoke("test-connection", binPath, dbPath, user, pass),

  checkDb: (binPath: string, dbPath: string, user: string, pass: string) =>
    ipcRenderer.invoke("check-db", binPath, dbPath, user, pass),

  mendDb: (binPath: string, dbPath: string, user: string, pass: string) =>
    ipcRenderer.invoke("mend-db", binPath, dbPath, user, pass),

  backupRestore: (binPath: string, dbPath: string, user: string, pass: string) =>
    ipcRenderer.invoke("backup-restore", binPath, dbPath, user, pass),

  // Status do Firebird
  getFirebirdStatus: () => ipcRenderer.invoke("status:firebird"),

  // Config / Templates
  getTemplates: () => ipcRenderer.invoke("config:get-templates"),
  saveTemplates: (data: any) => ipcRenderer.invoke("config:save-templates", data),
  restoreDefaults: () => ipcRenderer.invoke("config:restore-defaults"),

  // Janela
  minimize: () => ipcRenderer.send("win:minimize"),
  maximizeToggle: () => ipcRenderer.send("win:maximize"),
  confirmExit: () => ipcRenderer.invoke("app:confirm-exit"),
  exit: () => ipcRenderer.send("app:exit"),
});

export {};
