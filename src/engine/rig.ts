/*******************************************************************************
 * rig.ts
 * funcao principal: a bailarina 3D. constroi o corpo (pernas, bracos, cabeca
 * com rosto e cabelo, collant, saia, sapatilhas de meia ponta ou de ponta) e
 * traduz o estado de ballet (BodyState) em rotacoes das articulacoes. depois de
 * posar, ajusta o corpo ao chao: apoia as pernas de base, planta o pe no
 * releve, nao deixa uma perna atravessar a outra, faz a ponta do pe de trabalho
 * varrer o chao, tira os bracos de dentro da cabeca e prende a mao na barra.
 ******************************************************************************/
import * as THREE from 'three'
import { BASE, type Arm, type BodyState, type Leg, type Weight } from './state'
import { DEFAULT_LOOK, mixHex, type Look } from './look'

/*******************************************************************************
 * DIM
 * funcao: proporcoes do corpo em metros: pernas longas para as linhas do ballet
 * e cabeca grande e redonda (estilo cozy).
 ******************************************************************************/
export const DIM = {
  thigh: 0.44,
  shin: 0.42,
  ankleH: 0.065, // altura do tornozelo acima da sola com o pe no chao
  hipX: 0.072,
  torso: 0.31,
  shoulderX: 0.118,
  upperArm: 0.24,
  forearm: 0.22,
  headR: 0.16,
}
// comprimento da perna e altura do quadril em pe (o program.ts usa para as contas do plie)
export const LEG_LEN = DIM.thigh + DIM.shin
export const HIP_Y = LEG_LEN + DIM.ankleH

/*******************************************************************************
 * toeAlongLeg e TENDU_ANGLE
 * funcao: quanto o pe esticado alonga a perna, e o angulo do tendu: o quanto a
 * perna inclina ate a ponta do pe esticado tocar o chao.
 * recebe: pointDeg (graus de ponta do pe).
 * retorna: o alongamento em metros (TENDU_ANGLE e o angulo em graus).
 ******************************************************************************/
const toeAlongLeg = (pointDeg: number) => {
  const p = (pointDeg * Math.PI) / 180
  return 0.06 * Math.cos(p) + 0.166 * Math.sin(p)
}
export const TENDU_ANGLE = (Math.acos(HIP_Y / (LEG_LEN + toeAlongLeg(86))) * 180) / Math.PI

/*******************************************************************************
 * COLORS
 * funcao: as cores usadas para construir a bailarina. as do camarim sao
 * trocadas por applyLook antes de cada construcao.
 ******************************************************************************/
export const COLORS = {
  skin: '#f8d7c4',
  leotard: '#a98bd9',
  leotardDark: '#8f6fc6',
  skirtA: '#e4d8fa',
  skirtB: '#f6d6e6',
  tights: '#fad6da',
  slipper: '#f2b3c2',
  slipperEdge: '#eaa3b2',
  sole: '#c9a08c',
  elastic: '#f3b4c2',
  hair: '#6b4232',
  scrunchie: '#f28fae',
  eye: '#2f2430',
  blush: '#f7a1ae',
  mouth: '#c9677b',
}

/*******************************************************************************
 * applyLook
 * funcao: aplica o visual escolhido no camarim as cores da construcao,
 * derivando os tons de sombra e de brilho.
 * recebe: l (Look).
 * retorna: nada.
 ******************************************************************************/
function applyLook(l: Look) {
  COLORS.skin = l.pele
  COLORS.hair = l.cabelo
  COLORS.leotard = l.collant
  COLORS.leotardDark = mixHex(l.collant, '#2a1c33', 0.18)
  COLORS.skirtA = l.saia
  COLORS.skirtB = mixHex(l.saia, '#ffffff', 0.35)
  COLORS.slipper = l.sapatilha
  COLORS.slipperEdge = mixHex(l.sapatilha, '#3a2030', 0.1)
  COLORS.elastic = mixHex(l.sapatilha, '#3a2030', 0.04)
  COLORS.scrunchie = l.laco
  COLORS.blush = mixHex('#f7a1ae', l.pele, 0.25)
}

// material padrao, fosco
const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, ...extra })

/*******************************************************************************
 * mesh
 * funcao: cria uma malha que faz e recebe sombra.
 * recebe: geo (geometria), m (material) e shadow (false para nao fazer sombra).
 * retorna: o Mesh.
 ******************************************************************************/
function mesh(geo: THREE.BufferGeometry, m: THREE.Material, shadow = true) {
  const o = new THREE.Mesh(geo, m)
  o.castShadow = shadow
  o.receiveShadow = shadow
  return o
}

/*******************************************************************************
 * limb
 * funcao: um segmento de braco ou perna que vai da origem do grupo para baixo,
 * afinando, com uma bolinha na articulacao.
 * recebe: len (comprimento), r0 e r1 (raio em cima e embaixo) e m (material).
 * retorna: o grupo do segmento.
 ******************************************************************************/
function limb(len: number, r0: number, r1: number, m: THREE.Material) {
  const g = new THREE.Group()
  const cyl = mesh(new THREE.CylinderGeometry(r0, r1, len, 22), m)
  cyl.position.y = -len / 2
  g.add(cyl)
  g.add(mesh(new THREE.SphereGeometry(r0 * 1.02, 20, 14), m))
  return g
}

/*******************************************************************************
 * wavySkirt
 * funcao: uma camada de saia de chiffon, transparente, com a barra ondulada.
 * recebe: rTop e rBot (raio na cintura e na barra), h (altura), waves (quantas
 * ondas), amp (tamanho das ondas), color e opacity.
 * retorna: a malha da saia.
 ******************************************************************************/
function wavySkirt(rTop: number, rBot: number, h: number, waves: number, amp: number, color: string, opacity: number) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, 96, 6, true)
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const t = 0.5 - v.y / h // 0 em cima, 1 embaixo
    const th = Math.atan2(v.z, v.x)
    const k = 1 + amp * Math.sin(waves * th) * t * t
    v.x *= k
    v.z *= k
    v.y += 0.012 * Math.cos(waves * th) * t * t
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  const m = mat(color, { transparent: true, opacity, side: THREE.DoubleSide, roughness: 0.9 })
  const o = mesh(geo, m)
  o.castShadow = true
  return o
}

/*******************************************************************************
 * bow
 * funcao: um lacinho de fita (duas alcas e um no).
 * recebe: color e size (escala, 1 se nao vier).
 * retorna: o grupo do laco.
 ******************************************************************************/
function bow(color: string, size = 1) {
  const g = new THREE.Group()
  const m = mat(color, { roughness: 0.55 })
  for (const s of [-1, 1]) {
    const loop = mesh(new THREE.SphereGeometry(0.022, 14, 10), m)
    loop.scale.set(1.3, 0.85, 0.45)
    loop.position.x = s * 0.024
    loop.rotation.z = s * 0.35
    g.add(loop)
  }
  g.add(mesh(new THREE.SphereGeometry(0.011, 10, 8), m))
  g.scale.setScalar(size)
  return g
}

/*******************************************************************************
 * LegRig e ArmRig
 * funcao: as articulacoes de uma perna (quadril, en dehors, flexao, joelho,
 * tornozelo, dedos e os pontos da sola usados para achar o chao) e de um braco
 * (ombro, cotovelo, pulso e mao).
 ******************************************************************************/
type LegRig = {
  gesture: THREE.Group
  turnout: THREE.Group
  flex: THREE.Group
  knee: THREE.Group
  ankle: THREE.Group
  toes: THREE.Object3D
  samples: THREE.Object3D[]
  mem?: { gx: number; gz: number; ank: number; dobra: number } // correcoes do ultimo quadro (perna de trabalho)
  plant?: number // abertura extra do releve (metatarso/plataforma plantado) no ultimo quadro em que foi apoio
}
type ArmRig = { shoulder: THREE.Group; elbow: THREE.Group; wrist: THREE.Group; hand: THREE.Object3D }

/*******************************************************************************
 * Rig
 * funcao: a bailarina pronta: as partes que a tela mexe a cada quadro
 * (articulacoes, olhos, rosto, saia, peito) e onde fica a barra.
 ******************************************************************************/
export type Rig = {
  root: THREE.Group
  pelvis: THREE.Group
  spine: THREE.Group
  neck: THREE.Group
  legR: LegRig
  legL: LegRig
  armR: ArmRig
  armL: ArmRig
  eyes: THREE.Object3D[] // para piscar
  face: Face
  skirt: THREE.Object3D
  head: THREE.Object3D
  chest: THREE.Object3D // para respirar
  barre: { x: number; y: number } | null // onde a mao segura a barra
  ponta: boolean // sapatilha de ponta: o releve sobe ate a ponta dos dedos
}

