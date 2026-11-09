/*******************************************************************************
 * head.ts
 * funcao principal: calcula a cabeca e o olhar da bailarina a cada quadro, a
 * partir da posicao do corpo. a jogadora nunca programa a cabeca: ela segue as
 * convencoes de aula (olha a mao no port de bras, acompanha a perna estendida,
 * volta en face no passe, faz o spot na pirueta, epaulement no centro).
 ******************************************************************************/
import { ARMS, type Arm, type BodyState, type Head, type Leg } from './state'
import { TENDU_ANGLE } from './rig'

/*******************************************************************************
 * ARM_LOOK
 * funcao: tabela de olhar para cada posicao de braco do RAD (bras bas, 1a, 2a,
 * 5a, arabesque, demi-seconde). posicoes intermediarias misturam as vizinhas.
 * os valores consideram o lado direito como lado de trabalho: turn negativo
 * olha para a direita.
 ******************************************************************************/
const ARM_LOOK: { arm: Arm; head: Head }[] = [
  { arm: ARMS.brasBas, head: { turn: 0, nod: 6, tilt: 0 } },
  { arm: ARMS.primeira, head: { turn: -8, nod: 17, tilt: 4 } },
  { arm: ARMS.segunda, head: { turn: -30, nod: -2, tilt: 6 } },
  { arm: ARMS.quinta, head: { turn: -16, nod: -22, tilt: -4 } },
  { arm: ARMS.arabesque, head: { turn: -10, nod: -6, tilt: 0 } },
  { arm: ARMS.demiSeconde, head: { turn: -18, nod: 5, tilt: 4 } },
]

/*******************************************************************************
 * LEG_LOOK
 * funcao: olhar conforme a direcao da perna estendida, em graus: 0 e devant,
 * 90 e a la seconde, 180 e derriere. entre dois pontos o olhar e misturado.
 ******************************************************************************/
const LEG_LOOK: [number, Head][] = [
  [0, { turn: 18, nod: 12, tilt: -12 }], // devant: inclina para a barra e olha a frente
  [90, { turn: -42, nod: 0, tilt: 6 }], // a la seconde: abre para o lado de trabalho
  [180, { turn: -34, nod: -18, tilt: 18 }], // derriere: por cima do ombro, queixo alto
]

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/*******************************************************************************
 * mix
 * funcao: mistura duas posicoes de cabeca.
 * recebe: a e b (Head) e t (number, 0 da a, 1 da b).
 * retorna: uma Head nova com turn, nod e tilt interpolados.
 ******************************************************************************/
const mix = (a: Head, b: Head, t: number): Head => ({
  turn: lerp(a.turn, b.turn, t),
  nod: lerp(a.nod, b.nod, t),
  tilt: lerp(a.tilt, b.tilt, t),
})

/*******************************************************************************
 * lookFromArm
 * funcao: acha o olhar que combina com o braco de trabalho, misturando as
 * posicoes de ARM_LOOK pela distancia (as mais parecidas pesam muito mais).
 * recebe: a (Arm), o braco do lado de trabalho.
 * retorna: a Head correspondente.
 ******************************************************************************/
function lookFromArm(a: Arm): Head {
  let wsum = 0
  const out = { turn: 0, nod: 0, tilt: 0 }
  for (const { arm, head } of ARM_LOOK) {
    // distancia entre bracos com o cotovelo pesando menos; o 1e-3 evita divisao por zero na posicao exata
    const d = Math.hypot((a.abd - arm.abd) / 50, (a.swing - arm.swing) / 50, (a.elbow - arm.elbow) / 80) + 1e-3
    // peso pelo inverso do cubo: perto de uma posicao conhecida, ela domina
    const w = 1 / (d * d * d)
    wsum += w
    out.turn += head.turn * w
    out.nod += head.nod * w
    out.tilt += head.tilt * w
  }
  return { turn: out.turn / wsum, nod: out.nod / wsum, tilt: out.tilt / wsum }
}

/*******************************************************************************
 * lookFromLeg
 * funcao: acha o olhar que acompanha a perna de trabalho estendida e o quanto
 * ele deve valer.
 * recebe: leg (Leg), a perna do lado de trabalho.
 * retorna: head (o olhar pela direcao da perna) e amount (0 a 1: 0 com a perna
 * fechada ou dobrada, 1 com a perna estendida a partir do tendu).
 ******************************************************************************/
