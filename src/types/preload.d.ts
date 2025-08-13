// Tipos globais expostos pelo preload (window.api)

export {};

declare global {
  interface Window {
    api: {
      // genéricos
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      send: (channel: string, ...args: any[]) => void;

      // janela
      minimize: () => void;
      confirmExit: () => Promise<boolean>;
      exit: () => void;

      // config / templates
      getTemplates: () => Promise<{
        useCustom: boolean;
        test: string;
        check: string;
        mend: string;
        backup: string;
        restore: string;
      }>;
      saveTemplates: (data: {
        useCustom: boolean;
        test: string;
        check: string;
        mend: string;
        backup: string;
        restore: string;
      }) => Promise<"OK" | string>;
      restoreDefaults: () => Promise<{
        useCustom: boolean;
        test: string;
        check: string;
        mend: string;
        backup: string;
        restore: string;
      }>;
    };
  }
}
