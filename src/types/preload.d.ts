// src/types/preload.d.ts

export {};

declare global {
  interface Window {
    api: {
      // Sistema / janela
      minimize: () => void;
      confirmExit: () => Promise<boolean>;
      exit: () => void;

      // Pickers
      selectFdb: () => Promise<string>;
      selectBin: () => Promise<string>;

      // Ações banco
      testConnection: (
        binPath: string,
        dbPath: string,
        user: string,
        pass: string
      ) => Promise<string>;

      checkDb: (
        binPath: string,
        dbPath: string,
        user: string,
        pass: string
      ) => Promise<string>;

      mendDb: (
        binPath: string,
        dbPath: string,
        user: string,
        pass: string
      ) => Promise<string>;

      backupRestore: (
        binPath: string,
        dbPath: string,
        user: string,
        pass: string
      ) => Promise<string>;

      // Config (templates)
      getTemplates: () => Promise<any>;
      saveTemplates: (data: any) => Promise<string>;
      restoreDefaults: () => Promise<any>;
    };
  }
}