function lookFromLeg(leg: Leg): { head: Head; amount: number } {
  // perna cruzando para dentro (side negativo) conta como devant
  const lateral = Math.max(0, leg.side + 5)
  const ext = Math.hypot(leg.fwd, lateral)
  // so vale com a perna esticada: o joelho dobrado (passe, coupe) apaga o efeito
  const amount = clamp01((ext - 4) / (TENDU_ANGLE - 4)) * (1 - clamp01((leg.knee - 20) / 60))
  const theta = (Math.atan2(lateral, leg.fwd) * 180) / Math.PI // 0..180
  let head = LEG_LOOK[0][1]
  // procura o trecho de LEG_LOOK onde a direcao da perna cai e mistura os dois extremos
  for (let i = 0; i < LEG_LOOK.length - 1; i++) {
    const [a0, h0] = LEG_LOOK[i]
    const [a1, h1] = LEG_LOOK[i + 1]
    if (theta >= a0 && theta <= a1) head = mix(h0, h1, (theta - a0) / (a1 - a0))
    if (theta > a1) head = h1
  }
  return { head, amount }
}

/*******************************************************************************
 * autoHead
 * funcao: monta a cabeca do quadro somando as regras de aula: braco, perna
 * estendida, passe, plie, releve, cambre, virada na barra, epaulement no
 * centro e spot na pirueta.
 * recebe: st (BodyState), o corpo inteiro naquele instante.
 * retorna: a Head (turn, nod e tilt em graus) ja espelhada para o lado certo.
 ******************************************************************************/
export function autoHead(st: BodyState): Head {
  // lado de trabalho: o de fora da barra (barra a esquerda quando yaw e 0)
  const workRight = st.root.side >= 0
  const s = Math.max(-1, Math.min(1, st.root.side)) // espelha turn e tilt (suave ao trocar de lado)
  const arm = workRight ? st.armR : st.armL
  const leg = workRight ? st.legR : st.legL
  const support = workRight ? st.legL : st.legR

  let h = lookFromArm(arm)

  // perna estendida: o olhar acompanha a direcao da perna
  const fromLeg = lookFromLeg(leg)
  h = mix(h, fromLeg.head, fromLeg.amount)

  // passe, coupe e attitude: volta para en face, olhar alongado
  const bent = clamp01((leg.knee - 25) / 80) * clamp01((leg.flex - 8) / 30)
  h = mix(h, { turn: -6, nod: -4, tilt: 0 }, 0.7 * bent)

  // plie (os dois joelhos) e grand plie: o olhar desce junto, mais um pouco no grand plie
  const plie = Math.min(leg.flex, support.flex)
  h.nod += 7 * clamp01(plie / 31) + 8 * clamp01((plie - 31) / 23)

  // releve: o queixo sobe, mas so se a perna de base estiver esticada
  h.nod -= 6 * clamp01(Math.min(leg.point, support.point) / 58) * (support.flex < 5 ? 1 : 0)

  // cambre: a cabeca acompanha o tronco
  h.nod += st.torso.lean * 0.55

  // na barra, virando para o outro lado: a cabeca vai a frente da rotacao (c e 0 na barra e 1 no centro)
  const c = Math.max(0, Math.min(1, st.root.c))
  h.turn += 14 * Math.sin((st.root.yaw * Math.PI) / 180) * (workRight ? 1 : -1) * s * (1 - c)

  let turn = h.turn * s
  // no centro, epaulement: com o corpo em diagonal (croise, efface...), a cabeca volta para o publico
  const yawRel = ((((st.root.yaw + 180) % 360) + 360) % 360) - 180
  turn += -Math.max(-40, Math.min(40, yawRel * 0.6)) * c
  // pirueta: spot. o corpo gira, a cabeca fica olhando para a frente e chicoteia no meio do giro
  const spin = st.root.spin % 360
  if (Math.abs(spin) > 0.5) {
    const local = ((((spin + 180) % 360) + 360) % 360) - 180 // -180..180
    turn = Math.max(-85, Math.min(85, -local))
  }

  return { turn, nod: h.nod, tilt: h.tilt * s }
}
