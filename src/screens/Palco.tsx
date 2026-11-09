/*******************************************************************************
 * Palco.tsx
 * funcao principal: modo palco: a coreografia do estudio apresentada num
 * teatro, com cortina, canhao de luz e aplausos. sequencia: cortina fechada com
 * o titulo, abre, danca com a musica, flores e aplausos, fecha, e a tela
 * "brava!" com as opcoes de repetir ou voltar.
 ******************************************************************************/
import { useEffect, useRef, useState } from 'react'
import { Scene } from '../components/Scene'
import { useStore } from '../store'
import { aplausos, unlockAudio } from '../audio'
import { Heart, Play, Restart } from '../ui/icons'

/*******************************************************************************
 * Fase
 * funcao: em que momento da apresentacao esta. cada fase decide se a cortina
 * esta aberta e o que aparece por cima.
 ******************************************************************************/
type Fase = 'titulo' | 'abrindo' | 'dancando' | 'fechando' | 'bravo'

/*******************************************************************************
 * Palco
 * funcao: controla a apresentacao inteira com temporizadores e desenha o teatro
 * por cima da cena 3D.
 * recebe: nada (le o nome da coreografia, o tempo e o visual do store).
 * retorna: a tela do palco.
 ******************************************************************************/
export function Palco() {
  const nome = useStore((s) => s.palcoNome)
  const beat = useStore((s) => s.beat)
  const total = useStore((s) => s.timeline.total)
  const playing = useStore((s) => s.playing)
  const look = useStore((s) => s.look)
  const [fase, setFase] = useState<Fase>('titulo')
  const [rodada, setRodada] = useState(0)
  const timers = useRef<number[]>([])
  // todos os temporizadores ficam guardados para poder cancelar ao sair ou recomecar
  const depois = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // comeca (e recomeca): titulo, cortina abrindo, e a musica/danca
  useEffect(() => {
    const st = useStore.getState()
    st.pause()
    st.restart()
    useStore.setState({ playing: false, beat: 0, palcoFlores: false })
    setFase('titulo')
    depois(2200, () => setFase('abrindo'))
    depois(3600, () => {
      setFase('dancando')
      useStore.getState().play()
    })
  }, [rodada]) // eslint-disable-line react-hooks/exhaustive-deps

  // terminou de dancar: fecha a cortina, aplausos e flores
  useEffect(() => {
    if (fase === 'dancando' && !playing && beat >= total - 1e-6) {
      // primeiro a plateia aplaude e joga flores no palco; depois a cortina fecha
      depois(500, () => {
        useStore.setState({ palcoFlores: true })
        if (useStore.getState().sound) aplausos(5)
      })
      depois(3900, () => setFase('fechando'))
      depois(5300, () => setFase('bravo'))
    }
  }, [fase, playing, beat, total]) // eslint-disable-line react-hooks/exhaustive-deps

  /*****************************************************************************
   * voltar
   * funcao: cancela a apresentacao e volta para o estudio.
   * recebe: nada. retorna: nada.
   ****************************************************************************/
  const voltar = () => {
    timers.current.forEach(clearTimeout)
    useStore.setState({ palcoFlores: false })
    useStore.getState().setMode('estudio')
  }
  const fechada = fase === 'titulo' || fase === 'fechando' || fase === 'bravo'

  return (
    <div className="palco">
      <div className="palco-cena">
        <Scene palco interactive={false} />
      </div>
      <div className="palco-luz" />
      <div className="palco-sanefa" />
      <div className={`cortina esq ${fechada ? 'fechada' : ''}`} />
      <div className={`cortina dir ${fechada ? 'fechada' : ''}`} />

      {fase === 'titulo' && (
        <div className="palco-titulo">
          <small>ballet.code apresenta</small>
          <h2>{nome}</h2>
          <small>
            com {look.nome || 'a nossa bailarina'} ♡ {total} tempos
          </small>
        </div>
      )}

      {fase === 'bravo' && (
        <div className="palco-bravo">
          <div className="flores" aria-hidden>
            {Array.from({ length: 26 }, (_, i) => (
              <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.22}s`, ['--r' as string]: `${(i * 53) % 360}deg` }}>
                {i % 3 === 0 ? '❀' : i % 3 === 1 ? '✿' : '♡'}
              </span>
            ))}
          </div>
          <h2>Brava!</h2>
          <p>{nome}</p>
          <div className="palco-acoes">
            <button
              className="pill pink"
              onClick={() => {
                unlockAudio()
                timers.current.forEach(clearTimeout)
                timers.current = []
                setRodada((r) => r + 1)
              }}
            >
              <Restart size={14} /> de novo
            </button>
            <button className="pill ghost claro" onClick={voltar}>
              <Heart size={13} /> voltar ao estúdio
            </button>
          </div>
        </div>
      )}

      {fase !== 'bravo' && (
        <button className="palco-sair" onClick={voltar} title="voltar ao estúdio">
          ✕
        </button>
      )}
      {/* se o navegador bloqueou o som e a danca nao comecou sozinha, aparece um play */}
      {fase === 'dancando' && !playing && beat < total && (
        <button className="palco-play" onClick={() => (unlockAudio(), useStore.getState().play())}>
          <Play size={22} />
        </button>
      )}
    </div>
  )
}
