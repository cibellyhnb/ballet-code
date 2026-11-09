/*******************************************************************************
 * program.ts
 * funcao principal: o compilador do jogo. define a linguagem dos blocos (Instr,
 * Program) e transforma um programa numa linha do tempo de movimentos
 * (Timeline), guardando o estado do corpo entre um passo e outro. enquanto
 * compila, confere as regras de ballet (validador) e gera diagnosticos: "erro"
 * impede de dancar, "dica" so avisa. tambem define os pontos da sala e a
 * "impressao digital" usada para conferir se duas dancas sao iguais.
 ******************************************************************************/
import {
  ARMS,
  ARM_LABEL,
  BASE,
  FIRST_SIDE,
  TURNOUT,
  applyPatch,
  armKey,
  legKey,
  other,
  type Arm,
  type ArmPos,
  type BodyState,
  type Leg,
  type Patch,
  type Side,
  type Weight,
} from './state'
import { HIP_Y, LEG_LEN, TENDU_ANGLE } from './rig'
import type { Estilo } from '../audio'

/*******************************************************************************
 * Dir, Sentido, PosPes, DirFB, BracosPos, Arab, FormaPique, DirFS, DirCorpo
 * funcao: os valores que os campos dos blocos podem ter (direcao da perna,
 * sentido do giro, posicao dos pes, posicao dos bracos, tipo de arabesque,
 * forma do pique, direcao do corpo), com os rotulos que aparecem na tela.
 ******************************************************************************/
export type Dir = 'devant' | 'seconde' | 'derriere'
export const DIR_LABEL: Record<Dir, string> = {
  devant: 'devant',
  seconde: 'à la seconde',
  derriere: 'derrière',
}
// en croix: devant, a la seconde, derriere, a la seconde (a ordem do "para cada direcao")
export const EN_CROIX: Dir[] = ['devant', 'seconde', 'derriere', 'seconde']
export type Sentido = 'endehors' | 'endedans'
export const SENTIDO_LABEL: Record<Sentido, string> = { endehors: 'en dehors', endedans: 'en dedans' }
export type PosPes = '1' | '2' | '3' | '4' | '5'
// posicoes dos plies de barra (a 3a fica de fora, como na aula)
export const POSICOES_PLIE: PosPes[] = ['1', '2', '4', '5']
export type DirFB = 'devant' | 'derriere'
// posicoes dos dois bracos (RAD): a 3a e a 4a usam um braco diferente do outro
export type BracosPos = 'brasBas' | 'primeira' | 'segunda' | 'terceira' | 'quarta' | 'quinta'
export const BRACOS_LABEL: Record<BracosPos, string> = {
  brasBas: 'bras bas',
  primeira: '1ª posição',
  segunda: '2ª posição',
  terceira: '3ª posição',
  quarta: '4ª posição',
  quinta: '5ª posição',
}

export type Arab = '1' | '2' | '3'
export type FormaPique = 'giro' | 'passe' | 'arabesque'
export const PIQUE_LABEL: Record<FormaPique, string> = { giro: 'en dedans (giro)', passe: 'em retiré', arabesque: 'em arabesque' }
export type DirFS = 'devant' | 'seconde'
export type DirCorpo = 'enface' | 'croise' | 'efface' | 'ecarte'
export const DIRCORPO_LABEL: Record<DirCorpo, string> = { enface: 'en face', croise: 'croisé', efface: 'effacé', ecarte: 'écarté' }
// lugar do centro da sala
// lugar do centro da sala para onde ela vai com "ir para o centro"
const CENTRO = { x: -1.4, z: 0.45 }

/*******************************************************************************
 * SALA
 * funcao: ate onde ela pode viajar sem bater nas paredes, no espelho ou nas
 * plantas (em metros, no chao da cena).
 ******************************************************************************/
const SALA = { xMin: -4.0, xMax: -0.15, zMin: -2.2, zMax: 3.0 }

/*******************************************************************************
 * Ponto
 * funcao: os 8 pontos da sala, como na escola russa. 1 e a frente (o espelho) e
 * a contagem vai no sentido do relogio, visto de cima, com ela olhando para o
 * 1: 2 e o canto da frente a direita dela, 3 a parede da direita, ate o 8, o
 * canto da frente a esquerda. a direita dela e o lado -x da sala; a frente e
 * +z.
 ******************************************************************************/
export type Ponto = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export const PONTOS: Ponto[] = [1, 2, 3, 4, 5, 6, 7, 8]
export const PONTO_LABEL: Record<Ponto, string> = {
  1: 'frente, o espelho',
  2: 'canto da frente, à direita',
  3: 'parede da direita',
  4: 'canto de trás, à direita',
  5: 'fundo da sala',
  6: 'canto de trás, à esquerda',
  7: 'parede da esquerda',
  8: 'canto da frente, à esquerda',
}
// coordenadas das tres colunas e das tres linhas de pontos, um pouco afastadas das paredes
const PX = { dir: SALA.xMin + 0.4, meio: CENTRO.x, esq: SALA.xMax - 0.4 }
const PZ = { frente: SALA.zMax - 0.4, meio: CENTRO.z, fundo: SALA.zMin + 0.4 }

/*******************************************************************************
 * PONTO_POS
 * funcao: onde ela fica quando vai ate cada ponto (um pouquinho afastada da
 * parede).
 ******************************************************************************/
export const PONTO_POS: Record<Ponto, { x: number; z: number }> = {
  1: { x: PX.meio, z: PZ.frente },
  2: { x: PX.dir, z: PZ.frente },
  3: { x: PX.dir, z: PZ.meio },
  4: { x: PX.dir, z: PZ.fundo },
  5: { x: PX.meio, z: PZ.fundo },
  6: { x: PX.esq, z: PZ.fundo },
  7: { x: PX.esq, z: PZ.meio },
  8: { x: PX.esq, z: PZ.frente },
}
// yaw do corpo (em graus, entre -180 e 180) olhando para o ponto: 0 e en face, positivo vira para a esquerda dela
export const yawDoPonto = (n: Ponto) => ((((-(n - 1) * 45 + 180) % 360) + 360) % 360) - 180
export const isPonto = (n: unknown): n is Ponto => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 8

/*******************************************************************************
 * Val
 * funcao: valor de um campo que pode ser fixo ou uma variavel ({ var: nome }),
 * resolvida na hora de compilar.
 ******************************************************************************/
export type Val<T> = T | { var: string }

/*******************************************************************************
 * Instr
 * funcao: uma instrucao do programa (um bloco). id liga a instrucao ao bloco,
 * para destacar e mostrar avisos no lugar certo.
 ******************************************************************************/
export type Instr = InstrBody & { id?: string }

/*******************************************************************************
 * InstrBody
 * funcao: todos os tipos de instrucao e os campos de cada um.
 ******************************************************************************/
type InstrBody =
  | { t: 'preparacao'; perna: Val<Side> }
  | { t: 'finalizar'; perna: Val<Side> }
  | { t: 'tendu'; perna: Val<Side>; dir: Val<Dir> }
  | { t: 'glisse'; perna: Val<Side>; dir: Val<Dir> }
  | { t: 'jete'; perna: Val<Side>; dir: Val<Dir> }
  | { t: 'grandBattement'; perna: Val<Side>; dir: Val<Dir> }
  | { t: 'cloche'; perna: Val<Side> }
  | { t: 'rond'; perna: Val<Side>; sentido: Sentido }
  | { t: 'coupe'; perna: Val<Side> }
  | { t: 'passe'; perna: Val<Side> }
  | { t: 'fondu'; perna: Val<Side>; dir: Val<Dir> }
  | { t: 'frappe'; perna: Val<Side>; dir: Val<Dir> }
  | { t: 'pasDeCheval'; perna: Val<Side> }
  | { t: 'developpe'; perna: Val<Side>; dir: Val<Dir> }
  | { t: 'arabesque'; perna: Val<Side>; tipo?: Arab }
  | { t: 'fouette'; perna: Val<Side> }
  | { t: 'local'; onde: 'centro' | 'barra' }
  | { t: 'direcao'; dir: DirCorpo }
  | { t: 'olharPonto'; n: Ponto }
  | { t: 'irPonto'; n: Ponto }
  | { t: 'saute' }
  | { t: 'changement' }
  | { t: 'echappe' }
  | { t: 'reverence' }
  | { t: 'glissade'; perna: Val<Side> }
  | { t: 'pasDeBourree'; perna: Val<Side> }
  | { t: 'balance'; perna: Val<Side> }
  | { t: 'assemble'; perna: Val<Side> }
  | { t: 'sissonne'; perna: Val<Side> }
  | { t: 'grandJete'; perna: Val<Side> }
  | { t: 'pasDeChat'; perna: Val<Side> }
  | { t: 'pique'; perna: Val<Side>; forma: FormaPique }
  | { t: 'fouetteGiro'; perna: Val<Side> }
  | { t: 'soutenu'; perna: Val<Side> }
  | { t: 'tombe'; perna: Val<Side>; dir: Val<Dir> }
  | { t: 'chasse'; perna: Val<Side>; dir: DirFS }
  | { t: 'penche'; perna: Val<Side> }
  | { t: 'attitude'; perna: Val<Side>; dir: DirFB }
  | { t: 'cambre'; dir: DirFB }
  | { t: 'pirueta'; perna: Val<Side>; sentido?: Sentido; voltas?: 1 | 2; forma?: 'passe' | 'attitude' }
  | { t: 'fechar' }
  | { t: 'demiPlie'; pos?: Val<PosPes> }
  | { t: 'grandPlie'; pos?: Val<PosPes> }
  | { t: 'releve'; pos?: Val<PosPes> }
  | { t: 'pes'; pos: Val<PosPes> }
  | { t: 'bracos'; perna: Val<Side>; pos: ArmPos }
  | { t: 'bracosAmbos'; pos: BracosPos }
  | { t: 'soltar' }
  | { t: 'segurar' }
  | { t: 'virar' }
  | { t: 'pausa'; tempos: number }
  | { t: 'repetir'; vezes: number; corpo: Instr[] }
  | { t: 'paraCada'; nome: string; lista: (Dir | PosPes)[]; corpo: Instr[] }
  | { t: 'chamar'; fn: string; args: Record<string, Side | Dir> }

/*******************************************************************************
 * Fn e Program
 * funcao: uma funcao criada pela jogadora e o programa inteiro (funcoes e lista
 * principal).
 ******************************************************************************/
export type Fn = { nome: string; params: string[]; corpo: Instr[]; id?: string }
export type Program = { funcoes: Fn[]; principal: Instr[]; inicio?: 'centro' } // inicio: comeca ja no centro (demonstracoes)

/*******************************************************************************
 * Move
 * funcao: um movimento da linha do tempo: quantos tempos dura, o que muda no
 * corpo (patch), o texto que aparece, onde esta o peso e detalhes de como o
 * movimento anda.
 ******************************************************************************/
export type Move = {
  beats: number
  patch: Patch
  label: string
  weight: Weight
  slide?: boolean // perna de trabalho rente ao chao (padrao: sim)
  ease?: 'suave' | 'sobe' | 'cai' | 'linear' // linear = velocidade constante (para viagens longas, sem parar a cada passo); curva do movimento: sobe = sai rapido e freia; cai = comeca devagar e acelera
  musica?: Estilo // carater da musica neste movimento (define tambem o andamento)
  stack?: string[] // ids dos blocos em execucao (para destacar na tela)
  vars?: [string, string][] // variaveis visiveis neste momento
}

/*******************************************************************************
 * Diag
 * funcao: um aviso do validador. erro impede de dancar, dica so aparece.
 ******************************************************************************/
export type Diag = { blockId?: string; msg: string; level: 'erro' | 'dica' }

/*******************************************************************************
 * Timeline
 * funcao: o resultado da compilacao: movimentos, o tempo de inicio de cada um,
 * os estados do corpo, a duracao total, os avisos e a musica.
 ******************************************************************************/
export type Timeline = {
  moves: Move[]
  starts: number[]
  states: BodyState[] // states[i] = estado antes do movimento i; states[n] = final
  total: number
  diags: Diag[]
  musica: Estilo // uma musica para a combinacao inteira
}

// valores das variaveis enquanto compila (perna, direcao, posicao)
type EnvVal = Side | Dir | PosPes
type Env = Record<string, EnvVal>

/*******************************************************************************
 * val
 * funcao: resolve um campo que pode ser variavel.
 * recebe: v (Val) e env (as variaveis daquele ponto).
 * retorna: o valor fixo. lanca erro se a variavel nao existir ali (o editor ja
 * impede isso antes).
 ******************************************************************************/
function val<T extends string>(v: Val<T>, env: Env): T {
  if (typeof v === 'object') {
    const r = env[v.var]
    if (r === undefined) throw new Error(`Variável "${v.var}" não existe aqui`)
    return r as T
  }
  return v
}

// ===== geometria =====
const GLISSE = TENDU_ANGLE + 14 // o glisse sai do chao so um pouquinho
const JETE = 45
const GRAND = { devant: 88, seconde: 88, derriere: 62 }
const DEVELOPPE = { devant: 80, seconde: 80, derriere: 58 }

// posicoes dos pes: perna de trabalho (W) e de base (S); "cruzadas" lembram qual pe esta na frente
type PosDef = { side: number; turnout: number; offset: number; crossed: boolean }
const POS: Record<PosPes, PosDef> = {
  '1': { side: FIRST_SIDE, turnout: TURNOUT, offset: 0, crossed: false },
  '2': { side: 9, turnout: TURNOUT, offset: 0, crossed: false },
  '3': { side: -3.2, turnout: 70, offset: 3.4, crossed: true },
  '4': { side: -5, turnout: 75, offset: 11, crossed: true },
  '5': { side: -6.5, turnout: 78, offset: 5.6, crossed: true },
}
const FECHADAS: PosPes[] = ['1', '3', '5']

// poses da perna de trabalho no ar (no plano "aberto" da perna en dehors)
const COUPE: Partial<Leg> = { fwd: 0, side: -6, flex: 26, knee: 72, point: 70 }
// altura extra dos saltos com as pernas em retire (os pes ficam alto, entao o quadril precisa subir mais)
const PULO_RETIRE = 0.64
// coupe dos passos que viajam: o joelho bem aberto para o lado, o pe no tornozelo
const PDB_COUPE: Partial<Leg> = { fwd: 0, side: 6, flex: 38, knee: 84, point: 70, turnout: 80 }
const COUPE_FLEX: Partial<Leg> = { ...COUPE, point: -12 }
const PASSE: Partial<Leg> = { fwd: 0, side: -6, flex: 58, knee: 128, point: 75 }

/*******************************************************************************
 * outAt
 * funcao: angulos da perna para uma direcao e abertura.
 * recebe: d (direcao), a (graus de abertura) e baseSide (o side da posicao
 * atual, para devant e derriere).
 * retorna: fwd e side da perna. devant e derriere ficam no eixo da posicao; a
 * la seconde abre para o lado.
 ******************************************************************************/