/*******************************************************************************
 * SHOE
 * funcao: medidas da sapatilha de meia ponta (sapatilha de lona com sola
 * dividida), em relacao ao tornozelo: calcanhar, bico, altura e onde fica o
 * metatarso.
 ******************************************************************************/
const SHOE = { heelZ: -0.05, toeZ: 0.172, yc: -0.036, top: 0.044, ballZ: 0.1 }
// a sapatilha de ponta e cortada perto do bico (corte na esfera): ali fica a plataforma chata
const CORTE_PONTA = 0.8
const PLATAFORMA_Z = (SHOE.heelZ + SHOE.toeZ) / 2 + Math.pow(CORTE_PONTA, 0.72) * ((SHOE.toeZ - SHOE.heelZ) / 2)

/*******************************************************************************
 * shoeGeometry
 * funcao: a malha da sapatilha: uma malha so, lisa e afinada, deformada a
 * partir de uma esfera e "skinned" em dois ossos (tornozelo e dedos), para
 * dobrar suave na meia ponta sem emenda. as cores sao por vertice: cetim, a
 * abertura mostrando a meia, o debrum e as solinhas.
 * recebe: ponta (true para a sapatilha de ponta, com caixa dura e plataforma
 * chata no bico).
 * retorna: a BufferGeometry com cores e pesos de skinning.
 ******************************************************************************/
function shoeGeometry(ponta = false) {
  const geo = new THREE.SphereGeometry(1, 72, 48)
  geo.rotateX(Math.PI / 2) // polos ao longo de Z (calcanhar → ponta)
  const pos = geo.attributes.position
  const n = pos.count
  const colors = new Float32Array(n * 3)
  const skinIndex = new Uint16Array(n * 4)
  const skinWeight = new Float32Array(n * 4)
  const cz = (SHOE.heelZ + SHOE.toeZ) / 2
  const hz = (SHOE.toeZ - SHOE.heelZ) / 2
  const sole = -DIM.ankleH
  const cSatin = new THREE.Color(COLORS.slipper)
  const cRim = new THREE.Color(COLORS.slipperEdge)
  const cTights = new THREE.Color(COLORS.tights)
  const cSole = new THREE.Color(COLORS.sole)
  const cPlataforma = new THREE.Color(mixHex(COLORS.slipper, '#c9a08c', 0.45)) // cetim gasto da plataforma

  /*****************************************************************************
   * smooth
   * funcao: degrau suave entre a e b (0 antes de a, 1 depois de b).
   * recebe: a, b e x.
   * retorna: o valor entre 0 e 1.
   ****************************************************************************/
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }
  for (let i = 0; i < n; i++) {
    const sx = pos.getX(i)
    const sy = pos.getY(i)
    const sz = pos.getZ(i)
    const r = Math.sqrt(Math.max(1e-6, 1 - sz * sz))
    let z = cz + Math.sign(sz) * Math.pow(Math.abs(sz), 0.72) * hz
    // ponta: o bico termina numa plataforma chata e oval (onde ela fica em pe), em vez de afinar
    const naPlataforma = ponta && sz > CORTE_PONTA
    if (naPlataforma) z = PLATAFORMA_Z
    const u = (z - SHOE.heelZ) / (SHOE.toeZ - SHOE.heelZ)
    // na ponta a caixa nao afina tanto no bico: fica "quadradinha" e cheia
    const w = 0.0335 * (0.86 + 0.14 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * (ponta ? 1 + 0.35 * smooth(0.6, 1, u) * (1 - r) : 1)
    // a ponta tem a "caixa" dura: o bico fica mais alto e mais reto
    const htop = SHOE.top * (1 - (ponta ? 0.3 : 0.5) * smooth(0.5, 1.02, u))
    const x = sx * w
    let y = sy >= 0 ? SHOE.yc + sy * htop : SHOE.yc + sy * 0.05
    const onSole = y <= sole + 0.0015
    y = Math.max(sole, y)
    pos.setXYZ(i, x, y, z)

    // abertura: elipse no plano (u, angulo a partir do topo)
    const ang = Math.atan2(sx / r, sy / r)
    // ponta: abertura menor e mais para tras (a caixa cobre os dedos todos), debrum fino
    const e = ponta ? ((u - 0.2) / 0.19) ** 2 + (ang / 0.95) ** 2 : ((u - 0.27) / 0.25) ** 2 + (ang / 1.05) ** 2
    let c = cSatin
    if (e < 1) c = cTights
    else if (e < (ponta ? 1.12 : 1.22)) c = cRim
    if (ponta) {
      if (naPlataforma) c = cPlataforma
      else if (onSole && u < 0.78) c = cSole
    } else if (onSole && (u < 0.33 || (u > 0.56 && u < 0.92))) c = cSole
    colors.set([c.r, c.g, c.b], i * 3)

    const t = smooth(SHOE.ballZ - 0.018, SHOE.ballZ + 0.018, z)
    skinIndex.set([0, 1, 0, 0], i * 4)
    skinWeight.set([1 - t, t, 0, 0], i * 4)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
  geo.computeVertexNormals()
  return geo
}

/*******************************************************************************
 * ribbon
 * funcao: uma fita fininha passando pelos pontos dados (as fitas da sapatilha).
 * recebe: points (pontos da curva), radius (espessura) e color.
 * retorna: a malha da fita.
 ******************************************************************************/
function ribbon(points: [number, number, number][], radius: number, color: string) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
  return mesh(new THREE.TubeGeometry(curve, 28, radius, 6, false), mat(color, { roughness: 0.6 }), false)
}

/*******************************************************************************
 * buildSlipper
 * funcao: monta a sapatilha no tornozelo: a malha com os ossos, os elasticos
 * (meia ponta) ou as fitas cruzadas na canela com o no (ponta) e o lacinho.
 * recebe: ankle (o grupo do tornozelo), ponta (tipo de sapatilha) e canela (o
 * grupo do joelho, onde as fitas da ponta sobem).
 * retorna: o osso dos dedos (que dobra na meia ponta).
 ******************************************************************************/
function buildSlipper(ankle: THREE.Group, ponta = false, canela?: THREE.Group) {
  const shoe = new THREE.SkinnedMesh(
    shoeGeometry(ponta),
    ponta
      ? new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.25, clearcoatRoughness: 0.4 })
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
  )
  shoe.castShadow = true
  shoe.receiveShadow = true
  shoe.frustumCulled = false
  const b0 = new THREE.Bone()
  const toes = new THREE.Bone()
  toes.position.set(0, -DIM.ankleH + 0.01, SHOE.ballZ)
  b0.add(toes)
  shoe.add(b0)
  ankle.add(shoe)
  shoe.updateMatrixWorld(true)
  shoe.bind(new THREE.Skeleton([b0, toes]))

  // tornozelo de meia (cobre a junta)
  ankle.add(mesh(new THREE.SphereGeometry(0.03, 16, 12), mat(COLORS.tights, { roughness: 0.6 })))

  if (ponta && canela) {
    // fitas de cetim: saem da lateral da sapatilha, cruzam no peito do pe (parte que acompanha o pe)
    // e dao a volta no tornozelo (parte presa na canela, para nao girar junto quando ela sobe na ponta)
    const fita = mixHex(COLORS.slipper, '#ffffff', 0.18)
    const y0 = -DIM.shin
    for (const s of [-1, 1]) {
      ankle.add(
        ribbon(
          [
            [s * 0.031, -0.03, 0.006],
            [s * 0.026, -0.008, 0.024],
            [s * 0.008, 0.008, 0.032],
            [-s * 0.012, 0.018, 0.03],
          ],
          0.0042,
          fita,
        ),
      )
      // duas voltas subindo pelo tornozelo, cruzando na frente (bem visivel: e a marca da ponta)
      const r = 0.035
      const volta: [number, number, number][] = []
      for (let k = 0; k <= 22; k++) {
        const ang = Math.PI / 2 + s * (0.35 + (k / 22) * Math.PI * 3.1)
        volta.push([Math.cos(ang) * r, y0 + 0.02 + k * 0.0042 + (s > 0 ? 0.004 : 0), Math.sin(ang) * r])
      }
      canela.add(ribbon(volta, 0.005, fita))
    }
    const no = mesh(new THREE.SphereGeometry(0.0055, 10, 8), mat(fita, { roughness: 0.5 }), false)
    no.position.set(-0.034, y0 + 0.112, 0.006) // no escondido do lado de dentro
    canela.add(no)
    return toes
  }

  // elasticos cruzados em X sobre o peito do pe
  for (const s of [-1, 1]) {
    ankle.add(
      ribbon(
        [
          [s * 0.026, -0.03, -0.022],
          [s * 0.029, -0.012, -0.004],
          [s * 0.019, 0.004, 0.016],
          [0, 0.0135, 0.032],
          [-s * 0.02, 0.006, 0.05],
          [-s * 0.029, -0.012, 0.064],
        ],
        0.0032,
        COLORS.elastic,
      ),
    )
  }

  // lacinho do cordao na frente da abertura
  const bowM = mat(COLORS.slipperEdge, { roughness: 0.6 })
  const knot = new THREE.Group()
  knot.position.set(0, 0.0045, 0.066)
  knot.rotation.x = -0.35
  for (const s of [-1, 1]) {
    const loop = mesh(new THREE.TorusGeometry(0.0065, 0.0012, 6, 16), bowM, false)
    loop.position.x = s * 0.0068
    loop.rotation.set(Math.PI / 2, 0, s * 0.4)
    loop.scale.set(1, 0.6, 1)
    knot.add(loop)
    const tail = mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.016, 5), bowM, false)
    tail.position.set(s * 0.004, 0, 0.007)
    tail.rotation.set(Math.PI / 2, 0, s * 0.5)
    knot.add(tail)
  }
  knot.add(mesh(new THREE.SphereGeometry(0.0022, 8, 6), bowM, false))
  ankle.add(knot)
  return toes
}

