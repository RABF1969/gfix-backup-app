
import { spawn } from 'node:child_process'

function run(cmd: string, args: string[]) {
  return new Promise<{ code: number, out: string }>((resolve) => {
    const p = spawn(cmd, args, { windowsHide: true })
    let out = ''
    p.stdout.on('data', d => out += d.toString())
    p.stderr.on('data', d => out += d.toString())
    p.on('close', code => resolve({ code: code ?? 0, out }))
  })
}

export async function restartFirebirdService() {
  const names = ['FirebirdServerFB25', 'FirebirdServerDefaultInstance', 'FirebirdServer']
  for (const name of names) {
    const q = await run('sc', ['query', name])
    if (/STATE|SERVICENAME/i.test(q.out)) {
      await run('net', ['stop', name])
      await run('net', ['start', name])
      return { ok: true, service: name }
    }
  }
  return { ok: false, error: 'Nenhum serviço do Firebird 2.5 encontrado.' }
}
