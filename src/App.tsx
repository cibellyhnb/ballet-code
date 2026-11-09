/*******************************************************************************
 * App.tsx
 * funcao principal: monta a tela certa para o modo atual (inicio, palco,
 * camarim, mapa de uma trilha, ou a area de trabalho com painel e bailarina) e
 * a barra de cima. tambem liga a barra de espaco para dancar e pausar.
 ******************************************************************************/
import { useEffect } from 'react'
import { Stage } from './components/Stage'
import { Home } from './screens/Home'
import { StudioPanel } from './screens/StudioPanel'
import { GlossaryPanel } from './screens/GlossaryPanel'
import { AulaMap, FasePanel } from './screens/Aula'
import { Camarim } from './screens/Camarim'
import { Palco } from './screens/Palco'
import { useStore } from './store'
import { unlockAudio } from './audio'
import { isTrilha, TRILHAS } from './data/trilhas'
import { ConquistaToast } from './components/Conquistas'
import { Bandaid, Book, Bow, Bubble, Cap, Heart, Home as HomeIcon, Music, Note, NoteOff, Sparkle, Star } from './ui/icons'
import './App.css'

/*******************************************************************************
 * TopBar
 * funcao: barra do topo das telas internas: botao de voltar ao inicio, logo,
 * fita com o nome do modo e botao de ligar e desligar a musica.
 * recebe: nada (le o modo e o som do store).
 * retorna: o elemento header.
 ******************************************************************************/
function TopBar() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const sound = useStore((s) => s.sound)
  const setSound = useStore((s) => s.setSound)
  const title = isTrilha(mode) ? TRILHAS[mode].titulo : { estudio: 'Estúdio livre', glossario: 'Glossário', camarim: 'Camarim', palco: 'Palco', inicio: '' }[mode]
  const ICONE = { estudio: <Music size={18} />, aula: <Cap size={18} />, camarim: <Heart size={16} />, glossario: <Book size={18} />, desafios: <Star size={17} />, conserta: <Bandaid size={18} />, ditado: <Bubble size={18} />, allegro: <Sparkle size={17} />, palco: null, inicio: null }
  return (
    <header className="topbar">
      <button className="btn-round" title="menu inicial" onClick={() => setMode('inicio')}>
        <HomeIcon size={22} />
      </button>
      <div className="mini-logo">
        <Bow size={26} />
        <span className="mini-logo-txt">
          Ballet<span>.code</span>
        </span>
      </div>
      <div className="ribbon">
        {ICONE[mode]}
        {title}
      </div>
      <div className="topbar-right">
        <button
          className={`btn-round ${sound ? '' : 'off'}`}
          title={sound ? 'música ligada' : 'música desligada'}
          onClick={() => setSound(!sound)}
        >
          {sound ? <Note size={20} /> : <NoteOff size={20} />}
        </button>
      </div>
    </header>
  )
}

/*******************************************************************************
 * App
 * funcao: componente raiz. escolhe a tela pelo modo e, dentro de uma fase ou do
 * estudio, junta o painel, o palco 3D e o botao de alternar do celular.
 * recebe: nada.
 * retorna: a arvore da tela inteira.
 ******************************************************************************/
export default function App() {
  const mode = useStore((s) => s.mode)
  const faseId = useStore((s) => s.faseId)
  const grande = useStore((s) => s.editorGrande)
  const vista = useStore((s) => s.vistaMobile)
  const setVista = useStore((s) => s.setVistaMobile)

  useEffect(() => {
    /***************************************************************************
     * onKey
     * funcao: barra de espaco danca ou pausa, menos na tela inicial e quando o
     * foco esta num campo de texto.
     * recebe: e (KeyboardEvent).
     * retorna: nada.
     **************************************************************************/
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.code === 'Space' && tag !== 'INPUT' && useStore.getState().mode !== 'inicio') {
        e.preventDefault()
        unlockAudio()
        const s = useStore.getState()
        if (s.playing) s.pause()
        else s.play()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <ConquistaToast />
      {mode === 'inicio' ? (
        <Home />
      ) : mode === 'palco' ? (
        <Palco />
      ) : (
        <>
          <TopBar />
          {mode === 'camarim' ? (
            <Camarim />
          ) : isTrilha(mode) && !faseId ? (
            <AulaMap />
          ) : (
            <div className={`workspace ${isTrilha(mode) ? 'estudio' : mode} ${grande && mode === 'estudio' ? 'grande' : ''} ${mode === 'glossario' ? '' : `vm-${vista}`}`}>
              {/* painel a esquerda e bailarina a direita; as classes vm- decidem o que aparece no celular */}
              {mode === 'estudio' ? <StudioPanel /> : isTrilha(mode) ? <FasePanel /> : <GlossaryPanel />}
              <Stage />
              {/* so aparece no celular: alterna entre o painel e a bailarina */}
              {mode !== 'glossario' && (
                <nav className="vm-troca" aria-label="ver">
                  <button className={vista === 'painel' ? 'on' : ''} onClick={() => setVista('painel')}>
                    <Note size={16} /> programa
                  </button>
                  <button className={vista === 'palco' ? 'on' : ''} onClick={() => setVista('palco')}>
                    <Bow size={18} /> bailarina
                  </button>
                </nav>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
