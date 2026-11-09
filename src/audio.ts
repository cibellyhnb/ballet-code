/*******************************************************************************
 * audio.ts
 * funcao principal: a musica de aula gerada no navegador (Web Audio), sem
 * arquivos e sem direitos autorais, mais a musica da propria jogadora, os
 * aplausos e os efeitos sonoros. uma combinacao usa uma peca do comeco ao fim
 * (como o pianista da aula), escolhida pelo tipo de exercicio. cada tempo da
 * contagem de ballet e um compasso: no 3/4 cada tempo tem "um, dois, tres"; no
 * 4/4 e no 2/4, "um e". as melodias sao pecas originais de 16 tempos (duas
 * frases de 8), compostas para este jogo.
 ******************************************************************************/

/*******************************************************************************
 * Estilo
 * funcao: os estilos de musica que existem. cada passo pede um (ver MUSICA em
 * program.ts) e a combinacao fica com um so.
 ******************************************************************************/
export type Estilo = 'adagio' | 'tendu' | 'valsa' | 'marcha' | 'mazurca' | 'galope' | 'grandeValsa'

// nota da melodia: [inicio em pulsos, grau da escala (0 = tonica; 7 = oitava acima), duracao em pulsos]
type N = [number, number, number]
type Tempo = { c: number; m: N[] } // c = grau do acorde

/*******************************************************************************
 * Peca
 * funcao: uma peca: nome e compasso (para a tela), pulsos por tempo (3 na
 * valsa, 2 na marcha), speed (multiplica o andamento), tom (nota midi da
 * tonica) e os tempos, cada um com o acorde e as notas da melodia.
 ******************************************************************************/
type Peca = { nome: string; compasso: string; pulsos: number; speed: number; tom: number; tempos: Tempo[] }

// atalho para escrever um tempo: grau do acorde e as notas da melodia
const t = (c: number, ...m: N[]): Tempo => ({ c, m })

/*******************************************************************************
 * ESTILOS
 * funcao: as sete pecas originais, uma por estilo.
 ******************************************************************************/
