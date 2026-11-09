/*******************************************************************************
 * Decor.tsx
 * funcao principal: decoracao da sala de ensaio: papel de parede, quadros,
 * bandeirinhas, luzinhas, janela com cortinas, banco, tapete e relogio. tudo
 * desenhado no codigo (canvas e formas do three), sem imagens externas.
 ******************************************************************************/
import { useMemo } from 'react'
import * as THREE from 'three'

// posicao ou rotacao em x, y, z
type V3 = [number, number, number]

/*******************************************************************************
 * canvasTex
 * funcao: cria uma textura a partir de um desenho feito num canvas.
 * recebe: w e h (tamanho do canvas em px) e draw (funcao que desenha, recebe o
 * contexto 2d e o tamanho).
 * retorna: a CanvasTexture pronta para usar num material.
 ******************************************************************************/
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

// ===== artes dos quadros =====
/*******************************************************************************
 * Art
 * funcao: os desenhos que existem para os quadros da parede.
 ******************************************************************************/
export type Art = 'sapatilhas' | 'cisne' | 'flores' | 'coracao' | 'lua'

/*******************************************************************************
 * heart
 * funcao: desenha um coracao preenchido no canvas.
 * recebe: g (contexto 2d), x e y (ponto de cima, no meio) e s (altura).
 * retorna: nada.
 ******************************************************************************/
function heart(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.beginPath()
  g.moveTo(x, y + s * 0.35)
  g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.35)
  g.bezierCurveTo(x - s * 0.5, y + s * 0.65, x, y + s * 0.8, x, y + s)
  g.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.65, x + s * 0.5, y + s * 0.35)
  g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35)
  g.fill()
}

/*******************************************************************************
 * sparkle
 * funcao: desenha um brilhinho de quatro pontas no canvas.
 * recebe: g (contexto 2d), x e y (centro) e r (raio das pontas).
 * retorna: nada.
 ******************************************************************************/
function sparkle(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const rr = i % 2 ? r * 0.3 : r
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  g.closePath()
  g.fill()
}

/*******************************************************************************
 * ART
 * funcao: o desenho de cada quadro. cada funcao recebe o contexto 2d e o
 * tamanho e pinta o quadro inteiro.
 ******************************************************************************/