/*******************************************************************************
 * buildLeg
 * funcao: monta uma perna com meia-calca e sapatilha, e os pontos da sola
 * (calcanhar, metatarso e ponta ou plataforma) usados para achar o chao.
 * recebe: s (-1 perna direita, 1 esquerda) e ponta (tipo de sapatilha).
 * retorna: o LegRig.
 ******************************************************************************/
function buildLeg(s: -1 | 1, ponta = false): LegRig {
  const tights = mat(COLORS.tights, { roughness: 0.6 })
  const gesture = new THREE.Group()
  gesture.position.set(s * DIM.hipX, 0, 0)
  gesture.rotation.order = 'XZY'
  const turnout = new THREE.Group()
  const flex = new THREE.Group()
  gesture.add(turnout)
  turnout.add(flex)
  flex.add(limb(DIM.thigh, 0.066, 0.045, tights))
  const knee = new THREE.Group()
  knee.position.y = -DIM.thigh
  flex.add(knee)
  knee.add(limb(DIM.shin, 0.045, 0.031, tights))
  const ankle = new THREE.Group()
  ankle.position.y = -DIM.shin
  knee.add(ankle)
  const toes = buildSlipper(ankle, ponta, knee)

  /*****************************************************************************
   * mk
   * funcao: cria um ponto invisivel preso numa parte do corpo.
   * recebe: parent (onde prender) e x, y, z (posicao local).
   * retorna: o Object3D.
   ****************************************************************************/
  const mk = (parent: THREE.Object3D, x: number, y: number, z: number) => {
    const o = new THREE.Object3D()
    o.position.set(x, y, z)
    parent.add(o)
    return o
  }
  const samples = [
    mk(ankle, 0, -DIM.ankleH, -0.038), // calcanhar
    mk(ankle, 0, -DIM.ankleH, SHOE.ballZ), // metatarso (meia ponta)
    ...(ponta
      ? [mk(toes, 0, -0.01, PLATAFORMA_Z - SHOE.ballZ), mk(toes, 0, 0.008, PLATAFORMA_Z - SHOE.ballZ)] // plataforma da ponta
      : [mk(toes, 0, -0.012, SHOE.toeZ - SHOE.ballZ - 0.006)]), // ponta dos dedos
  ]
  return { gesture, turnout, flex, knee, ankle, toes, samples }
}

/*******************************************************************************
 * buildArm
 * funcao: monta um braco com a maozinha redonda.
 * recebe: s (-1 direito, 1 esquerdo).
 * retorna: o ArmRig.
 ******************************************************************************/
function buildArm(s: -1 | 1): ArmRig {
  const skin = mat(COLORS.skin)
  const shoulder = new THREE.Group()
  shoulder.position.set(s * DIM.shoulderX, -0.035, 0)
  shoulder.rotation.order = 'YZX'
  shoulder.add(limb(DIM.upperArm, 0.037, 0.03, skin))
  const elbow = new THREE.Group()
  elbow.position.y = -DIM.upperArm
  shoulder.add(elbow)
  elbow.add(limb(DIM.forearm, 0.029, 0.023, skin))
  const wrist = new THREE.Group()
  wrist.position.y = -DIM.forearm
  elbow.add(wrist)
  const mitten = mesh(new THREE.SphereGeometry(0.034, 16, 12), skin)
  mitten.scale.set(0.72, 1.2, 0.95)
  mitten.position.y = -0.03
  wrist.add(mitten)
  const hand = new THREE.Object3D()
  hand.position.y = -0.04
  wrist.add(hand)
  return { shoulder, elbow, wrist, hand }
}

/*******************************************************************************
 * Face
 * funcao: as partes do rosto que mudam: o rosto normal, a carinha de esforco, a
 * gotinha de suor e as bochechas.
 ******************************************************************************/
type Face = { normal: THREE.Object3D[]; esforco: THREE.Object3D[]; suor: THREE.Object3D; blush: THREE.Mesh[] }

/*******************************************************************************
 * buildHead
 * funcao: monta a cabeca: rosto com olhos, cilios, bochechas e boca (normal e
 * de esforco), gotinha de suor, cabelo com o penteado escolhido, xuxinha e
 * enfeites.
 * recebe: neck (o grupo do pescoco) e look (o visual).
 * retorna: os olhos (para piscar), as partes do rosto e a cabeca.
 ******************************************************************************/