export const ESTILOS: Record<Estilo, Peca> = {
  // plie, fondu, adage: 3/4 lento e cantado (fa maior)
  adagio: {
    nome: 'adágio',
    compasso: '3/4',
    pulsos: 3,
    speed: 0.7,
    tom: 65,
    tempos: [
      t(0, [0, 4, 2], [2, 5, 1]),
      t(0, [0, 4, 3]),
      t(3, [0, 5, 2], [2, 3, 1]),
      t(3, [0, 2, 3]),
      t(1, [0, 1, 2], [2, 3, 1]),
      t(4, [0, 4, 2], [2, 1, 1]),
      t(0, [0, 2, 2], [2, 1, 1]),
      t(4, [0, 1, 3]),
      t(0, [0, 4, 2], [2, 7, 1]),
      t(5, [0, 5, 2], [2, 7, 1]),
      t(3, [0, 5, 2], [2, 3, 1]),
      t(1, [0, 3, 2], [2, 1, 1]),
      t(0, [0, 2, 2], [2, 4, 1]),
      t(4, [0, 1, 2], [2, 6, 1]),
      t(0, [0, 0, 3]),
      t(0, [0, 0, 2], [2, -3, 1]),
    ],
  },
  // tendu, glisse, frappe, allegro: 4/4 alegre e marcado (do maior)
  tendu: {
    nome: 'tendu',
    compasso: '4/4',
    pulsos: 2,
    speed: 1,
    tom: 60,
    tempos: [
      t(0, [0, 4, 1], [1, 4, 0.5], [1.5, 5, 0.5]),
      t(0, [0, 4, 1], [1, 2, 1]),
      t(3, [0, 3, 1], [1, 5, 1]),
      t(0, [0, 4, 1.5], [1.5, 2, 0.5]),
      t(4, [0, 1, 1], [1, 3, 1]),
      t(4, [0, 6, 1], [1, 4, 1]),
      t(0, [0, 2, 1], [1, 4, 1]),
      t(0, [0, 7, 2]),
      t(0, [0, 4, 1], [1, 4, 0.5], [1.5, 5, 0.5]),
      t(0, [0, 4, 1], [1, 7, 1]),
      t(3, [0, 5, 1], [1, 7, 0.5], [1.5, 5, 0.5]),
      t(3, [0, 3, 2]),
      t(0, [0, 2, 1], [1, 4, 1]),
      t(4, [0, 1, 1], [1, 6, 0.5], [1.5, 1, 0.5]),
      t(0, [0, 0, 1], [1, 2, 1]),
      t(0, [0, 0, 2]),
    ],
  },
  // rond de jambe, pirueta, releve: valsa (sol maior)
  valsa: {
    nome: 'valsa',
    compasso: '3/4',
    pulsos: 3,
    speed: 0.95,
    tom: 67,
    tempos: [
      t(0, [0, 2, 3]),
      t(0, [0, 4, 2], [2, 2, 1]),
      t(4, [0, 1, 3]),
      t(4, [0, 3, 2], [2, 1, 1]),
      t(4, [0, 6, 3]),
      t(4, [0, 1, 2], [2, 3, 1]),
      t(0, [0, 2, 3]),
      t(0, [0, 0, 3]),
      t(0, [0, 2, 3]),
      t(0, [0, 4, 2], [2, 7, 1]),
      t(3, [0, 7, 2], [2, 5, 1]),
      t(3, [0, 3, 3]),
      t(0, [0, 4, 2], [2, 2, 1]),
      t(4, [0, 1, 2], [2, 6, 1]),
      t(0, [0, 0, 3]),
      t(0, [0, 0, 3]),
    ],
  },
  // grand battement: marcha ampla (re maior)
  marcha: {
    nome: 'marcha',
    compasso: '2/4',
    pulsos: 2,
    speed: 0.85,
    tom: 62,
    tempos: [
      t(0, [0, 4, 1], [1, 7, 1]),
      t(0, [0, 7, 1.5], [1.5, 6, 0.5]),
      t(3, [0, 5, 1], [1, 3, 1]),
      t(3, [0, 5, 2]),
      t(0, [0, 4, 1], [1, 2, 1]),
      t(4, [0, 1, 1], [1, 6, 1]),
      t(0, [0, 2, 1], [1, 4, 1]),
      t(0, [0, 7, 2]),
      t(0, [0, 4, 1], [1, 7, 1]),
      t(0, [0, 7, 1.5], [1.5, 6, 0.5]),
      t(3, [0, 5, 1], [1, 3, 1]),
      t(3, [0, 5, 2]),
      t(0, [0, 4, 1], [1, 2, 1]),
      t(4, [0, 4, 1], [1, 1, 1]),
      t(0, [0, 2, 0.5], [0.5, 1, 0.5], [1, 0, 1]),
      t(0, [0, 0, 2]),
    ],
  },
  // petit allegro (saltinhos, pas de chat, glissade): galope 2/4 ligeiro (fa maior)
  galope: {
    nome: 'galope',
    compasso: '2/4',
    pulsos: 2,
    speed: 1.1,
    tom: 65,
    tempos: [
      t(0, [0, 4, 0.5], [0.5, 5, 0.5], [1, 4, 0.5], [1.5, 2, 0.5]),
      t(0, [0, 0, 0.5], [0.5, 2, 0.5], [1, 4, 1]),
      t(4, [0, 1, 0.5], [0.5, 3, 0.5], [1, 6, 0.5], [1.5, 4, 0.5]),
      t(0, [0, 2, 1], [1, 7, 1]),
      t(3, [0, 5, 0.5], [0.5, 7, 0.5], [1, 5, 0.5], [1.5, 3, 0.5]),
      t(0, [0, 2, 0.5], [0.5, 4, 0.5], [1, 7, 1]),
      t(4, [0, 6, 0.5], [0.5, 5, 0.5], [1, 4, 0.5], [1.5, 3, 0.5]),
      t(4, [0, 1, 1], [1, 4, 1]),
      t(0, [0, 4, 0.5], [0.5, 5, 0.5], [1, 4, 0.5], [1.5, 2, 0.5]),
      t(0, [0, 0, 0.5], [0.5, 2, 0.5], [1, 4, 1]),
      t(3, [0, 3, 0.5], [0.5, 5, 0.5], [1, 8, 1]),
      t(0, [0, 7, 0.5], [0.5, 4, 0.5], [1, 2, 1]),
      t(1, [0, 3, 0.5], [0.5, 5, 0.5], [1, 3, 0.5], [1.5, 1, 0.5]),
      t(4, [0, 4, 0.5], [0.5, 6, 0.5], [1, 8, 0.5], [1.5, 6, 0.5]),
      t(0, [0, 7, 0.5], [0.5, 4, 0.5], [1, 2, 0.5], [1.5, 1, 0.5]),
      t(0, [0, 0, 2]),
    ],
  },
  // pique, soutenu: mazurca 3/4 com o acento no segundo tempo e ritmo pontuado (mi bemol maior)
  mazurca: {
    nome: 'mazurca',
    compasso: '3/4',
    pulsos: 3,
    speed: 0.9,
    tom: 63,
    tempos: [
      t(0, [0, 4, 1.5], [1.5, 5, 0.5], [2, 4, 1]),
      t(0, [0, 2, 1], [1, 4, 2]),
      t(4, [0, 1, 1.5], [1.5, 2, 0.5], [2, 1, 1]),
      t(4, [0, 6, 1], [1, 4, 2]),
      t(4, [0, 1, 1.5], [1.5, 3, 0.5], [2, 1, 1]),
      t(0, [0, 2, 1], [1, 0, 2]),
      t(1, [0, 3, 1.5], [1.5, 4, 0.5], [2, 5, 1]),
      t(4, [0, 4, 3]),
      t(0, [0, 4, 1.5], [1.5, 5, 0.5], [2, 4, 1]),
      t(0, [0, 7, 1], [1, 4, 2]),
      t(3, [0, 5, 1.5], [1.5, 7, 0.5], [2, 5, 1]),
      t(3, [0, 3, 1], [1, 5, 2]),
      t(0, [0, 4, 1.5], [1.5, 2, 0.5], [2, 4, 1]),
      t(4, [0, 1, 1], [1, 6, 2]),
      t(0, [0, 0, 1.5], [1.5, 2, 0.5], [2, 4, 1]),
      t(0, [0, 0, 3]),
    ],
  },
  // grand allegro (grand jete, tombe, chasse): valsa grande, com saltos de melodia bem largos (re maior)
  grandeValsa: {
    nome: 'valsa grande',
    compasso: '3/4',
    pulsos: 3,
    speed: 0.88,
    tom: 62,
    tempos: [
      t(0, [0, 0, 1], [1, 4, 1], [2, 7, 1]),
      t(0, [0, 9, 3]),
      t(4, [0, 8, 2], [2, 6, 1]),
      t(4, [0, 4, 3]),
      t(4, [0, 1, 1], [1, 4, 1], [2, 6, 1]),
      t(4, [0, 8, 3]),
      t(0, [0, 7, 2], [2, 4, 1]),
      t(0, [0, 2, 3]),
      t(3, [0, 3, 1], [1, 5, 1], [2, 7, 1]),
      t(3, [0, 10, 3]),
      t(0, [0, 9, 2], [2, 7, 1]),
      t(5, [0, 5, 3]),
      t(1, [0, 3, 1], [1, 5, 1], [2, 8, 1]),
      t(4, [0, 8, 2], [2, 6, 1]),
      t(0, [0, 7, 3]),
      t(0, [0, 0, 3]),
    ],
  },
}
// graus da escala maior em semitons; grau converte um grau (podendo passar da oitava) em semitons
const ESCALA = [0, 2, 4, 5, 7, 9, 11]
const grau = (d: number) => 12 * Math.floor(d / 7) + ESCALA[((d % 7) + 7) % 7]
// nota midi para frequencia em Hz (69 e o la de 440 Hz)
const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

