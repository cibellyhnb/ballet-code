/*******************************************************************************
 * store.ts
 * funcao principal: o estado do jogo inteiro (Zustand): modo e tela atual,
 * programa e linha do tempo, tempo da musica, estrelas, visual da bailarina,
 * camera, musica escolhida e o que esta tocando. tambem calcula o corpo da
 * bailarina num tempo qualquer (evaluate) e expoe atalhos para os testes.
 ******************************************************************************/
import { create } from 'zustand'
import { compile, type Program, type Timeline } from './engine/program'
import type { BlockError } from './blocks/convert'
import type { Diag } from './engine/program'
import { PRESETS } from './engine/presets'
import { GLOSSARIO, demoProgram } from './data/glossario'
import { lerpState, type BodyState, type Weight } from './engine/state'
import { autoHead } from './engine/head'
import { warmupTimeline } from './engine/warmup'
import { ESTILOS, setFileAudio, type Estilo } from './audio'
import { DEFAULT_LOOK, type Look } from './engine/look'
import { acharFase, isTrilha, type Trilha } from './data/trilhas'
import { contarSalvas } from './data/conquistas'

/*******************************************************************************
 * CamView
 * funcao: as cameras do palco. vitrine e a da tela inicial e plateia a do modo
 * palco; as outras aparecem nos botoes.
 ******************************************************************************/
export type CamView = 'tres-quartos' | 'frente' | 'lado' | 'perto' | 'pes' | 'cima' | 'vitrine' | 'plateia'

/*******************************************************************************
 * Mode
 * funcao: as telas do jogo. as trilhas com fases tambem sao modos.
 ******************************************************************************/
export type Mode = 'inicio' | 'estudio' | 'glossario' | 'camarim' | 'palco' | Trilha

/*******************************************************************************
 * S
 * funcao: tudo o que o store guarda e todas as acoes que mudam o estado.
 ******************************************************************************/
type S = {
  mode: Mode
  setMode: (m: Mode) => void
  termId: string
  setTerm: (id: string) => void
  loop: boolean
  program: Program // programa atual do estudio (vem dos blocos)
  errors: BlockError[]
  tips: Diag[]
  loadNonce: number // muda quando um modelo deve ser carregado no editor
  resetNonce: number // muda para recomecar o editor do zero
  watching: 'meu' | 'exemplo' // o que esta tocando no palco
  faseId: string | null
  stars: Record<string, number>
  salvas: number // coreografias salvas no estudio (para as conquistas)
  setSalvas: (n: number) => void
  openFase: (id: string | null) => void
  preview: (p: Program) => void
  setStars: (id: string, n: number) => void
  resetEditor: () => void
  musicaEscolha: 'auto' | Estilo | 'arquivo' | 'nenhuma'
  arquivoNome: string | null
  setMusica: (m: S['musicaEscolha']) => void
  setArquivo: (f: File | null) => void
  loadProgram: (p: Program) => void // carrega um programa no editor de blocos (codigo → blocos, em branco)
  editorGrande: boolean
  setEditorGrande: (v: boolean) => void
  // no celular, painel e bailarina nao cabem lado a lado: um botao alterna entre os dois
  vistaMobile: 'painel' | 'palco'
  setVistaMobile: (v: 'painel' | 'palco') => void
  look: Look
  setLook: (p: Partial<Look>) => void
  setProgram: (p: Program, errors: BlockError[]) => void
  presetId: string
  timeline: Timeline
  bpm: number
  beat: number
  playing: boolean
  sound: boolean
  cam: CamView
  camNonce: number
  setPreset: (id: string) => void
  setBpm: (b: number) => void
  play: () => void
  pause: () => void
  restart: () => void
  advance: (dt: number) => void
  setSound: (v: boolean) => void
  setCam: (c: CamView) => void
  palcoNome: string // nome da coreografia apresentada no palco
  palcoFlores: boolean // fim da apresentacao: flores caindo no palco
  provandoPonta: boolean // no camarim: experimentando a sapatilha de ponta antes de liberar
  provarPonta: (on: boolean) => void
  apresentar: (nome?: string) => void
}

/*******************************************************************************
 * moveAt
 * funcao: acha o movimento que esta tocando num tempo.
 * recebe: t (Timeline) e beat (number, em tempos).
 * retorna: o Move daquele tempo.
 ******************************************************************************/
