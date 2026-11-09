/*******************************************************************************
 * warmup.ts
 * funcao principal: o aquecimento que passa na tela inicial. nao e um programa
 * de blocos: e uma animacao montada a mao (plies na barra, perna na barra,
 * espacate, abertura lateral, borboleta, levanta e volta). no chao usa o peso
 * 'livre': o ponto mais baixo do corpo encosta no chao (ver rig.ts).
 ******************************************************************************/
import { ARMS, BASE, FIRST_SIDE, applyPatch, type BodyState, type Patch, type Weight } from './state'
import type { Move, Timeline } from './program'

const reto = { flex: 0, knee: 0, point: 0 }
const esticado = { flex: 0, knee: 0, point: 86 }
const primeira = { fwd: 0, side: FIRST_SIDE, turnout: 62, ...reto }
const plie = { flex: 31, knee: 66, point: -35 }
const CHAO = { x: -1.25, z: 0.35 } // lugarzinho no chao, longe da barra
const BARRA = { x: -0.66, side: 93 } // medido: o tornozelo fica apoiado em cima da barra

// tirar o pe do chao sem raspar (medido): o calcanhar descola e a perna sobe pelo passe
const DESCOLA = { fwd: 0, side: FIRST_SIDE + 4, flex: 10, knee: 20, point: -20 }
const PASSE_E = { fwd: 0, side: 10, flex: 58, knee: 125, point: 75 }

/*******************************************************************************
 * split
 * funcao: pernas no espacate de frente.
 * recebe: a (number, graus): 0 em pe, 90 com as pernas no chao.
 * retorna: o Patch das duas pernas (direita na frente).
 ******************************************************************************/
const split = (a: number): Patch => ({
  legR: { fwd: a, side: -2, turnout: 30, ...esticado },
  legL: { fwd: -a, side: -2, turnout: 30, ...esticado },
})
const bracosAlto = { armR: ARMS.quinta, armL: ARMS.quinta }
const bracosLado = { armR: ARMS.segunda, armL: ARMS.segunda }

// poses do chao: os numeros de ASAS, ABRE, MEIO_ABRACO, SOLTA e ABRACA foram achados por busca (tools/pes.test.ts e tools/assento.test.ts) para ela ficar sentada de verdade e os pes nao se atravessarem
const ASAS = { fwd: 116, side: 60, turnout: 57, flex: 0, knee: 137, point: 15 } // joelhos 8 cm mais altos, solas ainda juntas
const ABRE = { fwd: 89, side: 73, turnout: 85, flex: 0, knee: 132, point: 30 } // as solas se separam (14 cm)
const MEIO_ABRACO = { fwd: 125, side: 70, turnout: 45, flex: 0, knee: 135, point: 30 } // os joelhos sobem com os pes afastados
const SOLTA = { fwd: 160, side: 28, turnout: 6, flex: 0, knee: 138, point: 30 } // ainda sentada, pes a ~15 cm um do outro
const ABRACA = { fwd: 160, side: 12, turnout: 5, flex: 0, knee: 145, point: 10 } // sentada no chao, pes paralelos (12 cm entre eles) apoiados
const ALCANCA = { abd: 94, swing: 88, elbow: 10, wrist: 0 } // bracos esticados em direcao ao pe da frente
const PES_LADO = { abd: 74, swing: 30, elbow: 8, wrist: 0 } // bracos abertos em direcao aos pes
const ABRACO = { abd: 40, swing: 88, elbow: 70, wrist: 10 }
const CALCANHAR = { fwd: 90, side: -2, turnout: 5, flex: 0, knee: 160, point: 80 }
const JOELHOS = { fwd: 0, side: 2, turnout: 0, flex: 0, knee: 95, point: 80 } // pes atras, separados (sem se encavalar)

// borboleta: valores achados por busca. sentada de verdade (o bumbum no chao), as solas encostadas uma na outra,
// os pes apoiados a 2 a 4 cm do chao, calcanhares a ~27 cm do quadril e os joelhos abertos e baixos
const BORB = { fwd: 94, side: 64, turnout: 79, flex: 0, knee: 138, point: 15 }

/*******************************************************************************
 * K
 * funcao: um quadro do aquecimento: [tempos, texto que aparece, Patch, peso,
 * curva do movimento, perna rente ao chao]. so os tres primeiros sao
 * obrigatorios.
 ******************************************************************************/
