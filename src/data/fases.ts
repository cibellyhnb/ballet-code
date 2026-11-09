/*******************************************************************************
 * fases.ts
 * funcao principal: as fases do modo aula, na ordem de uma aula RAD (barra e
 * depois centro). cada fase tem um objetivo dito como numa aula, a combinacao
 * esperada, os blocos da gaveta e o limite de blocos para a 3a estrela. tambem
 * conta blocos e procura um tipo de bloco num programa, contas usadas na
 * conferencia.
 ******************************************************************************/
import { EN_CROIX, POSICOES_PLIE, type Instr, type Program } from '../engine/program'

/*******************************************************************************
 * Fase
 * funcao: uma fase de qualquer trilha. alvo e o programa da professora (o
 * exemplo); a jogadora acerta quando a danca dela fica igual a dele. os campos
 * opcionais valem so para alguns modos.
 ******************************************************************************/
export type Fase = {
  id: string
  titulo: string
  parte?: 'barra' | 'centro'
  conceito: string
  objetivo: string
  dica: string
  alvo: Program
  maxBlocos: number
  precisa?: Instr['t'] // conceito que precisa aparecer para a 2a estrela
  gaveta: string[] // tipos de bloco disponiveis
  proibido?: Instr['t'][] // desafios: blocos que nao podem ser usados
  inicial?: Program // conserta: o programa ja vem montado (com um erro)
  ditado?: string[] // professora dita: as falas, uma por vez
  rigido?: boolean // desafios: so ganha estrela se cumprir a meta de blocos
}

// D e E: perna direita e esquerda, como aparece nos textos das fases
const D = 'R' as const
const E = 'L' as const
// toda combinacao de barra comeca com a preparacao do braco e termina com o finalizar
const prep: Instr = { t: 'preparacao', perna: D }
const fim: Instr = { t: 'finalizar', perna: D }

/*******************************************************************************
 * FASES
 * funcao: as fases do modo aula, em ordem. a posicao na lista decide o
 * desbloqueio (cada uma abre quando a anterior ganha estrela).
 ******************************************************************************/