export function moveAt(t: Timeline, beat: number) {
  let i = 0
  while (i < t.moves.length - 1 && t.starts[i + 1] <= beat) i++
  return t.moves[i]
}

/*******************************************************************************
 * musicaDe
 * funcao: diz qual musica toca: a escolhida pela jogadora ou, no automatico, a
 * da combinacao. a musica e uma so para a combinacao inteira, entao o andamento
 * e constante.
 * recebe: t (Timeline).
 * retorna: um Estilo, 'arquivo' ou 'nenhuma'.
 ******************************************************************************/
export function musicaDe(t: Timeline): Estilo | 'arquivo' | 'nenhuma' {
  const c = useStore.getState().musicaEscolha
  return c === 'auto' ? t.musica : c
}

/*******************************************************************************
 * speedAt
 * funcao: multiplicador de velocidade do estilo de musica (ex: valsa mais
 * rapida, adagio mais lento).
 * recebe: t (Timeline) e _beat (nao usado: a velocidade e a mesma na combinacao
 * toda).
 * retorna: o multiplicador. musica de arquivo usa 1; sem musica usa o estilo da
 * combinacao.
 ******************************************************************************/
export function speedAt(t: Timeline, _beat: number) {
  const m = musicaDe(t)
  return m === 'arquivo' ? 1 : ESTILOS[m === 'nenhuma' ? t.musica : m].speed
}

// chaves do localStorage: o visual da bailarina e as estrelas de todas as fases
const LOOK_KEY = 'balletcode.look.v1'

/*******************************************************************************
 * loadLook
 * funcao: le o visual salvo, completando com o padrao o que faltar (visuais
 * salvos antes de um item novo existir).
 * recebe: nada.
 * retorna: o Look. se der erro, devolve o visual padrao.
 ******************************************************************************/
function loadLook(): Look {
  try {
    return { ...DEFAULT_LOOK, ...JSON.parse(localStorage.getItem(LOOK_KEY) ?? '{}') }
  } catch {
    return DEFAULT_LOOK
  }
}

const STARS_KEY = 'balletcode.aula.v1'

/*******************************************************************************
 * loadStars
 * funcao: le as estrelas salvas de todas as fases.
 * recebe: nada.
 * retorna: um objeto id da fase para estrelas. se der erro, devolve vazio.
 ******************************************************************************/