type K = [number, string, Patch, Weight?, Move['ease']?, boolean?]

/*******************************************************************************
 * K (lista)
 * funcao: a rotina inteira, em ordem. os textos aparecem na tela inicial
 * enquanto ela faz cada parte.
 ******************************************************************************/
const K: K[] = [
  // ===== plies na barra =====
  [2, 'esquentando com pliés', { armR: ARMS.primeira }],
  [2, 'esquentando com pliés', { legR: plie, legL: plie, armR: ARMS.segunda }],
  [2, 'esquentando com pliés', { legR: reto, legL: reto }],
  [2, 'esquentando com pliés', { legR: plie, legL: plie }],
  [2, 'esquentando com pliés', { legR: reto, legL: reto, armR: ARMS.brasBas }],
  // ===== perna na barra (a la seconde, de frente para o publico, braco por cima da cabeca) =====
  [3, 'vai alongar na barra', { root: { x: BARRA.x }, armL: ARMS.brasBas, armR: ARMS.brasBas }],
  [0.5, 'põe a perna na barra', { legL: DESCOLA, armL: ARMS.segunda, armR: ARMS.segunda }, 'R', 'suave', false],
  [1, 'põe a perna na barra', { legL: PASSE_E }, 'R', 'suave', false],
  [1.5, 'põe a perna na barra', { legL: { fwd: 0, side: BARRA.side, ...esticado, point: 60 } }, 'R', 'suave', false],
  [3, 'alongando na barra… estica!', {
    armR: { abd: 172, swing: 8, elbow: 26, wrist: 6 },
    armL: { abd: 70, swing: 20, elbow: 12, wrist: 6 },
    face: { esforco: 1 },
  }, 'R', 'suave', false],
  [2, 'alongando na barra… estica!', {}, 'R', 'suave', false],
  [2, 'alongando na barra', { armR: ARMS.segunda, armL: ARMS.segunda, face: { esforco: 0 } }, 'R', 'suave', false],
  [1.5, 'tira a perna da barra', { legL: PASSE_E }, 'R', 'suave', false],
  [1, 'desce a perna', { legL: DESCOLA, armR: ARMS.brasBas, armL: ARMS.brasBas }, 'R', 'suave', false],
  [0.5, 'desce a perna', { legL: primeira }, 'R', 'suave', false],
  // ===== espacate no chao (o corpo desce sozinho conforme as pernas abrem) =====
  [3, 'agora no chão', { root: { x: CHAO.x, z: CHAO.z, yaw: -55 } }],
  [1.5, 'escorregando para o espacate…', { ...split(30), ...bracosLado, face: { esforco: 0.6 } }, 'livre'],
  [1.5, 'escorregando para o espacate…', { ...split(62) }, 'livre'],
  [1.5, 'espacate!', { ...split(90) }, 'livre'],
  [2, 'espacate! alonga para cima', { ...bracosAlto, face: { esforco: 0.7 } }, 'livre'],
  [3, 'espacate… deita na perna. ai, ai!', { torso: { lean: 36 }, armR: ALCANCA, armL: ALCANCA, face: { esforco: 1 } }, 'livre'],
  [2, 'espacate… deita na perna. ai, ai!', {}, 'livre'],
  [2, 'respira…', { torso: { lean: 0 }, ...bracosLado, face: { esforco: 0 } }, 'livre'],
  // ===== abertura lateral =====
  // as pernas giram no chao sem descer: primeiro so "torcem" (side 92 com fwd ±90 nao muda a direcao),
  // depois varrem o chao ate os lados
  [1, 'abertura lateral', { legR: { side: 92, turnout: 40, point: 60 }, legL: { side: 92, turnout: 40, point: 60 } }, 'livre'],
  [2, 'abertura lateral', { legR: { fwd: 0 }, legL: { fwd: 0 }, root: { yaw: -20 } }, 'livre'],
  [3, 'abertura lateral… deita para a frente', { torso: { lean: 32 }, armR: PES_LADO, armL: PES_LADO, face: { esforco: 1 } }, 'livre'],
  [2, 'abertura lateral… deita para a frente', {}, 'livre'],
  [2, 'volta devagar', { torso: { lean: 0 }, armR: ARMS.primeira, armL: ARMS.primeira, face: { esforco: 0 } }, 'livre'],
  // ===== borboleta (pes juntinhos na frente, joelhos abertos) =====
  [1.5, 'dobra os joelhos para a borboleta', {
    legR: { fwd: 60, side: 100, turnout: 160, flex: 0, knee: 20, point: 60 },
    legL: { fwd: 60, side: 100, turnout: 160, flex: 0, knee: 20, point: 60 },
    armR: { abd: 55, swing: 75, elbow: 50, wrist: 10 },
    armL: { abd: 55, swing: 75, elbow: 50, wrist: 10 },
  }, 'livre'],
  [1.5, 'borboleta', {
    legR: BORB,
    legL: BORB,
    torso: { lean: 15 },
    armR: { abd: 55, swing: 75, elbow: 50, wrist: 10 },
    armL: { abd: 55, swing: 75, elbow: 50, wrist: 10 },
  }, 'livre'],
  ...Array.from({ length: 6 }, (_, i): K => [0.5, 'borboleta: bate as asinhas!', { legR: i % 2 ? BORB : ASAS, legL: i % 2 ? BORB : ASAS }, 'livre']),
  // ===== levanta: abraca os joelhos → senta nos calcanhares → fica de joelhos → um pe a frente → em pe =====
  // primeiro as solas se soltam e os pes se afastam (senao eles se atravessam no caminho para o abraco)
  [0.375, 'abraça os joelhos', { legR: ABRE, legL: ABRE }, 'livre'],
  [0.375, 'abraça os joelhos', { legR: MEIO_ABRACO, legL: MEIO_ABRACO }, 'livre'],
  [0.375, 'abraça os joelhos', { legR: SOLTA, legL: SOLTA, torso: { lean: 12 } }, 'livre'],
  [0.375, 'abraça os joelhos', { legR: ABRACA, legL: ABRACA, torso: { lean: 15 }, armR: ABRACO, armL: ABRACO }, 'livre'],
  [1.5, 'senta nos calcanhares', { legR: CALCANHAR, legL: CALCANHAR, torso: { lean: 5 }, armR: ARMS.brasBas, armL: ARMS.brasBas }, 'livre'],
  [1.5, 'fica de joelhos', { legR: JOELHOS, legL: JOELHOS, torso: { lean: 0 }, armR: ARMS.primeira, armL: ARMS.primeira }, 'livre'],
  [1, 'põe um pé à frente', { legR: { fwd: 60, side: -2, turnout: 10, flex: 0, knee: 130, point: 20 } }, 'livre'],
  [1, 'põe um pé à frente', { legR: { fwd: 88, side: -2, turnout: 10, flex: 0, knee: 90, point: 0 } }, 'livre'],
  [2, 'levanta!', { legR: primeira, legL: primeira, armR: ARMS.brasBas, armL: ARMS.brasBas }],
  [2, 'ufa! que aquecimento', { face: { esforco: 0.6 }, armR: ARMS.demiSeconde, armL: ARMS.demiSeconde }],
  [3, 'de volta para a barra', { root: { x: 0, z: 0, yaw: 0 }, armR: ARMS.brasBas, armL: ARMS.brasBas, face: { esforco: 0 } }],
  [2, 'pronta para a aula!', { armL: ARMS.barra }],
]


/*******************************************************************************
 * warmupTimeline
 * funcao: transforma a lista K numa Timeline igual as dos programas de blocos,
 * para a mesma tela tocar as duas.
 * recebe: nada.
 * retorna: a Timeline com os movimentos, o tempo de inicio de cada um, os
 * estados e a duracao total. sem diagnosticos e com a musica de adagio.
 ******************************************************************************/
export function warmupTimeline(): Timeline {
  const moves: Move[] = K.map(([beats, label, patch, weight = 'both', ease, slide]) => ({
    beats,
    label,
    patch,
    weight,
    ...(ease ? { ease } : {}),
    ...(slide === false ? { slide: false } : {}),
  }))
  const states: BodyState[] = [BASE]
  const starts: number[] = []
  let t = 0
  // cada movimento parte do estado em que o anterior terminou
  for (const m of moves) {
    starts.push(t)
    t += m.beats
    states.push(applyPatch(states[states.length - 1], m.patch))
  }
  return { moves, starts, states, total: t, diags: [], musica: 'adagio' }
}