function buildHead(neck: THREE.Group, look: Look): { eyes: THREE.Object3D[]; face: Face; head: THREE.Object3D } {
  const eyes: THREE.Object3D[] = []
  const face: Face = { normal: [], esforco: [], suor: new THREE.Group(), blush: [] }
  const r = DIM.headR
  const skin = mat(COLORS.skin, { roughness: 0.65 })
  const head = new THREE.Group()
  head.position.y = 0.055 + r * 0.9
  neck.add(head)

  const skull = mesh(new THREE.SphereGeometry(r, 36, 26), skin)
  skull.scale.set(1.04, 0.97, 0.97)
  head.add(skull)
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.03, 12, 10), skin)
    ear.scale.set(0.5, 1, 0.8)
    ear.position.set(s * r * 1.02, -0.012, 0.005)
    head.add(ear)
  }

  // rosto: olhos grandes com brilho, bochechas rosadas, sorrisinho
  // z da superficie da cabeca num ponto do rosto, para grudar olhos e bochechas nela
  const zOn = (x: number, y: number, k = 0.97) => Math.sqrt(Math.max(0, r * r - x * x - y * y)) * k
  const eyeM = new THREE.MeshStandardMaterial({ color: COLORS.eye, roughness: 0.25 })
  const white = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  for (const s of [-1, 1]) {
    const ex = s * 0.056
    const ey = -0.012
    // o olho fica num grupo proprio para poder piscar (escala em Y)
    const eyeG = new THREE.Group()
    eyeG.position.set(ex, ey, zOn(ex, ey) - 0.002)
    head.add(eyeG)
    eyes.push(eyeG)
    face.normal.push(eyeG)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.023, 16, 12), eyeM)
    eye.scale.set(0.82, 1.22, 0.45)
    eyeG.add(eye)
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 10, 8), white)
    shine.position.set(s * 0.004 + 0.004, 0.011, 0.01)
    eyeG.add(shine)
    const shine2 = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 8, 6), white)
    shine2.position.set(-0.004, -0.01, 0.009)
    eyeG.add(shine2)
    // cilios: dois risquinhos no canto de fora
    const lashM = new THREE.MeshStandardMaterial({ color: COLORS.eye, roughness: 0.5 })
    for (const [k, a] of [
      [0, 0.5],
      [1, 0.95],
    ] as const) {
      const lash = new THREE.Mesh(new THREE.CapsuleGeometry(0.0023, 0.012, 3, 6), lashM)
      lash.position.set(ex + s * (0.017 + k * 0.004), ey + 0.022 - k * 0.008, zOn(ex, ey) - 0.006)
      lash.rotation.z = -s * a
      lash.rotation.x = -0.3
      head.add(lash)
      face.normal.push(lash)
    }
    // olhinho de esforco: ">" e "<" (apertadinhos)
    const zz = zOn(ex, ey) + 0.004
    const ax = ex - s * 0.012 // ponta virada para o centro do rosto
    for (const dy of [0.012, -0.012]) {
      const fx = ex + s * 0.01
      const len = Math.hypot(fx - ax, dy)
      const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.0042, len, 3, 8), lashM)
      st.position.set((ax + fx) / 2, ey + dy / 2, zz)
      st.rotation.z = Math.atan2(dy, fx - ax) - Math.PI / 2
      st.visible = false
      head.add(st)
      face.esforco.push(st)
    }
    const bx = s * 0.098
    const by = -0.05
    const blush = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 14, 10),
      mat(COLORS.blush, { transparent: true, opacity: 0.75, roughness: 1 }),
    )
    blush.scale.set(1.25, 0.72, 0.25)
    blush.position.set(bx, by, zOn(bx, by, 0.96))
    blush.lookAt(head.position.clone().add(new THREE.Vector3(bx * 3, by * 3, 1)))
    head.add(blush)
    face.blush.push(blush)
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0045, 8, 20, Math.PI), mat(COLORS.mouth))
  mouth.rotation.z = Math.PI
  mouth.position.set(0, -0.058, zOn(0, -0.058) + 0.002)
  head.add(mouth)
  face.normal.push(mouth)
  // boquinha de esforco (um "hmpf" franzido) e gotinha de suor na tempora
  const pout = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 8), mat('#a8506e'))
  pout.scale.set(1.5, 0.55, 0.35)
  pout.position.set(0, -0.062, zOn(0, -0.062) + 0.001)
  pout.visible = false
  head.add(pout)
  face.esforco.push(pout)
  const gota = new THREE.Group()
  const gm = new THREE.MeshStandardMaterial({ color: '#bfe6ff', roughness: 0.1, emissive: '#9fd4ff', emissiveIntensity: 0.25 })
  const g1 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), gm)
  g1.scale.set(1, 1.1, 0.7)
  gota.add(g1)
  const g2 = new THREE.Mesh(new THREE.ConeGeometry(0.0125, 0.022, 12), gm)
  g2.position.y = 0.017
  gota.add(g2)
  gota.position.set(r * 0.86, 0.05, r * 0.5)
  gota.scale.setScalar(0.001)
  head.add(gota)
  face.suor = gota

  // cabelo: calota + (franjinha) + coque(s) com xuxinha e laco
  const hairM = mat(COLORS.hair, { roughness: 0.55 })
  const cap = mesh(new THREE.SphereGeometry(r * 1.06, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.56), hairM)
  cap.rotation.x = look.penteado === 'coque' ? -0.62 : -0.42
  cap.position.set(0, 0.006, -0.01)
  head.add(cap)
  if (look.penteado !== 'coque') {
    const bangs: [number, number, number][] = [
      [-0.085, 0.072, 0.105],
      [-0.03, 0.088, 0.118],
      [0.03, 0.088, 0.118],
      [0.085, 0.072, 0.105],
    ]
    for (const [x, y, z] of bangs) {
      const b = mesh(new THREE.SphereGeometry(0.052, 16, 12), hairM)
      b.scale.set(1, 0.62, 0.6)
      b.position.set(x, y, z)
      b.rotation.z = -x * 4
      head.add(b)
    }
  } else {
    // coque classico: testa a mostra, cabelo bem puxado para tras, laterais cobrindo as temporas
    for (const sgn of [-1, 1]) {
      const side = mesh(new THREE.SphereGeometry(r * 0.62, 20, 14), hairM)
      side.scale.set(0.55, 0.8, 1.05)
      side.position.set(sgn * r * 0.72, r * 0.32, -r * 0.05)
      side.rotation.z = sgn * 0.35
      head.add(side)
    }
    // risca no meio
    const part = mesh(new THREE.BoxGeometry(0.005, 0.003, 0.07), mat(COLORS.skin), false)
    part.position.set(0, r * 1.04, 0.03)
    part.rotation.x = 0.25
    head.add(part)
  }
  const scrM = mat(COLORS.scrunchie, { roughness: 0.6 })
  if (look.penteado === 'coquinhos') {
    for (const sgn of [-1, 1]) {
      const bun = mesh(new THREE.SphereGeometry(0.055, 20, 16), hairM)
      bun.position.set(sgn * 0.105, 0.135, -0.02)
      head.add(bun)
      const scr = mesh(new THREE.TorusGeometry(0.046, 0.012, 10, 24), scrM)
      scr.position.set(sgn * 0.083, 0.11, -0.016)
      scr.lookAt(new THREE.Vector3(sgn * 0.3, 0.35, -0.03))
      head.add(scr)
      const b = bow(COLORS.scrunchie, 1.1)
      b.position.set(sgn * 0.075, 0.1, 0.03)
      b.rotation.set(-0.2, sgn * 0.6, sgn * 0.7)
      head.add(b)
    }
  } else {
    const bun = mesh(new THREE.SphereGeometry(0.068, 20, 16), hairM)
    bun.position.set(0, 0.15, -0.075)
    head.add(bun)
    const scr = mesh(new THREE.TorusGeometry(0.058, 0.014, 10, 28), scrM)
    scr.position.set(0, 0.118, -0.06)
    scr.rotation.x = Math.PI / 2 + 0.55
    head.add(scr)
    const hairBow = bow(COLORS.scrunchie, 1.9)
    hairBow.position.set(0, 0.105, -0.122)
    hairBow.rotation.set(0.5, Math.PI, 0)
    head.add(hairBow)
  }

  // enfeites liberados com estrelas
  if (look.enfeite === 'tiara') {
    const gold = mat('#f2d38a', { roughness: 0.25, metalness: 0.6 })
    const pearl = mat('#fffaf5', { roughness: 0.2 })
    const tiara = new THREE.Group()
    tiara.position.set(0, 0.0, 0.0)
    tiara.rotation.x = 0.32
    head.add(tiara)
    const band = mesh(new THREE.TorusGeometry(r * 1.07, 0.005, 6, 40, Math.PI), gold)
    band.rotation.set(0, 0, 0)
    tiara.add(band)
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.32 + (0.36 * k) / 6)
      const h = k === 3 ? 0.045 : k % 2 ? 0.02 : 0.03
      const spike = mesh(new THREE.ConeGeometry(0.008, h, 8), gold)
      spike.position.set(Math.cos(a) * r * 1.07, Math.sin(a) * r * 1.07 + 0, 0)
      spike.position.multiplyScalar(1 + h / (2 * r))
      spike.rotation.z = a - Math.PI / 2
      tiara.add(spike)
      const p = mesh(new THREE.SphereGeometry(k === 3 ? 0.012 : 0.007, 10, 8), k === 3 ? mat(COLORS.scrunchie, { roughness: 0.2 }) : pearl)
      p.position.copy(spike.position).multiplyScalar(1 + h / (2 * r * 1.07))
      tiara.add(p)
    }
  }
  if (look.enfeite === 'flores') {
    const crown = new THREE.Group()
    crown.position.set(0, 0.05, -0.01)
    crown.rotation.x = -0.32
    head.add(crown)
    const cores = ['#f7b6c9', '#fff1c9', '#cdb8f0', '#ffffff', COLORS.scrunchie]
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2
      const fl = new THREE.Group()
      fl.position.set(Math.cos(a) * r * 1.02, 0, Math.sin(a) * r * 1.02)
      crown.add(fl)
      const c = cores[k % cores.length]
      for (let pt = 0; pt < 5; pt++) {
        const b = pt * ((Math.PI * 2) / 5)
        const petal = mesh(new THREE.SphereGeometry(0.015, 8, 6), mat(c, { roughness: 0.8 }), false)
        petal.position.set(Math.cos(b) * 0.015, Math.sin(b) * 0.015, 0)
        fl.add(petal)
      }
      fl.add(mesh(new THREE.SphereGeometry(0.009, 8, 6), mat('#ffd36b'), false))
      fl.lookAt(fl.position.clone().multiplyScalar(3).add(crown.position))
      if (k % 2) {
        const leaf = mesh(new THREE.SphereGeometry(0.01, 8, 6), mat('#8cc79a'), false)
        leaf.scale.set(1.8, 0.6, 0.6)
        leaf.position.set(Math.cos(a + 0.22) * r * 1.03, -0.006, Math.sin(a + 0.22) * r * 1.03)
        crown.add(leaf)
      }
    }
  }
  return { eyes, face, head }
}

