/*******************************************************************************
 * pes.test.ts
 * funcao principal: ferramenta de medida dos pes e das poses de chao do
 * aquecimento. cada modo e escolhido pelo primeiro argumento: show mede uma
 * pose; busca, fino, fino2, asas, asas2, assento, abraca, solta, abre e bracos
 * procuram por forca bruta os numeros das poses (solas encostadas, sentada de
 * verdade, pes sem se atravessar); quem diz qual parte do corpo e a mais baixa;
 * trilha percorre o aquecimento apontando pes se atravessando. roda com: npx
 * tsx tools/pes.test.ts modo argumentos
 ******************************************************************************/
import * as THREE from 'three'
import { buildRig, applyState } from '../src/engine/rig'
import { BASE, applyPatch } from '../src/engine/state'
import { DEFAULT_LOOK } from '../src/engine/look'
const rig = buildRig(DEFAULT_LOOK)
const V = () => new THREE.Vector3()

/*******************************************************************************
 * medir
 * funcao: poe as duas pernas na mesma pose (espelhada), sentada no chao, e mede
 * os pes.
 * recebe: L (a pose da perna), lean (inclinacao do tronco, 10 se nao vier) e
 * braco (pose dos dois bracos; por padrao em 2a, fora do caminho).
 * retorna: para cada pe, calcanhar, metatarso, ponta, normal da sola e joelho,
 * e a posicao do quadril.
 ******************************************************************************/
