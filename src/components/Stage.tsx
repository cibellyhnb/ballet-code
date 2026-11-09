/*******************************************************************************
 * Stage.tsx
 * funcao principal: o palco da area de trabalho: a cena 3D com a contagem dos
 * tempos por cima, os botoes de camera e o tocador (recomecar, dancar ou
 * pausar, musica e andamento).
 ******************************************************************************/
import { isTrilha } from '../data/trilhas'
import { Scene } from './Scene'
import { evaluate, musicaDe, useStore, type CamView } from '../store'
import { ESTILOS, type Estilo } from '../audio'
import { unlockAudio } from '../audio'
import { Camera, Pause, Play, Restart } from '../ui/icons'

/*******************************************************************************
 * Count
 * funcao: mostra o nome do passo atual, as 8 perolas da contagem (o tempo atual
 * aceso) e a musica com a frase em que esta.
 * recebe: nada (le o tempo e a linha do tempo do store).
 * retorna: o bloco da contagem.
 ******************************************************************************/
function Count() {
  const beat = useStore((s) => s.beat)
  const timeline = useStore((s) => s.timeline)
  const loop = useStore((s) => s.loop)
  const watching = useStore((s) => s.watching)
  const mode = useStore((s) => s.mode)
  const { index } = evaluate(timeline, beat)
  const b = Math.min(Math.floor(beat), timeline.total - 1)
  // a contagem de ballet vai de 1 a 8: frase e cada grupo de 8 tempos
  const inBar = ((b % 8) + 8) % 8
  const phrases = Math.max(1, Math.ceil(timeline.total / 8))
  const phrase = Math.min(Math.floor(b / 8) + 1, phrases)
  const running = beat > 0 && beat < timeline.total
  const label =
    beat >= timeline.total ? 'fim ♡ révérence' : beat === 0 && !loop ? 'pronta? 5, 6, 7, 8…' : timeline.moves[index]?.label
  return (
    <div className="count">
      {watching === 'exemplo' && isTrilha(mode) && <div className="count-tag">exemplo da professora</div>}
      <div className="step-label">{label}</div>
      <div className="pearls">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className={`pearl ${i === inBar && running ? 'on' : ''} ${i < inBar && running ? 'past' : ''}`}>
            {i + 1}
          </span>
        ))}
      </div>
      <div className="phrase">
        {(() => {
          const m = musicaDe(timeline)
          return m === 'arquivo' ? '♪ sua música' : m === 'nenhuma' ? 'sem música' : `♪ ${ESTILOS[m].nome} · ${ESTILOS[m].compasso}`
        })()}
        {!loop && ` · frase ${phrase} de ${phrases}`}
      </div>
    </div>
  )
}

/*******************************************************************************
 * CAM_LABEL
 * funcao: os botoes de camera, na ordem em que aparecem, com o texto de cada
 * um.
 ******************************************************************************/
const CAM_LABEL: [CamView, string][] = [
  ['tres-quartos', '3/4'],
  ['frente', 'frente'],
  ['lado', 'lado'],
  ['perto', 'perto'],
  ['pes', 'pés'],
  ['cima', 'cima'],
]

/*******************************************************************************
 * Player
 * funcao: tocador embaixo do palco. no estudio, os botoes ficam desligados
 * enquanto houver bloco com erro.
 * recebe: nada.
 * retorna: a barra do tocador.
 ******************************************************************************/
function Player() {
  const { bpm, setBpm, playing, play, pause, restart, errors, mode } = useStore()
  const blocked = mode === 'estudio' && errors.length > 0
  return (
    <div className="player">
      <button className="btn-round ghost" title="do início" disabled={blocked} onClick={() => (unlockAudio(), restart())}>
        <Restart size={20} />
      </button>
      <button
        className="btn-play"
        disabled={blocked}
        title={blocked ? 'conserte os blocos marcados antes de dançar' : 'dançar / pausar (espaço)'}
        onClick={() => {
          unlockAudio()
          if (playing) pause()
          else play()
        }}
      >
        {playing ? <Pause size={26} /> : <Play size={28} />}
      </button>
      <MusicPick />
      <label className="tempo">
        <span>
          andamento <b>{bpm}</b>
        </span>
        <input type="range" min={50} max={130} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
      </label>
    </div>
  )
}

/*******************************************************************************
 * MusicPick
 * funcao: escolha da musica: automatica pelo passo, um estilo fixo, um arquivo
 * da jogadora ou sem musica.
 * recebe: nada.
 * retorna: o seletor e o campo de arquivo escondido.
 ******************************************************************************/
function MusicPick() {
  const escolha = useStore((s) => s.musicaEscolha)
  const setMusica = useStore((s) => s.setMusica)
  const setArquivo = useStore((s) => s.setArquivo)
  const nome = useStore((s) => s.arquivoNome)
  const timeline = useStore((s) => s.timeline)
  return (
    <label className="music-pick">
      <span>música</span>
      <select
        value={escolha}
        onChange={(e) => {
          const v = e.target.value
          // "escolher arquivo" nao e uma musica: so abre o seletor de arquivo do navegador
          if (v === 'escolher') document.getElementById('music-file')?.click()
          else setMusica(v as typeof escolha)
        }}
      >
        <option value="auto">automática ({ESTILOS[timeline.musica].nome})</option>
        {(Object.keys(ESTILOS) as Estilo[]).map((k) => (
          <option key={k} value={k}>
            {ESTILOS[k].nome} · {ESTILOS[k].compasso}
          </option>
        ))}
        {nome && <option value="arquivo">♪ {nome.slice(0, 22)}</option>}
        <option value="escolher">escolher arquivo…</option>
        <option value="nenhuma">sem música</option>
      </select>
      <input
        id="music-file"
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setArquivo(f)
          e.target.value = ''
        }}
      />
    </label>
  )
}

/*******************************************************************************
 * Stage
 * funcao: junta cena, contagem, cameras e tocador dentro da moldura do palco.
 * recebe: nada.
 * retorna: o elemento main do palco.
 ******************************************************************************/
export function Stage() {
  const cam = useStore((s) => s.cam)
  const setCam = useStore((s) => s.setCam)
  return (
    <main className="stage">
      <div className="stage-frame">
        <Scene />
        <Count />
        <div className="cams">
          <Camera size={18} />
          {CAM_LABEL.map(([c, l]) => (
            <button key={c} className={c === cam ? 'sel' : ''} onClick={() => setCam(c)}>
              {l}
            </button>
          ))}
        </div>
        <Player />
      </div>
    </main>
  )
}
