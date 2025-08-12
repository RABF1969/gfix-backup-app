
import fs from 'fs-extra'
import path from 'node:path'

export async function prepareTempDir(tempDir: string) {
  await fs.ensureDir(tempDir)
}

export function dateStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export async function renameForProcess(baseDir: string, dbName: string, oldName: string) {
  const src = path.join(baseDir, dbName)
  const dst = path.join(baseDir, oldName)
  if (!(await fs.pathExists(src))) return { renamed: false }
  await fs.move(src, dst, { overwrite: true })
  return { renamed: true }
}

export async function finalizeRenames(baseDir: string, restoredTmp: string, dbName: string, oldName: string, stamp: string) {
  try {
    const rtmp = path.join(baseDir, restoredTmp)
    const final = path.join(baseDir, dbName)
    await fs.move(rtmp, final, { overwrite: true })
    const oldPath = path.join(baseDir, oldName)
    if (await fs.pathExists(oldPath)) {
      const oldStamped = path.join(baseDir, `DBCIECF_OLD_${stamp}.FDB`)
      await fs.move(oldPath, oldStamped, { overwrite: true })
    }
    const fbk = path.join(baseDir, 'DBCIEC.FBK')
    if (await fs.pathExists(fbk)) {
      await fs.move(fbk, path.join(baseDir, `DBCIECF_OLD_${stamp}.FBK`), { overwrite: true })
    }
    return true
  } catch {
    return false
  }
}

export async function moveOldArtifacts(baseDir: string, tempDir: string) {
  const entries = await fs.readdir(baseDir)
  for (const name of entries) {
    const looksOld = /OLD_\d{8}_\d{6}\.(fdb|fbk)$/i.test(name)
    if (looksOld) {
      await fs.move(path.join(baseDir, name), path.join(tempDir, name), { overwrite: true })
    }
  }
}
