/*******************************************************************************
 * Camarim.tsx
 * funcao principal: tela do camarim: nome da bailarina, penteado, cores de cada
 * parte, tipo de sapatilha e enfeite, com a bailarina no espelho mudando na
 * hora. opcoes especiais ficam trancadas ate a jogadora juntar estrelas.
 ******************************************************************************/
import { Scene } from '../components/Scene'
import { useStore } from '../store'
import { ENFEITES, ESTRELAS_PONTA, OPCOES, PENTEADOS, type Look } from '../engine/look'
import { Lock, Sparkle, Star } from '../ui/icons'

/*******************************************************************************
 * CorKey
 * funcao: as partes do visual que se escolhem por cor (as chaves de OPCOES).
 ******************************************************************************/
type CorKey = keyof typeof OPCOES

/*******************************************************************************
 * GRUPOS
 * funcao: a ordem e o titulo de cada grupo de cores na tela.
 ******************************************************************************/
const GRUPOS: { key: CorKey; titulo: string }[] = [
  { key: 'pele', titulo: 'tom de pele' },
  { key: 'cabelo', titulo: 'cor do cabelo' },
  { key: 'collant', titulo: 'collant' },
  { key: 'saia', titulo: 'saia' },
  { key: 'sapatilha', titulo: 'sapatilha' },
  { key: 'laco', titulo: 'laço e xuxinha' },
]

/*******************************************************************************
 * Camarim
 * funcao: mostra as opcoes do camarim e grava cada escolha no visual da
 * bailarina.
 * recebe: nada (le e muda o visual no store).
 * retorna: a tela do camarim.
 ******************************************************************************/
export function Camarim() {
  const look = useStore((s) => s.look)
  const setLook = useStore((s) => s.setLook)
  const stars = useStore((s) => s.stars)
  const total = Object.values(stars).reduce((a, b) => a + b, 0)
  const set = (p: Partial<Look>) => setLook(p)
  const provando = useStore((s) => s.provandoPonta)
  const provarPonta = useStore((s) => s.provarPonta)

  return (
    <div className="workspace camarim">
      <aside className="panel">
        <div className="name-card">
          <label htmlFor="nome">nome da bailarina</label>
          <input
            id="nome"
            value={look.nome}
            maxLength={16}
            onChange={(e) => set({ nome: e.target.value })}
            placeholder="dê um nome a ela"
          />
          <span className="name-stars">
            <Star size={15} /> {total} estrelas
          </span>
        </div>

        <section>
          <h3 className="sec-title">penteado</h3>
          <div className="pills">
            {PENTEADOS.map((p) => (
              <button key={p.id} className={`pill-opt ${look.penteado === p.id ? 'sel' : ''}`} onClick={() => set({ penteado: p.id })}>
                {p.nome}
              </button>
            ))}
          </div>
        </section>

        {GRUPOS.map((g) => (
          <section key={g.key}>
            <h3 className="sec-title">{g.titulo}</h3>
            <div className="swatches">
              {OPCOES[g.key].map((o) => {
                // cor especial: trancada enquanto a soma das estrelas nao chegar no que ela pede
                const locked = (o.estrelas ?? 0) > total
                return (
                  <button
                    key={o.cor}
                    className={`swatch ${look[g.key] === o.cor ? 'sel' : ''} ${locked ? 'locked' : ''}`}
                    style={{ ['--c' as string]: o.cor }}
                    title={locked ? `${o.nome}: libera com ${o.estrelas} estrelas` : o.nome}
                    disabled={locked}
                    onClick={() => set({ [g.key]: o.cor })}
                  >
                    {locked && <Lock size={14} />}
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        <section>
          {/* sem as 50 estrelas, "provar a ponta" deixa ver a ponta so aqui, sem salvar */}
          <h3 className="sec-title">tipo de sapatilha</h3>
          <div className="pills">
            <button className={`pill-opt ${!look.ponta && !provando ? 'sel' : ''}`} onClick={() => (set({ ponta: false }), provando && provarPonta(false))}>
              meia ponta
            </button>
            <button
              className={`pill-opt ${look.ponta ? 'sel' : ''} ${total < ESTRELAS_PONTA ? 'locked' : ''}`}
              disabled={total < ESTRELAS_PONTA}
              title={total < ESTRELAS_PONTA ? `libera com ${ESTRELAS_PONTA} estrelas (somando todos os modos)` : 'sapatilha de ponta'}
              onClick={() => (set({ ponta: true }), provarPonta(true))}
            >
              {total < ESTRELAS_PONTA ? <Lock size={13} /> : <Sparkle size={11} />} ponta
              {total < ESTRELAS_PONTA && <small> · {ESTRELAS_PONTA}★</small>}
            </button>
          </div>
          {total < ESTRELAS_PONTA && (
            <button className={`pill ghost provar ${provando ? 'sel' : ''}`} onClick={() => provarPonta(!provando)}>
              {provando ? '✓ provando a ponta (só aqui no camarim)' : '✿ provar a ponta'}
            </button>
          )}
          {(look.ponta || provando) && (
            <p className="muted unlock-note">Com a ponta, todo relevé, pirueta, piqué e fouetté sobe até a ponta dos pés!</p>
          )}
        </section>

        <section>
          <h3 className="sec-title">enfeite</h3>
          <div className="pills">
            {ENFEITES.map((e) => {
              const locked = (e.estrelas ?? 0) > total
              return (
                <button
                  key={e.id}
                  className={`pill-opt ${look.enfeite === e.id ? 'sel' : ''} ${locked ? 'locked' : ''}`}
                  disabled={locked}
                  onClick={() => set({ enfeite: e.id })}
                >
                  {locked ? <Lock size={13} /> : e.id !== 'nenhum' ? <Sparkle size={11} /> : null} {e.nome}
                  {locked && <small> · {e.estrelas}★</small>}
                </button>
              )
            })}
          </div>
          <p className="muted unlock-note">Ganhe estrelas (em qualquer modo) para liberar a tiara, a coroa de flores, a saia dourada e a sapatilha de ponta.</p>
        </section>
      </aside>

      <main className="stage">
        <div className="stage-frame mirror">
          <Scene />
        </div>
        <div className="mirror-name">
          <Sparkle size={14} /> {look.nome || 'sua bailarina'} <Sparkle size={14} />
        </div>
      </main>
    </div>
  )
}
