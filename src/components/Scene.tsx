/*******************************************************************************
 * Scene.tsx
 * funcao principal: a cena 3D (react three fiber): a bailarina, a sala de
 * ensaio ou o palco de teatro, os adesivos dos pontos da sala, as flores do fim
 * da apresentacao e a camera que acompanha a bailarina. a bailarina e quem faz
 * o tempo andar e toca a musica a cada tempo.
 ******************************************************************************/
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OC } from 'three-stdlib'
import { applyState, buildRig, handWorld } from '../engine/rig'
import { BASE } from '../engine/state'
import { PONTOS, PONTO_POS, type Ponto } from '../engine/program'
import { evaluate, musicaDe, useStore, type CamView } from '../store'
import { playBeat, sfx, syncFile } from '../audio'
import { Bench, Bunting, Clock, FairyLights, Frame, Rug, Wall, Window, useWallpaper } from './Decor'

/*******************************************************************************
 * BarreInfo
 * funcao: onde fica a barra (x e altura y), medido pela mao esquerda da
 * bailarina na posicao inicial. a sala posiciona a barra e a parede a partir
 * disso.
 ******************************************************************************/
type BarreInfo = { x: number; y: number }

/*******************************************************************************
 * Dancer
 * funcao: a bailarina 3D. a cada quadro avanca o tempo, aplica o estado do
 * corpo, respira e pisca, atualiza o ponto que a camera segue, toca o "tuc" do
 * pouso e a musica a cada tempo e sincroniza a musica de arquivo.
 * recebe: onBarre (funcao que recebe a posicao da barra) e focus (Vector3 que
 * ela atualiza com o ponto que a camera deve seguir).
 * retorna: o objeto 3D da bailarina.
 ******************************************************************************/
function Dancer({ onBarre, focus }: { onBarre: (b: BarreInfo) => void; focus: THREE.Vector3 }) {
  const look0 = useStore((s) => s.look)
  const provando = useStore((s) => s.provandoPonta)
  // provando a ponta no camarim: mostra a ponta sem gravar no visual dela
  const look = useMemo(() => (provando ? { ...look0, ponta: true } : look0), [look0, provando])
  // trocar o visual reconstroi a bailarina inteira; o efeito abaixo libera a memoria da anterior
  const rig = useMemo(() => buildRig(look), [look])
  useEffect(
    () => () => {
      rig.root.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mt = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mt)) mt.forEach((x) => x.dispose())
        else mt?.dispose()
      })
    },
    [rig],
  )
  const lastBeat = useRef(-1)
  const lastMove = useRef(-1)
  const quadril = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    // mede a mao esquerda na posicao inicial para saber onde a barra tem que ficar
    applyState(rig, BASE, 'both')
    const h = handWorld(rig, 'L')
    onBarre({ x: h.x, y: h.y })
  }, [rig, onBarre])

  useFrame(({ clock }, dt) => {
    const s = useStore.getState()
    s.advance(Math.min(dt, 0.1))
    // vida: respiracao e piscadinha
    const t = clock.elapsedTime
    rig.chest.scale.set(1 + 0.008 * Math.sin(t * 1.6), 1 + 0.006 * Math.sin(t * 1.6), 0.74 * (1 + 0.012 * Math.sin(t * 1.6)))
    const cycle = t % 3.7
    const blink = cycle < 0.14 ? Math.abs(Math.cos((cycle / 0.14) * Math.PI)) : 1
    for (const e of rig.eyes) e.scale.y = Math.max(0.08, blink)
    rig.face.suor.position.y = 0.05 - ((t * 0.04) % 0.03) // a gotinha escorrega devagar
    const { beat, timeline, playing, sound, mode } = useStore.getState()
    const { state, weight, slide } = evaluate(timeline, beat)
    applyState(rig, state, weight, slide)
    // nos grandes saltos (quadril bem acima do normal) a camera sobe um pouco junto; nos pulinhos ela fica parada
    focus.set(state.root.x, weight === 'livre' ? state.root.lift : Math.max(0, rig.pelvis.getWorldPosition(quadril).y - 1.1) * 1.2, state.root.z)
    // "tuc" da sapatilha quando ela pousa de um salto (fim de um movimento que "cai")
    // acha o movimento atual para saber quando um movimento que "cai" (salto) terminou
    let mi = 0
    while (mi < timeline.moves.length - 1 && timeline.starts[mi + 1] <= beat) mi++
    if (playing && mi !== lastMove.current && lastMove.current >= 0 && timeline.moves[lastMove.current]?.ease === 'cai' && sound && mode !== 'inicio')
      sfx('pouso')
    lastMove.current = playing ? mi : -1
    // a musica gerada toca um tempo de cada vez, quando o tempo inteiro muda
    const b = Math.floor(beat)
    if (playing && b !== lastBeat.current && b < timeline.total) {
      lastBeat.current = b
      const m = musicaDe(timeline)
      if (sound && mode !== 'inicio' && mode !== 'camarim' && m !== 'arquivo' && m !== 'nenhuma') playBeat(b, useStore.getState().bpm, m)
    }
    const st = useStore.getState()
    syncFile(playing && st.sound && musicaDe(timeline) === 'arquivo' && st.mode !== 'inicio', (beat * 60) / st.bpm)
    // parada: prepara para tocar o tempo atual assim que voltar a dancar
    if (!playing) lastBeat.current = Math.floor(beat) - (beat % 1 === 0 ? 1 : 0)
  })

  return <primitive object={rig.root} />
}