function medir(L: any, lean = 10, braco: any = { abd: 85, swing: 0, elbow: 10, wrist: 0 }) {
  const st = applyPatch(BASE, { legR: L, legL: L, torso: { lean }, armR: braco, armL: braco })
  applyState(rig, st, 'livre')
  rig.root.updateMatrixWorld(true)

  /*****************************************************************************
   * f
   * funcao: mede um pe: os tres pontos da sola, a direcao para onde a sola
   * aponta e o joelho.
   * recebe: l (a perna do rig).
   * retorna: heel, ball, toe, n e knee (Vector3).
   ****************************************************************************/
  const f = (l: any) => {
    const heel = l.samples[0].getWorldPosition(V()), ball = l.samples[1].getWorldPosition(V()), toe = l.samples[2].getWorldPosition(V())
    const q = l.ankle.getWorldQuaternion(new THREE.Quaternion())
    const n = new THREE.Vector3(0, -1, 0).applyQuaternion(q) // normal da sola
    return { heel, ball, toe, n, knee: l.knee.getWorldPosition(V()) }
  }
  const r = f(rig.legR), l = f(rig.legL)
  const pelv = rig.pelvis.getWorldPosition(V())
  return { r, l, pelv }
}
// vetor em texto com 3 casas
const fmt = (v: THREE.Vector3) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`
const args = (globalThis as any).process.argv.slice(2)
// show: mede uma pose dada por fwd side turnout knee point
if (args[0] === 'show') {
  const [fwd, side, turnout, knee, point] = args.slice(1).map(Number)
  const m = medir({ fwd, side, turnout, flex: 0, knee, point })
  for (const k of ['r', 'l'] as const) console.log(k, 'heel', fmt(m[k].heel), 'ball', fmt(m[k].ball), 'toe', fmt(m[k].toe), 'n', fmt(m[k].n), 'knee', fmt(m[k].knee))
  console.log('pelv', fmt(m.pelv), 'gap heel', m.r.heel.distanceTo(m.l.heel).toFixed(3), 'ball', m.r.ball.distanceTo(m.l.ball).toFixed(3), 'toe', m.r.toe.distanceTo(m.l.toe).toFixed(3), 'n·n', m.r.n.dot(m.l.n).toFixed(2))
}
// busca: borboleta com as solas encostadas, sem olhar o assento (primeira versao)
if (args[0] === 'busca') {
  let best: any = null
  for (let fwd = 30; fwd <= 120; fwd += 10) for (let side = 30; side <= 120; side += 10) for (let turnout = 40; turnout <= 150; turnout += 10)
    for (let knee = 110; knee <= 160; knee += 10) for (let point = -40; point <= 40; point += 20) {
      const L = { fwd, side, turnout, flex: 0, knee, point }
      const m = medir(L)
      const gap = Math.abs(m.r.heel.distanceTo(m.l.heel) - 0.014) + Math.abs(m.r.ball.distanceTo(m.l.ball) - 0.014) + Math.abs(m.r.toe.distanceTo(m.l.toe) - 0.02)
      const opp = 1 + m.r.n.dot(m.l.n)
      const footY = Math.max(m.r.heel.y, m.r.ball.y, m.r.toe.y)
      const heelZ = Math.abs(m.r.heel.z - 0.28)
      const kneeY = Math.max(0, m.r.knee.y - 0.2)
      const cost = gap * 10 + opp * 1.5 + Math.max(0, footY - 0.06) * 6 + heelZ * 2 + kneeY * 2
      if (!best || cost < best.cost) best = { cost, L, gap, opp, footY, heelZ: m.r.heel.z, kneeY: m.r.knee.y }
    }
  console.log(JSON.stringify(best))
}
// fino: refina a busca em volta do melhor resultado, com as solas sem passar do meio
if (args[0] === 'fino') {
  let best: any = null
  for (let fwd = 60; fwd <= 82; fwd += 2) for (let side = 50; side <= 72; side += 2) for (let turnout = 80; turnout <= 104; turnout += 3)
    for (let knee = 120; knee <= 142; knee += 3) for (let point = 5; point <= 35; point += 5) {
      const L = { fwd, side, turnout, flex: 0, knee, point }
      const m = medir(L)
      const xs = [m.r.heel.x, m.r.ball.x, m.r.toe.x]
      const gap = xs.reduce((a, x) => a + Math.abs(x + 0.004), 0)
      const opp = 1 + m.r.n.dot(m.l.n)
      const heelZ = Math.abs(m.r.heel.z - 0.28)
      const cost = gap * 10 + opp * 1.5 + heelZ * 1 + Math.max(0, m.r.toe.y - 0.03) * 3
      if (!best || cost < best.cost) best = { cost, L, xs, opp, heelZ: m.r.heel.z, kneeY: m.r.knee.y, toeY: m.r.toe.y }
    }
  console.log(JSON.stringify(best))
}
// asas: a pose das asinhas: joelhos 10 cm mais altos com os pes no mesmo lugar
if (args[0] === 'asas') {
  const B = medir({ fwd: 74, side: 62, turnout: 80, flex: 0, knee: 132, point: 20 })
  let best: any = null
  for (let fwd = 60; fwd <= 130; fwd += 3) for (let side = 20; side <= 70; side += 3) for (let turnout = 30; turnout <= 100; turnout += 4)
    for (let knee = 120; knee <= 160; knee += 3) for (let point = 0; point <= 40; point += 10) {
      const m = medir({ fwd, side, turnout, flex: 0, knee, point })
      const d = m.r.heel.distanceTo(B.r.heel) + m.r.ball.distanceTo(B.r.ball) + m.r.toe.distanceTo(B.r.toe)
      const opp = 1 + m.r.n.dot(m.l.n)
      const up = Math.abs(m.r.knee.y - B.r.knee.y - 0.1)
      const cross = Math.max(0, m.r.heel.x + 0.002) + Math.max(0, m.r.ball.x + 0.002) + Math.max(0, m.r.toe.x + 0.002)
      const cost = d * 5 + opp + up * 3 + cross * 20
      if (!best || cost < best.cost) best = { cost, L: { fwd, side, turnout, knee, point }, d, opp, kneeY: m.r.knee.y, k0: B.r.knee.y }
    }
  console.log(JSON.stringify(best))
}
// trilha: percorre o aquecimento entre dois tempos e marca com <<< os pes perto demais ou cruzados
if (args[0] === 'trilha') {
  const { warmupTimeline } = await import('../src/engine/warmup')
  const { lerpState } = await import('../src/engine/state')
  const tl = warmupTimeline()
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const [a, b] = args[1].split(',').map(Number)
  for (let bt = a; bt <= b; bt += 0.1) {
    let i = 0
    while (i < tl.moves.length - 1 && tl.starts[i + 1] <= bt) i++
    const k = smooth(Math.min(1, (bt - tl.starts[i]) / tl.moves[i].beats))
    const st = lerpState(tl.states[i], tl.states[i + 1], k)
    applyState(rig, st, tl.moves[i].weight, tl.moves[i].slide ?? true)
    rig.root.updateMatrixWorld(true)
    const pts = (l: any) => [...l.samples.map((o: any) => o.getWorldPosition(V())), l.ankle.getWorldPosition(V())]
    const R = pts(rig.legR), L = pts(rig.legL)
    let dmin = 9
    for (const p of R) for (const q of L) dmin = Math.min(dmin, p.distanceTo(q))
    const nR = new THREE.Vector3(0, -1, 0).applyQuaternion(rig.legR.ankle.getWorldQuaternion(new THREE.Quaternion()))
    const nL = new THREE.Vector3(0, -1, 0).applyQuaternion(rig.legL.ankle.getWorldQuaternion(new THREE.Quaternion()))
    // no referencial do quadril: o pe direito nao pode passar para o lado esquerdo
    const inv = rig.root.matrixWorld.clone().invert()
    const xR = Math.max(...R.map((p: THREE.Vector3) => p.clone().applyMatrix4(inv).x))
    const nn = nR.dot(nL)
    const ruim = (nn > -0.7 && dmin < 0.07) || xR > 0.004
    console.log(bt.toFixed(1), tl.moves[i].label.slice(0, 26).padEnd(26), 'dmin', dmin.toFixed(3), 'n·n', nn.toFixed(2), 'xR', xR.toFixed(3), ruim ? '<<<' : '')
  }
}
// assento: borboleta sentada de verdade (assento no chao) e com os pes baixos
if (args[0] === 'assento') {
  let best: any = null
  const lean = Number(args[1] ?? 10)
  for (let fwd = 20; fwd <= 110; fwd += 6) for (let side = 40; side <= 110; side += 6) for (let turnout = 40; turnout <= 140; turnout += 8)
    for (let knee = 100; knee <= 160; knee += 6) for (let point = -30; point <= 40; point += 10) {
      const m = medir({ fwd, side, turnout, flex: 0, knee, point }, lean)
      const xs = [m.r.heel.x, m.r.ball.x, m.r.toe.x]
      const gap = xs.reduce((a, x) => a + Math.abs(x + 0.004), 0)
      const opp = 1 + m.r.n.dot(m.l.n)
      const seat = Math.max(0, m.pelv.y - 0.07)
      const heelZ = Math.abs(m.r.heel.z - 0.27)
      const pe = Math.max(0, Math.max(m.r.heel.y, m.r.ball.y, m.r.toe.y) - 0.07)
      const cost = gap * 10 + opp * 1.5 + seat * 25 + heelZ * 2 + pe * 12
      if (!best || cost < best.cost) best = { cost, L: { fwd, side, turnout, knee, point }, xs, opp, seat, heelZ: m.r.heel.z, kneeY: m.r.knee.y, toeY: m.r.toe.y, heelY: m.r.heel.y }
    }
  console.log(JSON.stringify(best))
}
// fino2: refina a borboleta sentada
if (args[0] === 'fino2') {
  let best: any = null
  for (let fwd = 90; fwd <= 106; fwd += 2) for (let side = 56; side <= 72; side += 2) for (let turnout = 70; turnout <= 92; turnout += 3)
    for (let knee = 128; knee <= 144; knee += 2) for (let point = 10; point <= 30; point += 5) {
      const m = medir({ fwd, side, turnout, flex: 0, knee, point })
      const xs = [m.r.heel.x, m.r.ball.x, m.r.toe.x]
      const gap = xs.reduce((a, x) => a + Math.abs(x + 0.004), 0)
      const opp = 1 + m.r.n.dot(m.l.n)
      const seat = Math.max(0, m.pelv.y - 0.07)
      const heelZ = Math.abs(m.r.heel.z - 0.27)
      const pe = Math.max(0, Math.max(m.r.heel.y, m.r.ball.y, m.r.toe.y) - 0.06)
      const cost = gap * 10 + opp * 1.5 + seat * 25 + heelZ * 2 + pe * 12
      if (!best || cost < best.cost) best = { cost, L: { fwd, side, turnout, knee, point }, xs, opp, seat, heelZ: m.r.heel.z, kneeY: m.r.knee.y, toeY: m.r.toe.y, heelY: m.r.heel.y }
    }
  console.log(JSON.stringify(best))
}
// asas2: as asinhas a partir da borboleta sentada dada nos argumentos
if (args[0] === 'asas2') {
  const [f0, s0, t0, k0, p0] = args.slice(1).map(Number)
  const B = medir({ fwd: f0, side: s0, turnout: t0, flex: 0, knee: k0, point: p0 })
  let best: any = null
  for (let fwd = f0 - 20; fwd <= f0 + 30; fwd += 3) for (let side = s0 - 40; side <= s0 + 6; side += 3) for (let turnout = t0 - 50; turnout <= t0 + 10; turnout += 4)
    for (let knee = k0 - 10; knee <= k0 + 20; knee += 3) for (let point = p0 - 20; point <= p0 + 20; point += 10) {
      const m = medir({ fwd, side, turnout, flex: 0, knee, point })
      const d = m.r.heel.distanceTo(B.r.heel) + m.r.ball.distanceTo(B.r.ball) + m.r.toe.distanceTo(B.r.toe)
      const opp = 1 + m.r.n.dot(m.l.n)
      const up = Math.abs(m.r.knee.y - B.r.knee.y - 0.09)
      const seat = Math.max(0, m.pelv.y - 0.07)
      const cross = Math.max(0, m.r.heel.x + 0.002) + Math.max(0, m.r.ball.x + 0.002) + Math.max(0, m.r.toe.x + 0.002)
      const cost = d * 5 + opp + up * 3 + cross * 20 + seat * 20
      if (!best || cost < best.cost) best = { cost, L: { fwd, side, turnout, knee, point }, d, opp, seat, kneeY: m.r.knee.y, k0: B.r.knee.y }
    }
  console.log(JSON.stringify(best))
}
// bracos: os bracos que alcancam os pes na borboleta
if (args[0] === 'bracos') {
  const L = { fwd: 94, side: 64, turnout: 79, flex: 0, knee: 138, point: 15 }
  let best: any = null
  for (const lean of [10, 15, 20]) for (let abd = 20; abd <= 80; abd += 5) for (let swing = 40; swing <= 100; swing += 5) for (let elbow = 0; elbow <= 50; elbow += 5) {
    const braco = { abd, swing, elbow, wrist: 10 }
    const m = medir(L, lean, braco)
    rig.root.updateMatrixWorld(true)
    const h = rig.armR.hand.getWorldPosition(V())
    const alvo = m.r.ball.clone().lerp(m.r.heel, 0.3).add(new THREE.Vector3(0, 0.035, 0))
    const seat = Math.max(0, m.pelv.y - 0.07)
    const cost = h.distanceTo(alvo) + seat * 5
    if (!best || cost < best.cost) best = { cost, lean, braco, d: h.distanceTo(alvo), seat }
  }
  console.log(JSON.stringify(best))
}
// abraca: abraco dos joelhos sentada, com os pes paralelos e apoiados
if (args[0] === 'abraca') {
  let best: any = null
  const braco = { abd: 40, swing: 88, elbow: 70, wrist: 10 }
  for (let fwd = 130; fwd <= 175; fwd += 3) for (let side = 0; side <= 24; side += 3) for (let turnout = -10; turnout <= 30; turnout += 5)
    for (let knee = 130; knee <= 168; knee += 3) for (let point = -10; point <= 40; point += 10) {
      const m = medir({ fwd, side, turnout, flex: 0, knee, point }, 15, braco)
      const seat = Math.max(0, m.pelv.y - 0.07)
      const plano = 1 + m.r.n.y // n.y = -1 quando a sola esta para baixo
      const xs = [m.r.heel.x, m.r.ball.x, m.r.toe.x]
      const lado = xs.reduce((a, x) => a + Math.abs(x + 0.06), 0)
      const chao = Math.max(m.r.heel.y, m.r.ball.y) - 0.0
      const z = Math.abs(m.r.heel.z - 0.22)
      const cost = seat * 25 + plano * 2 + lado * 5 + Math.max(0, chao - 0.04) * 10 + z * 2
      if (!best || cost < best.cost) best = { cost, L: { fwd, side, turnout, knee, point }, seat, plano, xs, heelY: m.r.heel.y, heelZ: m.r.heel.z, kneeY: m.r.knee.y }
    }
  console.log(JSON.stringify(best))
}
// quem: imprime a altura de cada parte para saber qual encosta no chao
if (args[0] === 'quem') {
  const [fwd, side, turnout, knee, point, lean] = args.slice(1).map(Number)
  medir({ fwd, side, turnout, flex: 0, knee, point }, lean, { abd: 40, swing: 88, elbow: 70, wrist: 10 })
  rig.root.updateMatrixWorld(true)
  const y = (o: any, r: number) => (o.getWorldPosition(V()).y - r).toFixed(3)
  const l = rig.legR
  console.log('pelvis', y(rig.pelvis, 0.07), 'knee', y(l.knee, 0.046), 'ankle', y(l.ankle, 0.032), 'samples', l.samples.map((o: any) => y(o, 0.012)).join(' '), 'hand', y(rig.armR.hand, 0.03), 'elbow', y(rig.armR.elbow, 0.03))
  const g = l.gesture.getWorldPosition(V()), k = l.knee.getWorldPosition(V()), a = l.ankle.getWorldPosition(V())
  console.log('coxa', ((g.y + k.y) / 2 - 0.056).toFixed(3), 'canela', ((a.y + k.y) / 2 - 0.038).toFixed(3), 'quadril y', g.y.toFixed(3))
}
// solta: pose intermediaria sentada, com os pes afastados, entre a borboleta e o abraco
if (args[0] === 'solta') {
  let best: any = null
  const braco = { abd: 55, swing: 75, elbow: 50, wrist: 10 }
  for (let fwd = 100; fwd <= 160; fwd += 4) for (let side = 20; side <= 64; side += 4) for (let turnout = 0; turnout <= 80; turnout += 6)
    for (let knee = 130; knee <= 160; knee += 4) for (let point = 0; point <= 30; point += 10) {
      const m = medir({ fwd, side, turnout, flex: 0, knee, point }, 15, braco)
      const seat = Math.max(0, m.pelv.y - 0.07)
      const xs = [m.r.heel.x, m.r.ball.x, m.r.toe.x]
      const lado = xs.reduce((a, x) => a + Math.abs(x + 0.075), 0)
      const pe = Math.max(0, Math.max(m.r.heel.y, m.r.ball.y) - 0.05)
      const cost = seat * 25 + lado * 5 + pe * 8
      if (!best || cost < best.cost) best = { cost, L: { fwd, side, turnout, knee, point }, seat, xs, n: m.r.n.toArray().map((v) => +v.toFixed(2)), heelY: m.r.heel.y }
    }
  console.log(JSON.stringify(best))
}
// abre: as solas se separando, sem perder o en dehors
if (args[0] === 'abre') {
  let best: any = null
  const braco = { abd: 55, swing: 75, elbow: 50, wrist: 10 }
  for (let fwd = 80; fwd <= 130; fwd += 3) for (let side = 40; side <= 75; side += 3) for (let turnout = 60; turnout <= 95; turnout += 5)
    for (let knee = 100; knee <= 140; knee += 4) for (let point = 0; point <= 30; point += 10) {
      const m = medir({ fwd, side, turnout, flex: 0, knee, point }, 15, braco)
      const seat = Math.max(0, m.pelv.y - 0.07)
      const xs = [m.r.heel.x, m.r.ball.x, m.r.toe.x]
      const lado = xs.reduce((a, x) => a + Math.abs(x + 0.07), 0)
      const pe = Math.max(0, Math.min(m.r.heel.y, m.r.ball.y) - 0.05)
      const cost = seat * 25 + lado * 5 + pe * 8
      if (!best || cost < best.cost) best = { cost, L: { fwd, side, turnout, knee, point }, seat, xs, heelY: m.r.heel.y, n: m.r.n.toArray().map((v) => +v.toFixed(2)) }
    }
  console.log(JSON.stringify(best))
}