const ART: Record<Art, (g: CanvasRenderingContext2D, w: number, h: number) => void> = {
  /*****************************************************************************
   * sapatilhas
   * funcao: quadro com um par de sapatilhas e as fitas, sobre um fundo de
   * pontinhos.
   * recebe: g, w e h (contexto e tamanho). retorna: nada.
   ****************************************************************************/
  sapatilhas: (g, w, h) => {
    g.fillStyle = '#fde8ef'
    g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(244,166,190,0.25)'
    for (let x = 12; x < w; x += 28) for (let y = 12; y < h; y += 28) g.fillRect(x, y, 3, 3)
    // fitas
    g.strokeStyle = '#f2a3bb'
    g.lineWidth = 5
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(w * 0.5, h * 0.12)
    g.bezierCurveTo(w * 0.25, h * 0.3, w * 0.5, h * 0.4, w * 0.36, h * 0.55)
    g.moveTo(w * 0.5, h * 0.12)
    g.bezierCurveTo(w * 0.75, h * 0.3, w * 0.5, h * 0.4, w * 0.64, h * 0.55)
    g.stroke()
    // sapatilhas
    for (const [cx, rot] of [
      [0.38, 0.35],
      [0.62, -0.35],
    ]) {
      g.save()
      g.translate(w * cx, h * 0.72)
      g.rotate(rot)
      g.fillStyle = '#f5b8c9'
      g.beginPath()
      g.ellipse(0, 0, w * 0.1, h * 0.17, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#fbe0e8'
      g.beginPath()
      g.ellipse(0, -h * 0.04, w * 0.06, h * 0.09, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    g.fillStyle = '#ec8fae'
    heart(g, w * 0.5, h * 0.06, w * 0.12)
  },

  /*****************************************************************************
   * cisne
   * funcao: quadro com o desenho de um cisne.
   * recebe: g, w e h. retorna: nada.
   ****************************************************************************/
  cisne: (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#e6f0fb')
    grd.addColorStop(1, '#cfe2f6')
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(255,255,255,0.8)'
    g.lineWidth = 4
    for (let i = 0; i < 4; i++) {
      g.beginPath()
      const y = h * (0.78 + i * 0.05)
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x / 14 + i) * 3)
      g.stroke()
    }
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.ellipse(w * 0.52, h * 0.68, w * 0.26, h * 0.11, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#ffffff'
    g.lineWidth = w * 0.065
    g.beginPath()
    g.moveTo(w * 0.36, h * 0.66)
    g.bezierCurveTo(w * 0.22, h * 0.45, w * 0.4, h * 0.3, w * 0.3, h * 0.22)
    g.stroke()
    g.beginPath()
    g.arc(w * 0.29, h * 0.21, w * 0.055, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#f6a96d'
    g.beginPath()
    g.moveTo(w * 0.24, h * 0.2)
    g.lineTo(w * 0.15, h * 0.23)
    g.lineTo(w * 0.24, h * 0.24)
    g.fill()
    g.fillStyle = '#2f2430'
    g.beginPath()
    g.arc(w * 0.28, h * 0.2, w * 0.011, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#f7c5d6'
    sparkle(g, w * 0.8, h * 0.2, w * 0.05)
    sparkle(g, w * 0.68, h * 0.12, w * 0.03)
  },

  /*****************************************************************************
   * flores
   * funcao: quadro com flores coloridas de miolo amarelo.
   * recebe: g, w e h. retorna: nada.
   ****************************************************************************/
  flores: (g, w, h) => {
    g.fillStyle = '#fff6e8'
    g.fillRect(0, 0, w, h)
    const flowers: [number, number, string][] = [
      [0.3, 0.38, '#f5a7c0'],
      [0.62, 0.3, '#c9b3ef'],
      [0.5, 0.55, '#f7c48f'],
    ]
    g.strokeStyle = '#8cc79a'
    g.lineWidth = 5
    for (const [x, y] of flowers) {
      g.beginPath()
      g.moveTo(w * x, h * y)
      g.quadraticCurveTo(w * (x + 0.05), h * 0.75, w * 0.5, h * 0.9)
      g.stroke()
    }
    for (const [x, y, c] of flowers) {
      g.fillStyle = c
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3
        g.beginPath()
        g.arc(w * x + Math.cos(a) * w * 0.06, h * y + Math.sin(a) * w * 0.06, w * 0.05, 0, Math.PI * 2)
        g.fill()
      }
      g.fillStyle = '#ffe28a'
      g.beginPath()
      g.arc(w * x, h * y, w * 0.04, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = '#f5a7c0'
    g.beginPath()
    g.moveTo(w * 0.38, h * 0.86)
    g.lineTo(w * 0.62, h * 0.86)
    g.lineTo(w * 0.5, h * 0.94)
    g.fill()
  },

  /*****************************************************************************
   * coracao
   * funcao: quadro com um coracao grande e brilhinhos.
   * recebe: g, w e h. retorna: nada.
   ****************************************************************************/
  coracao: (g, w, h) => {
    g.fillStyle = '#efe6fb'
    g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(200,180,240,0.5)'
    for (let x = 0; x < w; x += 24) for (let y = 0; y < h; y += 24) if ((x + y) % 48 === 0) g.fillRect(x + 10, y + 10, 4, 4)
    g.fillStyle = '#f39bb8'
    heart(g, w * 0.5, h * 0.25, w * 0.5)
    g.fillStyle = '#ffffff'
    sparkle(g, w * 0.4, h * 0.38, w * 0.05)
  },

  /*****************************************************************************
   * lua
   * funcao: quadro com uma lua crescente e estrelinhas sobre fundo lilas.
   * recebe: g, w e h. retorna: nada.
   ****************************************************************************/
  lua: (g, w, h) => {
    g.fillStyle = '#e9e1f7'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#fff3c4'
    g.beginPath()
    g.arc(w * 0.5, h * 0.48, w * 0.25, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#e9e1f7'
    g.beginPath()
    g.arc(w * 0.6, h * 0.42, w * 0.22, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#ffffff'
    sparkle(g, w * 0.75, h * 0.7, w * 0.05)
    sparkle(g, w * 0.25, h * 0.2, w * 0.035)
    sparkle(g, w * 0.8, h * 0.22, w * 0.03)
  },
}

/*******************************************************************************
 * Frame
 * funcao: um quadro pendurado: moldura, passe-partout branco e o desenho.
 * recebe: art (qual desenho), position e rotation (na sala), w e h (tamanho do
 * desenho em metros) e frame (cor da moldura).
 * retorna: o grupo 3D do quadro.
 ******************************************************************************/
export function Frame({ art, position, rotation = [0, 0, 0], w, h, frame = '#f7e9d7' }: {
  art: Art
  position: V3
  rotation?: V3
  w: number
  h: number
  frame?: string
}) {
  const tex = useMemo(() => canvasTex(256, Math.round((256 * h) / w), ART[art]), [art, w, h])
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[w + 0.09, h + 0.09, 0.035]} />
        <meshStandardMaterial color={frame} roughness={0.5} />
      </mesh>
      <mesh position-z={0.019}>
        <planeGeometry args={[w + 0.02, h + 0.02]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      <mesh position-z={0.021}>
        <planeGeometry args={[w - 0.04, h - 0.04]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  )
}

/*******************************************************************************
 * useWallpaper
 * funcao: hook que cria uma vez a textura do papel de parede listrado com
 * bolinhas.
 * recebe: nada.
 * retorna: a textura, repetida 9 vezes na largura e 3 na altura.
 ******************************************************************************/
export function useWallpaper() {
  return useMemo(() => {
    const t = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#fbe9ef'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#f7dde6'
      for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 26, h)
      g.fillStyle = 'rgba(255,255,255,0.75)'
      for (let x = 45; x < w; x += 64)
        for (let y = 16; y < h; y += 64) {
          g.beginPath()
          g.arc(x, y, 3.5, 0, Math.PI * 2)
          g.arc(x, y + 32, 2, 0, Math.PI * 2)
          g.fill()
        }
    })
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(9, 3)
    return t
  }, [])
}

/*******************************************************************************
 * Wall
 * funcao: uma parede com papel de parede em cima e lambri embaixo (rodape,
 * friso e almofadas).
 * recebe: position e rotation (na sala), width (largura em metros) e tex
 * (textura do papel de parede).
 * retorna: o grupo 3D da parede.
 ******************************************************************************/
export function Wall({ position, rotation, width, tex }: { position: V3; rotation: V3; width: number; tex: THREE.Texture }) {
  const wainH = 0.9
  return (
    <group position={position} rotation={rotation}>
      <mesh position-y={1.6} receiveShadow>
        <planeGeometry args={[width, 3.2]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      {/* lambri */}
      <mesh position={[0, wainH / 2, 0.006]} receiveShadow>
        <planeGeometry args={[width, wainH]} />
        <meshStandardMaterial color="#fff4f6" roughness={0.9} />
      </mesh>
      <mesh position={[0, wainH, 0.015]}>
        <boxGeometry args={[width, 0.035, 0.03]} />
        <meshStandardMaterial color="#f6dbe4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.06, 0.015]}>
        <boxGeometry args={[width, 0.12, 0.03]} />
        <meshStandardMaterial color="#f3d2de" roughness={0.6} />
      </mesh>
      {Array.from({ length: Math.floor(width / 0.7) }, (_, i) => (
        <mesh key={i} position={[-width / 2 + 0.35 + i * 0.7, 0.5, 0.009]}>
          <planeGeometry args={[0.5, 0.56]} />
          <meshStandardMaterial color="#fae6ed" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/*******************************************************************************
 * sag
 * funcao: ponto de um fio pendurado entre dois pontos, que cai mais no meio
 * (curva de parabola).
 * recebe: a e b (pontas do fio), drop (quanto cai no meio, em metros) e t (0 em
 * a, 1 em b).
 * retorna: o ponto (Vector3) nessa altura do fio.
 ******************************************************************************/
function sag(a: THREE.Vector3, b: THREE.Vector3, drop: number, t: number) {
  const p = a.clone().lerp(b, t)
  p.y -= drop * 4 * t * (1 - t)
  return p
}

/*******************************************************************************
 * Bunting
 * funcao: varal de bandeirinhas coloridas entre dois pontos.
 * recebe: from e to (pontas do varal) e drop (quanto o fio cai no meio).
 * retorna: o grupo 3D do varal.
 ******************************************************************************/
export function Bunting({ from, to, drop = 0.25 }: { from: V3; to: V3; drop?: number }) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const len = a.distanceTo(b)
  const n = Math.floor(len / 0.28)
  const colors = ['#f6b3c8', '#fff1c9', '#cdb8f0', '#bfe6da', '#fbd0b4']
  const dir = b.clone().sub(a).normalize()
  // as bandeirinhas giram para ficar de frente na direcao do fio
  const angle = Math.atan2(-dir.z, dir.x)
  const flagGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.09, 0)
    s.lineTo(0.09, 0)
    s.lineTo(0, -0.17)
    s.closePath()
    return new THREE.ShapeGeometry(s)
  }, [])
  const line = useMemo(() => {
    const pts = Array.from({ length: 30 }, (_, i) => sag(a, b, drop, i / 29))
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.005, 4)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <group>
      <mesh geometry={line}>
        <meshStandardMaterial color="#f0c6d3" />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const p = sag(a, b, drop, (i + 0.5) / n)
        return (
          <mesh key={i} geometry={flagGeo} position={p} rotation={[0, angle, 0]}>
            <meshStandardMaterial color={colors[i % colors.length]} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        )
      })}
    </group>
  )
}

/*******************************************************************************
 * FairyLights
 * funcao: cordao de luzinhas acesas entre dois pontos, em tres cores
 * alternadas.
 * recebe: from e to (pontas), drop (quanto cai no meio) e count (quantas
 * luzinhas).
 * retorna: o grupo 3D do cordao.
 ******************************************************************************/
export function FairyLights({ from, to, drop = 0.3, count = 26 }: { from: V3; to: V3; drop?: number; count?: number }) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const line = useMemo(() => {
    const pts = Array.from({ length: 30 }, (_, i) => sag(a, b, drop, i / 29))
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.004, 4)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <group>
      <mesh geometry={line}>
        <meshStandardMaterial color="#e7d9c6" />
      </mesh>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={sag(a, b, drop, (i + 0.5) / count).add(new THREE.Vector3(0, -0.03, 0))}>
          <sphereGeometry args={[0.022, 10, 8]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? '#ffe7a8' : i % 3 === 1 ? '#ffd1dc' : '#fff4d6'}
            emissive={i % 3 === 0 ? '#ffd57a' : i % 3 === 1 ? '#ffb3c6' : '#ffe9b0'}
            emissiveIntensity={1.4}
          />
        </mesh>
      ))}
    </group>
  )
}