// cor da madeira da barra
const WOOD = '#d9a877'

/*******************************************************************************
 * Studio
 * funcao: a sala de ensaio: piso de madeira, duas paredes com quadros, relogio
 * e janela, bandeirinhas, luzinhas, banco, tapete, plantas e a barra presa na
 * parede.
 * recebe: barre (BarreInfo, ou null enquanto a bailarina ainda nao mediu).
 * retorna: o grupo 3D da sala.
 ******************************************************************************/
function Studio({ barre }: { barre: BarreInfo | null }) {
  const floorTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 512
    const g = c.getContext('2d')!
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#efd4b6' : '#ebcdac'
      g.fillRect(0, i * 64, 512, 64)
      g.fillStyle = 'rgba(150,100,60,0.10)'
      g.fillRect(0, i * 64, 512, 2)
      g.fillRect(((i * 197) % 400) + 40, i * 64, 2, 64)
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(3, 3)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const paper = useWallpaper()

  // a parede da barra fica um pouco atras da barra; o resto da sala e montado em volta dela e da parede do fundo
  const wallX = barre ? barre.x + 0.32 : 0.9
  const backZ = -3
  const backW = 9
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial map={floorTex} roughness={0.8} />
      </mesh>
      <Wall position={[wallX, 0, 0]} rotation={[0, -Math.PI / 2, 0]} width={9} tex={paper} />
      <Wall position={[0, 0, backZ]} rotation={[0, 0, 0]} width={backW} tex={paper} />

      <Window position={[-1.35, 1.72, backZ + 0.01]} />
      <Frame art="sapatilhas" position={[0.05, 1.82, backZ + 0.03]} w={0.5} h={0.64} />
      <Frame art="lua" position={[-2.7, 1.95, backZ + 0.03]} w={0.36} h={0.36} frame="#fbe3ea" />
      <Frame art="flores" position={[-2.7, 1.42, backZ + 0.03]} w={0.36} h={0.46} />
      <Frame art="cisne" position={[wallX - 0.03, 1.85, -2.1]} rotation={[0, -Math.PI / 2, 0]} w={0.56} h={0.7} />
      <Frame art="coracao" position={[wallX - 0.03, 1.9, -1.2]} rotation={[0, -Math.PI / 2, 0]} w={0.36} h={0.36} frame="#fbe3ea" />
      <Clock position={[wallX - 0.03, 2.0, -0.35]} rotation={[0, -Math.PI / 2, 0]} />

      <Bunting from={[-4.3, 2.85, backZ + 0.05]} to={[wallX - 0.05, 2.85, backZ + 0.05]} drop={0.28} />
      <FairyLights from={[wallX - 0.05, 2.75, backZ + 0.05]} to={[wallX - 0.05, 2.75, 2.5]} drop={0.35} count={30} />

      <Bench position={[-2.75, 0, backZ + 0.32]} />
      <Rug position={[-2.4, 0, -1.6]} />

      {barre && (
        <group>
          <mesh position={[barre.x, barre.y - 0.02, 0]} rotation-x={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 5.4, 20]} />
            <meshStandardMaterial color={WOOD} roughness={0.45} />
          </mesh>
          {[-2.2, 0, 2.2].map((z) => (
            <group key={z}>
              <mesh position={[(barre.x + wallX) / 2, barre.y - 0.02, z]} rotation-z={Math.PI / 2} castShadow>
                <cylinderGeometry args={[0.012, 0.012, wallX - barre.x, 10]} />
                <meshStandardMaterial color="#e8d9e6" metalness={0.3} roughness={0.4} />
              </mesh>
              <mesh position={[wallX - 0.01, barre.y - 0.02, z]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
                <meshStandardMaterial color="#e8d9e6" metalness={0.3} roughness={0.4} />
              </mesh>
            </group>
          ))}
        </group>
      )}
      <Plant position={[-0.95, 0, backZ + 0.35]} small />
      <Plant position={[wallX - 0.35, 0, backZ + 0.35]} />
    </group>
  )
}

