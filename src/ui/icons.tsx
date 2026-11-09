/*******************************************************************************
 * icons.tsx
 * funcao principal: os icones do jogo, desenhados a mao em SVG com traco
 * arredondado, para nao depender de emoji. todos aceitam size e qualquer
 * atributo de svg.
 ******************************************************************************/
import type { SVGProps } from 'react'

/*******************************************************************************
 * P
 * funcao: as props de todo icone: os atributos normais de um svg mais size
 * (largura e altura em px).
 ******************************************************************************/
type P = SVGProps<SVGSVGElement> & { size?: number }

/*******************************************************************************
 * base
 * funcao: atributos comuns a todos os icones (caixa 24x24, sem preenchimento,
 * traco na cor do texto e arredondado).
 * recebe: as props do icone (P); size vira largura e altura.
 * retorna: o objeto de atributos para espalhar no svg. o que vier nas props
 * substitui o padrao.
 ******************************************************************************/
const base = ({ size = 24, ...p }: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...p,
})

/*******************************************************************************
 * Slipper
 * funcao: icone de sapatilha com as fitas.
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Slipper = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 19c-2 0-3-1.5-2.5-3.2C4.6 12.5 8 9 12 7.6c2.6-.9 4.2.2 4.4 2 .3 2.4-1.8 4.8-4.6 6.6C9.6 17.7 8 19 6 19z" fill="currentColor" fillOpacity=".18" />
    <path d="M9 12.4c1.4.4 2.6 1.4 3 2.8" />
    <path d="M16.4 9.6c1.4-2.6 2.6-4.6 4.1-5.6M15.6 8.2C16 5.6 15.6 3.9 14.6 3" />
  </svg>
)

/*******************************************************************************
 * Music
 * funcao: icone de nota musical dupla (estudio livre).
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Music = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18V6l10-2v12" />
    <circle cx="6.5" cy="18" r="2.5" fill="currentColor" fillOpacity=".18" />
    <circle cx="16.5" cy="16" r="2.5" fill="currentColor" fillOpacity=".18" />
  </svg>
)

/*******************************************************************************
 * Book
 * funcao: icone de livro aberto (glossario).
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Book = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5z" fill="currentColor" fillOpacity=".14" />
    <path d="M12 6.5v13" />
  </svg>
)

/*******************************************************************************
 * Cap
 * funcao: icone de capelo de formatura (aula).
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Cap = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 9.5 12 5l9.5 4.5L12 14z" fill="currentColor" fillOpacity=".16" />
    <path d="M6.5 11.6V16c1.6 1.4 3.4 2 5.5 2s3.9-.6 5.5-2v-4.4M21.5 9.5v5" />
  </svg>
)

/*******************************************************************************
 * Bubble
 * funcao: icone de balao de fala (professora dita).
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Bubble = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6.5C4 5.1 5.1 4 6.5 4h11C18.9 4 20 5.1 20 6.5v7c0 1.4-1.1 2.5-2.5 2.5H11l-4.5 4v-4h0C5.1 16 4 14.9 4 13.5z" fill="currentColor" fillOpacity=".14" />
    <path d="M8.5 10h.01M12 10h.01M15.5 10h.01" strokeWidth="2.6" />
  </svg>
)

/*******************************************************************************
 * Star
 * funcao: icone de estrela preenchida (estrelas das fases).
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Star = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="currentColor" fillOpacity=".18" />
  </svg>
)

/*******************************************************************************
 * Bandaid
 * funcao: icone de curativo (conserta a combinacao).
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Bandaid = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)" fill="currentColor" fillOpacity=".14" />
    <path d="M10.6 10.4h.01M13.4 13.6h.01M10.4 13.4h.01M13.6 10.6h.01" strokeWidth="2.4" />
  </svg>
)

/*******************************************************************************
 * Lock
 * funcao: icone de cadeado (fase ou opcao trancada).
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Lock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor" fillOpacity=".16" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
)

/*******************************************************************************
 * Play
 * funcao: icone de triangulo de tocar.
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Play = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M8 5.6v12.8c0 .9 1 1.4 1.7.9l9.4-6.4c.6-.4.6-1.4 0-1.8L9.7 4.7C9 4.2 8 4.7 8 5.6z" />
  </svg>
)

/*******************************************************************************
 * Pause
 * funcao: icone de duas barras de pausar.
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Pause = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="6.5" y="5" width="4" height="14" rx="1.6" />
    <rect x="13.5" y="5" width="4" height="14" rx="1.6" />
  </svg>
)

/*******************************************************************************
 * Restart
 * funcao: icone de seta circular de voltar ao inicio.
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Restart = (p: P) => (
  <svg {...base(p)} strokeWidth={2.2}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
    <path d="M4.5 4.5v3.8h3.8" />
  </svg>
)

/*******************************************************************************
 * Note
 * funcao: icone de nota musical (musica ligada).
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Note = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 17V5.5l8-1.5v10" />
    <circle cx="7.5" cy="17" r="2.5" fill="currentColor" fillOpacity=".2" />
    <circle cx="15.5" cy="14" r="2.5" fill="currentColor" fillOpacity=".2" />
  </svg>
)

/*******************************************************************************
 * NoteOff
 * funcao: icone de nota musical riscada (musica desligada).
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const NoteOff = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 17V5.5l8-1.5v10" opacity=".45" />
    <circle cx="7.5" cy="17" r="2.5" opacity=".45" />
    <path d="M4 4l16 16" />
  </svg>
)

/*******************************************************************************
 * Home
 * funcao: icone de casinha (voltar ao menu inicial).
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Home = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 11 12 4.5l8 6.5" />
    <path d="M6 9.6V19h12V9.6" fill="currentColor" fillOpacity=".14" />
    <path d="M10.2 19v-3.6a1.8 1.8 0 0 1 3.6 0V19" />
  </svg>
)

/*******************************************************************************
 * Heart
 * funcao: icone de coracao.
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Heart = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.9a4.3 4.3 0 0 1 7.5 2.6c0 5.6-7.5 10-7.5 10z" />
  </svg>
)

/*******************************************************************************
 * Sparkle
 * funcao: icone de brilhinho de quatro pontas.
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Sparkle = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z" />
  </svg>
)

/*******************************************************************************
 * Camera
 * funcao: icone de camera (escolha de vista).
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Camera = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8.5C4 7.7 4.7 7 5.5 7h2l1.4-2h6.2L16.5 7h2c.8 0 1.5.7 1.5 1.5v9c0 .8-.7 1.5-1.5 1.5h-13C4.7 19 4 18.3 4 17.5z" fill="currentColor" fillOpacity=".14" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
)

/*******************************************************************************
 * Bow
 * funcao: icone de laco de fita, a marca do jogo.
 * recebe: p (P). retorna: o svg.
 ******************************************************************************/
export const Bow = (p: P) => (
  <svg {...base(p)} viewBox="0 0 32 20">
    <path d="M16 10C12 4 4 1.5 3 4.5s1.2 9.5 13 5.5zM16 10c4-6 12-8.5 13-5.5s-1.2 9.5-13 5.5z" fill="currentColor" fillOpacity=".9" stroke="none" />
    <path d="M14.5 11.5 11 18.5M17.5 11.5 21 18.5" />
    <circle cx="16" cy="10" r="2.6" fill="currentColor" stroke="none" />
  </svg>
)