/*******************************************************************************
 * buildRig
 * funcao: constroi a bailarina inteira com o visual escolhido e mede onde a mao
 * esquerda segura a barra.
 * recebe: look (Look, o padrao se nao vier).
 * retorna: o Rig.
 ******************************************************************************/
export function buildRig(look: Look = DEFAULT_LOOK): Rig {
  applyLook(look)
  const root = new THREE.Group()
  const pelvis = new THREE.Group()
  pelvis.position.y = HIP_Y
  root.add(pelvis)

  const leo = mat(COLORS.leotard, { roughness: 0.55 })
  const hips = mesh(new THREE.SphereGeometry(0.13, 28, 18), leo)
  hips.scale.set(1, 0.6, 0.74)
  hips.position.y = 0.03
  pelvis.add(hips)

  const skirt = new THREE.Group()
  skirt.position.y = 0.0
  pelvis.add(skirt)
  const s1 = wavySkirt(0.112, 0.235, 0.19, 9, 0.12, COLORS.skirtA, 0.8)
  s1.position.y = -0.02
  skirt.add(s1)
  const s2 = wavySkirt(0.11, 0.2, 0.16, 7, 0.1, COLORS.skirtB, 0.85)
  s2.position.y = -0.005
  s2.rotation.y = 0.4
  skirt.add(s2)
  skirt.scale.z = 0.86

  const legR = buildLeg(-1, !!look.ponta)
  const legL = buildLeg(1, !!look.ponta)
  pelvis.add(legR.gesture, legL.gesture)

  const spine = new THREE.Group()
  spine.position.y = 0.04
  pelvis.add(spine)

  // tronco: collant (ate o peito) + pele (colo e ombros), com alcas finas
  const body = new THREE.Group()
  body.scale.z = 0.74
  spine.add(body)
  const leoProfile = [
    [0.0, -0.02],
    [0.108, -0.015],
    [0.112, 0.04],
    [0.097, 0.12],
    [0.104, 0.19],
    [0.112, 0.235],
    [0.0, 0.235],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  body.add(mesh(new THREE.LatheGeometry(leoProfile, 40), leo))
  const skinProfile = [
    [0.112, 0.235],
    [0.113, 0.262],
    [0.1, 0.29],
    [0.06, 0.315],
    [0.035, 0.322],
    [0.0, 0.322],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  body.add(mesh(new THREE.LatheGeometry(skinProfile, 40), mat(COLORS.skin)))
  for (const s of [-1, 1]) {
    const strap = mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 24, Math.PI), leo)
    strap.rotation.y = Math.PI / 2
    strap.position.set(s * 0.066, 0.232, 0)
    strap.scale.set(1, 1, 1.12)
    body.add(strap)
  }
  // faixa na cintura com lacinho atras
  const band = mesh(new THREE.TorusGeometry(0.104, 0.011, 10, 40), mat(COLORS.leotardDark))
  band.rotation.x = Math.PI / 2
  band.position.y = 0.045
  body.add(band)
  const backBow = bow(COLORS.leotardDark, 0.9)
  backBow.position.set(0, 0.03, -0.11 * 0.74)
  backBow.rotation.y = Math.PI
  spine.add(backBow)

  const chest = new THREE.Group()
  chest.position.y = DIM.torso
  spine.add(chest)
  const armR = buildArm(-1)
  const armL = buildArm(1)
  chest.add(armR.shoulder, armL.shoulder)

  const neck = new THREE.Group()
  neck.position.y = 0.0
  chest.add(neck)
  const neckMesh = mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.08, 16), mat(COLORS.skin))
  neckMesh.position.y = 0.03
  neck.add(neckMesh)
  const { eyes, face, head } = buildHead(neck, look)

  // lacinho na frente do collant
  const frontBow = bow(COLORS.leotardDark, 0.7)
  frontBow.position.set(0, 0.228, 0.112 * 0.74)
  spine.add(frontBow)

  const rig: Rig = { root, pelvis, spine, neck, legR, legL, armR, armL, eyes, face, skirt, head, chest: body, barre: null, ponta: !!look.ponta }
  // a barra fica onde a mao esquerda segura na posicao inicial
  applyState(rig, BASE, 'both')
  const h = rig.armL.hand.getWorldPosition(new THREE.Vector3())
  rig.barre = { x: h.x, y: h.y }
  return rig
}

// graus para radianos
const R = Math.PI / 180
// anda de "de" ate "para" no maximo "passo" por chamada: usado para as correcoes mudarem devagar entre quadros
const limita = (de: number, para: number, passo: number) => de + Math.max(-passo, Math.min(passo, para - de))

/*******************************************************************************
 * poseLeg
 * funcao: coloca uma perna na pose de ballet, convertendo os graus do estado em
 * rotacoes das articulacoes.
 * recebe: l (LegRig), v (Leg) e s (-1 direita, 1 esquerda, para espelhar).
 * retorna: nada.
 ******************************************************************************/
function poseLeg(l: LegRig, v: Leg, s: -1 | 1) {
  l.gesture.rotation.set(-v.fwd * R, 0, s * v.side * R)
  l.turnout.rotation.set(0, s * v.turnout * R, 0)
  l.flex.rotation.set(-v.flex * R, 0, 0)
  l.knee.rotation.set(v.knee * R, 0, 0)
  l.ankle.rotation.set(v.point * R, 0, 0)
  l.toes.rotation.set(0, 0, 0)
}

/*******************************************************************************
 * poseArm
 * funcao: coloca um braco na pose.
 * recebe: a (ArmRig), v (Arm) e s (lado, para espelhar).
 * retorna: nada.
 ******************************************************************************/
function poseArm(a: ArmRig, v: Arm, s: -1 | 1) {
  a.shoulder.rotation.set(0, -s * v.swing * R, s * v.abd * R)
  a.elbow.rotation.set(-v.elbow * R, 0, 0)
  a.wrist.rotation.set(-v.wrist * R, 0, 0)
}

// vetores reaproveitados a cada quadro, para nao criar objetos novos o tempo todo
const tmp = new THREE.Vector3()
const tmpV = new THREE.Vector3()
const tmpQ = new THREE.Quaternion()

/*******************************************************************************
 * footMinY
 * funcao: altura do ponto mais baixo da sola de uma perna.
 * recebe: l (LegRig).
 * retorna: a menor altura entre os pontos da sola, em metros.
 ******************************************************************************/
const footMinY = (l: LegRig) => {
  let m = Infinity
  for (const o of l.samples) m = Math.min(m, o.getWorldPosition(tmp).y)
  return m
}

// informacao devolvida por applyState
export type ApplyInfo = { overExtended: boolean }

const hC = new THREE.Vector3()
const aP = new THREE.Vector3()
const aQ = new THREE.Vector3()

/*******************************************************************************
 * armIntoHead
 * funcao: mede o quanto um braco entra na cabeca (que e grande), testando
 * pontos ao longo do braco.
 * recebe: rig e a (o braco).
 * retorna: a maior invasao em metros (0 ou negativo quando o braco passa por
 * fora).
 ******************************************************************************/
export function armIntoHead(rig: Rig, a: ArmRig): number {
  rig.head.getWorldPosition(hC)
  hC.y += 0.02 // coque/cabelo deixam a cabeca um pouco mais alta
  const rr = DIM.headR * 1.04 + 0.024
  let worst = -Infinity
  const pts = [a.shoulder, a.elbow, a.wrist, a.hand]
  for (let i = 0; i < pts.length - 1; i++) {
    pts[i].getWorldPosition(aP)
    pts[i + 1].getWorldPosition(aQ)
    for (let k = 0; k <= 4; k++) {
      const x = aP.clone().lerp(aQ, k / 4)
      worst = Math.max(worst, rr - x.distanceTo(hC))
    }
  }
  return worst
}

/*******************************************************************************
 * keepArmsOffHead
 * funcao: se o braco passa por dentro da cabeca, leva o braco aos pouquinhos (2
 * graus por vez) na direcao que resolve com menos mudanca, ate passar por fora.
 * recebe: rig, a (o braco) e s (lado).
 * retorna: nada. se nenhuma direcao resolver em 90 graus, deixa o braco como
 * estava.
 ******************************************************************************/
