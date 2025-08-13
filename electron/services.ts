// electron/services.ts
// Utilidades do processo principal (Electron) para rodar comandos do Windows
// e checar status do serviço do Firebird 2.5.

import { exec } from "child_process";

/** Executa um comando e resolve sempre com stdout+stderr (sem lançar exceção). */
export function run(command: string): Promise<string> {
  return new Promise((resolve) => {
    exec(command, { windowsHide: true }, (err, stdout, stderr) => {
      const out = `${stdout || ""}${stderr || ""}`.trim();
      if (err) return resolve(out || err.message);
      resolve(out || "OK");
    });
  });
}

/**
 * Verifica se algum serviço de Firebird 2.5 está em execução.
 * Retorna: "rodando" | "parado" | "desconhecido"
 */
export async function getFirebirdServiceStatus(): Promise<"rodando" | "parado" | "desconhecido"> {
  // Nomes típicos do serviço no Windows
  const candidates = ["FirebirdServerFB25", "FirebirdServerDefaultInstance", "FirebirdServer"];

  try {
    for (const name of candidates) {
      // sc query <servico>
      const out = await run(`sc query "${name}"`);
      // Quando existe, a saída contém "STATE" e eventualmente "RUNNING"
      if (/SERVICE_NAME/i.test(out)) {
        if (/STATE\s*:\s*\d+\s*RUNNING/i.test(out)) return "rodando";
        if (/STATE\s*:\s*\d+\s*STOPPED/i.test(out)) return "parado";
        return "desconhecido";
      }
    }
    // Nenhum dos nomes respondeu como serviço válido
    return "desconhecido";
  } catch {
    return "desconhecido";
  }
}