/*******************************************************************************
 * PontosDaSala
 * funcao: adesivos redondos numerados no chao (como as marcas de fita das salas
 * de verdade), bem onde ela para em cada ponto. so aparecem quando a
 * coreografia usa os blocos de ponto, para a sala nao ficar cheia de numeros a
 * toa.
 * recebe: nada (le o programa do store).
 * retorna: o grupo 3D dos adesivos, ou null.
 ******************************************************************************/
function PontosDaSala() {
  const program = useStore((s) => s.program)
  const usa = useMemo(() => /"(irPonto|olharPonto)"/.test(JSON.stringify(program)), [program])
  const texs = useMemo(() => {
    const m = new Map<Ponto, THREE.CanvasTexture>()
    for (const n of PONTOS) {
      const c = document.createElement('canvas')
      c.width = c.height = 128
      const g = c.getContext('2d')!
      g.fillStyle = n % 2 ? '#f7b6cb' : '#d9b8f2'
      g.beginPath()
      g.arc(64, 64, 60, 0, Math.PI * 2)
      g.fill()
      g.lineWidth = 6
      g.strokeStyle = '#fff'
      g.stroke()
      g.fillStyle = '#6b3a55'
      g.font = '800 72px Nunito, ui-rounded, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(String(n), 64, 70)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      m.set(n, t)
    }
    return m
  }, [])
  if (!usa) return null
  return (
    <group>
      {PONTOS.map((n) => {
        const p = PONTO_POS[n]
        return (
          <mesh key={n} position={[p.x, 0.004, p.z]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.13, 32]} />
            <meshStandardMaterial map={texs.get(n)} transparent roughness={0.7} />
          </mesh>
        )
      })}
    </group>
  )
}

/*******************************************************************************
 * PalcoSet
 * funcao: o cenario do modo palco: tablado de madeira escura, rotunda de veludo
 * atras, luz de ribalta e um canhao de luz que segue a bailarina. se a
 * coreografia usa a barra, aparece uma barra portatil no mesmo lugar da barra
 * da sala.
 * recebe: barre (BarreInfo ou null), focus (o ponto que a bailarina atualiza) e
 * usaBarra (boolean).
 * retorna: o grupo 3D do palco.
 ******************************************************************************/