const outAt = (d: Dir, a: number, baseSide: number) => {
  if (d === 'devant') return { fwd: a, side: baseSide }
  if (d === 'seconde') return { fwd: 0, side: a }
  return { fwd: -a, side: baseSide }
}
// air: perna esticada no ar; chao: perna esticada com a ponta no chao (tendu)
const air = (d: Dir, a: number, baseSide: number): Partial<Leg> => ({ ...outAt(d, a, baseSide), flex: 0, knee: 0, point: 86 })
const chao = (d: Dir, baseSide: number): Partial<Leg> => ({ ...outAt(d, TENDU_ANGLE, baseSide), flex: 0, knee: 0, point: 86 })

// comprimento da coxa e da canela (em metros), para as contas do plie
const L1 = 0.44
const L2 = 0.42

/*******************************************************************************
 * pliePose
 * funcao: pose de plie com os pes plantados: a canela inclina para o tornozelo
 * ficar embaixo do quadril.
 * recebe: fh (flexao do quadril em graus) e heelLift (graus a mais na ponta,
 * para o calcanhar sair do chao no grand plie).
 * retorna: flex, knee e point da perna.
 ******************************************************************************/
function pliePose(fh: number, heelLift = 0): Partial<Leg> {
  const ts = (Math.asin(Math.min(0.999, (L1 / L2) * Math.sin((fh * Math.PI) / 180))) * 180) / Math.PI
  return { flex: fh, knee: fh + ts, point: -ts + heelLift }
}

/*******************************************************************************
 * tenduEmPlie
 * funcao: angulo da perna esticada (com ponta) que encosta no chao quando a
 * perna de base esta em plie e o quadril desceu.
 * recebe: fh (flexao do quadril da perna de base).
 * retorna: o angulo em graus.
 ******************************************************************************/
function tenduEmPlie(fh: number): number {
  const ts = Math.asin(Math.min(0.999, (L1 / L2) * Math.sin((fh * Math.PI) / 180)))
  const desce = L1 * (1 - Math.cos((fh * Math.PI) / 180)) + L2 * (1 - Math.cos(ts))
  const alcance = HIP_Y / Math.cos((TENDU_ANGLE * Math.PI) / 180)
  return (Math.acos((HIP_Y - desce) / alcance) * 180) / Math.PI
}

/*******************************************************************************
 * Work
 * funcao: onde esta a perna de trabalho entre um passo e outro: fechada, no
 * cou-de-pied (esticado ou flexionado), em passe ou aberta.
 ******************************************************************************/
type Work = 'fechado' | 'coupe' | 'coupeFlex' | 'passe' | 'aberto'

/*******************************************************************************
 * Ctx
 * funcao: tudo o que o compilador lembra enquanto percorre o programa: o corpo
 * atual, os movimentos ja gerados, os avisos e o estado de aula (posicao dos
 * pes, pe da frente, braco preparado, barra ou centro).
 ******************************************************************************/
type Ctx = {
  cur: BodyState
  moves: Move[]
  prog: Program
  stack: string[]
  counters: [string, string][]
  env: Env
  diags: Diag[]
  pes: PosPes // posicao dos pes atual
  front: Side // nas posicoes cruzadas (3a, 4a, 5a), qual pe esta a frente
  prepared: boolean // braco de trabalho ja fez a preparacao
  work: Work // onde esta a perna de trabalho
  free: boolean // soltou a barra
  loops: string[] // lacos em volta do bloco atual
  musica?: Estilo
  local: 'barra' | 'centro'
  pending?: Patch // ajuste aplicado junto com o proximo movimento
  cWork: Side // no centro: perna de trabalho atual (a do ultimo passo)
  emFouette?: Side // terminou um fouette en tournant (perna em passe, na meia ponta): o proximo pode emendar
}

/*******************************************************************************
 * MUSICA
 * funcao: o carater musical de cada passo, como o pianista da aula escolhe a
 * musica. passos sem musica (preparacao, pausa, bracos) nao entram na escolha.
 ******************************************************************************/
const MUSICA: Partial<Record<Instr['t'], Estilo>> = {
  demiPlie: 'adagio',
  grandPlie: 'adagio',
  fondu: 'adagio',
  developpe: 'adagio',
  arabesque: 'adagio',
  attitude: 'adagio',
  cambre: 'adagio',
  passe: 'adagio',
  bracosAmbos: 'adagio',
  rond: 'valsa',
  releve: 'tendu',
  pirueta: 'valsa',
  fouette: 'adagio',
  saute: 'galope',
  changement: 'galope',
  echappe: 'galope',
  tendu: 'tendu',
  glisse: 'tendu',
  jete: 'tendu',
  frappe: 'tendu',
  coupe: 'tendu',
  pasDeCheval: 'tendu',
  glissade: 'galope',
  pasDeBourree: 'galope',
  assemble: 'galope',
  sissonne: 'galope',
  balance: 'valsa',
  grandJete: 'grandeValsa',
  pasDeChat: 'galope',
  pique: 'mazurca',
  fouetteGiro: 'valsa',
  soutenu: 'mazurca',
  tombe: 'grandeValsa',
  chasse: 'grandeValsa',
  penche: 'adagio',
  irPonto: 'valsa',
  grandBattement: 'marcha',
  cloche: 'marcha',
}

// nome de cada perna e de cada valor de variavel, para as mensagens e o painel de variaveis
const SIDE_LABEL = { R: 'direita', L: 'esquerda' } as const
const show = (v: EnvVal) => (v === 'R' || v === 'L' ? SIDE_LABEL[v] : v in DIR_LABEL ? DIR_LABEL[v as Dir] : `${v}ª`)

/*******************************************************************************
 * emit
 * funcao: acrescenta movimentos na linha do tempo e atualiza o corpo atual. se
 * houver um ajuste pendente (ctx.pending), ele entra junto com o primeiro
 * movimento.
 * recebe: ctx (Ctx) e ms (lista de Move).
 * retorna: nada.
 ******************************************************************************/
function emit(ctx: Ctx, ms: Move[]) {
  const vars: [string, string][] = [...Object.entries(ctx.env).map(([k, v]) => [k, show(v)] as [string, string]), ...ctx.counters]
  for (let m of ms) {
    if (ctx.pending) {
      const merged: Record<string, object> = { ...ctx.pending }
      for (const [k, v] of Object.entries(m.patch)) merged[k] = { ...(merged[k] ?? {}), ...v }
      m = { ...m, patch: merged as Patch }
      ctx.pending = undefined
    }
    ctx.cur = applyPatch(ctx.cur, m.patch)
    ctx.moves.push({ ...m, stack: [...ctx.stack], vars, musica: ctx.musica })
  }
}

/*******************************************************************************
 * diag
 * funcao: registra um aviso do validador, sem repetir o mesmo aviso no mesmo
 * bloco (lacos passam varias vezes pelo mesmo bloco).
 * recebe: ctx, blockId (o bloco, se houver), level (erro ou dica) e msg.
 * retorna: nada.
 ******************************************************************************/
function diag(ctx: Ctx, blockId: string | undefined, level: Diag['level'], msg: string) {
  if (!ctx.diags.some((d) => d.blockId === blockId && d.msg === msg)) ctx.diags.push({ blockId, msg, level })
}

// lado da barra: com yaw 0 a mao esquerda segura; a perna de trabalho e a de fora (no centro, a do ultimo passo)
const barreSide = (ctx: Ctx): Side => (ctx.cur.root.yaw === 0 ? 'L' : 'R')
const outside = (ctx: Ctx): Side => (ctx.local === 'centro' ? ctx.cWork : other(barreSide(ctx)))
const noCentro = (ctx: Ctx) => ctx.local === 'centro'
const baseSideOf = (ctx: Ctx) => POS[ctx.pes].side

/*******************************************************************************
 * closedLeg
 * funcao: pose da perna de trabalho fechada na posicao atual, sem mexer na
 * perna de base.
 * recebe: ctx, p (a perna) e front (true para fechar na frente, nas posicoes
 * cruzadas).
 * retorna: o Partial<Leg> da perna fechada.
 ******************************************************************************/
function closedLeg(ctx: Ctx, p: Side, front: boolean): Partial<Leg> {
  const d = POS[ctx.pes]
  const base = { side: d.side, turnout: d.turnout, flex: 0, knee: 0, point: 0 }
  if (!d.crossed) return { ...base, fwd: 0 }
  const sup = ctx.cur[legKey(other(p))]
  return { ...base, fwd: sup.fwd + (front ? d.offset : -d.offset) }
}

/*******************************************************************************
 * checkWorkingLeg
 * funcao: confere a perna do passo. na barra tem que ser a de fora (e lembra da
 * preparacao do braco); no centro qualquer perna vale e o jogo passa a seguir
 * essa perna.
 * recebe: ctx, id (o bloco), p (a perna escolhida) e passo (nome do passo, para
 * a mensagem).
 * retorna: nada.
 ******************************************************************************/
function checkWorkingLeg(ctx: Ctx, id: string, p: Side, passo: string) {
  if (noCentro(ctx)) {
    // no centro, qualquer perna pode trabalhar: o jogo passa a seguir essa perna
    if (ctx.cWork !== p) {
      ctx.cWork = p
      ctx.pending = { root: { side: p === 'R' ? 1 : -1 } }
    }
    return
  }
  if (p === barreSide(ctx) && !ctx.free) {
    const certo = SIDE_LABEL[outside(ctx)]
    diag(ctx, id, 'erro', `Na barra, ${passo} é com a perna de fora (a mais longe da barra). Aqui, use a perna ${certo}.`)
  }
  if (!ctx.prepared) diag(ctx, id, 'dica', 'Na barra, faça a preparação do braço antes dos passos.')
}

/*******************************************************************************
 * checkArm
 * funcao: na barra, avisa se o bloco pede o braco que esta segurando a barra.
 * recebe: ctx, id e p (o lado do braco).
 * retorna: nada.
 ******************************************************************************/
function checkArm(ctx: Ctx, id: string, p: Side) {
  if (noCentro(ctx)) return
  if (p === barreSide(ctx) && !ctx.free)
    diag(ctx, id, 'erro', `Esse braço está segurando a barra! Use o braço ${SIDE_LABEL[outside(ctx)]}.`)
}

/*******************************************************************************
 * ensureClosed
 * funcao: garante a perna de trabalho fechada antes de um passo. se nao
 * estiver, fecha (1 tempo) e da uma dica sobre o bloco "fechar".
 * recebe: ctx, id e p (a perna de trabalho).
 * retorna: nada. depois de fouettes en tournant, fecha do jeito deles, sem
 * dica.
 ******************************************************************************/
function ensureClosed(ctx: Ctx, id: string, p: Side) {
  if (ctx.work === 'fechado') return
  if (ctx.emFouette) return fechaFouette(ctx)
  const front = ctx.front === p
  diag(ctx, id, 'dica', 'Antes deste passo a perna precisou fechar (1 tempo). Use o bloco "fechar" para escolher quando.')
  emit(ctx, [{ beats: 1, label: `fecha em ${ctx.pes}ª posição`, weight: other(p), patch: { [legKey(p)]: closedLeg(ctx, p, front) } }])
  ctx.work = 'fechado'
}

/*******************************************************************************
 * fechaFouette
 * funcao: fim dos fouettes en tournant: desce da meia ponta e fecha a perna em
 * 5a atras, com os bracos em 2a. e o fim natural, entao nao gera dica.
 * recebe: ctx.
 * retorna: nada.
 ******************************************************************************/
function fechaFouette(ctx: Ctx) {
  const p = ctx.emFouette!
  ctx.emFouette = undefined
  ctx.work = 'fechado'
  ctx.pes = '5'
  ctx.front = other(p)
  const d5 = POS['5']
  emit(ctx, [
    {
      beats: 1,
      label: 'fecha em 5ª atrás',
      weight: 'both',
      patch: {
        [legKey(p)]: { fwd: -d5.offset / 2, side: d5.side, turnout: d5.turnout, flex: 0, knee: 0, point: 0 },
        [legKey(other(p))]: { fwd: d5.offset / 2, side: d5.side, turnout: d5.turnout, flex: 0, knee: 0, point: 0 },
        armR: ARMS.segunda,
        armL: ARMS.segunda,
      },
    },
  ])
}

/*******************************************************************************
 * requireClosedPosition
 * funcao: erro se o passo precisar sair de uma posicao fechada (1a, 3a ou 5a) e
 * ela estiver em 2a ou 4a.
 * recebe: ctx, id e passo (nome, para a mensagem).
 * retorna: nada.
 ******************************************************************************/
function requireClosedPosition(ctx: Ctx, id: string, passo: string) {
  if (!FECHADAS.includes(ctx.pes))
    diag(ctx, id, 'erro', `O ${passo} sai de uma posição fechada (1ª, 3ª ou 5ª). Agora ela está em ${ctx.pes}ª: mude a posição dos pés antes.`)
}

/*******************************************************************************
 * checkCrossed
 * funcao: nas posicoes cruzadas, devant sai com o pe da frente e derriere com o
 * de tras. se nao, explica como consertar.
 * recebe: ctx, id, p (a perna), d (a direcao) e passo (nome).
 * retorna: nada.
 ******************************************************************************/
function checkCrossed(ctx: Ctx, id: string, p: Side, d: Dir, passo: string) {
  if (!POS[ctx.pes].crossed) return
  const pe = SIDE_LABEL[p]
  const frente = SIDE_LABEL[ctx.front]
  const comoConsertar =
    `Para consertar: coloque antes o bloco "pés em ${ctx.pes}ª posição" (ele troca os pés e deixa a perna ${pe} na frente), ` +
    `ou comece pela direção "à la seconde", que fica no menu de direção do próprio bloco: ao fechar, ela troca o pé da frente.`
  if (d === 'devant' && ctx.front !== p)
    diag(ctx, id, 'erro', `Na ${ctx.pes}ª, o pé da frente agora é o da perna ${frente}, mas o ${passo} devant precisa sair com o pé da frente. ${comoConsertar}`)
  if (d === 'derriere' && ctx.front === p) {
    const semMenu = passo === 'arabesque'
    diag(
      ctx,
      id,
      'erro',
      semMenu
        ? `Na ${ctx.pes}ª, o pé da perna ${pe} está na frente, mas a arabesque sai com o pé de trás. Use a perna ${SIDE_LABEL[other(p)]} (a de trás).`
        : `Na ${ctx.pes}ª, o pé da perna ${pe} está na frente, mas o ${passo} derrière precisa sair com o pé de trás. Comece por "à la seconde" (no menu de direção do bloco) para ele fechar atrás.`,
    )
  }
}

/*******************************************************************************
 * closeAfter
 * funcao: decide como a perna fecha depois de abrir: devant fecha na frente,
 * derriere atras, a la seconde troca o pe da frente. ja atualiza qual pe fica
 * na frente.
 * recebe: ctx, p (a perna) e d (a direcao em que ela abriu).
 * retorna: a pose da perna fechada e o texto do movimento.
 ******************************************************************************/
