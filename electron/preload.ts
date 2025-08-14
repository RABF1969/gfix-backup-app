import { contextBridge, ipcRenderer } from "electron";

/**
 * API exposta ao renderer com segurança.
 * Toda função que o React chamar deve ser exposta aqui.
 */
contextBridge.exposeInMainWorld("api", {
  // Seletores de arquivos
  selectFdb: () => ipcRenderer.invoke("select-fdb"),
  selectBin: () => ipcRenderer.invoke("select-bin"),

  // Ações com banco
  testConnection: (bin: string, db: string, user: string, pass: string) =>
    ipcRenderer.invoke("test-connection", bin, db, user, pass),
  checkDb: (bin: string, db: string, user: string, pass: string) =>
    ipcRenderer.invoke("check-db", bin, db, user, pass),
  mendDb: (bin: string, db: string, user: string, pass: string) =>
    ipcRenderer.invoke("mend-db", bin, db, user, pass),
  backupRestore: (bin: string, db: string, user: string, pass: string) =>
    ipcRenderer.invoke("backup-restore", bin, db, user, pass),

  // Templates
  getTemplates: () => ipcRenderer.invoke("config:get-templates"),
  saveTemplates: (data: unknown) => ipcRenderer.invoke("config:save-templates", data),
  restoreDefaults: () => ipcRenderer.invoke("config:restore-defaults"),

  // Status do Firebird
  getFirebirdStatus: () => ipcRenderer.invoke("get-firebird-status"),

  // Controles da janela
  minimize: () => ipcRenderer.invoke("win:minimize"),
  maximize: () => ipcRenderer.invoke("win:maximize"), // <— adicionado
  confirmExit: () => ipcRenderer.invoke("app:confirm-exit"),
  exit: () => ipcRenderer.send("app:exit"),
});
