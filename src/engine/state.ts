/*******************************************************************************
 * state.ts
 * funcao principal: define o estado do corpo da bailarina em termos de ballet
 * (graus de cada perna, braco, cabeca e tronco, lugar na sala), as posicoes de
 * braco do RAD e as funcoes que aplicam e misturam estados. o rig traduz isso
 * para as articulacoes; aqui tudo e numero para poder interpolar entre um passo
 * e outro.
 ******************************************************************************/

/*******************************************************************************
 * Leg
 * funcao: uma perna, em graus. combinando os campos sai qualquer posicao de
 * aula: tendu, passe, plie, arabesque.
 ******************************************************************************/
export type Leg = {
  fwd: number // + devant, negativo derriere (elevacao da perna no plano frente/tras)
  side: number // + a la seconde (abducao), negativo = aduzir em direcao ao centro
  turnout: number // en dehors na articulacao do quadril
  flex: number // flexao do quadril no plano "aberto" (plie)
  knee: number // flexao do joelho
  point: number // + pe esticado (pointe), negativo pe flexionado
}

/*******************************************************************************
 * Arm
 * funcao: um braco, em graus. as posicoes do RAD sao combinacoes destes quatro
 * valores (ver ARMS).
 ******************************************************************************/
export type Arm = {
  abd: number // abertura lateral (0 = ao lado do corpo, 90 = altura do ombro)
  swing: number // quanto o braco vem para a frente
  elbow: number // arredondamento do cotovelo
  wrist: number
}

export type Head = { turn: number; tilt: number; nod: number }

/*******************************************************************************
 * BodyState
 * funcao: o corpo inteiro num instante. a linha do tempo guarda um BodyState no
 * fim de cada movimento e a tela interpola entre eles.
 ******************************************************************************/
export type BodyState = {
  legR: Leg
  legL: Leg
  armR: Arm
  armL: Arm
  head: Head
  torso: { lean: number }
  face: { esforco: number } // 0 = carinha normal, 1 = fazendo forca
  // yaw: para onde o corpo esta virado (na barra: 0 = mao esquerda na barra, 180 = mao direita)
  // spin: giro da pirueta; side: +1 perna de trabalho direita, -1 esquerda; x/z: lugar na sala;
  // c: 0 na barra, 1 no centro; lift: altura do salto
  root: { yaw: number; spin: number; side: number; x: number; z: number; c: number; lift: number }
}

export type Side = 'R' | 'L'

/*******************************************************************************
 * Weight
 * funcao: em que perna esta o peso. 'both' nas duas, 'R' ou 'L' numa so,
 * 'livre' quando ela esta sentada ou deitada e o ponto mais baixo do corpo
 * encosta no chao.
 ******************************************************************************/
export type Weight = 'both' | Side | 'livre' // pernas de base; 'livre' = sentada/deitada no chao (altura do quadril pelo lift)

/*******************************************************************************
 * Patch
 * funcao: a parte do corpo que um movimento muda. o que nao aparece no patch
 * continua como estava.
 ******************************************************************************/
export type Patch = {
  [K in keyof BodyState]?: Partial<BodyState[K]>
}

/*******************************************************************************
 * FIRST_SIDE e TURNOUT
 * funcao: a 1a posicao dos pes: o quanto cada perna fecha para os calcanhares
 * se encostarem e o en dehors de cada quadril.
 ******************************************************************************/
export const FIRST_SIDE = -4.6
export const TURNOUT = 62

const leg1st = (): Leg => ({ fwd: 0, side: FIRST_SIDE, turnout: TURNOUT, flex: 0, knee: 0, point: 0 })

/*******************************************************************************
 * ARMS
 * funcao: as posicoes de braco (RAD) usadas nos blocos e no corpo. valores
 * ajustados olhando o render.
 ******************************************************************************/