function keepArmsOffHead(rig: Rig, a: ArmRig, s: -1 | 1) {
  if (armIntoHead(rig, a) <= 0) return
  const y0 = a.shoulder.rotation.y
  const z0 = a.shoulder.rotation.z
  const e0 = a.elbow.rotation.x

  /*****************************************************************************
   * set
   * funcao: aplica um desvio no ombro e no cotovelo a partir da pose original.
   * recebe: dy, dz (rotacoes do ombro) e de (rotacao do cotovelo), em radianos.
   * retorna: nada.
   ****************************************************************************/
  const set = (dy: number, dz: number, de: number) => {
    a.shoulder.rotation.y = y0 + dy
    a.shoulder.rotation.z = z0 + dz
    a.elbow.rotation.x = e0 + de
    a.shoulder.updateMatrixWorld(true)
  }
  // direcoes candidatas (em passos de 2 graus): frente, tras, abrir para fora, levantar, esticar o cotovelo
  const dirs: [number, number, number][] = [
    [-s, 0, 0],
    [s, 0, 0],
    [0, -s, 0],
    [0, s, 0],
    [-s, -s, 0],
    [s, -s, 0],
    [0, -s, 1],
  ]
  for (let k = 1; k <= 45; k++) {
    let melhor: [number, number, number] | null = null
    let folga = 0
    for (const [dy, dz, de] of dirs) {
      set(dy * k * 2 * R, dz * k * 2 * R, de * k * 2 * R)
      const p = armIntoHead(rig, a)
      if (p <= 0 && (melhor === null || p < folga)) {
        melhor = [dy, dz, de]
        folga = p
      }
    }
    if (melhor) {
      set(melhor[0] * k * 2 * R, melhor[1] * k * 2 * R, melhor[2] * k * 2 * R)
      return
    }
  }
  set(0, 0, 0)
}

const tgt = new THREE.Vector3()

/*******************************************************************************
 * holdBarre
 * funcao: prende a mao de apoio na barra: o braco dobra, estica e desliza ao
 * longo da barra quando o corpo desce no plie, sobe no releve ou se inclina.
 * busca local nas rotacoes do ombro e do cotovelo.
 * recebe: rig, a (o braco), s (lado, nao usado) e amount (0 a 1, o quanto a mao
 * esta segurando).
 * retorna: nada.
 ******************************************************************************/
function holdBarre(rig: Rig, a: ArmRig, s: -1 | 1, amount: number) {
  if (amount <= 0.01 || !rig.barre) return
  const bx = rig.barre.x
  const by = rig.barre.y

  /*****************************************************************************
   * err
   * funcao: distancia ao quadrado entre a mao e a barra, no plano de frente.
   * recebe: nada.
   * retorna: o erro.
   ****************************************************************************/
  const err = () => {
    a.shoulder.updateMatrixWorld(true)
    a.hand.getWorldPosition(tgt)
    return (tgt.x - bx) ** 2 + (tgt.y - by) ** 2
  }
  const y0 = a.shoulder.rotation.y
  const z0 = a.shoulder.rotation.z
  const e0 = a.elbow.rotation.x
  const params: [THREE.Object3D, 'x' | 'y' | 'z'][] = [
    [a.shoulder, 'y'],
    [a.shoulder, 'z'],
    [a.elbow, 'x'],
  ]
  let best = err()
  let step = 8 * R
  for (let it = 0; it < 22 && best > 1e-6; it++) {
    let melhorou = false
    for (const [o, ax] of params) {
      for (const d of [step, -step]) {
        o.rotation[ax] += d
        // o cotovelo so dobra para um lado
        if (o === a.elbow && (a.elbow.rotation.x > 0.05 || a.elbow.rotation.x < -2.4)) {
          o.rotation[ax] -= d
          continue
        }
        const e = err()
        if (e < best) {
          best = e
          melhorou = true
          break
        }
        o.rotation[ax] -= d
      }
    }
    if (!melhorou) step /= 2
  }
  // mistura com a pose original (para soltar/segurar a barra suavemente)
  if (amount < 1) {
    a.shoulder.rotation.y = y0 + (a.shoulder.rotation.y - y0) * amount
    a.shoulder.rotation.z = z0 + (a.shoulder.rotation.z - z0) * amount
    a.elbow.rotation.x = e0 + (a.elbow.rotation.x - e0) * amount
  }
  a.shoulder.updateMatrixWorld(true)
  void s
}
// pose do braco segurando a barra; onBarre diz o quanto o braco esta perto dela
const BARRA_POSE = { abd: 48, swing: 42, elbow: 38 }

/*******************************************************************************
 * onBarre
 * funcao: o quanto um braco esta na pose de segurar a barra.
 * recebe: v (Arm).
 * retorna: 1 na pose da barra, caindo ate 0 conforme o braco se afasta dela.
 ******************************************************************************/
function onBarre(v: Arm) {
  const d = Math.hypot(v.abd - BARRA_POSE.abd, v.swing - BARRA_POSE.swing, v.elbow - BARRA_POSE.elbow)
  return Math.max(0, Math.min(1, 1 - (d - 4) / 22))
}

const pA = new THREE.Vector3()
const pB = new THREE.Vector3()

/*******************************************************************************
 * lowestPoint
 * funcao: o ponto mais baixo do corpo, contando o volume de cada parte (sola,
 * joelho, tornozelo, coxa, canela, maos, cotovelos e quadril). usado no chao,
 * sentada ou deitada.
 * recebe: rig.
 * retorna: a altura em metros.
 ******************************************************************************/
function lowestPoint(rig: Rig): number {
  let m = Infinity
  const at = (o: THREE.Object3D, r: number) => (m = Math.min(m, o.getWorldPosition(pA).y - r))
  for (const l of [rig.legR, rig.legL]) {
    for (const o of l.samples) at(o, 0.012)
    at(l.knee, 0.046)
    at(l.ankle, 0.032)
    // meio da coxa e meio da canela
    l.gesture.getWorldPosition(pA)
    l.knee.getWorldPosition(pB)
    m = Math.min(m, (pA.y + pB.y) / 2 - 0.056)
    l.ankle.getWorldPosition(pA)
    m = Math.min(m, (pA.y + pB.y) / 2 - 0.038)
  }
  at(rig.armR.hand, 0.03)
  at(rig.armL.hand, 0.03)
  at(rig.armR.elbow, 0.03)
  at(rig.armL.elbow, 0.03)
  at(rig.pelvis, 0.07)
  return m
}

/*******************************************************************************
 * squashSkirt
 * funcao: sentada, a saia abre no chao em vez de atravessar o piso.
 * recebe: rig.
 * retorna: nada.
 ******************************************************************************/
function squashSkirt(rig: Rig) {
  const y = rig.pelvis.getWorldPosition(pA).y
  const sit = Math.min(1, Math.max(0, (0.6 - y) / 0.45))
  rig.skirt.scale.set(1 + 0.2 * sit, 1 - 0.3 * sit, 0.86 * (1 + 0.2 * sit))
  rig.skirt.position.y = 0.03 * sit
}

const cA = new THREE.Vector3()
const cB = new THREE.Vector3()
const cC = new THREE.Vector3()
const cP = new THREE.Vector3()
const cQ = new THREE.Vector3()
const cK = new THREE.Vector3()

/*******************************************************************************
 * segDist
 * funcao: distancia de um ponto ate um segmento.
 * recebe: p (o ponto) e a, b (as pontas do segmento).
 * retorna: d (a distancia) e t (0 em a, 1 em b: onde no segmento fica o ponto
 * mais perto).
 ******************************************************************************/
function segDist(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
  cQ.subVectors(b, a)
  const t = Math.min(1, Math.max(0, cP.subVectors(p, a).dot(cQ) / cQ.lengthSq()))
  return { d: p.distanceTo(cQ.multiplyScalar(t).add(a)), t }
}

/*******************************************************************************
 * penetration
 * funcao: quanto a perna de trabalho entra na perna de base, testando o
 * tornozelo, o meio da canela e a sola contra a coxa, a canela e o tornozelo da
 * outra.
 * recebe: work (a perna de trabalho) e sup (a perna de base).
 * retorna: a maior invasao em metros (0 ou negativo = sem contato).
 ******************************************************************************/
