
export function hasErrorsInOutput(out: string, heuristics: string[]) {
  const text = out.toLowerCase()
  return heuristics.some(h => {
    try {
      if (h.startsWith('/') && h.endsWith('/')) {
        const rx = new RegExp(h.slice(1, -1), 'i')
        return rx.test(out)
      }
    } catch { /* ignore */ }
    return text.includes(h.toLowerCase())
  })
}
