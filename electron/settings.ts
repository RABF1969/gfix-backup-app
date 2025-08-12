import { app } from 'electron'
import fs from 'fs-extra'
import path from 'node:path'

export type Settings = {
  gfixCheckCmd: string
  gfixMendCmd: string
  errorHeuristics: string[]
}

const defaults: Settings = {
  // COM ASPAS no executável e no caminho do DB
  gfixCheckCmd: '"{binPath}\\gfix.exe" -v -full "{dbPath}" -user {user} -password {password}',
  gfixMendCmd:  '"{binPath}\\gfix.exe" -mend "{dbPath}" -user {user} -password {password}',
  errorHeuristics: [
    'error','corrupt','bad','wrong page type','index root page','I/O error','checksum','inconsistency'
  ]
}

function settingsPath() {
  const dir = app.getPath('userData')
  return path.join(dir, 'settings.json')
}

export async function ensureSettings() {
  const p = settingsPath()
  if (!(await fs.pathExists(p))) {
    await fs.outputJson(p, defaults, { spaces: 2 })
  }
}

export async function getSettings(): Promise<Settings> {
  const p = settingsPath()
  try {
    const data = await fs.readJson(p)
    return { ...defaults, ...data }
  } catch {
    return defaults
  }
}

export async function saveSettings(data: Partial<Settings>) {
  const cur = await getSettings()
  const next = { ...cur, ...data }
  await fs.outputJson(settingsPath(), next, { spaces: 2 })
  return next
}

// NÃO adiciona aspas automaticamente; o template já tem aspas corretas
export function resolveCmdPlaceholders(
  cmd: string,
  ctx: { binPath: string, dbPath: string, user: string, password: string }
) {
  return cmd
    .replaceAll('{binPath}', ctx.binPath)
    .replaceAll('{dbPath}', ctx.dbPath)
    .replaceAll('{user}', ctx.user)
    .replaceAll('{password}', ctx.password)
}