// o AudioContext e criado so no primeiro uso (o navegador exige um clique antes)
let ctx: AudioContext | null = null
let master: GainNode | null = null

/*******************************************************************************
 * ac
 * funcao: devolve o AudioContext, criando na primeira vez com o volume geral e
 * um eco suave de salinha.
 * recebe: nada.
 * retorna: o AudioContext.
 ******************************************************************************/
function ac() {
  if (ctx) return ctx
  ctx = new AudioContext()
  master = ctx.createGain()
  master.gain.value = 0.85
  // salinha com eco suave (reverb feito com ruido)
  const conv = ctx.createConvolver()
  const len = Math.floor(ctx.sampleRate * 1.8)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
  }
  conv.buffer = buf
  const wet = ctx.createGain()
  wet.gain.value = 0.25
  master.connect(ctx.destination)
  master.connect(conv).connect(wet).connect(ctx.destination)
  return ctx
}

/*******************************************************************************
 * piano
 * funcao: toca uma nota de "piano": harmonicos que somem em tempos diferentes,
 * ataque rapido e decaimento longo.
 * recebe: m (nota midi), when (quando comeca, no relogio do audio), dur
 * (duracao em segundos) e vel (volume, de 0 a 1).
 * retorna: nada.
 ******************************************************************************/
