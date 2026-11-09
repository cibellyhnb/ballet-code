/*******************************************************************************
 * trilhas.ts
 * funcao principal: junta as listas de fases de cada modo com estrelas (aula,
 * desafios, conserta, professora dita e grand allegro) e os textos de
 * apresentacao de cada um. tambem acha uma fase pelo id em qualquer trilha.
 ******************************************************************************/
import { FASES, type Fase } from './fases'
import { ALLEGRO, CONSERTOS, DESAFIOS, DITADOS } from './modos'

/*******************************************************************************
 * Trilha
 * funcao: nome de cada modo com fases. e tambem o nome do modo na tela (store)
 * quando a jogadora esta dentro dele.
 ******************************************************************************/
export type Trilha = 'aula' | 'desafios' | 'conserta' | 'ditado' | 'allegro'

/*******************************************************************************
 * TRILHAS
 * funcao: para cada trilha, o titulo, o texto de introducao do mapa, a lista de
 * fases e a palavra usada para cada item ("fase", "desafio", "conserto",
 * "ditado").
 ******************************************************************************/
export const TRILHAS: Record<Trilha, { titulo: string; intro: string; lista: Fase[]; item: string }> = {
  aula: {
    titulo: 'Aula',
    intro: 'Siga as fases na ordem da aula. Cada fase vale até 3 estrelas: dançar igual ao exemplo, usar o conceito da fase e usar poucos blocos.',
    lista: FASES,
    item: 'fase',
  },
  desafios: {
    titulo: 'Desafios',
    intro: 'Combinações que você já conhece, mas com regras apertadas: poucos blocos, blocos proibidos… Desafio cumprido vale 3 estrelas.',
    lista: DESAFIOS,
    item: 'desafio',
  },
  conserta: {
    titulo: 'Conserta a combinação',
    intro: 'Os blocos já vêm montados, mas tem alguma coisa errada. Assista, descubra o problema e conserte mexendo no mínimo possível.',
    lista: CONSERTOS,
    item: 'conserto',
  },
  ditado: {
    titulo: 'Professora dita',
    intro: 'Igual na aula de verdade: a professora fala a combinação e você monta. O exemplo só aparece se você errar.',
    lista: DITADOS,
    item: 'ditado',
  },
  allegro: {
    titulo: 'Grand allegro',
    intro: 'Passos que viajam pela sala e os saltos grandes do fim da aula: glissade, pas de bourrée, balancé, assemblé, sissonne e o grand jeté!',
    lista: ALLEGRO,
    item: 'fase',
  },
}

export const isTrilha = (m: string): m is Trilha => m in TRILHAS

/*******************************************************************************
 * acharFase
 * funcao: procura uma fase pelo id em todas as trilhas.
 * recebe: id (string), o id da fase.
 * retorna: a fase, a trilha onde ela esta e a lista inteira dessa trilha, ou
 * null se nenhuma trilha tiver esse id.
 ******************************************************************************/
export function acharFase(id: string): { fase: Fase; trilha: Trilha; lista: Fase[] } | null {
  for (const trilha of Object.keys(TRILHAS) as Trilha[]) {
    const lista = TRILHAS[trilha].lista
    const fase = lista.find((f) => f.id === id)
    if (fase) return { fase, trilha, lista }
  }
  return null
}
