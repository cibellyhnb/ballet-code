/*******************************************************************************
 * assento.test.ts
 * funcao principal: teste do aquecimento da tela inicial: imprime, de quarto em
 * quarto de tempo, a altura do assento (quadril menos o raio do bumbum) e da
 * mao mais baixa, da borboleta ate ficar de joelhos. assento perto de 0 quer
 * dizer sentada de verdade. roda com: npx tsx tools/assento.test.ts
 ******************************************************************************/
import * as THREE from 'three'
import { buildRig, applyState } from '../src/engine/rig'
import { lerpState } from '../src/engine/state'
import { DEFAULT_LOOK } from '../src/engine/look'
import { warmupTimeline } from '../src/engine/warmup'
const rig = buildRig(DEFAULT_LOOK)
const tl = warmupTimeline()
// a mesma curva suave do store, para interpolar igual a tela
const smooth = (t: number) => t * t * (3 - 2 * t)
const V = new THREE.Vector3()
// grupo unico: percorre a parte do chao do aquecimento (tempos 52,5 a 64)
for (let bt = 52.5; bt <= 64; bt += 0.25) {
  let i = 0
  while (i < tl.moves.length - 1 && tl.starts[i + 1] <= bt) i++
  const k = smooth(Math.min(1, (bt - tl.starts[i]) / tl.moves[i].beats))
  applyState(rig, lerpState(tl.states[i], tl.states[i + 1], k), tl.moves[i].weight, true)
  rig.root.updateMatrixWorld(true)
  const seat = rig.pelvis.getWorldPosition(V).y - 0.07
  const h = Math.min(rig.armR.hand.getWorldPosition(V).y, rig.armL.hand.getWorldPosition(new THREE.Vector3()).y)
  console.log(bt.toFixed(2), tl.moves[i].label.slice(0, 28).padEnd(28), 'assento', (seat * 100).toFixed(1), 'mão', (h * 100).toFixed(1))
}
