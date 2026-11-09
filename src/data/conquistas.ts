/*******************************************************************************
 * conquistas.ts
 * funcao principal: lista das conquistas e as contas de progresso de cada uma,
 * somando as estrelas de todos os modos. algumas liberam coisas no camarim,
 * como a sapatilha de ponta.
 ******************************************************************************/
import { ESTRELAS_PONTA } from '../engine/look'
import { TRILHAS } from './trilhas'

/*******************************************************************************
 * Progresso
 * funcao: o que as conquistas olham: estrelas por id de fase (0 a 3) e quantas
 * coreografias estao salvas no estudio.
 ******************************************************************************/
export type Progresso = { stars: Record<string, number>; salvas: number }

/*******************************************************************************
 * Conquista
 * funcao: uma conquista. meta devolve [quanto ja tem, quanto precisa], que vira
 * a barrinha de progresso na tela. premio e o texto do que ela libera, quando
 * libera algo.
 ******************************************************************************/
export type Conquista = { id: string; titulo: string; texto: string; premio?: string; meta: (p: Progresso) => [number, number] }

const total = (p: Progresso) => Object.values(p.stars).reduce((a, b) => a + b, 0)
const feitas = (p: Progresso, ids: string[]) => ids.filter((id) => (p.stars[id] ?? 0) > 0).length
// ids das fases de uma trilha; parte filtra so barra ou so centro (fase sem parte conta como barra)
const ids = (t: keyof typeof TRILHAS, parte?: 'barra' | 'centro') =>
  TRILHAS[t].lista.filter((f) => !parte || (f.parte ?? 'barra') === parte).map((f) => f.id)
const perfeitas = (p: Progresso) => Object.values(p.stars).filter((n) => n === 3).length
const maximo = () => Object.values(TRILHAS).reduce((n, t) => n + t.lista.length * 3, 0)

/*******************************************************************************
 * CONQUISTAS
 * funcao: as 11 conquistas do jogo, na ordem em que aparecem na janela de
 * conquistas.
 ******************************************************************************/
export const CONQUISTAS: Conquista[] = [
  { id: 'primeira', titulo: 'Primeira estrela', texto: 'Ganhe sua primeira estrela.', meta: (p) => [Math.min(1, total(p)), 1] },
  { id: 'barra', titulo: 'Aluna da barra', texto: 'Complete todas as fases da barra no modo Aula.', meta: (p) => [feitas(p, ids('aula', 'barra')), ids('aula', 'barra').length] },
  { id: 'centro', titulo: 'No meio da sala', texto: 'Complete as fases do centro no modo Aula.', meta: (p) => [feitas(p, ids('aula', 'centro')), ids('aula', 'centro').length] },
  { id: 'perfeita', titulo: 'Caprichosa', texto: 'Tire 3 estrelas em 10 fases (de qualquer modo).', meta: (p) => [Math.min(10, perfeitas(p)), 10] },
  { id: 'desafios', titulo: 'Desafiante', texto: 'Cumpra 3 desafios.', meta: (p) => [Math.min(3, feitas(p, ids('desafios'))), 3] },
  { id: 'conserta', titulo: 'Detetive dos passos', texto: 'Conserte todas as combinações.', meta: (p) => [feitas(p, ids('conserta')), ids('conserta').length] },
  { id: 'ditado', titulo: 'Ouvido de bailarina', texto: 'Monte todos os ditados da professora.', meta: (p) => [feitas(p, ids('ditado')), ids('ditado').length] },
  { id: 'allegro', titulo: 'Voa, bailarina!', texto: 'Complete o Grand allegro.', meta: (p) => [feitas(p, ids('allegro')), ids('allegro').length] },
  { id: 'coreografa', titulo: 'Coreógrafa', texto: 'Salve uma coreografia sua no Estúdio.', meta: (p) => [Math.min(1, p.salvas), 1] },
  {
    id: 'ponta',
    titulo: 'Sapatilhas de ponta',
    texto: `Junte ${ESTRELAS_PONTA} estrelas somando todos os modos.`,
    premio: 'libera a sapatilha de ponta no camarim',
    meta: (p) => [Math.min(ESTRELAS_PONTA, total(p)), ESTRELAS_PONTA],
  },
  { id: 'companhia', titulo: 'Primeira bailarina', texto: 'Ganhe todas as estrelas do jogo.', meta: (p) => [total(p), maximo()] },
]

/*******************************************************************************
 * conseguiu
 * funcao: diz se a conquista ja foi alcancada.
 * recebe: c (Conquista) e p (Progresso).
 * retorna: true quando o que ja tem chega no que precisa.
 ******************************************************************************/
export const conseguiu = (c: Conquista, p: Progresso) => {
  const [a, b] = c.meta(p)
  return a >= b
}

/*******************************************************************************
 * contarSalvas
 * funcao: conta as coreografias salvas no estudio, lendo direto do
 * localStorage.
 * recebe: nada.
 * retorna: o numero de coreografias. nunca lanca erro: se o localStorage falhar
 * ou estiver estragado, devolve 0.
 ******************************************************************************/
export function contarSalvas(): number {
  try {
    const v = JSON.parse(localStorage.getItem('balletcode.coreografias.v1') ?? '[]')
    return Array.isArray(v) ? v.length : 0
  } catch {
    return 0
  }
}