function closeAfter(ctx: Ctx, p: Side, d: Dir) {
  const willFront = d === 'devant' ? true : d === 'derriere' ? false : ctx.front !== p
  const leg = closedLeg(ctx, p, willFront)
  const label = POS[ctx.pes].crossed ? `fecha em ${ctx.pes}ª ${willFront ? 'na frente' : 'atrás'}` : `fecha em ${ctx.pes}ª posição`
  if (POS[ctx.pes].crossed) ctx.front = willFront ? p : other(p)
  return { leg, label }
}

/*******************************************************************************
 * setArms
 * funcao: as duas posicoes de braco para uma posicao do RAD. na 3a e na 4a, o
 * braco de trabalho e o de base ficam diferentes.
 * recebe: ctx e pos (BracosPos).
 * retorna: o Patch dos dois bracos.
 ******************************************************************************/
function setArms(ctx: Ctx, pos: BracosPos): Patch {
  const w = outside(ctx)
  const b = barreSide(ctx)
  const pick = (a: ArmPos) => ARMS[a] as Arm
  const map: Record<BracosPos, [Arm, Arm]> = {
    brasBas: [pick('brasBas'), pick('brasBas')],
    primeira: [pick('primeira'), pick('primeira')],
    segunda: [pick('segunda'), pick('segunda')],
    terceira: [pick('primeira'), pick('segunda')], // RAD: um braco em 1a, o outro em 2a
    quarta: [pick('quinta'), pick('segunda')], // RAD: um braco em 5a, o outro em 2a
    quinta: [pick('quinta'), pick('quinta')],
  }
  const [aw, ab] = map[pos]
  return { [armKey(w)]: aw, [armKey(b)]: ab }
}

/*******************************************************************************
 * goToPos
 * funcao: muda a posicao dos pes (2 tempos) quando um plie ou releve pede uma
 * posicao diferente da atual.
 * recebe: ctx, id, pos (a posicao pedida, ou undefined para ficar onde esta) e
 * env.
 * retorna: nada.
 ******************************************************************************/
function goToPos(ctx: Ctx, id: string, pos: Val<PosPes> | undefined, env: Env) {
  if (pos === undefined) return
  const p = val(pos, env)
  if (p === ctx.pes) return
  const loops = ctx.loops
  ctx.loops = [] // mudanca automatica: nao gera dicas de laco
  step({ t: 'pes', pos: p }, env, ctx, 0, id)
  ctx.loops = loops
}

/*******************************************************************************
 * run
 * funcao: executa uma lista de instrucoes em ordem, guardando para cada
 * movimento quais blocos estao rodando, as variaveis e a musica do passo.
 * recebe: list (Instr[]), env (variaveis), ctx, depth (profundidade de
 * chamadas) e path (prefixo do id, para instrucoes sem bloco).
 * retorna: nada. lanca erro com mais de 20 niveis de chamadas (funcoes que se
 * chamam sem parar).
 ******************************************************************************/
function run(list: Instr[], env: Env, ctx: Ctx, depth: number, path: string) {
  if (depth > 20) throw new Error('Recursão demais')
  list.forEach((ins, i) => {
    const id = ins.id ?? `${path}.${i}`
    const prevEnv = ctx.env
    ctx.stack.push(id)
    ctx.env = env
    const prevMusica = ctx.musica
    if (ins.t !== 'repetir' && ins.t !== 'paraCada' && ins.t !== 'chamar') ctx.musica = MUSICA[ins.t]
    step(ins, env, ctx, depth, id)
    if (ins.t !== 'repetir' && ins.t !== 'paraCada' && ins.t !== 'chamar') ctx.musica = prevMusica
    ctx.env = prevEnv
    ctx.stack.pop()
  })
}

/*******************************************************************************
 * loopHints
 * funcao: dicas de lacos: direcao ou posicao fixa dentro de um "para cada", e
 * preparacao ou finalizar dentro de um laco.
 * recebe: ins (a instrucao), ctx e id.
 * retorna: nada.
 ******************************************************************************/
function loopHints(ins: Instr, ctx: Ctx, id: string) {
  if (ctx.loops.includes('direção') && 'dir' in ins && typeof ins.dir === 'string' && ins.t !== 'attitude' && ins.t !== 'cambre')
    diag(ctx, id, 'dica', 'Este bloco está dentro do "para cada direção", mas a direção está fixa. Escolha (direção) no menu para ela mudar a cada volta.')
  if (ctx.loops.includes('posição') && 'pos' in ins && typeof ins.pos === 'string' && ['pes', 'demiPlie', 'grandPlie', 'releve'].includes(ins.t))
    diag(ctx, id, 'dica', 'Este bloco está dentro do "para cada posição", mas a posição está fixa. Escolha (posição) no menu.')
  if (ctx.loops.length && (ins.t === 'finalizar' || ins.t === 'preparacao'))
    diag(ctx, id, 'dica', `O bloco "${ins.t === 'finalizar' ? 'finalizar' : 'preparação'}" está dentro de um laço, então ele se repete a cada volta. Normalmente ele fica ${ins.t === 'finalizar' ? 'depois' : 'antes'} do laço.`)
}

/*******************************************************************************
 * destino
 * funcao: para onde ela vai num passo que viaja. para o lado da perna indicada,
 * ou "frente" para onde o corpo olha.
 * recebe: ctx, id, para (R, L ou 'frente') e dist (distancia em metros).
 * retorna: o ponto x, z de chegada, preso dentro da SALA (com uma dica se ela
 * bater na parede).
 ******************************************************************************/
function destino(ctx: Ctx, id: string, para: Side | 'frente', dist: number) {
  const th = ((ctx.cur.root.yaw + ctx.cur.root.spin) * Math.PI) / 180
  const [dx, dz] = para === 'frente' ? [Math.sin(th), Math.cos(th)] : para === 'R' ? [-Math.cos(th), Math.sin(th)] : [Math.cos(th), -Math.sin(th)]
  let x = ctx.cur.root.x + dx * dist
  let z = ctx.cur.root.z + dz * dist
  if (x < SALA.xMin || x > SALA.xMax || z < SALA.zMin || z > SALA.zMax) {
    diag(ctx, id, 'dica', 'Ela chegou no cantinho da sala e não tem mais espaço para viajar! Alterne os lados (direita e esquerda) para ela ir e voltar.')
    x = Math.min(SALA.xMax, Math.max(SALA.xMin, x))
    z = Math.min(SALA.zMax, Math.max(SALA.zMin, z))
  }
  return { x, z }
}

/*******************************************************************************
 * virarPara
 * funcao: gira o corpo ate ficar olhando para yaw pelo caminho mais curto. o
 * yaw fica sempre entre -180 e 180 e a volta que sobra vai para o spin (o mesmo
 * campo que a pirueta usa).
 * recebe: ctx (ou so o yaw e o spin atuais) e yaw (graus).
 * retorna: o novo yaw e spin.
 ******************************************************************************/
function virarPara(ctx: Ctx | { yaw: number; spin: number }, yaw: number) {
  const r = 'cur' in ctx ? ctx.cur.root : ctx
  const y = ((((yaw + 180) % 360) + 360) % 360) - 180
  const agora = r.yaw + r.spin
  let spin = Math.round(r.spin / 360) * 360
  while (y + spin - agora > 180) spin -= 360
  while (y + spin - agora < -180) spin += 360
  return { yaw: y, spin }
}

/*******************************************************************************
 * meio
 * funcao: ponto no caminho entre onde ela esta e o destino.
 * recebe: ctx, d (destino) e k (0 onde esta, 1 no destino).
 * retorna: o ponto x, z.
 ******************************************************************************/
const meio = (ctx: Ctx, d: { x: number; z: number }, k: number) => ({
  x: ctx.cur.root.x + (d.x - ctx.cur.root.x) * k,
  z: ctx.cur.root.z + (d.z - ctx.cur.root.z) * k,
})

/*******************************************************************************
 * bracosLivres
 * funcao: diz se os bracos podem acompanhar um salto ou deslocamento: so quando
 * os dois estao em bras bas (ninguem escolheu outra coisa com o bloco de
 * bracos). ai eles abrem em demi-seconde (ou 2a) no ar e voltam ao bras bas no
 * fim.
 * recebe: ctx.
 * retorna: true se os dois bracos estao perto do bras bas.
 ******************************************************************************/
function bracosLivres(ctx: Ctx) {
  const perto = (a: BodyState['armR']) =>
    Math.abs(a.abd - ARMS.brasBas.abd) < 8 && Math.abs(a.swing - ARMS.brasBas.swing) < 10 && Math.abs(a.elbow - ARMS.brasBas.elbow) < 10
  return perto(ctx.cur.armR) && perto(ctx.cur.armL)
}
const bracos2 = (ok: boolean, pose: BodyState['armR']): Patch => (ok ? { armR: pose, armL: pose } : {})

/*******************************************************************************
 * allegroPronto
 * funcao: preparo comum dos passos de allegro e de deslocamento: tem que estar
 * no centro, com a perna fechada e em 5a. tambem passa a seguir a perna do
 * passo.
 * recebe: ctx, id, nome (do passo, para a mensagem) e p (a perna).
 * retorna: nada.
 ******************************************************************************/
function allegroPronto(ctx: Ctx, id: string, nome: string, p: Side) {
  if (!noCentro(ctx)) diag(ctx, id, 'erro', `${nome} é um passo do centro: use antes o bloco "ir para o centro".`)
  ensureClosed(ctx, id, outside(ctx))
  if (ctx.pes !== '5') diag(ctx, id, 'erro', `${nome} sai da 5ª posição: use antes "pés em 5ª".`)
  if (noCentro(ctx) && ctx.cWork !== p) {
    ctx.cWork = p
    ctx.pending = { root: { side: p === 'R' ? 1 : -1 } }
  }
}

/*******************************************************************************
 * step
 * funcao: compila uma instrucao: confere as regras do passo, atualiza o estado
 * de aula (pes, pe da frente, perna de trabalho) e gera os movimentos. cada
 * case e um passo.
 * recebe: ins (Instr), env (variaveis), ctx, depth e id (o bloco).
 * retorna: nada.
 ******************************************************************************/
