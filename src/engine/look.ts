/*******************************************************************************
 * look.ts
 * funcao principal: o visual da bailarina escolhido no camarim (pele, cabelo,
 * penteado, roupa, sapatilha, enfeite) e as opcoes de cada item, com quantas
 * estrelas cada opcao especial pede. tambem tem a mistura de cores usada para
 * sombras e brilhos.
 ******************************************************************************/
export type Penteado = 'franja' | 'coque' | 'coquinhos'
export type Enfeite = 'nenhum' | 'tiara' | 'flores'

/*******************************************************************************
 * Look
 * funcao: tudo o que o camarim pode mudar. as cores sao strings hex
 * ("#rrggbb"); ponta liga a sapatilha de ponta, que so aparece depois das
 * conquistas.
 ******************************************************************************/
export type Look = {
  nome: string
  pele: string
  cabelo: string
  penteado: Penteado
  collant: string
  saia: string
  sapatilha: string
  laco: string
  enfeite: Enfeite
  ponta?: boolean // sapatilha de ponta (liberada pelas conquistas)
}

/*******************************************************************************
 * DEFAULT_LOOK
 * funcao: o visual de quem abre o jogo pela primeira vez (a lili de coque com
 * franja e collant lilas).
 ******************************************************************************/
export const DEFAULT_LOOK: Look = {
  nome: 'Lili',
  pele: '#f8d7c4',
  cabelo: '#6b4232',
  penteado: 'franja',
  collant: '#a98bd9',
  saia: '#e4d8fa',
  sapatilha: '#f2b3c2',
  laco: '#f28fae',
  enfeite: 'nenhum',
}

type Opt = { cor: string; nome: string; estrelas?: number }

/*******************************************************************************
 * OPCOES
 * funcao: as cores que aparecem no camarim para cada parte. uma opcao com
 * estrelas so libera quando a jogadora soma esse total.
 ******************************************************************************/
export const OPCOES: Record<'pele' | 'cabelo' | 'collant' | 'saia' | 'sapatilha' | 'laco', Opt[]> = {
  pele: [
    { cor: '#f8d7c4', nome: 'pêssego' },
    { cor: '#efc2a4', nome: 'mel claro' },
    { cor: '#d9a07c', nome: 'caramelo' },
    { cor: '#b57a55', nome: 'canela' },
    { cor: '#8a5a3c', nome: 'cacau' },
  ],
  cabelo: [
    { cor: '#6b4232', nome: 'castanho' },
    { cor: '#3a2622', nome: 'castanho escuro' },
    { cor: '#262129', nome: 'preto' },
    { cor: '#b9733f', nome: 'ruivo' },
    { cor: '#e2bd78', nome: 'loiro' },
  ],
  collant: [
    { cor: '#a98bd9', nome: 'lilás' },
    { cor: '#f19bb8', nome: 'rosa' },
    { cor: '#8fb5e8', nome: 'azul' },
    { cor: '#7fc8b2', nome: 'menta' },
    { cor: '#a8506e', nome: 'vinho' },
    { cor: '#4a3e55', nome: 'preto' },
  ],
  saia: [
    { cor: '#e4d8fa', nome: 'lilás' },
    { cor: '#fbd3e2', nome: 'rosa' },
    { cor: '#fbf7f2', nome: 'branca' },
    { cor: '#d6e6fb', nome: 'azul' },
    { cor: '#d4f0e6', nome: 'menta' },
    { cor: '#f6e2a8', nome: 'dourada', estrelas: 18 },
  ],
  sapatilha: [
    { cor: '#f2b3c2', nome: 'rosa' },
    { cor: '#e9c7ad', nome: 'bege' },
    { cor: '#f6efe9', nome: 'branca' },
    { cor: '#4a3e55', nome: 'preta' },
  ],
  laco: [
    { cor: '#f28fae', nome: 'rosa' },
    { cor: '#b49ae0', nome: 'lilás' },
    { cor: '#8db6ea', nome: 'azul' },
    { cor: '#e06a7d', nome: 'vermelho' },
    { cor: '#fbf3f6', nome: 'branco' },
  ],
}

export const PENTEADOS: { id: Penteado; nome: string }[] = [
  { id: 'franja', nome: 'coque com franja' },
  { id: 'coque', nome: 'coque clássico' },
  { id: 'coquinhos', nome: 'dois coquinhos' },
]

/*******************************************************************************
 * ESTRELAS_PONTA
 * funcao: estrelas (somando todos os modos) para liberar a sapatilha de ponta.
 ******************************************************************************/
export const ESTRELAS_PONTA = 50

/*******************************************************************************
 * ENFEITES
 * funcao: enfeites de cabelo do camarim; tiara e coroa de flores pedem
 * estrelas.
 ******************************************************************************/
export const ENFEITES: { id: Enfeite; nome: string; estrelas?: number }[] = [
  { id: 'nenhum', nome: 'só o laço' },
  { id: 'tiara', nome: 'tiara', estrelas: 6 },
  { id: 'flores', nome: 'coroa de flores', estrelas: 12 },
]

// ===== cores =====
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

/*******************************************************************************
 * mixHex
 * funcao: mistura duas cores hex.
 * recebe: a e b (strings "#rrggbb") e t (number, 0 da a, 1 da b).
 * retorna: a cor misturada em hex. cada canal e limitado a 0..255.
 ******************************************************************************/
export const mixHex = (a: string, b: string, t: number) => {
  const x = hex(a)
  const y = hex(b)
  return toHex(x.map((v, i) => v + (y[i] - v) * t))
}
