/*******************************************************************************
 * StudioPanel.tsx
 * funcao principal: painel do estudio livre: botoes de coreografias, palco e
 * ampliar, os modelos para comecar, o editor em blocos ou em texto, os erros
 * antes de dancar e as variaveis enquanto ela danca.
 ******************************************************************************/
import { useEffect, useMemo, useRef, useState } from 'react'
import { PRESETS, toText } from '../engine/presets'
import { parseProgram, type ParseError } from '../engine/parse'
import { evaluate, useStore } from '../store'
import { BlockEditor, ajustarEditor } from '../components/BlockEditor'
import { Coreografias } from '../components/Coreografias'
import { unlockAudio } from '../audio'

/*******************************************************************************
 * CodeEditor
 * funcao: editor do programa em texto, com numeros de linha, Tab para recuo e
 * Ctrl+Enter para aplicar. so troca os blocos quando o texto nao tem erro.
 * recebe: nada (le e muda o programa no store).
 * retorna: a caixa de texto com os botoes e a lista de erros.
 ******************************************************************************/
function CodeEditor() {
  const program = useStore((s) => s.program)
  const loadProgram = useStore((s) => s.loadProgram)
  const [texto, setTexto] = useState(() => toText(program))
  const [erros, setErros] = useState<ParseError[]>([])
  const [ok, setOk] = useState(false)
  const nums = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  // se os blocos mudarem por fora (modelo escolhido), o texto acompanha
  const loadNonce = useStore((s) => s.loadNonce)
  useEffect(() => {
    setTexto(toText(useStore.getState().program))
    setErros([])
  }, [loadNonce])

  /*****************************************************************************
   * aplicar
   * funcao: le o texto, marca as linhas com erro e, se estiver tudo certo,
   * carrega o programa nos blocos e mostra "blocos atualizados" por 1,6
   * segundo.
   * recebe: nada. retorna: nada.
   ****************************************************************************/
  const aplicar = () => {
    const r = parseProgram(texto)
    setErros(r.errors)
    if (r.errors.length === 0) {
      loadProgram(r.program)
      setOk(true)
      window.setTimeout(() => setOk(false), 1600)
    }
  }
  const linhas = texto.split('\n').length
  const ruins = new Set(erros.map((e) => e.linha))

  return (
    <div className="code-editor">
      <div className="code-box">
        <div className="code-nums" ref={nums}>
          {Array.from({ length: linhas }, (_, i) => (
            <span key={i} className={ruins.has(i + 1) ? 'bad' : ''}>
              {i + 1}
            </span>
          ))}
        </div>
        <textarea
          ref={area}
          value={texto}
          spellCheck={false}
          onChange={(e) => setTexto(e.target.value)}
          onScroll={(e) => nums.current && (nums.current.scrollTop = e.currentTarget.scrollTop)}
          onKeyDown={(e) => {
            // Tab vira 4 espacos em vez de pular para o proximo campo
            if (e.key === 'Tab') {
              e.preventDefault()
              const t = e.currentTarget
              const a = t.selectionStart
              setTexto(texto.slice(0, a) + '    ' + texto.slice(t.selectionEnd))
              requestAnimationFrame(() => (t.selectionStart = t.selectionEnd = a + 4))
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              aplicar()
            }
          }}
        />
      </div>
      <div className="code-actions">
        <button className="pill pink" onClick={aplicar}>
          {ok ? '✓ blocos atualizados' : 'aplicar nos blocos'}
        </button>
        <span className="muted">Ctrl+Enter também aplica · Tab = recuo</span>
      </div>
      {erros.length > 0 && (
        <div className="oops">
          <b>Ops! No código:</b>
          <ul>
            {erros.slice(0, 4).map((e, i) => (
              <li key={i}>
                linha {e.linha}: {e.msg}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/*******************************************************************************
 * StudioPanel
 * funcao: monta o painel do estudio e alterna entre a aba de blocos e a de
 * texto.
 * recebe: nada.
 * retorna: o painel lateral.
 ******************************************************************************/
export function StudioPanel() {
  const presetId = useStore((s) => s.presetId)
  const setPreset = useStore((s) => s.setPreset)
  const loadProgram = useStore((s) => s.loadProgram)
  const program = useStore((s) => s.program)
  const errors = useStore((s) => s.errors)
  const beat = useStore((s) => s.beat)
  const timeline = useStore((s) => s.timeline)
  const grande = useStore((s) => s.editorGrande)
  const setGrande = useStore((s) => s.setEditorGrande)
  const preset = PRESETS.find((p) => p.id === presetId)
  const [view, setView] = useState<'blocos' | 'codigo'>('blocos')
  const [coreos, setCoreos] = useState(false)
  const apresentar = useStore((s) => s.apresentar)
  const resumo = useMemo(() => `${timeline.total} tempos`, [timeline])

  // as variaveis so aparecem enquanto ela danca: vem do movimento que esta tocando agora
  const running = beat > 0 && beat < timeline.total
  const move = running ? timeline.moves[evaluate(timeline, beat).index] : undefined
  const vars = move?.vars ?? []
  void program

  return (
    <aside className="panel studio">
      <div className="studio-acoes">
        <button className="pill pink" onClick={() => setCoreos(true)} title="salvar, abrir e compartilhar coreografias">
          ♡ minhas coreografias
        </button>
        <button
          className="pill lilac"
          disabled={errors.length > 0}
          title={errors.length ? 'conserte os blocos marcados antes de apresentar' : 'apresentar a coreografia num palco de teatro'}
          onClick={() => (unlockAudio(), apresentar())}
        >
          ✿ apresentar no palco
        </button>
        <span className="espaco" />
        <button
          className="pill ghost"
          onClick={() => {
            setGrande(!grande)
            window.setTimeout(ajustarEditor, 60)
          }}
          title="mais espaço para o programa"
        >
          {grande ? '⤡ diminuir' : '⤢ ampliar'}
        </button>
      </div>
      <section>
        <h3 className="sec-title">comece por um modelo ou do zero</h3>
        <div className="levels">
          <button
            className={`level blank ${presetId === '' ? 'sel' : ''}`}
            title="começar com o editor vazio"
            onClick={() => loadProgram({ funcoes: [], principal: [] })}
          >
            <span className="level-n">+</span>
            <span className="level-name">Em branco</span>
            <span className="level-tag">do zero</span>
          </button>
          {PRESETS.map((p, i) => (
            <button
              key={p.id}
              className={`level ${p.id === presetId ? 'sel' : ''}`}
              title={p.ensina}
              onClick={() => setPreset(p.id)}
            >
              <span className="level-n">{i + 1}</span>
              <span className="level-name">{p.nome}</span>
              <span className="level-tag">{p.conceito}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="notebook editor">
        <div className="notebook-tabs">
          <button
            className={view === 'blocos' ? 'sel' : ''}
            onClick={() => {
              setView('blocos')
              window.setTimeout(ajustarEditor, 30)
            }}
          >
            blocos
          </button>
          <button className={view === 'codigo' ? 'sel' : ''} onClick={() => setView('codigo')}>
            código
          </button>
        </div>
        <div className="notebook-tools">
          <span className="tempos-chip">{resumo}</span>
        </div>
        <p className="tip">
          {view === 'blocos' ? (
            <>
              Arraste blocos da gaveta para baixo do <b>quando ▶ for clicado</b>; para apagar, devolva à gaveta.
              {preset && <> Modelo: <b>{preset.conceito}</b>.</>}
            </>
          ) : (
            <>
              Escreva o programa em texto. Use recuo (espaços) para o que fica dentro de <b>repetir</b>, <b>para cada</b> e{' '}
              <b>função</b>.
            </>
          )}
        </p>
        {/* o editor de blocos so fica escondido (nao desmonta) na aba de texto, para nao perder o estado */}
        <div className="editor-area" style={{ display: view === 'blocos' ? 'block' : 'none' }}>
          <BlockEditor storageKey="balletcode.workspace.v1" initial={PRESETS[0].programa} followPresets />
        </div>
        {view === 'codigo' && <CodeEditor />}
        {view === 'blocos' && errors.length > 0 && (
          <div className="oops">
            <b>Ops! Antes de dançar:</b>
            <ul>
              {errors.slice(0, 3).map((e, i) => (
                <li key={i}>{e.msg}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="vars">
        <div className="vars-box">
          <span className="vars-title">variáveis</span>
          {vars.length === 0 ? (
            <span className="muted">aparecem aqui enquanto ela dança ♡</span>
          ) : (
            vars.map(([k, v]) => (
              <span key={k} className="chip">
                {k} <b>{v}</b>
              </span>
            ))
          )}
        </div>
      </section>
      {coreos && <Coreografias onClose={() => setCoreos(false)} />}
    </aside>
  )
}