function penetration(work: LegRig, sup: LegRig): number {
  const hip = sup.gesture.getWorldPosition(cA)
  const knee = sup.knee.getWorldPosition(cB)
  const ank = sup.ankle.getWorldPosition(cC)
  const pts: [THREE.Vector3, number][] = []
  const wa = work.ankle.getWorldPosition(new THREE.Vector3())
  const wk = work.knee.getWorldPosition(cK)
  pts.push([wa, 0.032])
  pts.push([wa.clone().lerp(wk, 0.5), 0.04])
  for (const o of work.samples) pts.push([o.getWorldPosition(new THREE.Vector3()), 0.03])
  let worst = -Infinity
  for (const [p, r] of pts) {
    const th = segDist(p, hip, knee)
    worst = Math.max(worst, r + (0.066 + (0.045 - 0.066) * th.t) - th.d)
    const sh = segDist(p, knee, ank)
    worst = Math.max(worst, r + (0.045 + (0.031 - 0.045) * sh.t) - sh.d)
    worst = Math.max(worst, r + 0.036 - p.distanceTo(ank))
  }
  return worst
}

/*******************************************************************************
 * rampaPonta
 * funcao: quanto um pe esta "na ponta" com a sapatilha de ponta: passa suave da
 * meia ponta (cerca de 58 graus) para a ponta (cerca de 92 graus).
 * recebe: v (Leg).
 * retorna: de 0 (meia ponta ou pe no chao) a 1 (na ponta). com o joelho dobrado
 * nao sobe na ponta.
 ******************************************************************************/
const rampaPonta = (v: Leg) => {
  const t = Math.min(1, Math.max(0, (v.point - 30) / 25))
  return t * t * (3 - 2 * t) * joelhoReto(v)
}
// 1 com o joelho esticado, 0 quando ele ja dobrou uns 8 graus (o releve so vale com a perna esticada; sem degrau)
const joelhoReto = (v: Leg) => Math.min(1, Math.max(0, 1 - Math.max(v.flex, 0) / 8))

/*******************************************************************************
 * pontaDe
 * funcao: leva o pe esticado mais longe na sapatilha de ponta.
 * recebe: v (Leg).
 * retorna: a perna com o point aumentado, ou a mesma perna se ela nao estiver
 * na ponta.
 ******************************************************************************/
const pontaDe = (v: Leg) => {
  const k = rampaPonta(v)
  return k ? { ...v, point: v.point + (Math.min(92, v.point * 1.6) - v.point) * k } : v
}

/*******************************************************************************
 * applyState
 * funcao: aplica o estado ao rig e ajusta ao chao. em ordem: posa tudo; no chao
 * (peso livre), encosta o ponto mais baixo; em pe, planta o metatarso (ou a
 * plataforma) no releve, apoia as pernas de base no chao, afasta a perna de
 * trabalho da de base e procura o angulo de ponta que mantem o pe encostado no
 * chao sem atravessar, que e o que faz o tendu varrer o chao; por fim, prende a
 * mao na barra.
 * recebe: rig, st0 (BodyState), weight (onde esta o peso) e slide (se a perna
 * de trabalho deve ficar rente ao chao).
 * retorna: o ApplyInfo. algumas correcoes guardam memoria no rig (l.mem) e so
 * mudam um pouco por quadro, entao o resultado depende dos quadros anteriores.
 ******************************************************************************/
