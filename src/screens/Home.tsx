/*******************************************************************************
 * Home.tsx
 * funcao principal: tela inicial: logo, botoes dos modos principais (aula,
 * estudio, glossario), cartoes dos outros jogos com as estrelas ganhas e a
 * bailarina fazendo o aquecimento numa janela em arco. abre o "como jogar" na
 * primeira visita.
 ******************************************************************************/
import { useState, type ReactNode } from 'react'
import { Scene } from '../components/Scene'
import { useStore } from '../store'
import { Bandaid, Book, Bow, Bubble, Cap, Heart, Music, Sparkle, Star } from '../ui/icons'
import { unlockAudio } from '../audio'
import { TRILHAS, type Trilha } from '../data/trilhas'
import { ConquistasModal } from '../components/Conquistas'
import { BoasVindas, jaViuBoasVindas } from '../components/BoasVindas'

/*******************************************************************************
 * JOGOS
 * funcao: os cartoes de "mais jogos" da tela inicial: a trilha que cada um
 * abre, o nome, a frase curta e o icone.
 ******************************************************************************/
const JOGOS: { modo: Trilha; nome: string; texto: string; icon: ReactNode }[] = [
  { modo: 'desafios', nome: 'Desafios', texto: 'poucos blocos', icon: <Star size={22} /> },
  { modo: 'conserta', nome: 'Conserta', texto: 'ache o erro', icon: <Bandaid size={22} /> },
  { modo: 'ditado', nome: 'Professora dita', texto: 'ouça e monte', icon: <Bubble size={22} /> },
  { modo: 'allegro', nome: 'Grand allegro', texto: 'saltos e viagens', icon: <Sparkle size={22} /> },
]

/*******************************************************************************
 * Home
 * funcao: monta a tela inicial e guarda se as janelas de conquistas e de "como
 * jogar" estao abertas.
 * recebe: nada (le o nome da bailarina, as estrelas e o aquecimento do store).
 * retorna: a tela inicial.
 ******************************************************************************/
export function Home() {
  const setMode = useStore((s) => s.setMode)
  const nome = useStore((s) => s.look.nome)
  const stars = useStore((s) => s.stars)
  const [conq, setConq] = useState(false)
  const [ajuda, setAjuda] = useState(() => !jaViuBoasVindas())
  // o texto embaixo da janela mostra em que parte do aquecimento ela esta agora
  const etapa = useStore((s) => {
    const t = s.timeline
    let i = 0
    while (i < t.moves.length - 1 && t.starts[i + 1] <= s.beat) i++
    return t.moves[i]?.label ?? ''
  })
  return (
    <div className="home">
      <div className="sparkles" aria-hidden>
        {Array.from({ length: 14 }, (_, i) => (
          <Sparkle
            key={i}
            size={10 + ((i * 7) % 14)}
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 7) * 0.45}s` }}
          />
        ))}
      </div>

      <div className="title-card">
        <div className="logo-big">
          <Bow className="logo-bow" size={58} />
          <h1>
            Ballet<span>.code</span>
          </h1>
          <p className="tagline">
            <i />
            programe sua coreografia
            <i />
          </p>
        </div>

        {/* unlockAudio vem antes de trocar de tela: o navegador so libera o som depois de um clique */}
        <div className="menu">
          <button
            className="home-btn butter"
            onClick={() => {
              unlockAudio()
              setMode('aula')
            }}
          >
            <span className="home-ico">
              <Cap size={22} />
            </span>
            <span className="home-txt">
              <b>Aula</b>
              <small>fases da barra e do centro, com estrelas</small>
            </span>
            <span className="home-arrow">›</span>
          </button>
          <button
            className="home-btn pink"
            onClick={() => {
              unlockAudio()
              setMode('estudio')
            }}
          >
            <span className="home-ico">
              <Music size={22} />
            </span>
            <span className="home-txt">
              <b>Estúdio livre</b>
              <small>monte combinações com blocos</small>
            </span>
            <span className="home-arrow">›</span>
          </button>
          <button
            className="home-btn lilac"
            onClick={() => {
              unlockAudio()
              setMode('glossario')
            }}
          >
            <span className="home-ico">
              <Book size={22} />
            </span>
            <span className="home-txt">
              <b>Glossário</b>
              <small>cada passo, com a bailarina mostrando</small>
            </span>
            <span className="home-arrow">›</span>
          </button>
        </div>

        <div className="soon-title">
          <Sparkle size={13} /> mais jogos
        </div>
        <div className="soon-grid">
          {JOGOS.map((m) => {
            const lista = TRILHAS[m.modo].lista
            // estrelas ganhas nesta trilha, de um total de 3 por fase
            const ganhas = lista.reduce((n, f) => n + (stars[f.id] ?? 0), 0)
            return (
              <button key={m.modo} className="soon-card play" onClick={() => (unlockAudio(), setMode(m.modo))}>
                {m.icon}
                <b>{m.nome}</b>
                <small>
                  {m.texto} · <Star size={10} /> {ganhas}/{lista.length * 3}
                </small>
              </button>
            )
          })}
        </div>
      </div>

      <div className="showcase">
        <div className="showcase-frame">
          <Scene interactive={false} />
        </div>
        <div className="showcase-caption">
          <Sparkle size={12} /> {nome || 'sua bailarina'} está aquecendo <Sparkle size={12} />
        </div>
        <div className="showcase-step">{etapa}
        </div>
        <div className="showcase-btn">
          <button className="pill ghost" onClick={() => setMode('camarim')}>
            <Heart size={14} /> camarim
          </button>
          <button className="pill ghost" onClick={() => setConq(true)}>
            <Star size={13} /> conquistas
          </button>
          <button className="pill ghost" onClick={() => setAjuda(true)}>
            ? como jogar
          </button>
        </div>
      </div>
      {conq && <ConquistasModal onClose={() => setConq(false)} />}
      {ajuda && <BoasVindas onClose={() => setAjuda(false)} />}
    </div>
  )
}