/*******************************************************************************
 * curtainGeo
 * funcao: geometria de uma cortina presa por uma faixa: ondulada na horizontal
 * e apertada perto de 1/3 da altura.
 * recebe: w e h (largura e altura em metros).
 * retorna: a PlaneGeometry deformada.
 ******************************************************************************/
function curtainGeo(w: number, h: number) {
  const geo = new THREE.PlaneGeometry(w, h, 28, 1)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const pinch = 1 - 0.45 * Math.exp(-(((y + h * 0.15) / (h * 0.12)) ** 2))
    pos.setX(i, x * pinch)
    pos.setZ(i, Math.sin((x / w) * Math.PI * 7) * 0.025 + 0.03)
  }
  geo.computeVertexNormals()
  return geo
}

/*******************************************************************************
 * Window
 * funcao: janela iluminada com caixilho em cruz, peitoril, duas cortinas presas
 * e o varao com as ponteiras.
 * recebe: position (na sala).
 * retorna: o grupo 3D da janela.
 ******************************************************************************/
export function Window({ position }: { position: V3 }) {
  const cg = useMemo(() => curtainGeo(0.42, 1.55), [])
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[1.25, 1.1]} />
        <meshStandardMaterial color="#fff6dd" emissive="#ffe6b0" emissiveIntensity={0.7} />
      </mesh>
      {[
        [0, 0, 0.04, 1.1],
        [0, 0, 1.25, 0.04],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.01]}>
          <boxGeometry args={[w, h, 0.02]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[1.33, 1.18, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, -0.6, 0.05]}>
        <boxGeometry args={[1.4, 0.04, 0.1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={cg} position={[s * 0.68, -0.12, 0.02]} castShadow>
            <meshStandardMaterial color="#f7c3d4" side={THREE.DoubleSide} roughness={0.95} />
          </mesh>
          <mesh position={[s * 0.68, -0.36, 0.08]}>
            <sphereGeometry args={[0.035, 12, 10]} />
            <meshStandardMaterial color="#f29bb7" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.7, 0.06]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, 1.8, 8]} />
        <meshStandardMaterial color="#e9d3b5" />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, 0.7, 0.06]}>
          <sphereGeometry args={[0.03, 12, 10]} />
          <meshStandardMaterial color="#f29bb7" />
        </mesh>
      ))}
    </group>
  )
}