function PalcoSet({ barre, focus, usaBarra }: { barre: BarreInfo | null; focus: THREE.Vector3; usaBarra: boolean }) {
  const chao = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 512
    const g = c.getContext('2d')!
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#8a5e4a' : '#7e5442'
      g.fillRect(0, i * 64, 512, 64)
      g.fillStyle = 'rgba(0,0,0,0.25)'
      g.fillRect(0, i * 64, 512, 2)
      g.fillRect(((i * 211) % 420) + 30, i * 64, 2, 64)
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(3, 3)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const veludo = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 64
    const g = c.getContext('2d')!
    for (let x = 0; x < 512; x++) {
      const v = 0.55 + 0.45 * Math.cos((x / 512) * Math.PI * 2 * 14) ** 2
      g.fillStyle = `rgb(${Math.round(150 * v)}, ${Math.round(32 * v)}, ${Math.round(70 * v)})`
      g.fillRect(x, 0, 1, 64)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const spot = useRef<THREE.SpotLight>(null)
  const alvo = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    // o canhao de luz mira na bailarina e fica sempre acima e a frente dela
    alvo.position.set(focus.x, 0, focus.z)
    alvo.updateMatrixWorld()
    if (spot.current) spot.current.position.set(focus.x + 0.6, 5.2, focus.z + 2.6)
  })
  const bx = barre?.x ?? 0.42
  const by = barre?.y ?? 0.95
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[-0.7, 0, 0]} receiveShadow>
        <planeGeometry args={[11, 9]} />
        <meshStandardMaterial map={chao} roughness={0.55} />
      </mesh>
      {/* rotunda de veludo no fundo e nas laterais */}
      <mesh position={[-0.7, 2.4, -3.2]}>
        <planeGeometry args={[12, 4.8]} />
        <meshStandardMaterial map={veludo} roughness={0.95} />
      </mesh>
      {[-5.2, 3.8].map((x) => (
        <mesh key={x} position={[x, 2.4, 0]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[8, 4.8]} />
          <meshStandardMaterial map={veludo} roughness={0.95} />
        </mesh>
      ))}
      <primitive object={alvo} />
      <FloresNoPalco focus={focus} />
      <spotLight ref={spot} target={alvo} angle={0.33} penumbra={0.55} intensity={95} distance={13} decay={1.5} color="#fff3e0" castShadow shadow-mapSize={[1024, 1024]} />
      {usaBarra && (
        <group>
          <mesh position={[bx, by - 0.02, 0]} rotation-x={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 3.2, 20]} />
            <meshStandardMaterial color={WOOD} roughness={0.45} />
          </mesh>
          {[-1.4, 1.4].map((z) => (
            <group key={z} position={[bx + 0.08, 0, z]}>
              <mesh position-y={(by - 0.02) / 2}>
                <cylinderGeometry args={[0.018, 0.018, by - 0.02, 12]} />
                <meshStandardMaterial color="#d9cbd8" metalness={0.4} roughness={0.35} />
              </mesh>
              <mesh position={[-0.04, by - 0.02, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.012, 0.012, 0.09, 10]} />
                <meshStandardMaterial color="#d9cbd8" metalness={0.4} roughness={0.35} />
              </mesh>
              <mesh position-y={0.02} rotation-y={Math.PI / 4}>
                <boxGeometry args={[0.42, 0.03, 0.05]} />
                <meshStandardMaterial color="#d9cbd8" metalness={0.4} roughness={0.35} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  )
}

/*******************************************************************************
 * FloresNoPalco
 * funcao: as flores que a plateia joga no fim da apresentacao: caem girando e
 * ficam deitadas no palco, em volta da bailarina.
 * recebe: focus (onde a bailarina esta).
 * retorna: o grupo 3D com as 22 flores (escondidas ate a hora).
 ******************************************************************************/
function FloresNoPalco({ focus }: { focus: THREE.Vector3 }) {
  const ativo = useStore((s) => s.palcoFlores)
  const grupo = useRef<THREE.Group>(null)
  const flores = useMemo(() => {
    const cores = ['#ff7aa2', '#ffffff', '#e8335f', '#ffc2d4', '#f75b8a']
    return Array.from({ length: 22 }, (_, i) => {
      const g = new THREE.Group()
      const caule = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 6), new THREE.MeshStandardMaterial({ color: '#5f9e5a', roughness: 0.8 }))
      caule.position.y = -0.12
      g.add(caule)
      const folha = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshStandardMaterial({ color: '#6fb066', roughness: 0.8 }))
      folha.scale.set(1, 0.25, 0.5)
      folha.position.set(0.02, -0.1, 0)
      g.add(folha)
      const cor = cores[i % cores.length]
      const pet = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6 })
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), pet)
        p.position.set(Math.cos(a) * 0.026, 0.01, Math.sin(a) * 0.026)
        p.scale.set(1, 0.7, 1)
        g.add(p)
      }
      const miolo = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffd66e', roughness: 0.5 }))
      miolo.position.y = 0.02
      g.add(miolo)
      g.traverse((o) => ((o as THREE.Mesh).castShadow = true))
      // onde cai (em volta da bailarina, mais para a frente do palco), quando comeca e como gira
      const ang = (i / 22) * Math.PI * 2 + Math.random() * 0.4
      const raio = 0.45 + Math.random() * 1.1
      return {
        g,
        dx: Math.cos(ang) * raio,
        dz: Math.abs(Math.sin(ang)) * raio * 0.9 + 0.2,
        atraso: Math.random() * 1.6,
        vel: 1.3 + Math.random() * 0.7,
        giro: (Math.random() - 0.5) * 6,
        fase: Math.random() * 6,
        deitada: Math.random() * Math.PI * 2,
      }
    })
  }, [])
  // t0 marca quando a chuva de flores comecou; o centro fica fixo onde ela estava nesse momento
  const t0 = useRef(-1)
  const centro = useRef(new THREE.Vector3())
  useEffect(() => {
    t0.current = -1
    flores.forEach((f) => (f.g.visible = false))
  }, [ativo, flores])
  useFrame((st) => {
    if (!ativo) return
    if (t0.current < 0) {
      t0.current = st.clock.elapsedTime
      centro.current.copy(focus)
    }
    const t = st.clock.elapsedTime - t0.current
    for (const f of flores) {
      const tt = t - f.atraso
      if (tt < 0) continue
      f.g.visible = true
      // cai acelerando a partir de 3,4 m e para deitada no chao
      const y = Math.max(0.03, 3.4 - f.vel * tt - 0.4 * tt * tt)
      const noChao = y <= 0.03
      f.g.position.set(centro.current.x + f.dx + (noChao ? 0 : Math.sin(tt * 3 + f.fase) * 0.08), y, centro.current.z + f.dz)
      if (noChao) f.g.rotation.set(Math.PI / 2, f.deitada, 0)
      else f.g.rotation.set(Math.sin(tt * 2 + f.fase) * 0.6, tt * f.giro, Math.cos(tt * 2.3 + f.fase) * 0.6)
    }
  })
  return (
    <group ref={grupo}>
      {flores.map((f, i) => (
        <primitive key={i} object={f.g} visible={false} />
      ))}
    </group>
  )
}

