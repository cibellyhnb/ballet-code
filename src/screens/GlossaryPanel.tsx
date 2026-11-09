/*******************************************************************************
 * GlossaryPanel.tsx
 * funcao principal: painel do glossario: o cartao do termo escolhido (nome,
 * traducao e dica), a busca e a lista de termos por grupo. escolher um termo
 * faz a bailarina demonstrar o passo.
 ******************************************************************************/
import { useState } from 'react'
import { GLOSSARIO, type Termo } from '../data/glossario'
import { useStore } from '../store'
import { Heart } from '../ui/icons'

/*******************************************************************************
 * GRUPOS
 * funcao: a ordem dos grupos na lista. os nomes sao os mesmos do campo grupo de
 * cada termo.
 ******************************************************************************/
const GRUPOS: Termo['grupo'][] = ['Posições', 'Braços', 'Passos', 'Direções', 'Centro', 'Saltos']
// ordem de aula: posicoes, bracos, e os passos na ordem da barra
const ORDEM = [
  'primeira-pes', 'segunda-pes', 'terceira-pes', 'quarta-pes', 'quinta-pes', 'en-dehors',
  'bras-bas', 'primeira-bracos', 'segunda-bracos', 'terceira-bracos', 'quarta-bracos', 'quinta-bracos', 'port-de-bras',
  'demi-plie', 'grand-plie', 'tendu', 'glisse', 'jete', 'rond', 'coupe', 'fondu', 'frappe', 'pas-de-cheval',
  'passe', 'developpe', 'arabesque', 'attitude', 'cambre', 'releve', 'grand-battement', 'cloche', 'pirueta',
]

/*******************************************************************************
 * rank
 * funcao: posicao de um termo na ordem de aula (ORDEM).
 * recebe: id (string), o id do termo.
 * retorna: o indice em ORDEM, ou 999 para termos fora dela (vao para o fim do
 * grupo).
 ******************************************************************************/
const rank = (id: string) => {
  const i = ORDEM.indexOf(id)
  return i < 0 ? 999 : i
}

/*******************************************************************************
 * GlossaryPanel
 * funcao: mostra o termo escolhido e a lista filtrada pela busca.
 * recebe: nada (le e muda o termo escolhido no store).
 * retorna: o painel lateral.
 ******************************************************************************/
export function GlossaryPanel() {
  const termId = useStore((s) => s.termId)
  const setTerm = useStore((s) => s.setTerm)
  const [q, setQ] = useState('')
  const sel = GLOSSARIO.find((t) => t.id === termId)!
  // a busca ignora acentos e maiusculas: "plie" acha o termo escrito com acento
  const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const match = (t: Termo) => norm(t.termo + ' ' + t.traducao).includes(norm(q))

  return (
    <aside className="panel">
      <div className="flashcard">
        <span className="fc-group">{sel.grupo}</span>
        <h3>{sel.termo}</h3>
        <p className="fc-trad">“{sel.traducao}”</p>
        <p className="fc-tip">
          <Heart size={12} /> {sel.dica}
        </p>
      </div>

      <input className="search" placeholder="buscar um passo…" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="term-list">
        {GRUPOS.map((g) => {
          const items = GLOSSARIO.filter((t) => t.grupo === g && match(t)).sort((a, b) => rank(a.id) - rank(b.id))
          if (items.length === 0) return null
          return (
            <div key={g} className="term-group">
              <h3 className="sec-title">{g}</h3>
              <div className="term-chips">
                {items.map((t) => (
                  <button key={t.id} className={`term ${t.id === termId ? 'sel' : ''}`} onClick={() => setTerm(t.id)}>
                    {t.termo}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