function loadStars(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STARS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/*******************************************************************************
 * safeCompile
 * funcao: compila um programa sem deixar a tela quebrar.
 * recebe: p (Program).
 * retorna: a Timeline. nunca lanca erro: se o compilador falhar, devolve 8
 * tempos de pausa.
 ******************************************************************************/
export function safeCompile(p: Program): Timeline {
  try {
    return compile(p)
  } catch {
    return compile({ funcoes: [], principal: [{ t: 'pausa', tempos: 8 }] })
  }
}

/*******************************************************************************
 * demoPonta
 * funcao: combinacao do camarim para ver a sapatilha em acao: releves em 1a, 2a
 * e 5a e uma pirueta.
 * recebe: nada.
 * retorna: a Timeline compilada.
 ******************************************************************************/
const demoPonta = () =>
  compile({
    funcoes: [],
    principal: [
      { t: 'preparacao', perna: 'R' },
      { t: 'releve', pos: '1' },
      { t: 'releve', pos: '2' },
      { t: 'pes', pos: '5' },
      { t: 'releve', pos: '5' },
      { t: 'pirueta', perna: 'R' },
      { t: 'finalizar', perna: 'R' },
    ],
  })

// linha do tempo da demonstracao de um termo do glossario
const termTl = (id: string) => compile(demoProgram(GLOSSARIO.find((t) => t.id === id)!))

/*******************************************************************************
 * useStore
 * funcao: o store em si, com o estado inicial e as acoes. o jogo abre na tela
 * inicial com o aquecimento tocando em loop.
 ******************************************************************************/
export const useStore = create<S>((set, get) => ({
  mode: 'inicio',

  /*****************************************************************************
   * setMode
   * funcao: troca de tela e prepara o que cada uma toca: camarim e glossario em
   * loop, estudio e palco com o programa atual, trilha no mapa, inicio com o
   * aquecimento.
   * recebe: mode (Mode).
   * retorna: nada. sempre sai do "provar a ponta" e volta o celular para o
   * painel.
   ****************************************************************************/
  setMode: (mode) => {
    if (get().provandoPonta) set({ provandoPonta: false })
    set({ vistaMobile: 'painel' })
    const cam: CamView = mode === 'inicio' ? 'vitrine' : 'tres-quartos'
    const camNonce = get().camNonce + 1
    if (mode === 'camarim') {
      set({ mode, timeline: termTl('port-de-bras'), beat: 0, playing: true, loop: true, cam: 'vitrine', camNonce, watching: 'meu' })
    } else if (isTrilha(mode)) {
      set({ mode, faseId: null, playing: false, loop: false, cam, camNonce, watching: 'meu', errors: [], tips: [] })
    } else if (mode === 'glossario') {
      const id = get().termId
      set({ mode, timeline: termTl(id), beat: 0, playing: true, loop: true, cam, camNonce })
    } else if (mode === 'palco') {
      set({ mode, timeline: safeCompile(get().program), beat: 0, playing: false, loop: false, cam: 'plateia', camNonce, watching: 'meu' })
    } else if (mode === 'estudio') {
      set({ mode, timeline: safeCompile(get().program), beat: 0, playing: false, loop: false, cam, camNonce, watching: 'meu' })
    } else set({ mode, timeline: warmupTimeline(), beat: 0, playing: true, loop: true, cam, camNonce })
  },
  palcoNome: '',
  palcoFlores: false,
  provandoPonta: false,
  provarPonta: (on) => set({ provandoPonta: on, timeline: on ? demoPonta() : termTl('port-de-bras'), beat: 0, playing: true, loop: true }),

  /*****************************************************************************
   * apresentar
   * funcao: vai para o modo palco com o programa atual.
   * recebe: nome (string opcional), o titulo da apresentacao (vazio usa um
   * titulo padrao).
   * retorna: nada.
   ****************************************************************************/
  apresentar: (nome) => {
    set({ palcoNome: nome?.trim() || 'Minha coreografia' })
    get().setMode('palco')
  },
  termId: GLOSSARIO[0].id,
  setTerm: (id) => set({ termId: id, timeline: termTl(id), beat: 0, playing: true, loop: true }),
  loop: true,
  program: PRESETS[0].programa,
  errors: [],
  tips: [],
  loadNonce: 0,
  resetNonce: 0,
  watching: 'meu',
  faseId: null,
  stars: loadStars(),
  salvas: contarSalvas(),
  setSalvas: (salvas) => set({ salvas }),

  /*****************************************************************************
   * openFase
   * funcao: abre uma fase (ou volta para o mapa com null). zera o que estava
   * tocando e deixa 8 tempos de pausa ate o editor mandar o programa.
   * recebe: faseId (string ou null).
   * retorna: nada.
   ****************************************************************************/
  openFase: (faseId) => {
    set({ vistaMobile: 'painel' })
    set((s) => ({
      faseId,
      timeline: safeCompile({ funcoes: [], principal: [{ t: 'pausa', tempos: 8 }] }),
      beat: 0,
      playing: false,
      loop: false,
      watching: 'meu',
      errors: [],
      tips: [],
      cam: 'tres-quartos',
      camNonce: s.camNonce + 1,
    }))
  },
  preview: (p) => set({ timeline: safeCompile(p), beat: 0, playing: true, loop: false, watching: 'exemplo' }),

  /*****************************************************************************
   * setStars
   * funcao: grava as estrelas de uma fase, sem nunca diminuir a melhor marca.
   * recebe: id (da fase) e n (estrelas desta tentativa).
   * retorna: nada. se o localStorage falhar, guarda so na memoria.
   ****************************************************************************/
  setStars: (id, n) => {
    const stars = { ...get().stars, [id]: Math.max(n, get().stars[id] ?? 0) }
    try {
      localStorage.setItem(STARS_KEY, JSON.stringify(stars))
    } catch {
      /* ok */
    }
    set({ stars })
  },
  resetEditor: () => set((s) => ({ resetNonce: s.resetNonce + 1 })),

  /*****************************************************************************
   * loadProgram
   * funcao: carrega um programa vindo de fora dos blocos (texto, coreografia
   * salva, em branco). loadNonce avisa o editor para redesenhar os blocos.
   * recebe: program (Program).
   * retorna: nada.
   ****************************************************************************/
  loadProgram: (program) => {
    const timeline = safeCompile(program)
    set((s) => ({
      presetId: '',
      program,
      errors: timeline.diags.filter((d) => d.level === 'erro'),
      tips: timeline.diags.filter((d) => d.level === 'dica'),
      timeline,
      beat: 0,
      playing: false,
      loadNonce: s.loadNonce + 1,
    }))
  },
  editorGrande: false,
  setEditorGrande: (editorGrande) => set({ editorGrande }),
  vistaMobile: 'painel',
  setVistaMobile: (vistaMobile) => set({ vistaMobile }),
  musicaEscolha: 'auto',
  arquivoNome: null,
  setMusica: (musicaEscolha) => set({ musicaEscolha }),

  /*****************************************************************************
   * setArquivo
   * funcao: escolhe um arquivo de audio da jogadora como musica (ou tira, com
   * null).
   * recebe: f (File ou null).
   * retorna: nada.
   ****************************************************************************/
  setArquivo: (f) => {
    setFileAudio(f ? URL.createObjectURL(f) : null)
    set({ arquivoNome: f?.name ?? null, musicaEscolha: f ? 'arquivo' : 'auto' })
  },
  look: loadLook(),

  /*****************************************************************************
   * setLook
   * funcao: muda partes do visual da bailarina e grava no localStorage.
   * recebe: p (as partes do Look que mudam).
   * retorna: nada.
   ****************************************************************************/
  setLook: (p) => {
    const look = { ...get().look, ...p }
    try {
      localStorage.setItem(LOOK_KEY, JSON.stringify(look))
    } catch {
      /* ok */
    }
    set({ look })
  },

  /*****************************************************************************
   * setProgram
   * funcao: recebe o programa que o editor de blocos montou. com erro do editor
   * ou do validador de ballet, guarda os erros e para de dancar; sem erro,
   * troca a linha do tempo e volta para o comeco.
   * recebe: program (Program) e errors (erros que o editor achou ao ler os
   * blocos).
   * retorna: nada.
   ****************************************************************************/
  setProgram: (program, errors) => {
    if (errors.length) return set({ errors, tips: [], playing: false, program })
    const timeline = safeCompile(program)
    const erros = timeline.diags.filter((d) => d.level === 'erro')
    const tips = timeline.diags.filter((d) => d.level === 'dica')
    if (erros.length) return set({ errors: erros, tips, playing: false, program })
    set({ program, errors: [], tips, timeline, beat: 0, playing: false, watching: 'meu' })
  },
  presetId: PRESETS[0].id,
  timeline: warmupTimeline(),
  bpm: 84,
  beat: 0,
  playing: true,
  sound: true,
  cam: 'vitrine',
  camNonce: 0,

  /*****************************************************************************
   * setPreset
   * funcao: carrega um dos modelos do estudio.
   * recebe: id (string), o id do modelo em PRESETS.
   * retorna: nada.
   ****************************************************************************/
  setPreset: (id) => {
    const program = PRESETS.find((p) => p.id === id)!.programa
    const timeline = safeCompile(program)
    set((s) => ({
      presetId: id,
      program,
      errors: [],
      tips: timeline.diags.filter((d) => d.level === 'dica'),
      timeline,
      beat: 0,
      playing: false,
      loadNonce: s.loadNonce + 1,
    }))
  },
  setBpm: (bpm) => set({ bpm }),

  /*****************************************************************************
   * play
   * funcao: comeca ou continua a danca. se ja tinha acabado, volta para o
   * comeco.
   * recebe: nada.
   * retorna: nada. nao toca o programa da jogadora enquanto ele tiver erro (o
   * exemplo da professora toca).
   ****************************************************************************/
  play: () => {
    const { beat, timeline, errors, mode, watching } = get()
    if ((mode === 'estudio' || isTrilha(mode)) && errors.length && watching === 'meu') return
    // dancar sempre mostra a bailarina (no celular, troca do painel para o palco)
    set({ playing: true, beat: beat >= timeline.total ? 0 : beat, vistaMobile: 'palco' })
  },
  pause: () => set({ playing: false }),

  /*****************************************************************************
   * restart
   * funcao: volta para o tempo 0 e toca, com a mesma regra de erros do play.
   * recebe: nada. retorna: nada.
   ****************************************************************************/
  restart: () => {
    const { errors, mode } = get()
    if ((mode === 'estudio' || isTrilha(mode)) && errors.length && get().watching === 'meu') return
    set({ beat: 0, playing: true })
  },

  /*****************************************************************************
   * advance
   * funcao: anda o tempo da danca. chamada a cada quadro pela bailarina.
   * recebe: dt (segundos desde o quadro anterior).
   * retorna: nada. em loop volta para o comeco; sem loop para no fim.
   ****************************************************************************/
  advance: (dt) => {
    const { playing, beat, bpm, timeline, loop } = get()
    if (!playing) return
    // tempos por segundo = bpm / 60, ajustado pela velocidade do estilo de musica
    const nb = beat + (dt * bpm * speedAt(timeline, beat)) / 60
    if (nb >= timeline.total && loop) set({ beat: nb % timeline.total })
    else if (nb >= timeline.total) set({ beat: timeline.total, playing: false })
    else set({ beat: nb })
  },
  setSound: (sound) => set({ sound }),
  setCam: (cam) => set((s) => ({ cam, camNonce: s.camNonce + 1 })),
}))

// curva suave (sai devagar e chega devagar), a curva padrao dos movimentos
const smooth = (t: number) => t * t * (3 - 2 * t)

/*******************************************************************************
 * evaluate
 * funcao: o corpo da bailarina num tempo qualquer, com a cabeca calculada
 * automaticamente.
 * recebe: t (Timeline) e beat (number).
 * retorna: state (BodyState), weight (onde esta o peso), index (o movimento
 * atual) e slide (se a perna de trabalho vai rente ao chao).
 ******************************************************************************/
export function evaluate(t: Timeline, beat: number): { state: BodyState; weight: Weight; index: number; slide: boolean } {
  const r = evaluateRaw(t, beat)
  return { ...r, state: { ...r.state, head: autoHead(r.state) }, slide: t.moves[r.index]?.slide ?? true }
}

/*******************************************************************************
 * evaluateRaw
 * funcao: interpola o estado entre o comeco e o fim do movimento atual, usando
 * a curva do movimento (suave, sobe, cai ou linear).
 * recebe: t (Timeline) e beat (number).
 * retorna: state, weight e index, sem cabeca. linha do tempo vazia devolve o
 * estado inicial; depois do fim, o estado final.
 ******************************************************************************/
function evaluateRaw(t: Timeline, beat: number): { state: BodyState; weight: Weight; index: number } {
  const n = t.moves.length
  if (n === 0) return { state: t.states[0], weight: 'both', index: -1 }
  if (beat >= t.total) return { state: t.states[n], weight: t.moves[n - 1].weight, index: n - 1 }
  let i = 0
  while (i < n - 1 && t.starts[i + 1] <= beat) i++
  const local = Math.min(1, Math.max(0, (beat - t.starts[i]) / t.moves[i].beats))
  const e = t.moves[i].ease
  const k = e === 'sobe' ? 1 - (1 - local) * (1 - local) : e === 'cai' ? local * local : e === 'linear' ? local : smooth(local)
  return { state: lerpState(t.states[i], t.states[i + 1], k), weight: t.moves[i].weight, index: i }
}

// atalhos de depuracao em window.__ballet, usados pelos testes automaticos (tools/)
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__ballet = {
    setBeat: (b: number) => useStore.setState({ beat: b, playing: false }),
    play: () => useStore.getState().play(),
    state: () => useStore.getState(),

    /***************************************************************************
     * __ballet.setPreset
     * funcao: vai para o estudio (se precisar) e carrega um modelo.
     * recebe: id (string). retorna: nada.
     **************************************************************************/
    setPreset: (id: string) => {
      if (useStore.getState().mode !== 'estudio') useStore.getState().setMode('estudio')
      useStore.getState().setPreset(id)
    },
    setMode: (m: Mode) => useStore.getState().setMode(m),
    setTerm: (id: string) => useStore.getState().setTerm(id),
    setLook: (p: Partial<Look>) => useStore.getState().setLook(p),
    setStars: (n: number) => useStore.setState({ stars: { seq: n } }),

    /***************************************************************************
     * __ballet.openFase
     * funcao: abre a trilha certa e depois a fase, como se a jogadora clicasse
     * no mapa.
     * recebe: id (string). retorna: nada.
     **************************************************************************/
    openFase: (id: string) => {
      useStore.getState().setMode(acharFase(id)?.trilha ?? 'aula')
      useStore.getState().openFase(id)
    },
    setCam: (c: CamView) => useStore.getState().setCam(c),
    fase: (id: string) => acharFase(id)?.fase,
  }
}