/*******************************************************************************
 * Bench
 * funcao: banquinho da sala, com uma toalhinha dobrada e um vaso de flores em
 * cima.
 * recebe: position e rotation (na sala).
 * retorna: o grupo 3D do banco.
 ******************************************************************************/
export function Bench({ position, rotation = [0, 0, 0] }: { position: V3; rotation?: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position-y={0.42} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.06, 0.38]} />
        <meshStandardMaterial color="#fff7f0" roughness={0.6} />
      </mesh>
      <mesh position-y={0.48} castShadow>
        <boxGeometry args={[1.0, 0.07, 0.33]} />
        <meshStandardMaterial color="#f7c3d4" roughness={0.95} />
      </mesh>
      {[-0.48, 0.48].map((x) =>
        [-0.14, 0.14].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.2, z]} castShadow>
            <cylinderGeometry args={[0.025, 0.02, 0.4, 10]} />
            <meshStandardMaterial color="#e9d3b5" />
          </mesh>
        )),
      )}
      {/* toalhinha dobrada e vaso de flores */}
      <mesh position={[-0.28, 0.545, 0]} castShadow>
        <boxGeometry args={[0.28, 0.05, 0.22]} />
        <meshStandardMaterial color="#cdb8f0" roughness={1} />
      </mesh>
      <group position={[0.3, 0.52, 0]}>
        <mesh position-y={0.07} castShadow>
          <cylinderGeometry args={[0.05, 0.04, 0.14, 14]} />
          <meshStandardMaterial color="#bfe6da" roughness={0.4} />
        </mesh>
        {[
          [0, 0.24, 0, '#f6a6c0'],
          [0.05, 0.21, 0.02, '#fff1c9'],
          [-0.05, 0.2, -0.02, '#cdb8f0'],
        ].map(([x, y, z, c], i) => (
          <mesh key={i} position={[x as number, y as number, z as number]}>
            <sphereGeometry args={[0.04, 12, 10]} />
            <meshStandardMaterial color={c as string} roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/*******************************************************************************
 * Rug
 * funcao: tapete redondo no chao, com um aro claro.
 * recebe: position (na sala).
 * retorna: o grupo 3D do tapete.
 ******************************************************************************/
export function Rug({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.004} receiveShadow>
        <circleGeometry args={[0.62, 40]} />
        <meshStandardMaterial color="#f8d6e2" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.006} receiveShadow>
        <ringGeometry args={[0.46, 0.5, 40]} />
        <meshStandardMaterial color="#fff4f7" roughness={1} />
      </mesh>
    </group>
  )
}

/*******************************************************************************
 * Clock
 * funcao: relogio de parede decorativo (os ponteiros sao fixos).
 * recebe: position e rotation (na sala).
 * retorna: o grupo 3D do relogio.
 ******************************************************************************/
export function Clock({ position, rotation }: { position: V3; rotation: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.17, 0.17, 0.04, 32]} />
        <meshStandardMaterial color="#f6b3c8" />
      </mesh>
      <mesh position-z={0.021}>
        <circleGeometry args={[0.14, 32]} />
        <meshStandardMaterial color="#fffaf5" />
      </mesh>
      <mesh position={[0, 0.04, 0.025]}>
        <boxGeometry args={[0.012, 0.09, 0.005]} />
        <meshStandardMaterial color="#6b4a7a" />
      </mesh>
      <mesh position={[0.03, 0, 0.025]} rotation-z={-Math.PI / 2}>
        <boxGeometry args={[0.012, 0.065, 0.005]} />
        <meshStandardMaterial color="#6b4a7a" />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[Math.sin((i * Math.PI) / 6) * 0.115, Math.cos((i * Math.PI) / 6) * 0.115, 0.024]}>
          <circleGeometry args={[i % 3 === 0 ? 0.01 : 0.005, 8]} />
          <meshStandardMaterial color="#e79ab4" />
        </mesh>
      ))}
    </group>
  )
}
