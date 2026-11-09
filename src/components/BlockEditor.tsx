/*******************************************************************************
 * BlockEditor.tsx
 * funcao principal: o editor de blocos (Blockly) usado no estudio e em cada
 * fase. cria o espaco de trabalho, carrega e salva os blocos no navegador,
 * transforma os blocos em programa a cada mudanca, mostra os avisos nos blocos
 * e acende os blocos que estao dancando.
 ******************************************************************************/
import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import * as Pt from 'blockly/msg/pt-br'
import { defineBlocks, makeToolbox, makeToolboxCategorias, theme } from '../blocks/defs'
import { programToJson, workspaceToProgram } from '../blocks/convert'
import { evaluate, useStore } from '../store'
import { sfx } from '../audio'
import type { Program } from '../engine/program'

/*******************************************************************************
 * Props
 * funcao: o que o editor recebe. cada fase tem a sua storageKey, entao cada uma
 * guarda os proprios blocos.
 ******************************************************************************/
type Props = {
  storageKey: string // onde salvar o trabalho no navegador
  initial: Program // o que aparece quando nao ha nada salvo
  allowed?: string[] // blocos da gaveta (todos, se vazio)
  followPresets?: boolean // estudio: carregar modelos quando escolhidos
}

// o editor que esta na tela agora (so existe um por vez); ajustarEditor usa este
let atual: Blockly.WorkspaceSvg | null = null
// no celular os blocos ficam um pouco menores, para a gaveta nao tomar a tela toda
const CELULAR = '(max-width: 760px), (max-height: 500px) and (orientation: landscape)'
const celular = () => typeof window !== 'undefined' && window.matchMedia(CELULAR).matches
const gaveta = (allowed?: string[]) => (celular() ? makeToolboxCategorias(allowed) : makeToolbox(allowed))
const escalaBase = () => (celular() ? 0.64 : 0.72)

/*******************************************************************************
 * enquadrar
 * funcao: ajusta o zoom para todos os blocos caberem, sem deixar tudo miudinho
 * (a gaveta acompanha o zoom) e centraliza.
 * recebe: ws (WorkspaceSvg), o espaco de trabalho.
 * retorna: nada. se o editor estiver escondido, nao faz nada (enquadra quando
 * aparecer).
 ******************************************************************************/
function enquadrar(ws: Blockly.WorkspaceSvg) {
  const m = ws.getMetrics()
  if (m.viewHeight < 60) return // editor escondido: enquadra quando aparecer
  const e = escalaBase()
  ws.setScale(e)
  const box = ws.getBlocksBoundingBox()
  // k < 1 quando os blocos nao cabem: diminui, mas no maximo ate 76% da escala normal
  const k = Math.min(m.viewHeight / (box.bottom - box.top + 60), m.viewWidth / (box.right - box.left + 60))
  if (k < 1) ws.setScale(Math.max(e * 0.76, e * k))
  ws.scrollCenter()
}

/*******************************************************************************
 * ajustarEditor
 * funcao: refaz o tamanho do editor e enquadra os blocos. chamada quando a aba
 * "blocos" volta a aparecer ou o painel muda de tamanho.
 * recebe: nada. retorna: nada.
 ******************************************************************************/
export function ajustarEditor() {
  if (!atual) return
  Blockly.svgResize(atual)
  enquadrar(atual)
}

/*******************************************************************************
 * save
 * funcao: guarda os blocos do espaco de trabalho no localStorage.
 * recebe: key (string), a chave onde salvar, e ws (WorkspaceSvg).
 * retorna: nada. sem armazenamento disponivel, ignora.
 ******************************************************************************/
function save(key: string, ws: Blockly.WorkspaceSvg) {
  try {
    localStorage.setItem(key, JSON.stringify(Blockly.serialization.workspaces.save(ws)))
  } catch {
    /* sem armazenamento: tudo bem */
  }
}

/*******************************************************************************
 * loadSaved
 * funcao: le os blocos salvos.
 * recebe: key (string).
 * retorna: o JSON do Blockly, ou null se nao houver nada salvo ou se der erro.
 ******************************************************************************/
