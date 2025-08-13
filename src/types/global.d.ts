// src/types/global.d.ts
export {};

declare global {
  interface Window {
    api: {
      // pickers
      selectFdb(): Promise<string>;
      selectBin(): Promise<string>;

      // ações
      testConnection(binPath: string, dbPath: string, user: string, pass: string): Promise<string>;
      checkDb(binPath: string, dbPath: string, user: string, pass: string): Promise<string>;
      mendDb(binPath: string, dbPath: string, user: string, pass: string): Promise<string>;
      backupRestore(binPath: string, dbPath: string, user: string, pass: string): Promise<string>;

      // status
      getFirebirdStatus(): Promise<"rodando" | "parado" | "desconhecido">;

      // templates
      getTemplates(): Promise<any>;
      saveTemplates(data: any): Promise<string>;
      restoreDefaults(): Promise<any>;

      // janela
      minimize(): void;
      maximizeToggle(): void;
      confirmExit(): Promise<boolean>;
      exit(): void;
    };
  }
}