function piano(m: number, when: number, dur: number, vel: number) {
  const a = ac()
  const out = a.createGain()
  const lp = a.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(1200 + vel * 5000, when)
  lp.frequency.exponentialRampToValueAtTime(700 + vel * 900, when + Math.max(0.2, dur))
  out.gain.setValueAtTime(0, when)
  out.gain.linearRampToValueAtTime(vel, when + 0.005)
  out.gain.exponentialRampToValueAtTime(vel * 0.4, when + 0.25)
  out.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.35)
  out.connect(lp).connect(master!)
  const f = midi(m)
  for (const [mult, g, type, det] of [
    [1, 0.55, 'triangle', 0],
    [1, 0.2, 'sine', 3],
    [2, 0.16, 'sine', -2],
    [3, 0.05, 'sine', 0],
  ] as const) {
    const o = a.createOscillator()
    const og = a.createGain()
    o.type = type
    o.frequency.value = f * mult
    o.detune.value = det
    og.gain.value = g
    o.connect(og).connect(out)
    o.start(when)
    o.stop(when + dur + 0.45)
  }
}

/*******************************************************************************
 * playBeat
 * funcao: toca um tempo da contagem (um compasso inteiro) da peca, comecando
 * agora: a melodia e o acompanhamento de cada estilo.
 * recebe: beat (numero do tempo na combinacao), bpm (andamento) e e (estilo,
 * valsa se nao vier).
 * retorna: nada.
 ******************************************************************************/
export function playBeat(beat: number, bpm: number, e: Estilo = 'valsa') {
  const a = ac()
  if (a.state === 'suspended') void a.resume()
  const p = ESTILOS[e]
  const t0 = a.currentTime + 0.02
  const dur = 60 / (bpm * p.speed)
  const pulso = dur / p.pulsos
  const k = ((beat % p.tempos.length) + p.tempos.length) % p.tempos.length
  const tempo = p.tempos[k]
  // o primeiro tempo de cada frase de 8 vem um pouco mais forte
  const forte = k % 8 === 0 ? 1.12 : 1
  const mel = (d: number) => p.tom + 12 + grau(d)
  const baixo = p.tom - 12 + grau(tempo.c)
  const tri = [0, 2, 4].map((i) => p.tom + grau(tempo.c + i))
  const sete = tempo.c === 4 ? [p.tom + grau(tempo.c + 6)] : []

  // melodia (mao direita)
  for (const [ini, d, len] of tempo.m) piano(mel(d), t0 + ini * pulso, len * pulso * 1.05, (ini === 0 ? 0.15 : 0.11) * forte)

  // acompanhamento (mao esquerda)
  if (e === 'adagio') {
    piano(baixo - 12, t0, dur * 1.4, 0.13 * forte)
    piano(tri[2], t0 + pulso, dur, 0.05)
    piano(tri[1] + 12 > mel(tempo.m[0][1]) ? tri[1] : tri[1] + 12, t0 + 2 * pulso, dur * 0.8, 0.05)
  } else if (e === 'valsa' || e === 'grandeValsa') {
    const grande = e === 'grandeValsa'
    piano(baixo - (k % 2 ? 5 : 12), t0, dur * 0.8, (grande ? 0.17 : 0.14) * forte)
    if (grande) piano(baixo - 24, t0, dur * 0.8, 0.08 * forte)
    for (const i of [1, 2]) for (const n of [...tri, ...sete]) piano(n, t0 + i * pulso, pulso * 0.7, grande ? 0.045 : 0.035)
  } else if (e === 'mazurca') {
    // o "pulo" da mazurca: o acorde do segundo tempo e o mais forte
    piano(baixo - 12, t0, pulso * 1.2, 0.12 * forte)
    for (const n of [...tri, ...sete]) piano(n, t0 + pulso, pulso * 0.6, 0.06)
    for (const n of tri) piano(n, t0 + 2 * pulso, pulso * 0.5, 0.03)
  } else if (e === 'tendu' || e === 'galope') {
    piano(baixo - (k % 2 ? 5 : 12), t0, pulso * 0.9, 0.13 * forte)
    for (const n of [...tri, ...sete]) piano(n, t0 + pulso, pulso * 0.5, 0.04)
  } else {
    piano(baixo - 24, t0, pulso * 1.1, 0.1 * forte)
    piano(baixo - 12, t0, pulso * 1.1, 0.13 * forte)
    for (const n of [...tri, tri[0] + 12]) piano(n, t0 + pulso, pulso * 0.55, 0.045)
  }
}

// musica propria: o arquivo de audio escolhido pela jogadora
let fileEl: HTMLAudioElement | null = null

/*******************************************************************************
 * setFileAudio
 * funcao: troca o arquivo de musica da jogadora (ou tira, com null). o audio
 * fica em loop.
 * recebe: url (string ou null), o endereco do arquivo.
 * retorna: nada.
 ******************************************************************************/
