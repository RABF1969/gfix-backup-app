// scripts/kill-locks.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("> Encerrando processos possivelmente bloqueando o build...");

try {
  // Encerra qualquer instância do Electron ou app que esteja aberta
  execSync(`taskkill /F /IM electron.exe /T`, { stdio: "ignore" });
  execSync(`taskkill /F /IM gfix-backup-app.exe /T`, { stdio: "ignore" });
} catch (err) {
  // Ignora erros se o processo não estiver aberto
}

console.log("> Limpando pastas dist e dist-electron...");
try {
  fs.rmSync(path.join(__dirname, "..", "dist"), { recursive: true, force: true });
  fs.rmSync(path.join(__dirname, "..", "dist-electron"), { recursive: true, force: true });
} catch (err) {}

console.log("> Limpando cache do winCodeSign...");
try {
  const winCodeSignCache = path.join(process.env.LOCALAPPDATA, "electron-builder", "Cache", "winCodeSign");
  fs.rmSync(winCodeSignCache, { recursive: true, force: true });
} catch (err) {}

console.log("> Pronto. Pode rodar o build.");
