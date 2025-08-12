
import fs from 'fs-extra'
import path from 'node:path'

export async function detectFirebirdBin() {
  const candidates = [
    path.resolve(process.cwd(), 'Firebird_2_5', 'bin'),
    path.join(process.env['ProgramFiles'] || 'C:/Program Files', 'Firebird', 'Firebird_2_5', 'bin'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Firebird', 'Firebird_2_5', 'bin')
  ]
  for (const p of candidates) {
    if (await fs.pathExists(path.join(p, 'gfix.exe')) && await fs.pathExists(path.join(p, 'gbak.exe'))) {
      return { found: true, binPath: p }
    }
  }
  return { found: false, binPath: '' }
}

export async function testBinPath(binPath: string){
  try {
    const hasGfix = await fs.pathExists(path.join(binPath, 'gfix.exe'))
    const hasGbak = await fs.pathExists(path.join(binPath, 'gbak.exe'))
    return { ok: hasGfix && hasGbak, hasGfix, hasGbak }
  } catch {
    return { ok: false, hasGfix: false, hasGbak: false }
  }
}
