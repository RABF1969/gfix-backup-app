export {};

declare global {
  interface Window {
    api: {
      // Pickers
      selectFdb(): Promise<string>;
      selectBin(): Promise<string>;

      // Ações banco
      testConnection(bin: string, db: string, user: string, pass: string): Promise<string>;
      checkDb(bin: string, db: string, user: string, pass: string): Promise<string>;
      mendDb(bin: string, db: string, user: string, pass: string): Promise<string>;
      backupRestore(bin: string, db: string, user: string, pass: string): Promise<string>;

      // Templates
      getTemplates(): Promise<any>;
      saveTemplates(data: any): Promise<string>;
      restoreDefaults(): Promise<any>;

      // Status
      getFirebirdStatus(): Promise<"Rodando" | "Parado" | "—" | string>;

      // Janela
      minimize(): Promise<void>;
      maximize(): Promise<void>; // <— adicionado
      confirmExit(): Promise<boolean>;
      exit(): void;
    };
  }
}