export const ARMS = {
  brasBas: { abd: 24, swing: 78, elbow: 38, wrist: 14 },
  primeira: { abd: 62, swing: 84, elbow: 44, wrist: 10 },
  segunda: { abd: 76, swing: 24, elbow: 18, wrist: 8 },
  quinta: { abd: 158, swing: 50, elbow: 38, wrist: 8 }, // medido: emoldura a cabeca sem tapar o rosto
  barra: { abd: 48, swing: 42, elbow: 38, wrist: -10 },
  arabesque: { abd: 72, swing: 82, elbow: 6, wrist: -4 }, // braco alongado a frente
  arabesqueAlto: { abd: 100, swing: 80, elbow: 6, wrist: -4 }, // a frente, um pouco mais alto
  arabesqueLado: { abd: 80, swing: -8, elbow: 8, wrist: -2 }, // aberto para o lado, um pouco atras
  demiSeconde: { abd: 45, swing: 30, elbow: 14, wrist: 10 },
} satisfies Record<string, Arm>

export type ArmPos = keyof typeof ARMS

/*******************************************************************************
 * ARM_LABEL
 * funcao: o nome de cada posicao de braco como aparece nos blocos e no texto do
 * programa.
 ******************************************************************************/
export const ARM_LABEL: Record<ArmPos, string> = {
  brasBas: 'bras bas',
  primeira: '1ª posição',
  segunda: '2ª posição',
  quinta: '5ª posição',
  barra: 'mão na barra',
  arabesque: 'arabesque',
  demiSeconde: 'demi-seconde',
  arabesqueAlto: 'arabesque (alto)',
  arabesqueLado: 'arabesque (lado)',
}

/*******************************************************************************
 * BASE
 * funcao: o corpo no comeco de toda combinacao: na barra, pes em 1a, braco
 * direito em bras bas e a mao esquerda na barra.
 ******************************************************************************/
export const BASE: BodyState = {
  legR: leg1st(),
  legL: leg1st(),
  armR: { ...ARMS.brasBas },
  armL: { ...ARMS.barra },
  head: { turn: 0, tilt: 0, nod: 0 },
  torso: { lean: 0 },
  face: { esforco: 0 },
  root: { yaw: 0, spin: 0, side: 1, x: 0, z: 0, c: 0, lift: 0 },
}

/*******************************************************************************
 * applyPatch
 * funcao: aplica um Patch sobre um estado.
 * recebe: s (BodyState), o estado atual, e p (Patch), as partes que mudam.
 * retorna: um BodyState novo; s nao e alterado.
 ******************************************************************************/
export function applyPatch(s: BodyState, p: Patch): BodyState {
  const out = { ...s } as Record<string, unknown>
  for (const k of Object.keys(p) as (keyof BodyState)[]) {
    out[k] = { ...s[k], ...p[k] }
  }
  return out as BodyState
}

/*******************************************************************************
 * lerpState
 * funcao: mistura dois estados do corpo campo a campo. e o que deixa o
 * movimento continuo entre dois passos.
 * recebe: a e b (BodyState) e t (number, 0 da a, 1 da b).
 * retorna: um BodyState novo com todos os numeros interpolados.
 ******************************************************************************/
export function lerpState(a: BodyState, b: BodyState, t: number): BodyState {
  const out = {} as Record<string, Record<string, number>>
  for (const k of Object.keys(a) as (keyof BodyState)[]) {
    const pa = a[k] as Record<string, number>
    const pb = b[k] as Record<string, number>
    const o: Record<string, number> = {}
    for (const f of Object.keys(pa)) o[f] = pa[f] + (pb[f] - pa[f]) * t
    out[k] = o
  }
  return out as unknown as BodyState
}

export const legKey = (s: Side) => (s === 'R' ? 'legR' : 'legL') as 'legR' | 'legL'
export const armKey = (s: Side) => (s === 'R' ? 'armR' : 'armL') as 'armR' | 'armL'
export const other = (s: Side): Side => (s === 'R' ? 'L' : 'R')