function loadSaved(key: string): object | null {
  try {
    const s = localStorage.getItem(key)
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

/*******************************************************************************
 * BlockEditor
 * funcao: componente do editor. o Blockly e criado uma vez por storageKey e
 * conversa com o store por inscricoes.
 * recebe: storageKey, initial, allowed e followPresets (ver Props).
 * retorna: a area do Blockly e os botoes de zoom, enquadrar e organizar.
 ******************************************************************************/
export function BlockEditor({ storageKey, initial, allowed, followPresets }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const wsRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const loading = useRef(false)

  useEffect(() => {
    Blockly.setLocale(Pt as unknown as { [key: string]: string })
    defineBlocks()
    const ws = Blockly.inject(host.current!, {
      renderer: 'zelos',
      theme,
      toolbox: gaveta(allowed),
      trashcan: false,
      sounds: false,
      grid: { spacing: 26, length: 2, colour: '#ffd3e2', snap: true },
      zoom: { controls: false, wheel: true, startScale: escalaBase(), maxScale: 1.4, minScale: 0.4, scaleSpeed: 1.15 },
      move: { scrollbars: true, drag: true, wheel: false },
    })
    wsRef.current = ws
    atual = ws

    /***************************************************************************
     * sync
     * funcao: transforma os blocos em programa, manda para o store e coloca os
     * avisos de erro e as dicas em cada bloco.
     * recebe: nada. retorna: nada.
     **************************************************************************/
    const sync = () => {
      const { program, errors } = workspaceToProgram(ws)
      useStore.getState().setProgram(program, errors)
      // avisos nos blocos: erros (do editor ou do validador de ballet) e dicas
      const { errors: errs, tips } = useStore.getState()
      for (const b of ws.getAllBlocks(false)) b.setWarningText(null)
      for (const e of [...errs, ...tips]) if (e.blockId) ws.getBlockById(e.blockId)?.setWarningText(e.msg)
    }

    /***************************************************************************
     * load
     * funcao: troca todos os blocos do editor pelos do json, enquadra,
     * sincroniza e salva.
     * recebe: json (object), blocos no formato do Blockly.
     * retorna: nada. pode lancar erro se o json estiver estragado (quem chama
     * trata).
     **************************************************************************/
    const load = (json: object) => {
      loading.current = true
      // sem eventos enquanto carrega: senao cada bloco carregado contaria como mudanca da jogadora
      Blockly.Events.disable()
      try {
        ws.clear()
        Blockly.serialization.workspaces.load(json, ws)
      } finally {
        Blockly.Events.enable()
        loading.current = false
      }
      ws.cleanUp()
      enquadrar(ws)
      sync()
      save(storageKey, ws)
    }

    // no estudio, se ela escolheu um modelo nesta sessao, ele tem prioridade sobre o que estava salvo
    const chosen = followPresets && useStore.getState().loadNonce > 0
    const saved = chosen ? programToJson(useStore.getState().program) : loadSaved(storageKey)
    // se o que estava salvo nao carregar (versao antiga, json quebrado), volta para o programa inicial
    try {
      load(saved ?? programToJson(initial))
    } catch {
      load(programToJson(initial))
    }

    // a cada mudanca espera 250 ms parada antes de sincronizar e salvar, para nao recompilar a cada pixel arrastado
    let t: number | undefined
    ws.addChangeListener((e) => {
      if (loading.current || e.isUiEvent) return
      // "toc" quando um bloco encaixa em outro (so quando e a pessoa arrastando, nao ao carregar)
      if (e.type === Blockly.Events.BLOCK_MOVE && (e as Blockly.Events.BlockMove).newParentId && useStore.getState().sound) sfx('encaixe')
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        sync()
        save(storageKey, ws)
      }, 250)
    })

    // loadNonce muda quando um modelo e escolhido (ou um programa vem do texto); resetNonce quando a fase e recomecada
    let lastNonce = useStore.getState().loadNonce
    let resetNonce = useStore.getState().resetNonce
    const unsubLoad = useStore.subscribe((s) => {
      if (followPresets && s.loadNonce !== lastNonce) {
        lastNonce = s.loadNonce
        load(programToJson(s.program))
      }
      if (s.resetNonce !== resetNonce) {
        resetNonce = s.resetNonce
        load(programToJson(initial))
      }
    })

    // destacar os blocos em execucao (so quando e o programa dela que esta tocando)
    let lastKey = ''
    const unsubHi = useStore.subscribe((s) => {
      const running = s.beat > 0 && s.beat < s.timeline.total && s.watching === 'meu' && s.mode !== 'glossario'
      const stack = running ? (s.timeline.moves[evaluate(s.timeline, s.beat).index]?.stack ?? []) : []
      const key = stack.join('|')
      if (key === lastKey) return
      lastKey = key
      ws.highlightBlock(null)
      for (const id of stack) if (ws.getBlockById(id)) ws.highlightBlock(id, true)
    })

    // atalhos para os testes automaticos (tools/)
    ;(window as unknown as { __ws?: Blockly.WorkspaceSvg }).__ws = ws
    ;(window as unknown as { __loadBlocks?: (p: Program) => void }).__loadBlocks = (p: Program) => load(programToJson(p))
    // quando o editor volta a aparecer (no celular, ao trocar de "bailarina" para "programa"), enquadra de novo
    let escondido = false
    const ro = new ResizeObserver(() => {
      Blockly.svgResize(ws)
      const h = host.current?.clientHeight ?? 0
      if (h < 60) escondido = true
      else if (escondido) {
        escondido = false
        enquadrar(ws)
      }
    })
    ro.observe(host.current!)

    return () => {
      ro.disconnect()
      unsubLoad()
      unsubHi()
      window.clearTimeout(t)
      ws.dispose()
      if (atual === ws) atual = null
      wsRef.current = null
    }
    // o editor e recriado quando a chave muda (cada fase tem o seu)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  const ws = () => wsRef.current
  return (
    <>
      <div ref={host} className="blockly-host" />
      <div className="editor-tools">
        <button title="aproximar" onClick={() => ws()?.zoomCenter(1)}>
          +
        </button>
        <button title="afastar" onClick={() => ws()?.zoomCenter(-1)}>
          −
        </button>
        <button title="mostrar todos os blocos" onClick={() => ws() && enquadrar(ws()!)}>
          ⤧
        </button>
        <button
          title="organizar os blocos"
          onClick={() => {
            ws()?.cleanUp()
            ws()?.scrollCenter()
          }}
        >
          ✿
        </button>
      </div>
    </>
  )
}