/*******************************************************************************
 * Plant
 * funcao: um vaso com uma planta redondinha.
 * recebe: position (na sala) e small (true para uma versao 70% menor).
 * retorna: o grupo 3D da planta.
 ******************************************************************************/
function Plant({ position, small }: { position: [number, number, number]; small?: boolean }) {
  const k = small ? 0.7 : 1
  return (
    <group position={position} scale={k}>
      <mesh position-y={0.18} castShadow>
        <cylinderGeometry args={[0.17, 0.13, 0.36, 20]} />
        <meshStandardMaterial color="#f0b48f" roughness={0.9} />
      </mesh>
      {[
        [0, 0.55, 0, 0.22],
        [0.12, 0.7, 0.05, 0.16],
        [-0.1, 0.72, -0.04, 0.17],
        [0.02, 0.86, 0, 0.13],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 16, 12]} />
          <meshStandardMaterial color={i % 2 ? '#8fc79a' : '#7dbb8a'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/*******************************************************************************
 * CAMS
 * funcao: posicao de cada camera em relacao a bailarina na barra. vitrine e a
 * da tela inicial e plateia a do palco.
 ******************************************************************************/
const CAMS: Record<CamView, [number, number, number]> = {
  'tres-quartos': [-2.3, 1.45, 2.9],
  frente: [0, 1.0, 3.9],
  lado: [-3.9, 1.0, 0],
  perto: [-1.5, 1.45, 2.9],
  pes: [-0.75, 0.32, 1.25],
  cima: [-1.2, 3.6, 2.2],
  vitrine: [-1.05, 1.2, 2.75],
  plateia: [-0.25, 1.15, 5.0],
}
// altura para onde cada camera olha (as que nao estao aqui olham para 0,78 m)
const TARGET_Y: Partial<Record<CamView, number>> = { perto: 1.05, pes: 0.12, vitrine: 0.9, plateia: 0.95 }

/*******************************************************************************
 * CameraRig
 * funcao: a camera, com os controles de girar e aproximar. acompanha a
 * bailarina pela sala (barra e centro) sem perder o angulo escolhido.
 * recebe: interactive (se a jogadora pode mexer na camera) e focus (o ponto a
 * seguir).
 * retorna: os controles de orbita.
 ******************************************************************************/
function CameraRig({ interactive, focus }: { interactive: boolean; focus: THREE.Vector3 }) {
  const { camera } = useThree()
  const controls = useRef<OC>(null)
  const nonce = useStore((s) => s.camNonce)
  const track = useRef(new THREE.Vector3())
  // trocar de camera (camNonce) recoloca a camera e o alvo a partir de onde a bailarina esta (camNonce) recoloca a camera e o alvo a partir de onde a bailarina esta
  useEffect(() => {
    const c = useStore.getState().cam
    const [x, y, z] = CAMS[c]
    camera.position.set(x + track.current.x, y + track.current.y, z + track.current.z)
    controls.current?.target.set(track.current.x, (TARGET_Y[c] ?? 0.78) + track.current.y, track.current.z)
    controls.current?.update()
  }, [nonce, camera])
  useFrame((_, dt) => {
    // a camera e o alvo andam juntos, um pedaco do caminho por quadro, para seguir suave
    const k = Math.min(1, dt * 2.5)
    const dx = (focus.x - track.current.x) * k
    const dz = (focus.z - track.current.z) * k
    const dy = (focus.y * 0.6 - track.current.y) * k // sentada no chao: a camera desce um pouco
    if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) < 1e-5) return
    track.current.x += dx
    track.current.y += dy
    track.current.z += dz
    camera.position.x += dx
    camera.position.y += dy
    camera.position.z += dz
    if (controls.current) {
      controls.current.target.x += dx
      controls.current.target.y += dy
      controls.current.target.z += dz
      controls.current.update()
    }
  })
  return (
    <OrbitControls
      ref={controls}
      target={[0, 0.78, 0]}
      minDistance={0.6}
      maxDistance={7}
      maxPolarAngle={Math.PI / 2 - 0.05}
      enableDamping
      enabled={interactive}
    />
  )
}

/*******************************************************************************
 * Scene
 * funcao: o canvas 3D com luzes, a sala ou o palco, a bailarina e a camera.
 * recebe: interactive (se a camera pode ser mexida, padrao true) e palco (true
 * para o modo palco).
 * retorna: o Canvas.
 ******************************************************************************/
export function Scene({ interactive = true, palco = false }: { interactive?: boolean; palco?: boolean }) {
  const [barre, setBarre] = useState<BarreInfo | null>(null)
  const focus = useMemo(() => new THREE.Vector3(), [])
  // a barra portatil so aparece se a coreografia comeca na barra (se o primeiro bloco ja leva ao centro, nao precisa)
  const program = useStore((s) => s.program)
  const usaBarra = useMemo(() => {
    if (!palco || program.inicio === 'centro') return false
    const p0 = program.principal[0]
    return !(p0 && p0.t === 'local' && p0.onde === 'centro')
  }, [palco, program])
  const fundo = palco ? '#2a1830' : '#fbeef3'
  return (
    <Canvas shadows camera={{ position: CAMS[palco ? 'plateia' : 'tres-quartos'], fov: 38 }} gl={{ preserveDrawingBuffer: true }}>
      <color attach="background" args={[fundo]} />
      <fog attach="fog" args={[fundo, palco ? 9 : 8, palco ? 16 : 15]} />
      <hemisphereLight args={palco ? ['#ffe6f0', '#5a3a40', 1.05] : ['#fff6ea', '#e6d3c8', 1.35]} />
      {!palco && (
        <directionalLight
          position={[-3, 5, 4]}
          intensity={1.6}
          color="#fff1dc"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0004}
          shadow-radius={4}
        />
      )}
      {palco ? (
        <>
          <directionalLight position={[0, 1.2, 5]} intensity={1.3} color="#ffd9a8" /> {/* luz da ribalta, de frente e de baixo */}
          <PalcoSet barre={barre} focus={focus} usaBarra={usaBarra} />
        </>
      ) : (
        <>
          <pointLight position={[-1.2, 1.8, -2.4]} intensity={0.8} color="#ffd9a0" distance={5} />
          <Studio barre={barre} />
          <PontosDaSala />
        </>
      )}
      <Dancer onBarre={setBarre} focus={focus} />
      <CameraRig interactive={interactive} focus={focus} />
    </Canvas>
  )
}