export function setFileAudio(url: string | null) {
  if (fileEl) {
    fileEl.pause()
    fileEl = null
  }
  if (url) {
    fileEl = new Audio(url)
    fileEl.loop = true
  }
}

/*******************************************************************************
 * syncFile
 * funcao: mantem o arquivo tocando no mesmo ponto da danca. chamada a cada
 * quadro.
 * recebe: playing (se deve tocar) e seconds (em que segundo da danca ela esta).
 * retorna: nada.
 ******************************************************************************/
export function syncFile(playing: boolean, seconds: number) {
  if (!fileEl) return
  if (!playing) {
    if (!fileEl.paused) fileEl.pause()
    return
  }
  const d = fileEl.duration || Infinity
  const want = seconds % d
  // so pula quando a diferenca passa de 0,35 s, para o som nao engasgar a cada quadro
  if (Math.abs(fileEl.currentTime - want) > 0.35) fileEl.currentTime = want
  if (fileEl.paused) void fileEl.play().catch(() => {})
}

/*******************************************************************************
 * unlockAudio
 * funcao: libera o som. precisa ser chamada dentro de um clique, porque o
 * navegador so deixa tocar depois de um gesto da pessoa.
 * recebe: nada. retorna: nada.
 ******************************************************************************/
export function unlockAudio() {
  const a = ac()
  if (a.state === 'suspended') void a.resume()
}

/*******************************************************************************
 * aplausos
 * funcao: aplausos da plateia sintetizados: muitas palminhas curtas de ruido
 * filtrado, que crescem e depois somem.
 * recebe: segundos (duracao, 3,5 se nao vier).
 * retorna: nada. sem audio disponivel, nao faz nada.
 ******************************************************************************/
export function aplausos(segundos = 3.5) {
  try {
    const a = ac()
    if (!a || !master) return
    const n = Math.floor(a.sampleRate * 0.03)
    const buf = a.createBuffer(1, n, a.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.18))
    const t0 = a.currentTime + 0.05
    const palmas = Math.floor(segundos * 55)
    for (let k = 0; k < palmas; k++) {
      const t = t0 + Math.random() * segundos
      const env = Math.sin(Math.PI * Math.min(1, (t - t0) / segundos)) ** 0.6 // cresce e some
      const src = a.createBufferSource()
      src.buffer = buf
      src.playbackRate.value = 0.8 + Math.random() * 0.6
      const f = a.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 900 + Math.random() * 1800
      f.Q.value = 0.9
      const g = a.createGain()
      g.gain.value = 0.16 * env * (0.6 + Math.random() * 0.4)
      src.connect(f).connect(g).connect(master)
      src.start(t)
    }
  } catch {
    /* sem audio: tudo bem */
  }
}

/*******************************************************************************
 * sfx
 * funcao: efeitos sonoros curtinhos e baixinhos. estrela: arpejo brilhante
 * quando ganha estrela. encaixe: "toc" macio de bloco encaixando. pouso: a
 * sapatilha tocando o chao depois de um salto.
 * recebe: tipo ('estrela', 'encaixe' ou 'pouso').
 * retorna: nada. sem audio disponivel, nao faz nada.
 ******************************************************************************/
export function sfx(tipo: 'estrela' | 'encaixe' | 'pouso') {
  try {
    const a = ac()
    if (!a || !master) return
    if (a.state === 'suspended') void a.resume()
    const t0 = a.currentTime + 0.01
    if (tipo === 'estrela') {
      ;[0, 4, 7, 12, 16].forEach((st, i) => piano(84 + st, t0 + i * 0.07, 0.5, 0.07))
    } else if (tipo === 'encaixe') {
      const o = a.createOscillator()
      const g = a.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(880, t0)
      o.frequency.exponentialRampToValueAtTime(520, t0 + 0.06)
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(0.09, t0 + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09)
      o.connect(g).connect(master)
      o.start(t0)
      o.stop(t0 + 0.1)
    } else {
      // ruido grave e curtinho, filtrado: "tuc" de sapatilha no linoleo
      const n = Math.floor(a.sampleRate * 0.06)
      const buf = a.createBuffer(1, n, a.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.15))
      const src = a.createBufferSource()
      src.buffer = buf
      const f = a.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 650
      const g = a.createGain()
      g.gain.value = 0.35
      src.connect(f).connect(g).connect(master)
      src.start(t0)
    }
  } catch {
    /* sem audio */
  }
}