export function applyState(rig: Rig, st0: BodyState, weight: Weight, slide = true): ApplyInfo {
  // na sapatilha de ponta, todo pe esticado (de apoio ou no ar) vai mais longe: o releve vira ponta de verdade.
  const st = rig.ponta ? { ...st0, legR: pontaDe(st0.legR), legL: pontaDe(st0.legL) } : st0
  poseLeg(rig.legR, st.legR, -1)
  poseLeg(rig.legL, st.legL, 1)
  poseArm(rig.armR, st.armR, -1)
  poseArm(rig.armL, st.armL, 1)
  rig.neck.rotation.set(st.head.nod * R, st.head.turn * R, st.head.tilt * R)
  rig.root.updateMatrixWorld(true)
  keepArmsOffHead(rig, rig.armR, -1)
  keepArmsOffHead(rig, rig.armL, 1)
  // expressao: carinha de esforco
  const e = st.face.esforco
  for (const o of rig.face.normal) o.visible = e < 0.5
  for (const o of rig.face.esforco) o.visible = e >= 0.5
  rig.face.suor.scale.setScalar(Math.max(0.001, Math.min(1, (e - 0.3) / 0.5)))
  for (const b of rig.face.blush) {
    const m = b.material as THREE.MeshStandardMaterial
    m.opacity = 0.75 + 0.25 * e
    b.scale.set(1.25 + 0.3 * e, 0.72 + 0.2 * e, 0.25)
  }
  rig.spine.rotation.set(st.torso.lean * R, 0, 0)

  // sentada ou deitada no chao: o ponto mais baixo do corpo (quadril, pernas, pes ou maos) encosta no chao
  if (weight === 'livre') {
    rig.root.rotation.set(0, (st.root.yaw + st.root.spin) * R, 0)
    rig.root.position.set(st.root.x, 0, st.root.z)
    rig.root.updateMatrixWorld(true)
    rig.root.position.y = -lowestPoint(rig) + Math.max(0, st.root.lift)
    rig.root.updateMatrixWorld(true)
    squashSkirt(rig)
    return { overExtended: false }
  }
  rig.skirt.scale.set(1, 1, 0.86)
  const support = weight === 'both' ? [rig.legR, rig.legL] : [weight === 'R' ? rig.legR : rig.legL]
  const supportState = weight === 'both' ? [st.legR, st.legL] : [weight === 'R' ? st.legR : st.legL]
  const supportSide: (-1 | 1)[] = weight === 'both' ? [-1, 1] : [weight === 'R' ? -1 : 1]
  // releve: os metatarsos ficam plantados onde estavam. ao subir, o tornozelo passa a ficar
  // em cima deles, entao cada perna abre um pouquinho (na direcao do pe en dehors)
  // e o corpo avanca um pouco. sem isso os pes "deslizam" um para cima do outro.
  let forward = 0
  let pesoPlant = 0 // quantos pes (esticados e no chao) entram na media do avanco do corpo
  const chao = Math.max(0, 1 - st.root.lift / 0.05) // 1 no chao, 0 no ar
  // na ponta, o que fica plantado e a plataforma e os dedos ficam esticados em linha com o peito do pe
  const naPonta: number[] = support.map((_, i) => (rig.ponta ? rampaPonta(supportState[i]) : 0))
  support.forEach((l, i) => {
    const v = supportState[i]
    if (v.point <= 0) return
    const reto = joelhoReto(v)
    if (reto <= 0) return
    const np = naPonta[i]
    const pt = v.point
    const p = pt * R
    const apoioZ = SHOE.ballZ + (PLATAFORMA_Z - SHOE.ballZ) * np // na ponta, o que fica plantado e a plataforma
    const zBall = -DIM.ankleH * Math.sin(p) + apoioZ * Math.cos(p)
    // so vale para o pe que esta mesmo no chao: no ar, ou com a perna levantada (num salto com peso nas duas), nao
    const ab = Math.max(Math.abs(v.fwd), Math.abs(v.side))
    const noChao = Math.min(1, Math.max(0, 1 - (ab - 15) / 10))
    const disp = (apoioZ - zBall) * chao * noChao * reto
    const tr = v.turnout * R
    const s = supportSide[i]
    l.plant = s * Math.asin((disp * Math.sin(tr)) / LEG_LEN)
    l.gesture.rotation.z = s * v.side * R + l.plant
    forward += disp * Math.cos(tr) * reto * noChao
    pesoPlant += reto * noChao
  })
  forward = pesoPlant > 0 ? forward / Math.max(1, pesoPlant) : 0
  const yaw = st.root.yaw * R
  rig.root.rotation.set(0, yaw + st.root.spin * R, 0)
  rig.root.position.set(st.root.x + Math.sin(yaw) * forward, 0, st.root.z + Math.cos(yaw) * forward)

  // pernas de base com o calcanhar levantado (releve, grand plie): os dedos ficam rentes ao chao
  rig.root.updateMatrixWorld(true)
  support.forEach((l, i) => {
    l.ankle.getWorldQuaternion(tmpQ)
    tmpV.set(0, 0, 1).applyQuaternion(tmpQ)
    const pitch = Math.asin(Math.max(-1, Math.min(1, -tmpV.y)))
    if (pitch > 0.02) l.toes.rotation.x = -pitch * chao * (1 - naPonta[i])
  })

  rig.root.position.y = 0
  rig.root.updateMatrixWorld(true)
  const apoio = Math.min(...support.map(footMinY))
  // no ar nao existe perna de apoio: a referencia e o pe mais baixo, e ao pousar ela passa suavemente para o apoio
  const base = chao >= 1 ? apoio : chao * apoio + (1 - chao) * Math.min(footMinY(rig.legR), footMinY(rig.legL))
  rig.root.position.y -= base - st.root.lift
  rig.root.updateMatrixWorld(true)

  let overExtended = false
  const working: [LegRig, Leg][] = []
  if (weight === 'L') working.push([rig.legR, st.legR])
  if (weight === 'R') working.push([rig.legL, st.legL])

  // a perna de trabalho nunca atravessa a perna de base: se o pe ou a canela entram nela
  // (coupe, passe, fondu, frappe, pirueta...), a perna e levada um pouquinho a frente ate encostar por fora.
  // pernas que nao estao trabalhando comecam sem correcao; a que acabou de sair do apoio
  // comeca com a abertura do releve que tinha (e solta aos poucos), para nao dar um tranco
  for (const l of [rig.legR, rig.legL]) {
    if (!working.some(([w]) => w === l)) l.mem = undefined
    else if (!l.mem) l.mem = { gx: 0, gz: l.plant ?? 0, ank: 0, dobra: 0 }
  }
  for (const [l] of working) l.plant = 0
  for (const [l, v] of working) {
    const sup = l === rig.legR ? rig.legL : rig.legR
    // perna esticada perto da base (tendu saindo da 1a/5a): abre um pouquinho para o lado.
    // perna dobrada (coupe, passe, fondu...): vai para a frente ou para tras, pelo caminho mais curto.
    // entre os dois casos as duas solucoes se misturam, para nao haver "pulo" quando o joelho dobra.
    const gx0 = l.gesture.rotation.x
    const gz0 = l.gesture.rotation.z
    const w = Math.min(1, Math.max(0, (v.knee - 8) / 20))
    let gzS = gz0
    if (w < 1) {
      const s = l === rig.legR ? -1 : 1
      let k = 0
      while (penetration(l, sup) > 0.001 && k < 30) {
        k++
        l.gesture.rotation.z = gz0 + s * k * 0.5 * R
        l.gesture.updateMatrixWorld(true)
      }
      gzS = l.gesture.rotation.z
      l.gesture.rotation.z = gz0
      l.gesture.updateMatrixWorld(true)
    }
    let gxF = gx0
    if (w > 0) {
      /*************************************************************************
       * passos
       * funcao: quantos graus a perna precisa ir para a frente (ou para tras)
       * para sair de dentro da perna de base.
       * recebe: dir (1 ou -1, o sentido).
       * retorna: o numero de passos de 1 grau (no maximo 45).
       ************************************************************************/
      const passos = (dir: number) => {
        let k = 0
        l.gesture.rotation.x = gx0
        l.gesture.updateMatrixWorld(true)
        while (penetration(l, sup) > 0.001 && k < 45) {
          k++
          l.gesture.rotation.x = gx0 + dir * k * R
          l.gesture.updateMatrixWorld(true)
        }
        return k
      }
      // perna dobrada atras (coupe derriere, attitude...) vai para tras; nas outras posicoes, para a frente.
      // na passagem de uma para a outra (developpe derriere saindo do passe), mistura as duas, sem pulo.
      const t = Math.min(1, Math.max(0, -v.fwd / 12))
      const kf = t < 1 ? passos(-1) : 0
      const kb = t > 0 ? passos(1) : 0
      gxF = gx0 + (-kf * (1 - t) + kb * t) * R
    }
    // a correcao muda no maximo um pouquinho por quadro: o pe nunca "teleporta"
    const m = (l.mem ??= { gx: 0, gz: 0, ank: 0, dobra: 0 })
    m.gx = limita(m.gx, (gxF - gx0) * w, 5 * R)
    m.gz = limita(m.gz, (gzS - gz0) * (1 - w), 5 * R)
    l.gesture.rotation.x = gx0 + m.gx
    l.gesture.rotation.z = gz0 + m.gz
    l.gesture.updateMatrixWorld(true)
  }
  for (const [l, v] of working) {
    /***************************************************************************
     * groundAt
     * funcao: coloca o tornozelo da perna de trabalho num angulo e mede a
     * altura da sola.
     * recebe: p (angulo de ponta em graus).
     * retorna: a altura do ponto mais baixo da sola.
     **************************************************************************/
    const groundAt = (p: number) => {
      l.ankle.rotation.x = p * R
      l.ankle.updateMatrixWorld(true)
      return footMinY(l)
    }
    const TOUCH = 0.004
    const fx = l.flex.rotation.x
    const kn = l.knee.rotation.x
    // a ponta do pe fica no chao partindo do angulo do proprio estado (v.point), sempre pelo caminho mais curto:
    // se atravessa o chao, o pe "desaponta" so o necessario; se fica no ar, aponta mais ate encostar.
    // se nem com o pe flexionado cabe (base em plie, quadril baixo), o joelho de trabalho dobra so o necessario.
    const P0 = Math.min(-30, v.point)
    const PMAX = Math.max(88, v.point)
    // acha, entre a e b, o angulo em que o pe passa de "atravessa" para "nao atravessa"
    /***************************************************************************
     * cruza
     * funcao: busca binaria do angulo em que o pe passa de atravessar o chao
     * para nao atravessar.
     * recebe: a (um angulo que atravessa) e b (um que nao atravessa).
     * retorna: o angulo que nao atravessa, com precisao de 12 divisoes.
     **************************************************************************/
    const cruza = (a: number, b: number) => {
      let dentro = a // atravessa
      let fora = b // nao atravessa
      for (let i = 0; i < 12; i++) {
        const m = (dentro + fora) / 2
        if (groundAt(m) < -0.001) dentro = m
        else fora = m
      }
      return fora
    }
    const TOL = -0.006 // alguns milimetros "dentro" do chao nao aparecem (a sapatilha e macia!)
    let hi = v.point
    let dobra = 0
    const y0 = groundAt(v.point)
    if (y0 < TOL) {
      // atravessa: procura para baixo (menos ponta) o primeiro angulo que cabe
      let achou: number | null = null
      for (let p = v.point - 2; p >= P0 - 0.001; p -= 2) {
        if (groundAt(p) >= -0.001) {
          achou = cruza(Math.min(v.point, p + 2), p)
          break
        }
      }
      if (achou !== null) hi = achou
      else {
        hi = P0
        for (let d = 1; d <= 70; d += 1) {
          dobra = d
          l.flex.rotation.x = fx - d * R
          l.knee.rotation.x = kn + 2 * d * R
          l.flex.updateMatrixWorld(true)
          if (groundAt(P0) >= -0.001) break
        }
      }
    } else if (y0 > TOUCH && slide) {
      // no ar (num passo rente ao chao): aponta mais ate a ponta encostar (se der)
      let ultimo = v.point
      for (let p = v.point + 2; p <= PMAX + 0.001; p += 2) {
        const y = groundAt(p)
        if (y < -0.001) {
          hi = cruza(p, ultimo)
          break
        }
        hi = p
        ultimo = p
        if (y <= TOUCH) break
      }
    }
    // no ar (pulinhos), a perna vai soltando do chao aos poucos
    const k = chao * chao
    const m = l.mem!
    m.dobra = limita(m.dobra, dobra * k, 8)
    m.ank = limita(m.ank, (hi - v.point) * k, 40)
    l.flex.rotation.x = fx - m.dobra * R
    l.knee.rotation.x = kn + 2 * m.dobra * R
    l.flex.updateMatrixWorld(true)
    groundAt(v.point + m.ank)
  }
  // mao de apoio presa na barra (so na barra, com os pes no chao)
  if (st.root.c < 0.5) {
    const k = Math.max(0, 1 - st.root.c * 2)
    if (st.root.yaw < 90) holdBarre(rig, rig.armL, 1, onBarre(st.armL) * k)
    else holdBarre(rig, rig.armR, -1, onBarre(st.armR) * k)
  }
  return { overExtended }
}

/*******************************************************************************
 * handWorld
 * funcao: posicao da mao no mundo.
 * recebe: rig e side ('R' ou 'L').
 * retorna: um Vector3 novo com a posicao.
 ******************************************************************************/
export function handWorld(rig: Rig, side: 'R' | 'L') {
  return (side === 'R' ? rig.armR : rig.armL).hand.getWorldPosition(new THREE.Vector3())
}
