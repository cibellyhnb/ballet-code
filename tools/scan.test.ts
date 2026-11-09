/*******************************************************************************
 * scan.test.ts
 * funcao principal: teste de trancos e de pe atravessando o chao: compila mais
 * de 140 combinacoes (barra, centro, saltos, giros, viagens) e anda por cada
 * uma de 0,02 em 0,02 tempo, procurando pe mais de 1,2 cm dentro do chao ou
 * algum ponto que pula mais de 12 cm de um quadro para o outro. com PONTA=1 usa
 * a sapatilha de ponta. com o nome de um caso e um intervalo de tempos, imprime
 * os angulos das pernas quadro a quadro. roda com: npx tsx tools/scan.test.ts
 ******************************************************************************/
import * as THREE from 'three'
import { compile, type Instr, type Program } from '../src/engine/program'
import { lerpState } from '../src/engine/state'
import { buildRig, applyState } from '../src/engine/rig'
const smooth = (t: number) => t * t * (3 - 2 * t)

/*******************************************************************************
 * ev
 * funcao: o estado do corpo num tempo, igual ao evaluate do store mas sem a
 * cabeca.
 * recebe: t (Timeline) e beat (number).
 * retorna: st (o estado), w (o peso), slide e label (o texto do movimento).
 ******************************************************************************/
function ev(t: ReturnType<typeof compile>, beat: number) {
  const n = t.moves.length
  let i = 0
  while (i < n - 1 && t.starts[i + 1] <= beat) i++
  const local = Math.min(1, Math.max(0, (beat - t.starts[i]) / t.moves[i].beats))
  const e = t.moves[i].ease
  const k = e === 'sobe' ? 1 - (1 - local) * (1 - local) : e === 'cai' ? local * local : e === 'linear' ? local : smooth(local)
  return { st: lerpState(t.states[i], t.states[i + 1], k), w: t.moves[i].weight, slide: t.moves[i].slide ?? true, label: t.moves[i].label }
}
import { DEFAULT_LOOK } from '../src/engine/look'
const rig = buildRig({ ...DEFAULT_LOOK, ponta: !!(globalThis as any).process.env.PONTA })
// altura do ponto mais baixo da sola de uma perna
const mins = (l: typeof rig.legR) => { let m = Infinity; for (const o of (l as any).samples) m = Math.min(m, o.getWorldPosition(new THREE.Vector3()).y); return m }

/*******************************************************************************
 * scan
 * funcao: percorre uma combinacao e conta os quadros com pe dentro do chao e os
 * trancos (pulo de mais de 12 cm entre quadros, menos nos giros). imprime o
 * caso se achar problema ou erro de compilacao.
 * recebe: nome (do caso) e prog (Program).
 * retorna: o numero de quadros com problema.
 ******************************************************************************/
