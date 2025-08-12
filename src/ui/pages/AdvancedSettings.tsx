import React, { useEffect, useState } from 'react'

declare global { interface Window { api: any } }

type Settings = { gfixCheckCmd: string; gfixMendCmd: string; errorHeuristics: string[] }
const placeholders = '{binPath}, {dbPath}, {user}, {password}'

export function AdvancedSettings(){
  const [s, setS] = useState<Settings>({ gfixCheckCmd: '', gfixMendCmd: '', errorHeuristics: [] })
  const [newH, setNewH] = useState('')

  useEffect(()=>{ (async()=>{ setS(await window.api.getSettings()) })() },[])

  async function save(){
    const hasRequired = (cmd: string) => ['{binPath}','{dbPath}','{user}','{password}'].every(t=>cmd.includes(t))
    if(!hasRequired(s.gfixCheckCmd) || !hasRequired(s.gfixMendCmd)){
      alert('Os comandos devem conter todos os placeholders: ' + placeholders); return
    }
    const saved = await window.api.saveSettings(s); setS(saved); alert('Configurações salvas!')
  }

  function restore(){
    setS({
      gfixCheckCmd: '"{binPath}\\gfix.exe" -v -full "{dbPath}" -user {user} -password {password}',
      gfixMendCmd:  '"{binPath}\\gfix.exe" -mend "{dbPath}" -user {user} -password {password}',
      errorHeuristics: ['error','corrupt','bad','wrong page type','index root page','I/O error','checksum','inconsistency']
    })
  }

  return (
    <div className="grid gap-6">
      <section className="card grid gap-3">
        <h2 className="text-xl font-bold">Comandos Editáveis</h2>
        <p className="opacity-80 text-sm">Use os placeholders: <code>{placeholders}</code></p>
        <label className="grid gap-1">
          <span>gfix -v -full</span>
          <textarea className="rounded-xl bg-gray-800 border border-white/10 p-3 min-h-[80px]" value={s.gfixCheckCmd} onChange={e=>setS(v=>({...v, gfixCheckCmd: e.target.value}))} />
        </label>
        <label className="grid gap-1">
          <span>gfix -mend</span>
          <textarea className="rounded-xl bg-gray-800 border border-white/10 p-3 min-h-[80px]" value={s.gfixMendCmd} onChange={e=>setS(v=>({...v, gfixMendCmd: e.target.value}))} />
        </label>
        <div className="flex gap-3">
          <button className="bigbtn bg-indigo-500" onClick={save}>Salvar</button>
          <button className="bigbtn bg-gray-700" onClick={restore}>Restaurar Padrão</button>
        </div>
      </section>

      <section className="card grid gap-3">
        <h2 className="text-xl font-bold">Heurísticas de Erro (stdout)</h2>
        <div className="flex gap-2">
          <input className="px-3 py-2 rounded bg-gray-800 border border-white/10 flex-1" placeholder="ex.: corrupt ou /checksum/i" value={newH} onChange={e=>setNewH(e.target.value)} />
          <button className="bigbtn bg-emerald-500" onClick={()=>{ if(newH.trim()) setS(v=>({...v, errorHeuristics: [...v.errorHeuristics, newH.trim()]})); setNewH('') }}>Adicionar</button>
        </div>
        <ul className="grid gap-2">
          {s.errorHeuristics.map((h,idx)=> (
            <li key={idx} className="flex items-center justify-between bg-black/40 rounded-xl px-3 py-2">
              <span className="text-sm">{h}</span>
              <button className="bigbtn bg-rose-600" onClick={()=>setS(v=>({...v, errorHeuristics: v.errorHeuristics.filter((_,i)=>i!==idx)}))}>Remover</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