function step(ins: Instr, env: Env, ctx: Ctx, depth: number, id: string) {
  const L = (p: Side) => legKey(p)
  loopHints(ins, ctx, id)
  switch (ins.t) {
    // ===== bracos =====
    // preparacao: o braco de trabalho vai a 1a e abre para a 2a (no centro, os dois bracos)
    case 'preparacao': {
      const p = val(ins.perna, env)
      checkArm(ctx, id, p)
      ctx.prepared = true
      if (noCentro(ctx))
        return emit(ctx, [
          { beats: 2, label: 'preparação: braços em 1ª', weight: 'both', patch: { armR: ARMS.primeira, armL: ARMS.primeira } },
          { beats: 2, label: 'preparação: abre para 2ª', weight: 'both', patch: { armR: ARMS.segunda, armL: ARMS.segunda } },
        ])
      return emit(ctx, [
        { beats: 2, label: 'preparação: braço em 1ª', weight: 'both', patch: { [armKey(p)]: ARMS.primeira } },
        { beats: 2, label: 'preparação: abre para 2ª', weight: 'both', patch: { [armKey(p)]: ARMS.segunda } },
      ])
    }
    // finalizar: o braco volta ao bras bas e fica 2 tempos parado
    case 'finalizar': {
      const p = val(ins.perna, env)
      checkArm(ctx, id, p)
      ctx.prepared = false
      if (noCentro(ctx))
        return emit(ctx, [
          { beats: 2, label: 'finaliza: braços em bras bas', weight: 'both', patch: { armR: ARMS.brasBas, armL: ARMS.brasBas } },
          { beats: 2, label: 'finaliza: pausa', weight: 'both', patch: {} },
        ])
      return emit(ctx, [
        { beats: 2, label: 'finaliza: braço em bras bas', weight: 'both', patch: { [armKey(p)]: ARMS.brasBas } },
        { beats: 2, label: 'finaliza: pausa', weight: 'both', patch: {} },
      ])
    }
    // um braco numa posicao do RAD
    case 'bracos': {
      const p = val(ins.perna, env)
      checkArm(ctx, id, p)
      ctx.prepared = ins.pos !== 'brasBas'
      return emit(ctx, [
        { beats: 2, label: `braço em ${ARM_LABEL[ins.pos]}`, weight: 'both', patch: { [armKey(p)]: ARMS[ins.pos] } },
      ])
    }
    // os dois bracos: na barra so depois de soltar a barra
    case 'bracosAmbos': {
      if (!ctx.free && !noCentro(ctx))
        diag(ctx, id, 'erro', 'Para usar os dois braços, primeiro solte a barra (bloco "soltar a barra") ou vá para o centro.')
      ctx.prepared = ins.pos !== 'brasBas'
      return emit(ctx, [{ beats: 2, label: `braços em ${BRACOS_LABEL[ins.pos]}`, weight: 'both', patch: setArms(ctx, ins.pos) }])
    }
    // soltar e segurar a barra: so na barra
    case 'soltar': {
      if (noCentro(ctx)) diag(ctx, id, 'erro', 'Ela está no centro: não tem barra para soltar.')
      if (ctx.free) diag(ctx, id, 'dica', 'Ela já soltou a barra.')
      ctx.free = true
      return emit(ctx, [{ beats: 2, label: 'solta a barra', weight: 'both', patch: { [armKey(barreSide(ctx))]: ARMS.brasBas } }])
    }
    case 'segurar': {
      if (noCentro(ctx)) diag(ctx, id, 'erro', 'Ela está no centro. Para voltar, use o bloco "voltar para a barra".')
      if (!ctx.free) diag(ctx, id, 'dica', 'Ela já está segurando a barra.')
      ctx.free = false
      return emit(ctx, [{ beats: 2, label: 'volta a mão para a barra', weight: 'both', patch: { [armKey(barreSide(ctx))]: ARMS.barra } }])
    }

    // ===== posicoes e plies =====
    // pes numa posicao: nas cruzadas, a perna de trabalho fica na frente
    case 'pes': {
      const pos = val(ins.pos, env)
      if (ctx.work !== 'fechado') ensureClosed(ctx, id, outside(ctx))
      const w = outside(ctx)
      if (pos === ctx.pes && POS[pos].crossed && ctx.front !== w) {
        // ja esta nessa posicao, mas com o pe de trabalho atras: troca os pes
        const d = POS[pos]
        ctx.front = w
        return emit(ctx, [
          {
            beats: 2,
            label: `pés em ${pos}ª: perna de trabalho na frente`,
            weight: 'both',
            patch: {
              [L(w)]: { fwd: d.offset / 2, side: d.side, turnout: d.turnout },
              [L(other(w))]: { fwd: -d.offset / 2, side: d.side, turnout: d.turnout },
            },
          },
        ])
      }
      if (pos === ctx.pes) return emit(ctx, [{ beats: 2, label: `pés em ${pos}ª posição`, weight: 'both', patch: {} }])
      const d = POS[pos]
      ctx.pes = pos
      if (!d.crossed) {
        const leg = { fwd: 0, side: d.side, turnout: d.turnout }
        return emit(ctx, [{ beats: 2, label: `pés em ${pos}ª posição`, weight: 'both', patch: { legR: leg, legL: leg } }])
      }
      ctx.front = w
      return emit(ctx, [
        {
          beats: 2,
          label: `pés em ${pos}ª posição`,
          weight: 'both',
          patch: {
            [L(w)]: { fwd: d.offset / 2, side: d.side, turnout: d.turnout },
            [L(other(w))]: { fwd: -d.offset / 2, side: d.side, turnout: d.turnout },
          },
        },
      ])
    }
    // demi plie: desce 2 tempos e estica 2
    case 'demiPlie': {
      ensureClosed(ctx, id, outside(ctx))
      goToPos(ctx, id, ins.pos, env)
      const down = pliePose(31)
      const up = { flex: 0, knee: 0, point: 0 }
      return emit(ctx, [
        { beats: 2, label: `demi-plié em ${ctx.pes}ª`, weight: 'both', patch: { legR: down, legL: down } },
        { beats: 2, label: 'estica os joelhos', weight: 'both', patch: { legR: up, legL: up } },
      ])
    }
    // grand plie: desce 2 tempos, sobe em 2; o braco desce ao bras bas e volta pela 1a ate a 2a
    case 'grandPlie': {
      ensureClosed(ctx, id, outside(ctx))
      goToPos(ctx, id, ins.pos, env)
      const em2 = ctx.pes === '2'
      const down = em2 ? pliePose(50) : pliePose(54, 34) // na 2a os calcanhares ficam no chao
      const half = pliePose(31)
      const up = { flex: 0, knee: 0, point: 0 }
      const w = outside(ctx)
      const armOk = ctx.prepared && (!ctx.free || noCentro(ctx))
      const arm = (a: ArmPos): Patch =>
        !armOk ? {} : noCentro(ctx) ? { armR: ARMS[a], armL: ARMS[a] } : { [armKey(w)]: ARMS[a] }
      return emit(ctx, [
        { beats: 2, label: `grand plié em ${ctx.pes}ª: desce`, weight: 'both', patch: { legR: down, legL: down, ...arm('brasBas') } },
        { beats: 1, label: 'grand plié: sobe', weight: 'both', patch: { legR: half, legL: half, ...arm('primeira') } },
        { beats: 1, label: 'grand plié: estica', weight: 'both', patch: { legR: up, legL: up, ...arm('segunda') } },
      ])
    }
    // releve: sobe na meia ponta em 2 tempos e desce em 2
    case 'releve': {
      ensureClosed(ctx, id, outside(ctx))
      goToPos(ctx, id, ins.pos, env)
      const up = { point: 58 }
      const down = { point: 0 }
      return emit(ctx, [
        { beats: 2, label: `relevé em ${ctx.pes}ª (meia ponta)`, weight: 'both', patch: { legR: up, legL: up } },
        { beats: 2, label: 'desce do relevé', weight: 'both', patch: { legR: down, legL: down } },
      ])
    }
    // fechar: a perna de trabalho volta para a posicao atual
    case 'fechar': {
      if (ctx.emFouette) return fechaFouette(ctx)
      if (ctx.work === 'fechado') {
        diag(ctx, id, 'dica', 'A perna já está fechada.')
        return emit(ctx, [{ beats: 2, label: 'pausa', weight: 'both', patch: {} }])
      }
      const p = outside(ctx)
      const front = ctx.front === p
      ctx.work = 'fechado'
      return emit(ctx, [{ beats: 2, label: `fecha em ${ctx.pes}ª posição`, weight: other(p), patch: { [L(p)]: closedLeg(ctx, p, front) } }])
    }

    // ===== battements =====
    // battements: o tendu sai e fecha em 1 tempo cada; glisse, jete e grand battement sobem e descem pelo chao em meio tempo cada
    case 'tendu':
    case 'glisse':
    case 'jete':
    case 'grandBattement': {
      const p = val(ins.perna, env)
      const d = val(ins.dir, env)
      const nome = { tendu: 'battement tendu', glisse: 'battement glissé', jete: 'battement jeté', grandBattement: 'grand battement' }[ins.t]
      checkWorkingLeg(ctx, id, p, `o ${nome}`)
      ensureClosed(ctx, id, p)
      requireClosedPosition(ctx, id, nome)
      checkCrossed(ctx, id, p, d, nome)
      const w: Weight = other(p)
      const bs = baseSideOf(ctx)
      const { leg: close, label: fecha } = closeAfter(ctx, p, d)
      const tendu = { [L(p)]: { ...outAt(d, TENDU_ANGLE, bs), point: 86 } }
      if (ins.t === 'tendu')
        return emit(ctx, [
          { beats: 1, label: `${nome} ${DIR_LABEL[d]}`, weight: w, patch: tendu },
          { beats: 1, label: fecha, weight: w, patch: { [L(p)]: close } },
        ])
      const alto = ins.t === 'glisse' ? GLISSE : ins.t === 'jete' ? JETE : GRAND[d]
      return emit(ctx, [
        { beats: 0.5, label: `${nome} ${DIR_LABEL[d]}`, weight: w, patch: tendu },
        { beats: 0.5, label: `${nome} ${DIR_LABEL[d]}`, weight: w, slide: false, patch: { [L(p)]: air(d, alto, bs) } },
        { beats: 0.5, label: 'desce pelo chão', weight: w, slide: false, patch: { [L(p)]: chao(d, bs) } },
        { beats: 0.5, label: fecha, weight: w, patch: { [L(p)]: close } },
      ])
    }
    // battement en cloche: a perna balanca da frente para tras passando pela 1a; termina aberta atras
    case 'cloche': {
      const p = val(ins.perna, env)
      checkWorkingLeg(ctx, id, p, 'o battement en cloche')
      if (ctx.pes !== '1') diag(ctx, id, 'erro', 'O battement en cloche passa pela 1ª posição: use antes "pés em 1ª".')
      if (ctx.work !== 'aberto') ensureClosed(ctx, id, p)
      const w: Weight = other(p)
      const bs = POS['1'].side
      const first = { fwd: 0, side: bs, flex: 0, knee: 0, point: 0 }
      ctx.work = 'aberto'
      return emit(ctx, [
        { beats: 0.25, label: 'en cloche: passa pela 1ª', weight: w, patch: { [L(p)]: first } },
        { beats: 0.25, label: 'en cloche devant', weight: w, patch: { [L(p)]: chao('devant', bs) } },
        { beats: 0.5, label: 'en cloche devant', weight: w, slide: false, patch: { [L(p)]: air('devant', 60, bs) } },
        { beats: 0.25, label: 'en cloche: passa pela 1ª', weight: w, slide: false, patch: { [L(p)]: chao('devant', bs) } },
        { beats: 0.25, label: 'en cloche: passa pela 1ª', weight: w, patch: { [L(p)]: first } },
        { beats: 0.25, label: 'en cloche derrière', weight: w, patch: { [L(p)]: chao('derriere', bs) } },
        { beats: 0.25, label: 'en cloche derrière', weight: w, slide: false, patch: { [L(p)]: air('derriere', 50, bs) } },
      ])
    }
    // rond de jambe a terre: a ponta desenha um meio circulo no chao, da frente para tras (en dehors) ou ao contrario
    case 'rond': {
      const p = val(ins.perna, env)
      checkWorkingLeg(ctx, id, p, 'o rond de jambe')
      ensureClosed(ctx, id, p)
      if (ctx.pes !== '1') diag(ctx, id, 'erro', 'O rond de jambe à terre começa da 1ª posição. Use antes o bloco "pés em 1ª".')
      const w: Weight = other(p)
      const A = TENDU_ANGLE

      /*************************************************************************
       * at
       * funcao: posicao da ponta no meio circulo do rond de jambe.
       * recebe: deg (0 e devant, 90 a la seconde, 180 derriere).
       * retorna: fwd, side e point da perna.
       ************************************************************************/
      const at = (deg: number) => {
        const t = (deg * Math.PI) / 180
        return { fwd: A * Math.cos(t), side: FIRST_SIDE + (A - FIRST_SIDE) * Math.sin(t), point: 86 }
      }
      const path = ins.sentido === 'endehors' ? [45, 90, 135, 180] : [135, 90, 45, 0]
      const start = ins.sentido === 'endehors' ? 0 : 180
      const nome = `rond de jambe ${SENTIDO_LABEL[ins.sentido]}`
      return emit(ctx, [
        { beats: 1, label: `${nome}: tendu ${start === 0 ? 'devant' : 'derrière'}`, weight: w, patch: { [L(p)]: at(start) } },
        ...path.map((deg) => ({ beats: 0.5, label: nome, weight: w, patch: { [L(p)]: at(deg) } })),
        { beats: 1, label: 'fecha em 1ª posição', weight: w, patch: { [L(p)]: { fwd: 0, side: FIRST_SIDE, point: 0 } } },
      ])
    }

    // ===== sur le cou-de-pied =====
    // coupe: o pe de trabalho no tornozelo da perna de base
    case 'coupe': {
      const p = val(ins.perna, env)
      checkWorkingLeg(ctx, id, p, 'o coupé')
      if (ctx.work === 'coupe') diag(ctx, id, 'dica', 'O pé já está no cou-de-pied.')
      ctx.work = 'coupe'
      return emit(ctx, [{ beats: 2, label: 'coupé (pé no cou-de-pied)', weight: other(p), slide: false, patch: { [L(p)]: COUPE } }])
    }
    case 'fondu': {
      const p = val(ins.perna, env)
      const d = val(ins.dir, env)
      checkWorkingLeg(ctx, id, p, 'o battement fondu')
      const w: Weight = other(p)
      const bs = baseSideOf(ctx)
      const sup = pliePose(28)
      ctx.work = 'aberto'
      // com a base em plie o quadril desce: o pe de trabalho sobe um pouco no cou-de-pied para nao encostar no chao,
      // e a perna desdobra passando por cima (meio caminho mais alto), como um developpe baixinho
      const meio: Partial<Leg> =
        d === 'seconde'
          ? { fwd: 0, side: 34, flex: 24, knee: 48, point: 80 }
          : { fwd: d === 'devant' ? 34 : -34, side: bs, flex: 24, knee: 48, point: 80 }
      return emit(ctx, [
        { beats: 1, label: 'fondu: dobra os dois joelhos', weight: w, slide: false, patch: { [L(p)]: { ...COUPE, flex: 40, knee: 96 }, [L(other(p))]: sup } },
        { beats: 0.5, label: `battement fondu ${DIR_LABEL[d]}`, weight: w, slide: false, patch: { [L(p)]: meio, [L(other(p))]: pliePose(14) } },
        {
          beats: 0.5,
          label: `battement fondu ${DIR_LABEL[d]}`,
          weight: w,
          slide: false,
          patch: { [L(p)]: air(d, 45, bs), [L(other(p))]: { flex: 0, knee: 0, point: 0 } },
        },
      ])
    }
    case 'frappe': {
      const p = val(ins.perna, env)
      const d = val(ins.dir, env)
      checkWorkingLeg(ctx, id, p, 'o battement frappé')
      const w: Weight = other(p)
      const bs = baseSideOf(ctx)
      // o primeiro frappe leva 1 tempo a mais para o pe ir ao cou-de-pied (flexionado)
      if (ctx.work !== 'coupeFlex')
        emit(ctx, [{ beats: 1, label: 'frappé: pé flexionado no cou-de-pied', weight: w, slide: false, patch: { [L(p)]: COUPE_FLEX } }])
      ctx.work = 'coupeFlex'
      return emit(ctx, [
        { beats: 0.5, label: `battement frappé ${DIR_LABEL[d]}`, weight: w, slide: false, patch: { [L(p)]: air(d, GLISSE, bs) } },
        { beats: 0.5, label: 'volta ao cou-de-pied', weight: w, slide: false, patch: { [L(p)]: COUPE_FLEX } },
      ])
    }
    case 'pasDeCheval': {
      const p = val(ins.perna, env)
      checkWorkingLeg(ctx, id, p, 'o pas de cheval')
      const w: Weight = other(p)
      const bs = baseSideOf(ctx)
      // o primeiro pas de cheval leva 1 tempo a mais para o pe ir ao cou-de-pied
      if (ctx.work !== 'coupe')
        emit(ctx, [{ beats: 1, label: 'pé no cou-de-pied', weight: w, slide: false, patch: { [L(p)]: COUPE } }])
      ctx.work = 'coupe'
      return emit(ctx, [
        { beats: 0.5, label: 'pas de cheval: o pé desenrola', weight: w, slide: false, patch: { [L(p)]: air('devant', 30, bs) } },
        { beats: 0.5, label: 'pas de cheval: pousa a ponta', weight: w, patch: { [L(p)]: chao('devant', bs) } },
        { beats: 1, label: 'volta ao cou-de-pied', weight: w, slide: false, patch: { [L(p)]: COUPE } },
      ])
    }

    // ===== adage =====
    // passe (retire): a ponta sobe ate o joelho e segura
    case 'passe': {
      const p = val(ins.perna, env)
      checkWorkingLeg(ctx, id, p, 'o passé')
      ctx.work = 'passe'
      return emit(ctx, [
        { beats: 1, label: 'passé (retiré)', weight: other(p), slide: false, patch: { [L(p)]: PASSE } },
        { beats: 1, label: 'segura o passé', weight: other(p), slide: false, patch: {} },
      ])
    }
    // developpe: sobe pelo passe, desdobra, segura no alto e desce ate o chao para fechar
    case 'developpe': {
      const p = val(ins.perna, env)
      const d = val(ins.dir, env)
      checkWorkingLeg(ctx, id, p, 'o développé')
      if (ctx.work !== 'passe' && ctx.work !== 'fechado') ensureClosed(ctx, id, p)
      checkCrossed(ctx, id, p, d, 'développé')
      const w: Weight = other(p)
      const bs = baseSideOf(ctx)
      const fromPasse = ctx.work === 'passe'
      const { leg: close, label: fecha } = closeAfter(ctx, p, d)
      ctx.work = 'fechado'
      return emit(ctx, [
        ...(fromPasse ? [] : [{ beats: 1, label: 'développé: sobe pelo passé', weight: w, slide: false, patch: { [L(p)]: PASSE } }]),
        { beats: 1, label: `développé ${DIR_LABEL[d]}`, weight: w, slide: false, patch: { [L(p)]: air(d, DEVELOPPE[d], bs) } },
        { beats: 1, label: 'segura em cima', weight: w, slide: false, patch: {} },
        { beats: 0.5, label: 'desce até o chão', weight: w, slide: false, patch: { [L(p)]: chao(d, bs) } },
        { beats: 0.5, label: fecha, weight: w, patch: { [L(p)]: close } },
      ])
    }
    case 'arabesque': {
      const p = val(ins.perna, env)
      checkWorkingLeg(ctx, id, p, 'a arabesque')
      ensureClosed(ctx, id, p)
      checkCrossed(ctx, id, p, 'derriere', 'arabesque')
      const w: Weight = other(p)
      const bs = baseSideOf(ctx)
      const sup = other(p)
      const tipo = ins.tipo ?? '1'
      const arms0 = { armR: ctx.cur.armR, armL: ctx.cur.armL }
      // RAD: 1a = braco do lado da perna de base a frente; 2a = braco do lado da perna de trabalho a frente;
      // 3a = os dois bracos a frente, o do lado da perna de base mais alto
      const bracos: Patch = !noCentro(ctx)
        ? { [armKey(p)]: ARMS.arabesque }
        : tipo === '1'
          ? { [armKey(sup)]: ARMS.arabesque, [armKey(p)]: ARMS.arabesqueLado }
          : tipo === '2'
            ? { [armKey(p)]: ARMS.arabesque, [armKey(sup)]: ARMS.arabesqueLado }
            : { [armKey(sup)]: ARMS.arabesqueAlto, [armKey(p)]: ARMS.arabesque }
      const { leg: close, label: fecha } = closeAfter(ctx, p, 'derriere')
      const nome = noCentro(ctx) ? `${tipo}ª arabesque` : 'arabesque'
      return emit(ctx, [
        { beats: 1, label: 'tendu derrière', weight: w, patch: { [L(p)]: chao('derriere', bs) } },
        { beats: 1, label: nome, weight: w, slide: false, patch: { [L(p)]: air('derriere', 55, bs), ...bracos, torso: { lean: 12 } } },
        { beats: 1, label: `segura a ${nome}`, weight: w, slide: false, patch: {} },
        { beats: 0.5, label: 'desce até o chão', weight: w, slide: false, patch: { [L(p)]: chao('derriere', bs), ...arms0, torso: { lean: 0 } } },
        { beats: 0.5, label: fecha, weight: w, patch: { [L(p)]: close } },
      ])
    }
    // attitude: sobe pelo passe e abre com o joelho dobrado, devant ou derriere
    case 'attitude': {
      const p = val(ins.perna, env)
      checkWorkingLeg(ctx, id, p, 'a attitude')
      ensureClosed(ctx, id, p)
      checkCrossed(ctx, id, p, ins.dir, 'attitude')
      const w: Weight = other(p)
      const bs = baseSideOf(ctx)
      const { leg: close, label: fecha } = closeAfter(ctx, p, ins.dir)
      const pose = { ...air(ins.dir, ins.dir === 'devant' ? 62 : 58, bs), knee: ins.dir === 'devant' ? 62 : 72 }
      return emit(ctx, [
        { beats: 1, label: 'attitude: sobe pelo passé', weight: w, slide: false, patch: { [L(p)]: PASSE } },
        { beats: 1, label: `attitude ${DIR_LABEL[ins.dir]}`, weight: w, slide: false, patch: { [L(p)]: pose } },
        { beats: 1, label: 'segura a attitude', weight: w, slide: false, patch: {} },
        { beats: 0.5, label: 'desce até o chão', weight: w, slide: false, patch: { [L(p)]: chao(ins.dir, bs) } },
        { beats: 0.5, label: fecha, weight: w, patch: { [L(p)]: close } },
      ])
    }
    // cambre: o tronco inclina para a frente ou para tras e o braco de trabalho acompanha em 5a
    case 'cambre': {
      ensureClosed(ctx, id, outside(ctx))
      const w = outside(ctx)
      const lean = ins.dir === 'devant' ? 42 : -22
      const armOk = !ctx.free
      return emit(ctx, [
        {
          beats: 2,
          label: `cambré ${DIR_LABEL[ins.dir]}`,
          weight: 'both',
          patch: { torso: { lean }, ...(armOk ? { [armKey(w)]: ARMS.quinta } : {}) },
        },
        {
          beats: 2,
          label: 'volta e abre o braço',
          weight: 'both',
          patch: { torso: { lean: 0 }, ...(armOk ? { [armKey(w)]: ARMS.segunda } : {}) },
        },
      ])
    }
    // pirueta: plie, sobe na meia ponta em passe (ou attitude), gira uma ou duas voltas e fecha atras
    case 'pirueta': {
      const p = val(ins.perna, env)
      const sentido = ins.sentido ?? 'endehors'
      const voltas = ins.voltas ?? 1
      const forma = ins.forma ?? 'passe'
      const nome = `pirueta ${voltas === 2 ? 'dupla ' : ''}${SENTIDO_LABEL[sentido]}${forma === 'attitude' ? ' em attitude' : ''}`
      if (forma === 'attitude' && !noCentro(ctx)) diag(ctx, id, 'erro', 'A pirueta em attitude é feita no centro: use antes o bloco "ir para o centro".')
      checkWorkingLeg(ctx, id, p, `a ${nome}`)
      ensureClosed(ctx, id, p)
      if (ctx.pes === '2') diag(ctx, id, 'erro', 'Aqui a pirueta sai da 4ª ou da 5ª posição (ou da 1ª, para começar).')
      const w: Weight = other(p)
      const centro = noCentro(ctx)
      const bs = barreSide(ctx)
      const spin0 = ctx.cur.root.spin
      // en dehors: gira para o lado da perna de trabalho; en dedans: para o lado da perna de base
      const dirGiro = (p === 'R' ? -1 : 1) * (sentido === 'endehors' ? 1 : -1)
      const spin = spin0 + 360 * voltas * dirGiro
      const pose = forma === 'attitude' ? { ...air('derriere', 58, baseSideOf(ctx)), knee: 72 } : PASSE
      const plie = pliePose(30)
      const { leg: close, label: fecha } = POS[ctx.pes].crossed
        ? { leg: closedLeg(ctx, p, false), label: `fecha em ${ctx.pes}ª atrás` }
        : { leg: closedLeg(ctx, p, false), label: `fecha em ${ctx.pes}ª` }
      if (POS[ctx.pes].crossed) ctx.front = other(p)
      const armsUp = { armR: ARMS.primeira, armL: ARMS.primeira }
      const fim: Patch = centro ? { armR: ARMS.segunda, armL: ARMS.segunda } : { [armKey(bs)]: ARMS.barra, [armKey(p)]: ARMS.segunda }
      return emit(ctx, [
        {
          beats: voltas === 2 ? 0.5 : 1,
          label: `preparação da ${nome}: demi-plié`,
          weight: 'both',
          patch: { [L(p)]: plie, [L(other(p))]: plie, ...(centro ? { armR: ARMS.primeira, armL: ARMS.segunda } : { [armKey(p)]: ARMS.primeira }) },
        },
        {
          beats: 0.5,
          label: nome,
          weight: w,
          slide: false,
          patch: { [L(p)]: pose, [L(other(p))]: { flex: 0, knee: 0, point: 58 }, ...(forma === 'attitude' ? { [armKey(p)]: ARMS.quinta, [armKey(other(p))]: ARMS.segunda } : armsUp), root: { spin: spin0 + (spin - spin0) * 0.15 } },
        },
        { beats: voltas === 2 ? 1.5 : 1, label: nome, weight: w, slide: false, patch: { root: { spin } } },
        { beats: 0.5, label: fecha, weight: 'both', patch: { [L(p)]: close, [L(other(p))]: { point: 0 }, ...fim } },
      ])
    }

    // ===== centro =====
    // ir para o centro ou voltar para a barra: solta a barra e anda ate o lugar
    case 'local': {
      ensureClosed(ctx, id, outside(ctx))
      if (ins.onde === ctx.local) {
        diag(ctx, id, 'dica', ins.onde === 'centro' ? 'Ela já está no centro.' : 'Ela já está na barra.')
        return emit(ctx, [{ beats: 2, label: 'pausa', weight: 'both', patch: {} }])
      }
      ctx.prepared = false
      ctx.free = false
      if (ins.onde === 'centro') {
        ctx.local = 'centro'
        ctx.cWork = POS[ctx.pes].crossed ? ctx.front : 'R'
        return emit(ctx, [
          { beats: 1, label: 'solta a barra', weight: 'both', patch: { armR: ARMS.brasBas, armL: ARMS.brasBas } },
          {
            beats: 3,
            label: 'vai para o centro da sala',
            weight: 'both',
            patch: { root: { x: CENTRO.x, z: CENTRO.z, yaw: 0, c: 1, side: ctx.cWork === 'R' ? 1 : -1 }, torso: { lean: 0 } },
          },
        ])
      }
      ctx.local = 'barra'
      return emit(ctx, [
        { beats: 1, label: 'braços em bras bas', weight: 'both', patch: { armR: ARMS.brasBas, armL: ARMS.brasBas, root: virarPara(ctx, 0) } },
        // o spin fica no multiplo de 360 que ela ja esta (senao ela "desgira" todas as voltas das piruetas)
        { beats: 2, label: 'volta para a barra', weight: 'both', patch: { root: { x: 0, z: 0, yaw: 0, c: 0, side: 1, spin: virarPara(ctx, 0).spin } } },
        { beats: 1, label: 'mão na barra', weight: 'both', patch: { armL: ARMS.barra } },
      ])
    }
    case 'direcao': {
      if (!noCentro(ctx)) diag(ctx, id, 'erro', 'As direções do corpo são do centro: use antes o bloco "ir para o centro".')
      ensureClosed(ctx, id, outside(ctx))
      // o pe da frente decide o croise/efface: com o pe direito na frente, croise e virado para a esquerda dela
      const f = (POS[ctx.pes].crossed ? ctx.front : ctx.cWork) === 'R' ? 1 : -1
      const yaw = { enface: 0, croise: 45 * f, efface: -45 * f, ecarte: 45 * f }[ins.dir]
      return emit(ctx, [
        { beats: 2, label: `corpo ${DIRCORPO_LABEL[ins.dir]}`, weight: 'both', patch: { root: virarPara(ctx, yaw) } },
      ])
    }
    // virar para um dos 8 pontos da sala, em 2 tempos
    case 'olharPonto': {
      if (!noCentro(ctx)) diag(ctx, id, 'erro', 'Os pontos da sala são do centro: use antes o bloco "ir para o centro".')
      ensureClosed(ctx, id, outside(ctx))
      const giro = virarPara(ctx, yawDoPonto(ins.n))
      return emit(ctx, [{ beats: 2, label: `vira para o ponto ${ins.n} (${PONTO_LABEL[ins.n]})`, weight: 'both', patch: { root: giro } }])
    }
    case 'irPonto': {
      // pas de bourree couru: na meia ponta, em 5a, com passinhos bem rapidos, ela "corre" ate o ponto
      if (!noCentro(ctx)) diag(ctx, id, 'erro', 'Para viajar até um ponto da sala, ela precisa estar no centro: use antes o bloco "ir para o centro".')
      ensureClosed(ctx, id, outside(ctx))
      if (ctx.pes !== '5') diag(ctx, id, 'erro', 'O pas de bourrée couru sai da 5ª posição: use antes "pés em 5ª".')
      const n = ins.n
      const alvo = PONTO_POS[n]
      const x0 = ctx.cur.root.x
      const z0 = ctx.cur.root.z
      const dist = Math.hypot(alvo.x - x0, alvo.z - z0)
      // no fim: num canto, ela ja fica olhando para o canto oposto (pronta para a diagonal); numa parede, en face
      const fim: Ponto = n % 2 === 0 ? ((((n + 3) % 8) + 1) as Ponto) : 1
      const fimGiro = (c: Ctx | { yaw: number; spin: number }) => virarPara(c, yawDoPonto(fim))
      if (dist < 0.15) {
        diag(ctx, id, 'dica', `Ela já está no ponto ${n}.`)
        return emit(ctx, [{ beats: 2, label: `vira para o ponto ${fim}`, weight: 'both', patch: { root: fimGiro(ctx) } }])
      }
      const d5 = POS['5']
      const fr = ctx.front
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const pe = (s: Side, dobra: number) => ({ ...em5(s === fr), flex: dobra * 0.45, knee: dobra, point: 58 })
      const bl = bracosLivres(ctx)
      // o corpo nao vira para onde vai: como no couru de verdade, ela continua olhando para o mesmo lado
      // (normalmente o publico) e desliza para tras, para o lado ou na diagonal
      const ida = { yaw: ctx.cur.root.yaw, spin: ctx.cur.root.spin }
      const passos = Math.min(14, Math.max(2, 2 * Math.ceil(dist / 0.7))) // meio tempo cada; sempre par: termina no tempo
      const ms: Move[] = [
        {
          beats: 0.5,
          label: 'sobe na meia ponta, em 5ª',
          weight: 'both',
          patch: { legR: pe('R', 0), legL: pe('L', 0), root: ida, ...bracos2(bl, ARMS.demiSeconde) },
        },
      ]
      // cada passinho: um pe sai um tiquinho do chao e volta (meio tempo); o peso so troca com os dois pes juntos
      const em = (q: number) => ({ x: x0 + ((alvo.x - x0) * q) / (2 * passos), z: z0 + ((alvo.z - z0) * q) / (2 * passos) })
      for (let k = 1; k <= passos; k++) {
        const s: Side = k % 2 ? 'R' : 'L'
        const nome = `pas de bourrée couru até o ponto ${n}`
        ms.push({
          beats: 0.25,
          label: nome,
          weight: 'both',
          slide: false,
          ease: k === 1 ? 'cai' : 'linear',
          patch: { [L(s)]: pe(s, 9), root: em(2 * k - 1) },
        })
        ms.push({
          beats: 0.25,
          label: nome,
          weight: 'both',
          slide: false,
          ease: k === passos ? 'sobe' : 'linear',
          patch: { [L(s)]: pe(s, 0), root: em(2 * k) },
        })
      }
      // virada grande: 1 tempo inteiro, ja juntando os pes; pequena: junta e vira em meio tempo cada
      const giroFim = fimGiro(ida)
      const grande = Math.abs(giroFim.yaw + giroFim.spin - (ida.yaw + ida.spin)) > 90
      const virada = `vira para o ponto ${fim} (${PONTO_LABEL[fim]})`
      if (grande) ms.push({ beats: 1, label: virada, weight: 'both', patch: { legR: pe('R', 0), legL: pe('L', 0), root: giroFim } })
      else {
        ms.push({ beats: 0.5, label: 'pas de bourrée couru: junta os pés', weight: 'both', patch: { legR: pe('R', 0), legL: pe('L', 0) } })
        ms.push({ beats: 0.5, label: virada, weight: 'both', patch: { root: giroFim } })
      }
      ms.push({ beats: 0.5, label: 'desce em 5ª', weight: 'both', patch: { legR: { point: 0 }, legL: { point: 0 }, ...bracos2(bl, ARMS.brasBas) } })
      return emit(ctx, ms)
    }
    case 'fouette': {
      const p = val(ins.perna, env)
      if (!noCentro(ctx)) diag(ctx, id, 'erro', 'O fouetté de adage é feito no centro: use antes o bloco "ir para o centro".')
      checkWorkingLeg(ctx, id, p, 'o fouetté de adage')
      ensureClosed(ctx, id, p)
      const w: Weight = other(p)
      const bs = baseSideOf(ctx)
      // developpe a la seconde e o corpo vira 90 graus para longe da perna: ela termina atras, em arabesque
      const yaw = ctx.cur.root.yaw + (p === 'R' ? 90 : -90)
      const sup = other(p)
      ctx.front = other(p)
      const close = closedLeg(ctx, p, false)
      return emit(ctx, [
        { beats: 1, label: 'fouetté de adage: passé', weight: w, slide: false, patch: { [L(p)]: PASSE } },
        {
          beats: 1,
          label: 'développé à la seconde',
          weight: w,
          slide: false,
          patch: { [L(p)]: air('seconde', 80, bs), armR: ARMS.segunda, armL: ARMS.segunda },
        },
        { beats: 1, label: 'segura à la seconde', weight: w, slide: false, patch: {} },
        {
          beats: 2,
          label: 'fouetté: o corpo vira e a perna fica em arabesque',
          weight: w,
          slide: false,
          patch: {
            [L(p)]: air('derriere', 62, bs),
            root: { yaw },
            [armKey(sup)]: ARMS.arabesque,
            [armKey(p)]: ARMS.arabesqueLado,
            torso: { lean: 10 },
          },
        },
        { beats: 1, label: 'segura a arabesque', weight: w, slide: false, patch: {} },
        {
          beats: 1,
          label: 'desce até o chão',
          weight: w,
          slide: false,
          patch: { [L(p)]: chao('derriere', bs), torso: { lean: 0 }, armR: ARMS.segunda, armL: ARMS.segunda },
        },
        { beats: 1, label: `fecha em ${ctx.pes}ª atrás`, weight: w, patch: { [L(p)]: close } },
      ])
    }
    case 'saute':
    case 'changement':
    case 'echappe': {
      ensureClosed(ctx, id, outside(ctx))
      const nome = { saute: 'sauté', changement: 'changement', echappe: 'échappé sauté' }[ins.t]
      if (ins.t !== 'saute' && ctx.pes !== '5') diag(ctx, id, 'erro', `O ${nome} sai da 5ª posição: use antes "pés em 5ª".`)
      if (ins.t === 'saute' && POS[ctx.pes].crossed && ctx.pes !== '5')
        diag(ctx, id, 'dica', 'O sauté costuma ser feito na 1ª, 2ª ou 5ª posição.')
      const plie = pliePose(28)
      const reto = { flex: 0, knee: 0, point: 0 }
      const d5 = POS['5']
      const d2 = POS['2']
      const wk = POS[ctx.pes].crossed ? ctx.front : outside(ctx)
      const pos5 = (_frente: Side, fwdSign: 1 | -1) => ({ fwd: (fwdSign * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const ar = { flex: 0, knee: 0, point: 86 }
      // um pulo: impulso (sai rapido e freia no alto) → cai (acelera ate tocar o chao com a ponta)
      // → amortece no demi-plie (rapido no comeco, macio no fim)
      /*************************************************************************
       * pulo
       * funcao: os movimentos de um pulo: impulso, queda e amortecimento no
       * demi plie.
       * recebe: labelAr e pernasAr (texto e pose no ar), labelChao e pernasChao
       * (texto e pose ao cair).
       * retorna: a lista de Move do pulo.
       ************************************************************************/
      const pulo = (labelAr: string, pernasAr: Patch, labelChao: string, pernasChao: Patch): Move[] => [
        { beats: 0.25, label: labelAr, weight: 'both', ease: 'sobe', patch: { ...pernasAr, root: { lift: 0.15 } } },
        {
          beats: 0.25,
          label: labelChao,
          weight: 'both',
          ease: 'cai',
          patch: {
            root: { lift: 0 },
            legR: { ...(pernasChao.legR as object), flex: 0, knee: 0, point: 35 },
            legL: { ...(pernasChao.legL as object), flex: 0, knee: 0, point: 35 },
          },
        },
        {
          beats: 0.5,
          label: labelChao,
          weight: 'both',
          ease: 'sobe',
          patch: { legR: { ...(pernasChao.legR as object), ...plie }, legL: { ...(pernasChao.legL as object), ...plie } },
        },
      ]
      const prepara: Move = { beats: 0.5, label: 'demi-plié', weight: 'both', patch: { legR: plie, legL: plie } }
      const estica: Move = { beats: 0.5, label: 'estica', weight: 'both', patch: { legR: reto, legL: reto } }
      if (ins.t === 'saute')
        return emit(ctx, [prepara, ...pulo('sauté!', { legR: ar, legL: ar }, 'cai em demi-plié', { legR: {}, legL: {} }), estica])
      if (ins.t === 'changement') {
        const novo = other(wk)
        ctx.front = novo
        const noAr = { ...ar, fwd: 0, side: -2 }
        return emit(ctx, [
          prepara,
          ...pulo(
            'changement: troca os pés no ar',
            { legR: noAr, legL: noAr },
            `cai em 5ª com a ${SIDE_LABEL[novo]} na frente`,
            { [L(novo)]: pos5(novo, 1), [L(other(novo))]: pos5(other(novo), -1) },
          ),
          estica,
        ])
      }
      const bl = bracosLivres(ctx)
      const abre = { ...ar, fwd: 0, side: 5 }
      const fecha = { ...ar, fwd: 0, side: -2 }
      const em2 = { fwd: 0, side: d2.side, turnout: d2.turnout }
      return emit(ctx, [
        prepara,
        ...pulo('échappé: abre no ar', { legR: abre, legL: abre, ...bracos2(bl, ARMS.demiSeconde) }, 'cai em 2ª, em demi-plié', { legR: em2, legL: em2 }),
        { beats: 0.5, label: 'em 2ª, em demi-plié', weight: 'both', patch: {} },
        ...pulo('échappé: fecha no ar', { legR: fecha, legL: fecha, ...bracos2(bl, ARMS.brasBas) }, 'cai em 5ª, em demi-plié', {
          [L(wk)]: pos5(wk, 1),
          [L(other(wk))]: pos5(other(wk), -1),
        }),
        { beats: 1, label: 'estica', weight: 'both', patch: { legR: reto, legL: reto } },
      ])
    }
    // reverence: abre os bracos, agradece com plie e a perna atras, e volta
    case 'reverence': {
      ensureClosed(ctx, id, outside(ctx))
      const p = outside(ctx)
      const w: Weight = other(p)
      const bs = baseSideOf(ctx)
      const centro = noCentro(ctx)
      const abre: Patch = centro ? { armR: ARMS.demiSeconde, armL: ARMS.demiSeconde } : { [armKey(p)]: ARMS.demiSeconde }
      const fecha: Patch = centro ? { armR: ARMS.brasBas, armL: ARMS.brasBas } : { [armKey(p)]: ARMS.brasBas }
      const front = ctx.front === p
      ctx.prepared = false
      return emit(ctx, [
        // no centro, ela agradece de frente para o publico (mesmo que estivesse virada para um canto)
        { beats: 1, label: 'révérence: abre os braços', weight: w, patch: { [L(p)]: chao('derriere', bs), ...abre, ...(centro ? { root: virarPara(ctx, 0) } : {}) } },
        { beats: 1.5, label: 'révérence: agradece', weight: w, patch: { [L(other(p))]: pliePose(26), [L(p)]: { ...outAt('derriere', tenduEmPlie(26) + 1, bs) }, torso: { lean: 14 } } },
        { beats: 0.5, label: 'révérence', weight: w, patch: {} },
        { beats: 1, label: 'révérence: volta', weight: w, patch: { [L(other(p))]: { flex: 0, knee: 0, point: 0 }, [L(p)]: closedLeg(ctx, p, front), torso: { lean: 0 }, ...fecha } },
      ])
    }

    // ===== deslocamentos e grand allegro (centro) =====
    case 'glissade': {
      // glissade: a perna indicada desliza para o lado, ela viaja para esse lado e a outra fecha. nao troca os pes.
      const p = val(ins.perna, env)
      const o = other(p)
      allegroPronto(ctx, id, 'A glissade', p)
      const d5 = POS['5']
      const pFrente = ctx.front === p
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const plie = pliePose(26)
      const reto = { flex: 0, knee: 0, point: 0 }
      const alvo = destino(ctx, id, p, 0.4)
      const nome = `glissade ${pFrente ? 'devant' : 'derrière'}`
      const bl = bracosLivres(ctx)
      const ponta = (lado: number) => ({ fwd: 0, side: lado, turnout: TURNOUT, flex: 0, knee: 0, point: 86 })
      const abre = tenduEmPlie(26) // a perna de base esta em plie: a perna que desliza abre um pouco mais
      return emit(ctx, [
        { beats: 0.25, label: `${nome}: demi-plié`, weight: 'both', patch: { legR: plie, legL: plie } },
        { beats: 0.375, label: `${nome}: a perna ${SIDE_LABEL[p]} desliza`, weight: o, patch: { ...bracos2(bl, ARMS.demiSeconde),  [L(p)]: ponta(abre) } },
        {
          // empurra o chao: as duas pontas esticadas, rentinho, e o corpo atravessa para o lado
          beats: 0.375,
          label: `${nome}: desliza no ar`,
          weight: o,
          ease: 'sobe',
          slide: false,
          patch: { [L(p)]: ponta(abre), [L(o)]: ponta(TENDU_ANGLE - 4), root: { ...meio(ctx, alvo, 0.55), lift: 0.06 } },
        },
        {
          beats: 0.25,
          label: `${nome}: pousa na perna ${SIDE_LABEL[p]}`,
          weight: p,
          ease: 'cai',
          patch: { [L(p)]: { ...em5(pFrente), ...plie }, [L(o)]: ponta(abre), root: { ...alvo, lift: 0 } },
        },
        { beats: 0.25, label: `${nome}: fecha em 5ª`, weight: p, patch: { [L(o)]: { ...em5(!pFrente), ...plie } } },
        { beats: 0.5, label: 'estica', weight: 'both', patch: { ...bracos2(bl, ARMS.brasBas),  legR: reto, legL: reto } },
      ])
    }
    case 'pasDeBourree': {
      // pas de bourree dessous: a perna da frente pisa atras, a outra pisa ao lado, a primeira fecha na frente
      const p = val(ins.perna, env)
      const o = other(p)
      allegroPronto(ctx, id, 'O pas de bourrée', p)
      if (ctx.pes === '5' && ctx.front !== p)
        diag(ctx, id, 'erro', `O pas de bourrée dessous começa com o pé da frente. Agora a perna da frente é a ${SIDE_LABEL[ctx.front]}.`)
      const d5 = POS['5']
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const meia = { flex: 0, knee: 0, point: 58 }
      const bl = bracosLivres(ctx)
      const alvo = destino(ctx, id, o, 0.3)
      ctx.front = p
      return emit(ctx, [
        { beats: 0.375, label: 'pas de bourrée: demi-plié e coupé', weight: o, slide: false, patch: { [L(o)]: pliePose(26), [L(p)]: PDB_COUPE } },
        {
          beats: 0.375,
          label: 'pas de bourrée: pisa atrás, na meia ponta',
          weight: 'both',
          slide: false,
          patch: { ...bracos2(bl, ARMS.demiSeconde),  [L(p)]: { ...em5(false), ...meia }, [L(o)]: { ...em5(true), ...meia }, root: meio(ctx, alvo, 0.15) },
        },
        {
          beats: 0.375,
          label: 'pas de bourrée: pisa ao lado, na meia ponta',
          weight: 'both',
          slide: false,
          patch: { [L(o)]: { fwd: 0, side: 6, turnout: d5.turnout, ...meia }, root: alvo },
        },
        { beats: 0.25, label: 'pas de bourrée: coupé na frente', weight: o, slide: false, patch: { [L(p)]: PDB_COUPE } },
        { beats: 0.25, label: 'pas de bourrée: fecha na frente em demi-plié', weight: 'both', patch: { [L(p)]: { ...em5(true), ...pliePose(26) }, [L(o)]: { ...em5(false), ...pliePose(26) } } },
        { beats: 0.375, label: 'estica', weight: 'both', patch: { ...bracos2(bl, ARMS.brasBas),  legR: { flex: 0, knee: 0, point: 0 }, legL: { flex: 0, knee: 0, point: 0 } } },
      ])
    }
    case 'balance': {
      // balance de cote (valsa): pisa ao lado em demi-plie, troca o peso na meia ponta atras, volta ao demi-plie
      const p = val(ins.perna, env)
      const o = other(p)
      if (!noCentro(ctx)) diag(ctx, id, 'erro', 'O balancé é um passo do centro: use antes o bloco "ir para o centro".')
      ensureClosed(ctx, id, outside(ctx))
      if (!FECHADAS.includes(ctx.pes)) diag(ctx, id, 'erro', `O balancé sai de uma posição fechada (1ª, 3ª ou 5ª). Agora ela está em ${ctx.pes}ª.`)
      if (noCentro(ctx) && ctx.cWork !== p) {
        ctx.cWork = p
        ctx.pending = { root: { side: p === 'R' ? 1 : -1 } }
      }
      const d5 = POS['5']
      const bl = bracosLivres(ctx)
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const alvo = destino(ctx, id, p, 0.26)
      ctx.pes = '5'
      ctx.front = p
      return emit(ctx, [
        {
          beats: 0.75,
          label: `balancé para a ${SIDE_LABEL[p]}: pisa ao lado`,
          weight: p,
          patch: { ...bracos2(bl, ARMS.demiSeconde), 
            [L(p)]: { fwd: 0, side: 3, turnout: TURNOUT, ...pliePose(28) },
            [L(o)]: { ...chao('seconde', d5.side), side: tenduEmPlie(28), turnout: TURNOUT },
            root: alvo,
            torso: { lean: 0 },
          },
        },
        {
          beats: 0.5,
          label: 'balancé: meia ponta atrás',
          weight: 'both',
          patch: { [L(o)]: { ...em5(false), flex: 0, knee: 0, point: 50 }, [L(p)]: { ...em5(true), flex: 0, knee: 0, point: 50 } },
        },
        { beats: 0.5, label: 'balancé: demi-plié', weight: p, slide: false, patch: { [L(p)]: pliePose(26), [L(o)]: { ...PDB_COUPE, fwd: -10 } } },
        { beats: 0.25, label: 'balancé: fecha em 5ª', weight: 'both', patch: { ...bracos2(bl, ARMS.brasBas),  [L(o)]: { ...em5(false), flex: 0, knee: 0, point: 0 }, [L(p)]: { flex: 0, knee: 0, point: 0 } } },
      ])
    }
    case 'assemble': {
      // assemble dessus: a perna de tras escova para o lado, as pernas se juntam no ar e ela cai em 5a com essa perna na frente
      const p = val(ins.perna, env)
      const o = other(p)
      allegroPronto(ctx, id, 'O assemblé', p)
      if (ctx.pes === '5' && ctx.front === p)
        diag(ctx, id, 'erro', `No assemblé dessus, quem escova é a perna de trás. Agora a perna ${SIDE_LABEL[p]} está na frente: use a ${SIDE_LABEL[o]}.`)
      const d5 = POS['5']
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const plie = pliePose(28)
      const bl = bracosLivres(ctx)
      const alvo = destino(ctx, id, p, 0.08)
      ctx.front = p
      return emit(ctx, [
        { beats: 0.5, label: 'assemblé: demi-plié', weight: 'both', patch: { legR: plie, legL: plie } },
        { beats: 0.25, label: `assemblé: a perna ${SIDE_LABEL[p]} escova para o lado`, weight: o, slide: false, patch: { [L(p)]: air('seconde', 45, d5.side) } },
        {
          beats: 0.375,
          label: 'assemblé: junta as pernas no ar',
          weight: 'both',
          ease: 'sobe',
          slide: false,
          patch: { ...bracos2(bl, ARMS.demiSeconde),  [L(p)]: { ...em5(true), flex: 0, knee: 0, point: 86 }, [L(o)]: { ...em5(false), flex: 0, knee: 0, point: 86 }, root: { ...meio(ctx, alvo, 0.5), lift: 0.17 } },
        },
        {
          beats: 0.25,
          label: 'assemblé: cai em 5ª',
          weight: 'both',
          ease: 'cai',
          patch: { [L(p)]: { point: 35 }, [L(o)]: { point: 35 }, root: { ...alvo, lift: 0 } },
        },
        { beats: 0.25, label: 'assemblé: amortece em demi-plié', weight: 'both', ease: 'sobe', patch: { legR: plie, legL: plie } },
        { beats: 0.375, label: 'estica', weight: 'both', patch: { ...bracos2(bl, ARMS.brasBas),  legR: { flex: 0, knee: 0, point: 0 }, legL: { flex: 0, knee: 0, point: 0 } } },
      ])
    }
    case 'sissonne': {
      // sissonne fermee de cote: pula dos dois pes, a perna indicada abre para o lado,
      // ela viaja para o lado contrario, cai na outra perna e fecha na frente (dessus)
      const p = val(ins.perna, env)
      const o = other(p)
      allegroPronto(ctx, id, 'A sissonne', p)
      const d5 = POS['5']
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const plie = pliePose(28)
      const bl = bracosLivres(ctx)
      const alvo = destino(ctx, id, o, 0.42)
      const oFrente = ctx.front === o
      ctx.front = p
      return emit(ctx, [
        { beats: 0.5, label: 'sissonne: demi-plié', weight: 'both', patch: { legR: plie, legL: plie } },
        {
          beats: 0.375,
          label: `sissonne: abre a perna ${SIDE_LABEL[p]} no ar`,
          weight: 'both',
          ease: 'sobe',
          slide: false,
          patch: { ...bracos2(bl, ARMS.demiSeconde), 
            [L(p)]: air('seconde', 48, d5.side),
            [L(o)]: { ...em5(oFrente), flex: 0, knee: 0, point: 86 },
            root: { ...meio(ctx, alvo, 0.65), lift: 0.2 },
          },
        },
        {
          beats: 0.25,
          label: `sissonne: cai na perna ${SIDE_LABEL[o]}`,
          weight: 'both',
          ease: 'cai',
          slide: false,
          patch: { [L(o)]: { point: 35 }, [L(p)]: air('seconde', 38, d5.side), root: { ...alvo, lift: 0 } },
        },
        { beats: 0.25, label: 'sissonne: amortece', weight: o, ease: 'sobe', slide: false, patch: { [L(o)]: plie, [L(p)]: air('seconde', 30, d5.side) } },
        { beats: 0.25, label: 'sissonne: fecha em 5ª na frente', weight: 'both', patch: { [L(p)]: { ...em5(true), ...plie }, [L(o)]: { ...em5(false), ...plie } } },
        { beats: 0.375, label: 'estica', weight: 'both', patch: { ...bracos2(bl, ARMS.brasBas),  legR: { flex: 0, knee: 0, point: 0 }, legL: { flex: 0, knee: 0, point: 0 } } },
      ])
    }
    case 'grandJete': {
      // grand jete en avant: lanca a perna da frente, voa em grand ecart, cai nela com a outra em arabesque
      const p = val(ins.perna, env)
      const o = other(p)
      allegroPronto(ctx, id, 'O grand jeté', p)
      if (ctx.pes === '5' && ctx.front !== p)
        diag(ctx, id, 'erro', `O grand jeté en avant é lançado pela perna da frente. Agora a perna ${SIDE_LABEL[p]} está atrás: use a ${SIDE_LABEL[ctx.front]}.`)
      const d5 = POS['5']
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const plie = pliePose(30)
      const alvo = destino(ctx, id, 'frente', 1.0)
      const antes = { armR: ctx.cur.armR, armL: ctx.cur.armL }
      // no alto, o ponto mais baixo e o pe de tras: o "lift" compensa a perna inclinada
      const TRAS = 52
      const voo = 0.3 + LEG_LEN * (1 - Math.cos((TRAS * Math.PI) / 180))
      const bracos = { [armKey(p)]: ARMS.arabesque, [armKey(o)]: ARMS.arabesqueLado }
      ctx.front = p
      return emit(ctx, [
        { beats: 0.5, label: 'grand jeté: demi-plié', weight: 'both', patch: { legR: plie, legL: plie, armR: ARMS.primeira, armL: ARMS.primeira } },
        {
          beats: 0.5,
          label: `grand jeté: lança a perna ${SIDE_LABEL[p]}`,
          weight: o,
          slide: false,
          patch: { [L(p)]: air('devant', 50, d5.side), [L(o)]: pliePose(34), root: meio(ctx, alvo, 0.08), torso: { lean: 4 } },
        },
        {
          beats: 0.75,
          label: 'grand jeté: voa em grand écart!',
          weight: 'both',
          ease: 'sobe',
          slide: false,
          patch: {
            [L(p)]: air('devant', 86, d5.side),
            [L(o)]: air('derriere', TRAS, d5.side),
            root: { ...meio(ctx, alvo, 0.6), lift: voo },
            torso: { lean: 6 },
            ...bracos,
          },
        },
        {
          beats: 0.5,
          label: `grand jeté: cai na perna ${SIDE_LABEL[p]}`,
          weight: 'both',
          ease: 'cai',
          slide: false,
          patch: { [L(p)]: { fwd: 6, side: d5.side, flex: 0, knee: 0, point: 35 }, [L(o)]: air('derriere', 48, d5.side), root: { ...alvo, lift: 0 } },
        },
        { beats: 0.5, label: 'grand jeté: amortece em arabesque', weight: p, ease: 'sobe', slide: false, patch: { [L(p)]: { ...pliePose(30), fwd: 0 }, [L(o)]: air('derriere', 45, d5.side), torso: { lean: 10 } } },
        { beats: 0.5, label: 'grand jeté: segura a arabesque', weight: p, slide: false, patch: { [L(p)]: { flex: 0, knee: 0, point: 0 } } },
        { beats: 0.75, label: 'fecha em 5ª atrás', weight: 'both', patch: { [L(o)]: { ...em5(false), flex: 0, knee: 0, point: 0 }, [L(p)]: em5(true), torso: { lean: 0 }, ...antes } },
      ])
    }

    case 'pasDeChat': {
      // pas de chat: a perna de tras sobe em retire, depois a outra; ela viaja para o lado e fecha na frente
      const p = val(ins.perna, env)
      const o = other(p)
      allegroPronto(ctx, id, 'O pas de chat', p)
      if (ctx.pes === '5' && ctx.front === p)
        diag(ctx, id, 'erro', `O pas de chat sai com a perna de trás. Agora a perna ${SIDE_LABEL[p]} está na frente: use a ${SIDE_LABEL[o]}.`)
      const d5 = POS['5']
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const plie = pliePose(28)
      const bl = bracosLivres(ctx)
      const alvo = destino(ctx, id, p, 0.45)
      const retire = { ...PASSE, side: 18 }
      ctx.front = o
      return emit(ctx, [
        { beats: 0.5, label: 'pas de chat: demi-plié', weight: 'both', patch: { legR: plie, legL: plie } },
        {
          beats: 0.375,
          label: `pas de chat: a perna ${SIDE_LABEL[p]} sobe em retiré`,
          weight: 'both',
          ease: 'sobe',
          slide: false,
          patch: { ...bracos2(bl, ARMS.demiSeconde),  [L(p)]: retire, [L(o)]: { flex: 0, knee: 0, point: 86 }, root: { ...meio(ctx, alvo, 0.45), lift: 0.08 } },
        },
        {
          beats: 0.25,
          label: 'pas de chat: a outra perna sobe também',
          weight: 'both',
          slide: false,
          patch: { [L(o)]: { ...PASSE, side: 22 }, root: { ...meio(ctx, alvo, 0.8), lift: PULO_RETIRE } },
        },
        {
          beats: 0.25,
          label: `pas de chat: cai na perna ${SIDE_LABEL[p]}`,
          weight: 'both',
          ease: 'cai',
          slide: false,
          patch: { [L(p)]: { ...em5(false), flex: 0, knee: 0, point: 35 }, root: { ...alvo, lift: 0 } },
        },
        { beats: 0.25, label: 'pas de chat: fecha na frente', weight: p, slide: false, patch: { [L(p)]: plie, [L(o)]: { ...em5(true), ...plie } } },
        { beats: 0.375, label: 'estica', weight: 'both', patch: { ...bracos2(bl, ARMS.brasBas),  legR: { flex: 0, knee: 0, point: 0 }, legL: { flex: 0, knee: 0, point: 0 } } },
      ])
    }
    case 'pique': {
      // pique: pisa direto na meia ponta com a perna esticada; a outra vai para o retire (ou arabesque)
      const p = val(ins.perna, env)
      const o = other(p)
      const forma = ins.forma
      allegroPronto(ctx, id, 'O piqué', p)
      const d5 = POS['5']
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const bs = d5.side
      const arms0 = { armR: ctx.cur.armR, armL: ctx.cur.armL }
      const alvo = destino(ctx, id, forma === 'arabesque' ? 'frente' : p, 0.45)
      const spin0 = ctx.cur.root.spin
      const spin = spin0 + 360 * (p === 'R' ? -1 : 1) // en dedans: gira para o lado da perna que pisa
      const nome = `piqué ${PIQUE_LABEL[forma]}`
      const livre = forma === 'arabesque' ? air('derriere', 55, bs) : PASSE
      const bracos: Patch =
        forma === 'arabesque'
          ? { [armKey(p)]: ARMS.arabesque, [armKey(o)]: ARMS.arabesqueLado }
          : forma === 'giro'
            ? { armR: ARMS.primeira, armL: ARMS.primeira }
            : { armR: ARMS.quinta, armL: ARMS.quinta }
      ctx.front = p
      return emit(ctx, [
        {
          beats: 0.5,
          label: `${nome}: demi-plié e a perna sai`,
          weight: o,
          slide: false,
          patch: { [L(o)]: pliePose(28), [L(p)]: air(forma === 'arabesque' ? 'devant' : 'seconde', 42, bs), armR: ARMS.segunda, armL: ARMS.segunda },
        },
        {
          beats: 0.5,
          label: `${nome}: pisa na meia ponta`,
          weight: 'both',
          slide: false,
          patch: {
            [L(p)]: { fwd: 0, side: bs, turnout: d5.turnout, flex: 0, knee: 0, point: 58 },
            [L(o)]: livre,
            root: alvo,
            torso: { lean: forma === 'arabesque' ? 10 : 0 },
            ...bracos,
          },
        },
        {
          beats: 0.375,
          label: forma === 'giro' ? `${nome}: gira!` : `${nome}: segura`,
          weight: p,
          slide: false,
          patch: forma === 'giro' ? { root: { spin } } : {},
        },
        {
          beats: 0.375,
          label: 'fecha em 5ª atrás, em demi-plié',
          weight: 'both',
          patch: { [L(o)]: { ...em5(false), ...pliePose(26) }, [L(p)]: { ...em5(true), ...pliePose(26) }, torso: { lean: 0 }, ...arms0 },
        },
        { beats: 0.25, label: 'estica', weight: 'both', patch: { legR: { flex: 0, knee: 0, point: 0 }, legL: { flex: 0, knee: 0, point: 0 } } },
      ])
    }
    case 'fouetteGiro': {
      // fouette rond de jambe en tournant: plie, a perna estica devant, chicoteia para a seconde e volta ao passe girando
      const p = val(ins.perna, env)
      const o = other(p)
      if (!noCentro(ctx)) diag(ctx, id, 'erro', 'Os fouettés en tournant são do centro: use antes o bloco "ir para o centro".')
      const emenda = ctx.emFouette === p && ctx.work === 'passe'
      const ms: Move[] = []
      if (!emenda) {
        if (ctx.emFouette) fechaFouette(ctx)
        ensureClosed(ctx, id, outside(ctx))
        if (!['4', '5'].includes(ctx.pes)) diag(ctx, id, 'erro', 'Os fouettés começam da 4ª ou da 5ª posição: use antes "pés em 5ª".')
        ms.push({
          beats: 1,
          label: 'fouetté: preparação em demi-plié',
          weight: 'both',
          patch: { legR: pliePose(30), legL: pliePose(30), [armKey(p)]: ARMS.primeira, [armKey(o)]: ARMS.segunda },
        })
      }
      if (noCentro(ctx) && ctx.cWork !== p) {
        ctx.cWork = p
        ctx.pending = { root: { side: p === 'R' ? 1 : -1 } }
      }
      const bs = POS['5'].side
      const spin0 = ctx.cur.root.spin
      const spin = spin0 + 360 * (p === 'R' ? -1 : 1) // en dehors
      ms.push(
        {
          beats: 0.5,
          label: 'fouetté: a perna estica devant',
          weight: o,
          slide: false,
          patch: { [L(o)]: pliePose(26), [L(p)]: air('devant', 50, bs), armR: ARMS.segunda, armL: ARMS.segunda },
        },
        // a perna passa pela diagonal no alto (sem "cair" no meio do caminho)
        { beats: 0.25, label: 'fouetté: chicoteia para a seconde', weight: o, slide: false, patch: { [L(p)]: { fwd: 38, side: 38, flex: 0, knee: 0, point: 86 } } },
        { beats: 0.25, label: 'fouetté: chicoteia para a seconde', weight: o, slide: false, patch: { [L(p)]: air('seconde', 48, bs) } },
        {
          beats: 1,
          label: 'fouetté: passé e gira!',
          weight: o,
          slide: false,
          patch: { [L(p)]: PASSE, [L(o)]: { flex: 0, knee: 0, point: 58 }, armR: ARMS.primeira, armL: ARMS.primeira, root: { spin } },
        },
      )
      ctx.work = 'passe'
      ctx.emFouette = p
      return emit(ctx, ms)
    }
    case 'soutenu': {
      // soutenu en tournant: tendu a la seconde, fecha na frente subindo para a meia ponta e gira; o outro pe termina na frente
      const p = val(ins.perna, env)
      const o = other(p)
      allegroPronto(ctx, id, 'O soutenu', p)
      const d5 = POS['5']
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const spin0 = ctx.cur.root.spin
      const spin = spin0 + 360 * (o === 'R' ? -1 : 1) // gira para o lado do pe de tras
      const arms0 = { armR: ctx.cur.armR, armL: ctx.cur.armL }
      ctx.front = o
      return emit(ctx, [
        {
          beats: 0.5,
          label: 'soutenu: demi-plié e tendu à la seconde',
          weight: o,
          patch: { [L(o)]: pliePose(26), [L(p)]: { ...chao('seconde', d5.side), side: tenduEmPlie(26), turnout: TURNOUT }, armR: ARMS.segunda, armL: ARMS.segunda },
        },
        {
          beats: 0.5,
          label: 'soutenu: fecha na frente, na meia ponta',
          weight: 'both',
          patch: { [L(p)]: { ...em5(true), flex: 0, knee: 0, point: 58 }, [L(o)]: { ...em5(false), flex: 0, knee: 0, point: 58 }, armR: ARMS.quinta, armL: ARMS.quinta },
        },
        {
          beats: 0.75,
          label: 'soutenu en tournant',
          weight: 'both',
          patch: { [L(o)]: { ...em5(true), point: 58 }, [L(p)]: { ...em5(false), point: 58 }, root: { spin } },
        },
        { beats: 0.25, label: `desce em 5ª, a ${SIDE_LABEL[o]} na frente`, weight: 'both', patch: { legR: { point: 0 }, legL: { point: 0 }, ...arms0 } },
      ])
    }
    case 'tombe': {
      // tombe: a perna sai no ar e o corpo "cai" nela em demi-plie, viajando; a outra fica esticada e depois fecha
      const p = val(ins.perna, env)
      const o = other(p)
      const d = val(ins.dir, env)
      allegroPronto(ctx, id, 'O tombé', p)
      const d5 = POS['5']
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const bs = d5.side
      const bl = bracosLivres(ctx)
      const alvo = d === 'seconde' ? destino(ctx, id, p, 0.4) : destino(ctx, id, 'frente', d === 'devant' ? 0.4 : -0.4)
      const oposta: Dir = d === 'devant' ? 'derriere' : d === 'derriere' ? 'devant' : 'seconde'
      const abre = tenduEmPlie(30) + 1.5 // um tiquinho a mais: a ponta fica rente, sem entrar no chao
      const oFrente = d === 'derriere'
      ctx.front = oFrente ? o : p
      return emit(ctx, [
        {
          beats: 0.5,
          label: `tombé ${DIR_LABEL[d]}: a perna sai`,
          weight: o,
          slide: false,
          patch: { [L(o)]: { flex: 0, knee: 0, point: 40 }, [L(p)]: air(d, 40, bs) },
        },
        {
          beats: 0.5,
          label: `tombé ${DIR_LABEL[d]}: cai em demi-plié`,
          weight: 'both',
          ease: 'cai',
          patch: { ...bracos2(bl, ARMS.demiSeconde), 
            [L(p)]: { fwd: 0, side: bs, turnout: d5.turnout, ...pliePose(30) },
            [L(o)]: { ...outAt(oposta, abre, bs), turnout: TURNOUT, flex: 0, knee: 0, point: 86 },
            root: alvo,
          },
        },
        // a perna de base estica enquanto a outra desliza de volta: a ponta vem rente ao chao, como num tendu
        { beats: 0.75, label: 'fecha em 5ª', weight: p, patch: { [L(o)]: { ...em5(oFrente), flex: 0, knee: 0, point: 0 }, [L(p)]: { flex: 0, knee: 0, point: 0 } } },
        { beats: 0.25, label: 'fecha em 5ª', weight: 'both', patch: { ...bracos2(bl, ARMS.brasBas), } },
      ])
    }
    case 'chasse': {
      // chasse: a perna desliza, o peso passa por ela em demi-plie e a de tras "persegue" a da frente num pulinho
      const p = val(ins.perna, env)
      const o = other(p)
      const d = ins.dir
      allegroPronto(ctx, id, 'O chassé', p)
      const d5 = POS['5']
      const em5 = (frente: boolean) => ({ fwd: ((frente ? 1 : -1) * d5.offset) / 2, side: d5.side, turnout: d5.turnout })
      const plie = pliePose(28)
      const bl = bracosLivres(ctx)
      const alvo = d === 'seconde' ? destino(ctx, id, p, 0.6) : destino(ctx, id, 'frente', 0.6)
      const abre = tenduEmPlie(28)
      const aberto = d === 'seconde' ? { fwd: 0, side: 10, turnout: TURNOUT } : { fwd: 12, side: d5.side, turnout: d5.turnout }
      const atras = d === 'seconde' ? { fwd: 0, side: 10, turnout: TURNOUT } : { fwd: -12, side: d5.side, turnout: d5.turnout }
      ctx.front = p
      return emit(ctx, [
        { beats: 0.25, label: 'chassé: demi-plié', weight: 'both', patch: { legR: plie, legL: plie } },
        {
          beats: 0.5,
          label: `chassé ${DIR_LABEL[d]}: a perna desliza`,
          weight: o,
          patch: { [L(p)]: { ...outAt(d, abre, d5.side), turnout: TURNOUT, flex: 0, knee: 0, point: 86 } },
        },
        {
          beats: 0.25,
          label: 'chassé: passa o peso em demi-plié',
          weight: 'both',
          patch: { [L(p)]: { ...aberto, ...plie }, [L(o)]: { ...atras, ...plie }, root: meio(ctx, alvo, 0.4) },
        },
        {
          beats: 0.5,
          label: 'chassé: a de trás persegue a da frente no ar',
          weight: 'both',
          ease: 'sobe',
          slide: false,
          patch: { ...bracos2(bl, ARMS.segunda),  [L(p)]: { ...em5(true), flex: 0, knee: 0, point: 86 }, [L(o)]: { ...em5(false), flex: 0, knee: 0, point: 86 }, root: { ...meio(ctx, alvo, 0.8), lift: 0.12 } },
        },
        {
          beats: 0.25,
          label: 'chassé: cai em 5ª, em demi-plié',
          weight: 'both',
          ease: 'cai',
          patch: { [L(p)]: plie, [L(o)]: plie, root: { ...alvo, lift: 0 } },
        },
        { beats: 0.25, label: 'estica', weight: 'both', patch: { ...bracos2(bl, ARMS.brasBas),  legR: { flex: 0, knee: 0, point: 0 }, legL: { flex: 0, knee: 0, point: 0 } } },
      ])
    }
    case 'penche': {
      // arabesque penchee: da arabesque, o corpo desce para a frente e a perna sobe bem alto atras
      const p = val(ins.perna, env)
      checkWorkingLeg(ctx, id, p, 'a arabesque penchée')
      ensureClosed(ctx, id, p)
      checkCrossed(ctx, id, p, 'derriere', 'arabesque')
      const w: Weight = other(p)
      const bs = baseSideOf(ctx)
      const sup = other(p)
      const arms0 = { armR: ctx.cur.armR, armL: ctx.cur.armL }
      const bracos: Patch = !noCentro(ctx) ? { [armKey(p)]: ARMS.arabesque } : { [armKey(sup)]: ARMS.arabesque, [armKey(p)]: ARMS.arabesqueLado }
      const { leg: close, label: fecha } = closeAfter(ctx, p, 'derriere')
      return emit(ctx, [
        { beats: 1, label: 'tendu derrière', weight: w, patch: { [L(p)]: chao('derriere', bs) } },
        { beats: 1, label: 'arabesque', weight: w, slide: false, patch: { [L(p)]: air('derriere', 55, bs), ...bracos, torso: { lean: 12 } } },
        { beats: 2, label: 'penché: o corpo desce e a perna sobe', weight: w, slide: false, patch: { [L(p)]: air('derriere', 100, bs), torso: { lean: 58 } } },
        { beats: 1, label: 'segura a arabesque penchée', weight: w, slide: false, patch: {} },
        { beats: 1, label: 'volta para a arabesque', weight: w, slide: false, patch: { [L(p)]: air('derriere', 55, bs), torso: { lean: 12 } } },
        { beats: 1, label: 'desce até o chão', weight: w, slide: false, patch: { [L(p)]: chao('derriere', bs), ...arms0, torso: { lean: 0 } } },
        { beats: 1, label: fecha, weight: w, patch: { [L(p)]: close } },
      ])
    }

    // ===== outros =====
    // pausa: fica parada os tempos pedidos
    case 'pausa':
      return emit(ctx, [{ beats: ins.tempos, label: 'pausa', weight: 'both', patch: {} }])
    // virar para o outro lado da barra: solta, vira de frente para a barra e segura com a outra mao
    case 'virar': {
      ensureClosed(ctx, id, outside(ctx))
      if (noCentro(ctx)) diag(ctx, id, 'erro', 'No centro não tem "outro lado da barra": use o bloco "direção do corpo".')
      if (ctx.free) diag(ctx, id, 'erro', 'Segure a barra antes de virar para o outro lado.')
      const yaw = ctx.cur.root.yaw
      const next = outside(ctx)
      ctx.prepared = false
      return emit(ctx, [
        { beats: 1, label: 'solta a barra', weight: 'both', patch: { armR: ARMS.brasBas, armL: ARMS.brasBas } },
        { beats: 2, label: 'vira de frente para a barra', weight: 'both', patch: { root: { yaw: yaw === 0 ? 180 : 0, side: yaw === 0 ? -1 : 1 } } },
        { beats: 1, label: 'outra mão na barra', weight: 'both', patch: { [armKey(next)]: ARMS.barra } },
      ])
    }
    // repetir: roda o corpo n vezes; o painel de variaveis mostra em qual repeticao esta
    case 'repetir':
      ctx.loops.push('repetir')
      for (let i = 0; i < ins.vezes; i++) {
        ctx.counters.push(['repetição', `${i + 1} de ${ins.vezes}`])
        run(ins.corpo, env, ctx, depth + 1, id)
        ctx.counters.pop()
      }
      ctx.loops.pop()
      return
    // para cada: roda o corpo uma vez para cada valor da lista, com a variavel valendo esse valor
    case 'paraCada':
      ctx.loops.push(ins.nome)
      for (const d of ins.lista) run(ins.corpo, { ...env, [ins.nome]: d }, ctx, depth + 1, id)
      ctx.loops.pop()
      return
    // chamar: roda o corpo da funcao com os argumentos passados no bloco
    case 'chamar': {
      const fn = ctx.prog.funcoes.find((f) => f.nome === ins.fn)
      if (!fn) throw new Error(`Função "${ins.fn}" não existe`)
      ctx.stack.push(fn.id ?? `f.${fn.nome}`)
      run(fn.corpo, { ...ins.args }, ctx, depth + 1, `f.${fn.nome}`)
      ctx.stack.pop()
      return
    }
  }
}

/*******************************************************************************
 * compile
 * funcao: compila o programa inteiro: roda a lista principal a partir da barra
 * (ou do centro, nas demonstracoes), escolhe a musica, monta os estados e
 * acrescenta as dicas de fim (perna no ar, barra solta, frase de 8 incompleta,
 * braco sem finalizar).
 * recebe: prog (Program).
 * retorna: a Timeline. pode lancar erro em programas impossiveis (variavel
 * inexistente, recursao demais); quem chama usa safeCompile.
 ******************************************************************************/
export function compile(prog: Program): Timeline {
  const start: BodyState =
    prog.inicio === 'centro'
      ? applyPatch(BASE, { root: { x: CENTRO.x, z: CENTRO.z, c: 1 }, armL: ARMS.brasBas, armR: ARMS.brasBas })
      : BASE
  const ctx: Ctx = {
    cur: start,
    moves: [],
    prog,
    stack: [],
    counters: [],
    env: {},
    diags: [],
    pes: '1',
    front: 'R',
    prepared: false,
    work: 'fechado',
    free: false,
    loops: [],
    local: prog.inicio === 'centro' ? 'centro' : 'barra',
    cWork: 'R',
  }
  run(prog.principal, {}, ctx, 0, 'm')
  if (ctx.work !== 'fechado') diag(ctx, undefined, 'dica', 'A combinação termina com a perna no ar: termine com o bloco "fechar".')
  if (ctx.free) diag(ctx, undefined, 'dica', 'Termine segurando a barra (bloco "segurar a barra").')
  const moves = ctx.moves
  // a musica da combinacao: o carater que ocupa mais tempos (preparacao, pausas e bracos nao contam)
  const peso: Partial<Record<Estilo, number>> = {}
  for (const m of moves) if (m.musica) peso[m.musica] = (peso[m.musica] ?? 0) + m.beats
  // os passos que dao o carater da combinacao pesam mais: com um grand jete, e grand allegro (valsa grande)
  if (peso.grandeValsa) peso.grandeValsa *= 2
  const musica = (Object.entries(peso).sort((x, y) => y[1] - x[1])[0]?.[0] as Estilo | undefined) ?? 'valsa'
  // os estados sao recalculados aplicando os patches em ordem: states[i] e o corpo antes do movimento i
  const states = [start]
  const starts: number[] = []
  let t = 0
  for (const m of moves) {
    starts.push(t)
    t += m.beats
    states.push(applyPatch(states[states.length - 1], m.patch))
  }
  // a musica de aula anda em frases de 8 tempos
  const resto = t % 8
  if (t > 0 && resto !== 0) {
    const falta = 8 - resto
    ctx.diags.push({
      level: 'dica',
      msg: `A combinação tem ${t} tempos. Para fechar a frase de 8, faltam ${falta} tempo${falta > 1 ? 's' : ''}: que tal uma pausa?`,
    })
  }
  if (ctx.prepared && !noCentro(ctx)) ctx.diags.push({ level: 'dica', msg: 'Termine com "finalizar" para o braço voltar ao bras bas.' })
  return { moves, starts, states, total: t, diags: ctx.diags, musica }
}

/*******************************************************************************
 * moveSignature
 * funcao: "impressao digital" de um movimento, para conferir se duas dancas sao
 * iguais: o nome e a duracao, a perna de apoio e a pose final (pernas, bracos,
 * direcao e lugar do corpo, arredondados). o que importa e o que ela faz, nao
 * como os blocos foram montados; usar a outra perna ou outro braco conta como
 * diferente.
 * recebe: t (Timeline) e i (indice do movimento).
 * retorna: a assinatura em texto, com as partes separadas por #.
 ******************************************************************************/
export function moveSignature(t: Timeline, i: number): string {
  const m = t.moves[i]
  const st = t.states[i + 1]
  const r = (x: number) => Math.round(x / 5)
  const perna = (l: BodyState['legR']) => [l.fwd, l.side, l.knee, l.point].map(r).join(',')
  const braco = (a: BodyState['armR']) => [a.abd, a.swing, a.elbow].map(r).join(',')
  const raiz = [st.root.yaw + st.root.spin, st.root.x * 20, st.root.z * 20].map((x) => Math.round(x / 5)).join(',')
  return `${m.label}@${m.beats}#${m.weight}#${perna(st.legR)};${perna(st.legL)}#${braco(st.armR)};${braco(st.armL)}#${raiz}`
}

/*******************************************************************************
 * danceSignature
 * funcao: a impressao digital da danca inteira (as assinaturas de todos os
 * movimentos).
 * recebe: t (Timeline).
 * retorna: o texto; duas dancas sao iguais quando os textos sao iguais.
 ******************************************************************************/
export function danceSignature(t: Timeline): string {
  return t.moves.map((_, i) => moveSignature(t, i)).join('|')
}