function scan(nome: string, prog: Program) {
  const tl = compile(prog)
  const erros = tl.diags.filter((d) => d.level === 'erro').map((d) => d.msg.slice(0, 50))
  let prev: number[] | null = null
  let pops = 0, fundo = 0, pior = '', piorV = 0, cabeca = 0
  for (let b = 0; b <= tl.total; b += 0.02) {
    const { st, w, slide, label } = ev(tl, b)
    applyState(rig, st, w, slide)
    rig.root.updateMatrixWorld(true)
    const cur = [...rig.legR.toes.getWorldPosition(new THREE.Vector3()).toArray(), ...rig.legL.toes.getWorldPosition(new THREE.Vector3()).toArray(), ...rig.pelvis.getWorldPosition(new THREE.Vector3()).toArray()]
    const yR = mins(rig.legR), yL = mins(rig.legL)
    if (Math.min(yR, yL) < -0.012) { fundo++; if (-Math.min(yR, yL) > piorV) { piorV = -Math.min(yR, yL); pior = `${b.toFixed(2)} ${label} (chão ${Math.min(yR, yL).toFixed(3)})` } }
    if (prev) {
      const d = (a: number) => Math.hypot(cur[a] - prev![a], cur[a + 1] - prev![a + 1], cur[a + 2] - prev![a + 2])
      const m = Math.max(d(0), d(3), d(6))
      const spin = Math.abs(st.root.spin % 360) > 1 // girando
      if (m > 0.12 && !(spin && d(6) < 0.03)) { pops++; if (m > piorV) { piorV = m; pior = `${b.toFixed(2)} ${label} (${m.toFixed(2)} m)` } }
    }
    prev = cur
  }
  if (pops || fundo || erros.length) console.log(nome.padEnd(42), 'pulos', pops, 'chão', fundo, erros.length ? 'ERROS ' + erros.join(' | ') : '', pior)
  return pops + fundo
}
const D = 'R' as const, E = 'L' as const
const prep: Instr = { t: 'preparacao', perna: D }
// barra e centro montam o programa de um caso: na barra com preparacao e finalizar, no centro ja comecando la
const barra = (i: Instr[]): Program => ({ funcoes: [], principal: [prep, ...i, { t: 'finalizar', perna: D }] })
const centro = (i: Instr[], pes: '1' | '5' = '5'): Program => ({ funcoes: [], inicio: 'centro', principal: [{ t: 'pes', pos: pes }, ...i] })
const dirs = ['devant', 'seconde', 'derriere'] as const
let total = 0
const casos: [string, Program][] = []
// grupo: battements, fondu, frappe e developpe nas tres direcoes, na barra em 1a, na barra em 5a e no centro
for (const t of ['tendu', 'glisse', 'jete', 'grandBattement', 'fondu', 'frappe', 'developpe'] as const)
  for (const d of dirs) {
    casos.push([`barra ${t} ${d}`, barra([{ t, perna: D, dir: d } as Instr])])
    casos.push([`barra5 ${t} ${d}`, barra([{ t: 'pes', pos: '5' }, { t, perna: D, dir: d === 'derriere' ? 'seconde' : d } as Instr, ...(d === 'derriere' ? [{ t, perna: D, dir: d } as Instr] : [])])])
    casos.push([`centro ${t} ${d}`, centro([{ t, perna: d === 'derriere' ? E : D, dir: d } as Instr])])
  }
