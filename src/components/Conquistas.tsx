/*******************************************************************************
 * conquistas.tsx
 * funcao principal: a janela com a lista de conquistas e o avisinho que aparece
 * em qualquer tela quando uma conquista nova e alcancada. guarda no
 * localStorage quais conquistas ja foram anunciadas.
 ******************************************************************************/
import { useEffect, useRef, useState } from 'react'
import { CONQUISTAS, conseguiu, type Progresso } from '../data/conquistas'
import { useStore } from '../store'
import { Lock, Sparkle, Star } from '../ui/icons'

// chave do localStorage com os ids das conquistas que ja ganharam aviso
const VISTAS = 'balletcode.conquistas.vistas.v1'

/*******************************************************************************
 * lerVistas
 * funcao: le do localStorage as conquistas ja anunciadas.
 * recebe: nada.
 * retorna: a lista de ids, ou null se nunca foi gravada (ou se o localStorage
 * falhar).
 ******************************************************************************/
const lerVistas = (): string[] | null => {
  try {
    const v = localStorage.getItem(VISTAS)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

/*******************************************************************************
 * gravarVistas
 * funcao: grava a lista de conquistas ja anunciadas.
 * recebe: l (lista de ids).
 * retorna: nada. se o navegador nao deixar gravar, ignora.
 ******************************************************************************/
const gravarVistas = (l: string[]) => {
  try {
    localStorage.setItem(VISTAS, JSON.stringify(l))
  } catch {
    /* sem espaco: so nao lembra */
  }
}

/*******************************************************************************
 * useProgresso
 * funcao: hook que junta do store o que as conquistas precisam.
 * recebe: nada.
 * retorna: o Progresso (estrelas e quantidade de coreografias salvas).
 ******************************************************************************/
function useProgresso(): Progresso {
  const stars = useStore((s) => s.stars)
  const salvas = useStore((s) => s.salvas)
  return { stars, salvas }
}

/*******************************************************************************
 * ConquistasModal
 * funcao: janela com todas as conquistas, as alcancadas com estrela e as outras
 * com cadeado e barrinha de progresso.
 * recebe: onClose (funcao chamada ao fechar).
 * retorna: a janela.
 ******************************************************************************/
export function ConquistasModal({ onClose }: { onClose: () => void }) {
  const p = useProgresso()
  const n = CONQUISTAS.filter((c) => conseguiu(c, p)).length
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal conquistas" onClick={(e) => e.stopPropagation()}>
        <h3>
          <Star size={22} /> Conquistas
        </h3>
        <p className="muted">
          {n} de {CONQUISTAS.length} conquistas
        </p>
        <div className="conq-lista">
          {CONQUISTAS.map((c) => {
            const [a, b] = c.meta(p)
            const ok = a >= b
            return (
              <div key={c.id} className={`conq ${ok ? 'ok' : ''}`}>
                <span className="conq-icone">{ok ? <Star size={20} /> : <Lock size={16} />}</span>
                <div className="conq-txt">
                  <b>{c.titulo}</b>
                  <small>{c.texto}</small>
                  {c.premio && (
                    <small className="conq-premio">
                      <Sparkle size={10} /> {c.premio}
                    </small>
                  )}
                  {!ok && b > 1 && (
                    <span className="conq-barra">
                      <span style={{ width: `${(100 * a) / b}%` }} />
                    </span>
                  )}
                </div>
                <span className="conq-num">{ok ? '♡' : `${a}/${b}`}</span>
              </div>
            )
          })}
        </div>
        <button className="pill pink" onClick={onClose}>
          fechar
        </button>
      </div>
    </div>
  )
}

/*******************************************************************************
 * ConquistaToast
 * funcao: avisinho de conquista nova. compara as conquistas alcancadas com as
 * ja anunciadas e mostra as novas uma de cada vez, por 4,2 segundos cada (ou
 * ate um clique).
 * recebe: nada.
 * retorna: o aviso, ou null quando nao ha nada para mostrar.
 ******************************************************************************/
export function ConquistaToast() {
  const p = useProgresso()
  const [fila, setFila] = useState<string[]>([])
  const iniciou = useRef(false)
  useEffect(() => {
    const feitas = CONQUISTAS.filter((c) => conseguiu(c, p)).map((c) => c.id)
    const vistas = lerVistas()
    if (!iniciou.current && vistas === null) {
      // primeira vez com conquistas: o que ja foi feito antes entra sem festa
      gravarVistas(feitas)
      iniciou.current = true
      return
    }
    iniciou.current = true
    // conquistas novas entram na fila e ja ficam gravadas como vistas, para nao repetir o aviso
    const novas = feitas.filter((id) => !(vistas ?? []).includes(id))
    if (novas.length) {
      gravarVistas([...(vistas ?? []), ...novas])
      setFila((f) => [...f, ...novas])
    }
  }, [p.stars, p.salvas]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!fila.length) return
    const t = window.setTimeout(() => setFila((f) => f.slice(1)), 4200)
    return () => window.clearTimeout(t)
  }, [fila])
  const c = CONQUISTAS.find((x) => x.id === fila[0])
  if (!c) return null
  return (
    <div className="conq-toast" key={c.id} onClick={() => setFila((f) => f.slice(1))}>
      <span className="conq-icone">
        <Star size={22} />
      </span>
      <div>
        <small>conquista nova!</small>
        <b>{c.titulo}</b>
        {c.premio && <small className="conq-premio">{c.premio} ♡</small>}
      </div>
    </div>
  )
}
