import { contextBridge, ipcRenderer } from "electron";

const api = {
  // Controles janela
  minimize: () => ipcRenderer.send("window:minimize"),
  exit:     () => ipcRenderer.send("app:exit"),

  // Pickers
  selectFdb: () => ipcRenderer.invoke("select-fdb"),
  selectBin: () => ipcRenderer.invoke("select-bin"),

  // Ações
  testConnection: (bin: string, db: string, user: string, pass: string) =>
    ipcRenderer.invoke("test-connection", { bin, db, user, pass }),
  checkDb: (bin: string, db: string, user: string, pass: string) =>
    ipcRenderer.invoke("check-db", { bin, db, user, pass }),
  mendDb: (bin: string, db: string, user: string, pass: string) =>
    ipcRenderer.invoke("mend-db", { bin, db, user, pass }),
  backupRestore: (bin: string, db: string, user: string, pass: string) =>
    ipcRenderer.invoke("backup-restore", { bin, db, user, pass }),

  // Configs
  getTemplates:      () => ipcRenderer.invoke("config:get-templates"),
  saveTemplates:     (data: any) => ipcRenderer.invoke("config:save-templates", data),
  restoreDefaults:   () => ipcRenderer.invoke("config:restore-defaults"),

  // Canal genérico se precisar
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  send:   (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
};

contextBridge.exposeInMainWorld("api", api);

declare global {
  interface Window { api: typeof api }
}
