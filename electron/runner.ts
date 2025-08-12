
import { spawn, SpawnOptions } from 'node:child_process'

export function runProcess(command: string, args: string[], opts: SpawnOptions = {}) {
  return new Promise<{ code: number, stdout: string, stderr: string }>((resolve) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore','pipe','pipe'], ...opts })
    let stdout = ''
    let stderr = ''
    child.stdout!.on('data', d => { stdout += d.toString() })
    child.stderr!.on('data', d => { stderr += d.toString() })
    child.on('close', code => resolve({ code: code ?? 0, stdout, stderr }))
  })
}

export function runProcessWithInput(command: string, args: string[], input: string, opts: SpawnOptions = {}) {
  return new Promise<{ code: number, stdout: string, stderr: string }>((resolve) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['pipe','pipe','pipe'], ...opts })
    let stdout = ''
    let stderr = ''
    child.stdout!.on('data', d => { stdout += d.toString() })
    child.stderr!.on('data', d => { stderr += d.toString() })
    child.on('close', code => resolve({ code: code ?? 0, stdout, stderr }))
    child.stdin!.end(input)
  })
}

export async function runPipeline(
  leftCmd: string, leftArgs: string[],
  rightCmd: string, rightArgs: string[],
  opts: SpawnOptions = {}
) {
  return new Promise<{ ok: boolean, stderr: string }>((resolve) => {
    const left = spawn(leftCmd, leftArgs, { windowsHide: true, ...opts, stdio: ['ignore', 'pipe', 'pipe'] })
    const right = spawn(rightCmd, rightArgs, { windowsHide: true, ...opts, stdio: ['pipe', 'ignore', 'pipe'] })
    let stderr = ''
    left.stderr.on('data', d => { stderr += d.toString() })
    right.stderr.on('data', d => { stderr += d.toString() })
    left.stdout.pipe(right.stdin!)
    right.on('close', (code) => resolve({ ok: (code ?? 1) === 0, stderr }))
  })
}