export const FASES: Fase[] = [
  {
    id: 'seq',
    titulo: 'Primeiros pliés',
    conceito: 'sequência',
    objetivo: 'Faça a preparação do braço, dois demi-pliés e finalize.',
    dica: 'Os blocos rodam de cima para baixo, na ordem em que estão encaixados.',
    alvo: { funcoes: [], principal: [prep, { t: 'demiPlie' }, { t: 'demiPlie' }, fim] },
    maxBlocos: 4,
    gaveta: ['bc_prep', 'bc_plie', 'bc_final'],
  },
  {
    id: 'rep',
    titulo: 'Pliés com laço',
    conceito: 'laço repetir',
    objetivo: 'Agora são quatro demi-pliés, entre a preparação e o finalizar.',
    dica: 'Em vez de empilhar quatro pliés, coloque um só dentro de um "repetir".',
    alvo: { funcoes: [], principal: [prep, { t: 'repetir', vezes: 4, corpo: [{ t: 'demiPlie' }] }, fim] },
    maxBlocos: 4,
    precisa: 'repetir',
    gaveta: ['bc_prep', 'bc_plie', 'bc_final', 'bc_repetir'],
  },
  {
    id: 'pliesPos',
    titulo: 'Pliés nas posições',
    conceito: 'laço por posição',
    objetivo: 'Em cada posição (1ª, 2ª, 4ª e 5ª): mude os pés, um demi-plié e um grand plié , entre a preparação e o finalizar.',
    dica: 'O "para cada posição" troca a posição sozinho. Dentro dele, escolha (posição) no bloco "pés em".',
    alvo: {
      funcoes: [],
      principal: [
        prep,
        {
          t: 'paraCada',
          nome: 'posição',
          lista: POSICOES_PLIE,
          corpo: [{ t: 'pes', pos: { var: 'posição' } }, { t: 'demiPlie' }, { t: 'grandPlie' }],
        },
        fim,
      ],
    },
    maxBlocos: 6,
    precisa: 'paraCada',
    gaveta: ['bc_prep', 'bc_final', 'bc_pes', 'bc_plie', 'bc_grandplie', 'bc_repetir', 'bc_cadapos'],
  },
  {
    id: 'tendu',
    titulo: 'Tendus devant',
    conceito: 'laço repetir',
    objetivo: 'Quatro battements tendus devant com a perna direita (a de fora da barra) , entre a preparação e o finalizar.',
    dica: 'A perna de trabalho é sempre a mais longe da barra.',
    alvo: { funcoes: [], principal: [prep, { t: 'repetir', vezes: 4, corpo: [{ t: 'tendu', perna: D, dir: 'devant' }] }, fim] },
    maxBlocos: 4,
    precisa: 'repetir',
    gaveta: ['bc_prep', 'bc_final', 'bc_tendu', 'bc_plie', 'bc_repetir'],
  },
  {
    id: 'croix',
    titulo: 'Tendus en croix',
    conceito: 'laço para cada',
    objetivo: 'Um tendu em cada direção: devant, à la seconde, derrière, à la seconde , entre a preparação e o finalizar.',
    dica: 'O "para cada direção" troca a direção sozinho. Dentro dele, escolha (direção) no tendu.',
    alvo: {
      funcoes: [],
      principal: [prep, { t: 'paraCada', nome: 'direção', lista: EN_CROIX, corpo: [{ t: 'tendu', perna: D, dir: { var: 'direção' } }] }, fim],
    },
    maxBlocos: 4,
    precisa: 'paraCada',
    gaveta: ['bc_prep', 'bc_final', 'bc_tendu', 'bc_repetir', 'bc_cada'],
  },
  {
    id: 'glisse',
    titulo: 'Glissés en croix',
    conceito: 'laço dentro de laço',
    objetivo: 'Glissés en croix, duas vezes seguidas , entre a preparação e o finalizar.',
    dica: 'Um laço pode ficar dentro de outro: repetir 2 vezes o "para cada direção".',
    alvo: {
      funcoes: [],
      principal: [
        prep,
        {
          t: 'repetir',
          vezes: 2,
          corpo: [{ t: 'paraCada', nome: 'direção', lista: EN_CROIX, corpo: [{ t: 'glisse', perna: D, dir: { var: 'direção' } }] }],
        },
        fim,
      ],
    },
    maxBlocos: 5,
    precisa: 'paraCada',
    gaveta: ['bc_prep', 'bc_final', 'bc_tendu', 'bc_glisse', 'bc_repetir', 'bc_cada'],
  },
  {
    id: 'quinta',
    titulo: 'Na 5ª posição',
    conceito: 'estado',
    objetivo: 'Pés em 5ª e pausa de 2 tempos. Depois: preparação, tendus en croix e finalizar. No fim, pés em 1ª com pausa de 2.',
    dica: 'Na 5ª, o jogo lembra qual pé está na frente. O en croix sai certinho porque o à la seconde troca o pé.',
    alvo: {
      funcoes: [],
      principal: [
        { t: 'pes', pos: '5' },
        { t: 'pausa', tempos: 2 },
        prep,
        { t: 'paraCada', nome: 'direção', lista: EN_CROIX, corpo: [{ t: 'tendu', perna: D, dir: { var: 'direção' } }] },
        fim,
        { t: 'pes', pos: '1' },
        { t: 'pausa', tempos: 2 },
      ],
    },
    maxBlocos: 8,
    precisa: 'paraCada',
    gaveta: ['bc_pes', 'bc_pausa', 'bc_prep', 'bc_final', 'bc_tendu', 'bc_cada'],
  },
  {
    id: 'rond',
    titulo: 'Ronds de jambe',
    conceito: 'dois laços',
    objetivo: 'Dois ronds de jambe à terre en dehors e depois dois en dedans , entre a preparação e o finalizar.',
    dica: 'En dehors vai da frente para trás; en dedans, de trás para a frente.',
    alvo: {
      funcoes: [],
      principal: [
        prep,
        { t: 'repetir', vezes: 2, corpo: [{ t: 'rond', perna: D, sentido: 'endehors' }] },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'rond', perna: D, sentido: 'endedans' }] },
        fim,
      ],
    },
    maxBlocos: 6,
    precisa: 'repetir',
    gaveta: ['bc_prep', 'bc_final', 'bc_rond', 'bc_repetir'],
  },
  {
    id: 'frappe',
    titulo: 'Frappés en croix',
    conceito: 'estado da perna',
    objetivo: 'Preparação, frappés en croix, depois feche a perna, faça uma pausa de 1 tempo e finalize.',
    dica: 'O primeiro frappé leva 1 tempo a mais para o pé ir ao cou-de-pied. Depois, a perna fica no ar até você fechar.',
    alvo: {
      funcoes: [],
      principal: [
        prep,
        { t: 'paraCada', nome: 'direção', lista: EN_CROIX, corpo: [{ t: 'frappe', perna: D, dir: { var: 'direção' } }] },
        { t: 'fechar' },
        { t: 'pausa', tempos: 1 },
        fim,
      ],
    },
    maxBlocos: 6,
    precisa: 'paraCada',
    gaveta: ['bc_prep', 'bc_final', 'bc_frappe', 'bc_fondu', 'bc_fechar', 'bc_pausa', 'bc_cada', 'bc_repetir'],
  },
  {
    id: 'releve',
    titulo: 'Relevés e port de bras',
    conceito: 'sequência no laço',
    objetivo: 'Duas vezes: braço em 5ª, relevé, braço em 2ª , entre a preparação e o finalizar.',
    dica: 'A ordem dentro do laço também importa.',
    alvo: {
      funcoes: [],
      principal: [
        prep,
        {
          t: 'repetir',
          vezes: 2,
          corpo: [{ t: 'bracos', perna: D, pos: 'quinta' }, { t: 'releve' }, { t: 'bracos', perna: D, pos: 'segunda' }],
        },
        fim,
      ],
    },
    maxBlocos: 6,
    precisa: 'repetir',
    gaveta: ['bc_prep', 'bc_final', 'bc_braco', 'bc_releve', 'bc_plie', 'bc_repetir'],
  },
  {
    id: 'grand',
    titulo: 'Grands battements',
    conceito: 'laço para cada',
    objetivo: 'Grands battements en croix, bem altos , entre a preparação e o finalizar.',
    dica: 'Cuidado para não confundir com o jeté: o grand battement vai bem mais alto.',
    alvo: {
      funcoes: [],
      principal: [prep, { t: 'paraCada', nome: 'direção', lista: EN_CROIX, corpo: [{ t: 'grandBattement', perna: D, dir: { var: 'direção' } }] }, fim],
    },
    maxBlocos: 4,
    precisa: 'paraCada',
    gaveta: ['bc_prep', 'bc_final', 'bc_jete', 'bc_grandbattement', 'bc_tendu', 'bc_cada', 'bc_repetir'],
  },
  {
    id: 'lados',
    titulo: 'Os dois lados',
    conceito: 'função',
    objetivo:
      'Crie a função "combinação" com: demi-plié, tendus en croix com (perna) e outro demi-plié. Preparação e a combinação com a direita; vire; preparação e a combinação com a esquerda; finalize.',
    dica: 'Depois de virar, a preparação e o finalizar são com o braço esquerdo.',
    alvo: {
      funcoes: [
        {
          nome: 'combinação',
          params: ['perna'],
          corpo: [
            { t: 'demiPlie' },
            { t: 'paraCada', nome: 'direção', lista: EN_CROIX, corpo: [{ t: 'tendu', perna: { var: 'perna' }, dir: { var: 'direção' } }] },
            { t: 'demiPlie' },
          ],
        },
      ],
      principal: [
        prep,
        { t: 'chamar', fn: 'combinação', args: { perna: D } },
        { t: 'virar' },
        { t: 'preparacao', perna: E },
        { t: 'chamar', fn: 'combinação', args: { perna: E } },
        { t: 'finalizar', perna: E },
      ],
    },
    maxBlocos: 11,
    precisa: 'chamar',
    gaveta: ['bc_prep', 'bc_final', 'bc_plie', 'bc_tendu', 'bc_cada', 'bc_def', 'bc_chamar', 'bc_virar'],
  },
  {
    id: 'cloche',
    titulo: 'En cloche',
    conceito: 'laço repetir',
    objetivo: 'Preparação, três battements en cloche com a direita (a perna balança como um sino), feche a perna e finalize.',
    dica: 'Cada cloche passa pela 1ª e vai do devant ao derrière (ou volta). O "repetir" conta por você.',
    alvo: { funcoes: [], principal: [{ t: 'preparacao', perna: D }, { t: 'repetir', vezes: 3, corpo: [{ t: 'cloche', perna: D }] }, { t: 'fechar' }, { t: 'finalizar', perna: D }] },
    maxBlocos: 5,
    precisa: 'repetir',
    gaveta: ['bc_prep', 'bc_final', 'bc_cloche', 'bc_fechar', 'bc_repetir', 'bc_pausa'],
  },
  {
    id: 'cheval',
    titulo: 'Pas de cheval',
    conceito: 'laço repetir',
    objetivo: 'Preparação, cinco pas de cheval com a direita, feche a perna, uma pausa de 3 tempos e finalize.',
    dica: 'O pas de cheval é o "passo do cavalinho": o pé desenrola do cou-de-pied e pousa a ponta no chão.',
    alvo: {
      funcoes: [],
      principal: [
        { t: 'preparacao', perna: D },
        { t: 'repetir', vezes: 5, corpo: [{ t: 'pasDeCheval', perna: D }] },
        { t: 'fechar' },
        { t: 'pausa', tempos: 3 },
        { t: 'finalizar', perna: D },
      ],
    },
    maxBlocos: 6,
    precisa: 'repetir',
    gaveta: ['bc_prep', 'bc_final', 'bc_cheval', 'bc_fechar', 'bc_repetir', 'bc_pausa'],
  },
  {
    id: 'piruetas',
    titulo: 'Piruetas na barra',
    conceito: 'opções do bloco',
    objetivo: 'Preparação, pés em 5ª, uma pirueta en dehors e uma pirueta en dedans com a direita, e finalize.',
    dica: 'O mesmo bloco de pirueta tem as opções en dehors e en dedans: só trocar o sentido.',
    alvo: {
      funcoes: [],
      principal: [
        { t: 'preparacao', perna: D },
        { t: 'pes', pos: '5' },
        { t: 'pirueta', perna: D, sentido: 'endehors' },
        { t: 'pirueta', perna: D, sentido: 'endedans' },
        { t: 'finalizar', perna: D },
      ],
    },
    maxBlocos: 5,
    gaveta: ['bc_prep', 'bc_final', 'bc_pes', 'bc_pirueta', 'bc_fechar', 'bc_pausa'],
  },
  {
    id: 'penche',
    titulo: 'Arabesque penchée',
    conceito: 'um passo de adage',
    objetivo: 'Preparação, uma arabesque penchée com a direita e finalize.',
    dica: 'A penchée é um passo longo (8 tempos): tendu derrière, arabesque, o corpo desce, segura e volta.',
    alvo: { funcoes: [], principal: [{ t: 'preparacao', perna: D }, { t: 'penche', perna: D }, { t: 'finalizar', perna: D }] },
    maxBlocos: 3,
    gaveta: ['bc_prep', 'bc_final', 'bc_arabesque', 'bc_penche', 'bc_developpe', 'bc_pausa'],
  },
  {
    id: 'cDirecoes',
    parte: 'centro',
    titulo: 'No centro',
    conceito: 'sequência',
    objetivo: 'Vá para o centro, pés em 5ª, e mostre o corpo croisé, depois effacé e por fim en face. Termine com uma pausa de 4 tempos.',
    dica: 'No centro não tem barra: o bloco "ir para o centro" leva a bailarina para o meio da sala.',
    alvo: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        { t: 'direcao', dir: 'croise' },
        { t: 'direcao', dir: 'efface' },
        { t: 'direcao', dir: 'enface' },
        { t: 'pausa', tempos: 4 },
      ],
    },
    maxBlocos: 6,
    gaveta: ['bc_centro', 'bc_pes', 'bc_direcao', 'bc_pausa', 'bc_barra'],
  },
  {
    id: 'cFouette',
    parte: 'centro',
    titulo: 'Fouetté de adage',
    conceito: 'sequência',
    objetivo: 'No centro, pés em 5ª, preparação, um fouetté de adage com a perna direita, corpo en face e finalize. Termine com uma pausa de 8 tempos.',
    dica: 'No fouetté, o corpo vira e a perna que estava à la seconde termina atrás, em arabesque.',
    alvo: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        prep,
        { t: 'fouette', perna: D },
        { t: 'direcao', dir: 'enface' },
        fim,
        { t: 'pausa', tempos: 8 },
      ],
    },
    maxBlocos: 7,
    gaveta: ['bc_centro', 'bc_pes', 'bc_prep', 'bc_final', 'bc_fouette', 'bc_developpe', 'bc_arabesque', 'bc_direcao', 'bc_pausa'],
  },
  {
    id: 'cAllegro',
    parte: 'centro',
    titulo: 'Petit allegro',
    conceito: 'laço repetir',
    objetivo: 'No centro, pés em 5ª: quatro changements, depois dois échappés sautés e uma pausa de 2 tempos.',
    dica: 'Dois laços "repetir" deixam o programa bem curtinho.',
    alvo: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        { t: 'repetir', vezes: 4, corpo: [{ t: 'changement' }] },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'echappe' }] },
        { t: 'pausa', tempos: 2 },
      ],
    },
    maxBlocos: 7,
    precisa: 'repetir',
    gaveta: ['bc_centro', 'bc_pes', 'bc_saute', 'bc_changement', 'bc_echappe', 'bc_repetir', 'bc_pausa'],
  },
]

/*******************************************************************************
 * contarBlocos
 * funcao: conta os blocos de um programa, incluindo os de dentro dos lacos e
 * das funcoes (cada definicao de funcao conta como um bloco).
 * recebe: p (Program).
 * retorna: o numero de blocos.
 ******************************************************************************/
export function contarBlocos(p: Program): number {
  const c = (l: Instr[]): number => l.reduce((n, i) => n + 1 + (i.t === 'repetir' || i.t === 'paraCada' ? c(i.corpo) : 0), 0)
  return c(p.principal) + p.funcoes.reduce((n, f) => n + 1 + c(f.corpo), 0)
}

/*******************************************************************************
 * usa
 * funcao: diz se um tipo de bloco aparece no programa, em qualquer nivel
 * (dentro de lacos ou de funcoes).
 * recebe: p (Program) e t (o tipo de instrucao, ex: 'repetir').
 * retorna: true se aparecer pelo menos uma vez.
 ******************************************************************************/
export function usa(p: Program, t: Instr['t']): boolean {
  const has = (l: Instr[]): boolean => l.some((i) => i.t === t || ((i.t === 'repetir' || i.t === 'paraCada') && has(i.corpo)))
  return has(p.principal) || p.funcoes.some((f) => has(f.corpo))
}