// grupo: passos da barra que nao tem direcao, rond de jambe, arabesque, penche, attitude e cambre
for (const t of ['cloche', 'coupe', 'passe', 'pasDeCheval'] as const) casos.push([`barra ${t}`, barra([{ t, perna: D } as Instr, { t: 'fechar' }])])
for (const s of ['endehors', 'endedans'] as const) casos.push([`barra rond ${s}`, barra([{ t: 'rond', perna: D, sentido: s }])])
casos.push(['barra arabesque', barra([{ t: 'arabesque', perna: D }])])
casos.push(['barra penche', barra([{ t: 'penche', perna: D }])])
for (const d of ['devant', 'derriere'] as const) {
  casos.push([`barra attitude ${d}`, barra([{ t: 'attitude', perna: D, dir: d }])])
  casos.push([`barra cambre ${d}`, barra([{ t: 'cambre', dir: d }])])
}
// grupo: piruetas simples e duplas, en dehors e en dedans, na barra e no centro
for (const s of ['endehors', 'endedans'] as const) for (const v of [1, 2] as const) {
  casos.push([`barra pirueta ${s} ${v}`, barra([{ t: 'pes', pos: '5' }, { t: 'pirueta', perna: D, sentido: s, voltas: v }])])
  casos.push([`centro pirueta ${s} ${v}`, centro([{ t: 'pirueta', perna: D, sentido: s, voltas: v }])])
}
casos.push(['centro pirueta attitude', centro([{ t: 'pirueta', perna: D, forma: 'attitude' }])])
// grupo: plies e releves em cada posicao, mais virar, reverence e ir e voltar do centro
for (const p of ['1', '2', '4', '5'] as const) for (const t of ['demiPlie', 'grandPlie', 'releve'] as const) casos.push([`barra ${t} ${p}`, barra([{ t, pos: p }])])
casos.push(['barra virar', barra([{ t: 'virar' }, { t: 'preparacao', perna: E }, { t: 'tendu', perna: E, dir: 'seconde' }])])
casos.push(['barra reverence', barra([{ t: 'reverence' }])])
casos.push(['vai e volta centro', barra([{ t: 'local', onde: 'centro' }, { t: 'direcao', dir: 'croise' }, { t: 'local', onde: 'barra' }])])
casos.push(['centro fouette adage', centro([{ t: 'fouette', perna: D }])])
casos.push(['centro arabesques', centro([{ t: 'arabesque', perna: E, tipo: '1' }, { t: 'arabesque', perna: E, tipo: '2' }, { t: 'arabesque', perna: E, tipo: '3' }])])
casos.push(['centro penche', centro([{ t: 'penche', perna: E }])])
casos.push(['centro saltos', centro([{ t: 'saute' }, { t: 'changement' }, { t: 'changement' }, { t: 'echappe' }])])
// grupo: deslocamentos, saltos e giros do centro com as duas pernas
for (const p of [D, E]) {
  const q = p === 'R' ? E : D
  casos.push([`glissade ${p}`, centro([{ t: 'glissade', perna: p }])])
  casos.push([`bourree ${p}`, centro([{ t: 'pes', pos: '5' }, ...(p === 'L' ? [{ t: 'changement' } as Instr] : []), { t: 'pasDeBourree', perna: p }])])
  casos.push([`balance ${p}`, centro([{ t: 'balance', perna: p }, { t: 'balance', perna: q }])])
  casos.push([`assemble ${q}`, centro([...(p === 'L' ? [{ t: 'changement' } as Instr] : []), { t: 'assemble', perna: q }])])
  casos.push([`sissonne ${p}`, centro([{ t: 'sissonne', perna: p }])])
  casos.push([`grandJete ${p}`, centro([...(p === 'L' ? [{ t: 'changement' } as Instr] : []), { t: 'grandJete', perna: p }])])
  casos.push([`pasDeChat ${q}`, centro([...(p === 'L' ? [{ t: 'changement' } as Instr] : []), { t: 'pasDeChat', perna: q }])])
  for (const f of ['giro', 'passe', 'arabesque'] as const) casos.push([`pique ${f} ${p}`, centro([{ t: 'pique', perna: p, forma: f }])])
  casos.push([`fouettes ${p}`, centro([{ t: 'repetir', vezes: 4, corpo: [{ t: 'fouetteGiro', perna: p }] }, { t: 'fechar' }])])
  casos.push([`soutenu ${p}`, centro([{ t: 'soutenu', perna: p }, { t: 'soutenu', perna: q }])])
  for (const d of dirs) casos.push([`tombe ${d} ${p}`, centro([{ t: 'tombe', perna: p, dir: d }])])
  for (const d of ['devant', 'seconde'] as const) casos.push([`chasse ${d} ${p}`, centro([{ t: 'chasse', perna: p, dir: d }])])
}
// grupo: pontos da sala e diagonais
casos.push(['ponto 6 diagonal 2', centro([{ t: 'irPonto', n: 6 }, { t: 'grandJete', perna: D }, { t: 'chasse', perna: D, dir: 'devant' }, { t: 'grandJete', perna: D }])])
casos.push(['pontos volta', centro([{ t: 'irPonto', n: 8 }, { t: 'irPonto', n: 4 }, { t: 'irPonto', n: 1 }, { t: 'olharPonto', n: 5 }, { t: 'olharPonto', n: 3 }])])
casos.push(['ponto 4 pique', centro([{ t: 'irPonto', n: 4 }, { t: 'repetir', vezes: 3, corpo: [{ t: 'pique', perna: E, forma: 'giro' }] }])])
if (!(globalThis as any).process.argv[2]) for (const [n, p] of casos) total += scan(n, p)
console.log('casos', casos.length, 'problemas', total)
// modo detalhe: um caso so, com os angulos das pernas quadro a quadro no intervalo pedido
const det = (globalThis as any).process.argv[2]
if (det) {
  const [n, p] = casos.find(([n]) => n === det)!
  const tl = compile(p)
  const [a, b] = (globalThis as any).process.argv[3].split(',').map(Number)
  for (let x = a; x <= b; x += 0.02) {
    const { st, w, slide, label } = ev(tl, x)
    applyState(rig, st, w, slide)
    const g = (l: any) => `ank ${(l.ankle.rotation.x * 57.3).toFixed(0)} kn ${(l.knee.rotation.x * 57.3).toFixed(0)} fl ${(l.flex.rotation.x * 57.3).toFixed(0)} gx ${(l.gesture.rotation.x * 57.3).toFixed(0)} gz ${(l.gesture.rotation.z * 57.3).toFixed(0)}`
    console.log(x.toFixed(2), label.padEnd(30), w, 'R:', g(rig.legR), '| L:', g(rig.legL), 'stR kn', st.legR.knee.toFixed(0), 'fwd', st.legR.fwd.toFixed(0))
  }
}
