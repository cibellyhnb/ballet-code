/*******************************************************************************
 * presets.ts
 * funcao principal: os modelos do estudio (combinacoes prontas, cada uma
 * ensinando um conceito de programacao) e a escrita de um programa como texto,
 * no formato da aba "codigo" e dos arquivos de coreografia.
 ******************************************************************************/
import type { Instr, Program, Val } from './program'
import { BRACOS_LABEL, PIQUE_LABEL, DIRCORPO_LABEL, DIR_LABEL, EN_CROIX, POSICOES_PLIE, SENTIDO_LABEL, type Dir, type PosPes } from './program'
import { ARM_LABEL, type Side } from './state'

const D: Side = 'R'
const E: Side = 'L'

/*******************************************************************************
 * Preset
 * funcao: um modelo do estudio: nome, o conceito que ensina (aparece no
 * cartao), a explicacao (aparece ao parar o mouse) e o programa.
 ******************************************************************************/
export type Preset = { id: string; nome: string; conceito: string; ensina: string; programa: Program }

/*******************************************************************************
 * PRESETS
 * funcao: os modelos, na ordem dos cartoes do estudio. o primeiro tambem e o
 * programa inicial de quem abre o estudio pela primeira vez.
 ******************************************************************************/
export const PRESETS: Preset[] = [
  {
    id: 'croix',
    nome: 'Tendus en croix',
    conceito: 'laço · para cada',
    ensina: 'Laço "para cada": a mesma instrução repete em cada direção.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'preparacao', perna: D },
        {
          t: 'paraCada',
          nome: 'direção',
          lista: EN_CROIX,
          corpo: [{ t: 'repetir', vezes: 2, corpo: [{ t: 'tendu', perna: D, dir: { var: 'direção' } }] }],
        },
        { t: 'finalizar', perna: D },
      ],
    },
  },
  {
    id: 'plies',
    nome: 'Demi-pliés',
    conceito: 'laço · repetir',
    ensina: 'Laço "repetir": o mesmo passo várias vezes.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'preparacao', perna: D },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'demiPlie' }] },
        { t: 'finalizar', perna: D },
      ],
    },
  },
  {
    id: 'glisses',
    nome: 'Glissés da 5ª',
    conceito: 'estado · 5ª posição',
    ensina: 'Na 5ª, o pé que fecha na frente ou atrás muda o próximo passo: o programa precisa lembrar disso.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'pes', pos: '5' },
        { t: 'pausa', tempos: 2 },
        { t: 'preparacao', perna: D },
        {
          t: 'paraCada',
          nome: 'direção',
          lista: EN_CROIX,
          corpo: [{ t: 'glisse', perna: D, dir: { var: 'direção' } }],
        },
        { t: 'finalizar', perna: D },
        { t: 'pes', pos: '1' },
        { t: 'pausa', tempos: 2 },
      ],
    },
  },
  {
    id: 'ronds',
    nome: 'Ronds de jambe',
    conceito: 'dois laços',
    ensina: 'Dois laços seguidos: ronds en dehors e depois en dedans.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'preparacao', perna: D },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'rond', perna: D, sentido: 'endehors' }] },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'rond', perna: D, sentido: 'endedans' }] },
        { t: 'finalizar', perna: D },
      ],
    },
  },
  {
    id: 'pliesRad',
    nome: 'Pliés nas posições',
    conceito: 'laço por posição',
    ensina: 'Um laço que passa pela 1ª, 2ª, 4ª e 5ª: em cada posição, dois demi-pliés e um grand plié.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'preparacao', perna: D },
        {
          t: 'paraCada',
          nome: 'posição',
          lista: POSICOES_PLIE,
          corpo: [
            { t: 'pes', pos: { var: 'posição' } },
            { t: 'pausa', tempos: 2 },
            { t: 'demiPlie' },
            { t: 'demiPlie' },
            { t: 'grandPlie' },
          ],
        },
        { t: 'finalizar', perna: D },
      ],
    },
  },
  {
    id: 'fondus',
    nome: 'Fondus e frappés',
    conceito: 'estado da perna',
    ensina: 'O jogo lembra onde está o pé: depois do fondu, o frappé já sabe que precisa ir ao cou-de-pied.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'preparacao', perna: D },
        { t: 'paraCada', nome: 'direção', lista: EN_CROIX, corpo: [{ t: 'fondu', perna: D, dir: { var: 'direção' } }] },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'paraCada', nome: 'direção', lista: EN_CROIX, corpo: [{ t: 'frappe', perna: D, dir: { var: 'direção' } }] }] },
        { t: 'fechar' },
        { t: 'pausa', tempos: 5 },
        { t: 'finalizar', perna: D },
      ],
    },
  },
  {
    id: 'grands',
    nome: 'Grands battements',
    conceito: 'laço para cada',
    ensina: 'Grands battements en croix, com pas de cheval e cloche para aquecer.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'preparacao', perna: D },
        { t: 'paraCada', nome: 'direção', lista: EN_CROIX, corpo: [{ t: 'grandBattement', perna: D, dir: { var: 'direção' } }] },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'cloche', perna: D }] },
        { t: 'fechar' },
        { t: 'pausa', tempos: 2 },
        { t: 'finalizar', perna: D },
      ],
    },
  },
  {
    id: 'adage',
    nome: 'Adage',
    conceito: 'sequência lenta',
    ensina: 'Développés devant e à la seconde, arabesque, cambré e pirueta para terminar.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'pes', pos: '5' },
        { t: 'preparacao', perna: D },
        { t: 'pausa', tempos: 2 },
        { t: 'developpe', perna: D, dir: 'devant' },
        { t: 'developpe', perna: D, dir: 'seconde' },
        { t: 'arabesque', perna: D },
        { t: 'attitude', perna: D, dir: 'derriere' },
        { t: 'cambre', dir: 'devant' },
        { t: 'cambre', dir: 'derriere' },
        { t: 'pirueta', perna: D },
        { t: 'pausa', tempos: 1 },
        { t: 'finalizar', perna: D },
        { t: 'pes', pos: '1' },
        { t: 'pausa', tempos: 6 },
      ],
    },
  },
  {
    id: 'bracos',
    nome: 'Port de bras sem a barra',
    conceito: 'estado da barra',
    ensina: 'Solte a barra para usar os dois braços nas 5 posições, e segure de novo no fim.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'soltar' },
        { t: 'bracosAmbos', pos: 'primeira' },
        { t: 'bracosAmbos', pos: 'segunda' },
        { t: 'bracosAmbos', pos: 'terceira' },
        { t: 'bracosAmbos', pos: 'quarta' },
        { t: 'bracosAmbos', pos: 'quinta' },
        { t: 'releve' },
        { t: 'bracosAmbos', pos: 'segunda' },
        { t: 'bracosAmbos', pos: 'brasBas' },
        { t: 'segurar' },
        { t: 'pausa', tempos: 2 },
      ],
    },
  },
  {
    id: 'centroDirecoes',
    nome: 'Centro: direções do corpo',
    conceito: 'centro · épaulement',
    ensina: 'No centro, o corpo pode ficar en face, croisé ou effacé. A cabeça faz o épaulement sozinha.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        { t: 'pausa', tempos: 2 },
        { t: 'preparacao', perna: D },
        { t: 'direcao', dir: 'croise' },
        { t: 'tendu', perna: D, dir: 'devant' },
        { t: 'tendu', perna: D, dir: 'devant' },
        { t: 'direcao', dir: 'efface' },
        { t: 'tendu', perna: D, dir: 'devant' },
        { t: 'tendu', perna: D, dir: 'devant' },
        { t: 'direcao', dir: 'enface' },
        { t: 'bracosAmbos', pos: 'quinta' },
        { t: 'bracosAmbos', pos: 'segunda' },
        { t: 'finalizar', perna: D },
        { t: 'pausa', tempos: 2 },
        { t: 'reverence' },
      ],
    },
  },
  {
    id: 'centroFouette',
    nome: 'Centro: adage com fouetté',
    conceito: 'centro · adage',
    ensina: 'Développé devant, depois o fouetté de adage: développé à la seconde e o corpo vira, deixando a perna em arabesque.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        { t: 'preparacao', perna: D },
        { t: 'pausa', tempos: 2 },
        { t: 'direcao', dir: 'croise' },
        { t: 'developpe', perna: D, dir: 'devant' },
        { t: 'direcao', dir: 'enface' },
        { t: 'pes', pos: '5' },
        { t: 'fouette', perna: D },
        { t: 'direcao', dir: 'enface' },
        { t: 'pausa', tempos: 8 },
        { t: 'finalizar', perna: D },
        { t: 'reverence' },
      ],
    },
  },
  {
    id: 'centroArabesques',
    nome: 'Centro: arabesques e piruetas',
    conceito: 'centro · arabesques',
    ensina: 'A 1ª, 2ª e 3ª arabesque mudam os braços. Depois, piruetas en dehors e en dedans.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        { t: 'preparacao', perna: D },
        { t: 'direcao', dir: 'efface' },
        { t: 'arabesque', perna: E, tipo: '1' },
        { t: 'arabesque', perna: E, tipo: '2' },
        { t: 'arabesque', perna: E, tipo: '3' },
        { t: 'direcao', dir: 'enface' },
        { t: 'pirueta', perna: D, sentido: 'endehors' },
        { t: 'pausa', tempos: 1 },
        { t: 'pirueta', perna: E, sentido: 'endedans' },
        { t: 'pausa', tempos: 3 },
        { t: 'finalizar', perna: D },
      ],
    },
  },
  {
    id: 'allegro',
    nome: 'Centro: petit allegro',
    conceito: 'centro · saltos',
    ensina: 'Sautés na 1ª, changements e échappés: o laço "repetir" deixa o programa curtinho.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pausa', tempos: 2 },
        { t: 'repetir', vezes: 4, corpo: [{ t: 'saute' }] },
        { t: 'pes', pos: '5' },
        { t: 'repetir', vezes: 4, corpo: [{ t: 'changement' }] },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'echappe' }] },
        { t: 'pausa', tempos: 4 },
        { t: 'reverence' },
      ],
    },
  },
  {
    id: 'deslocamentos',
    nome: 'Centro: glissades e pas de bourrée',
    conceito: 'centro · deslocamento · função',
    ensina: 'Passos que viajam! A glissade vai para o lado da perna escolhida e o pas de bourrée volta um pouquinho. O changement troca o pé da frente para o outro lado.',
    programa: {
      funcoes: [
        {
          nome: 'viajar',
          params: ['perna'],
          corpo: [
            { t: 'glissade', perna: { var: 'perna' } },
            { t: 'glissade', perna: { var: 'perna' } },
            { t: 'pasDeBourree', perna: { var: 'perna' } },
            { t: 'changement' },
          ],
        },
      ],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        { t: 'chamar', fn: 'viajar', args: { perna: 'R' } },
        { t: 'chamar', fn: 'viajar', args: { perna: 'L' } },
        { t: 'pausa', tempos: 2 },
      ],
    },
  },
  {
    id: 'balances',
    nome: 'Centro: balancés de valsa',
    conceito: 'centro · valsa · repetir',
    ensina: 'O balancé balança de um lado para o outro, como uma valsa. Dois blocos dentro do repetir: direita, esquerda, direita, esquerda…',
    programa: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        { t: 'bracosAmbos', pos: 'segunda' },
        { t: 'repetir', vezes: 4, corpo: [{ t: 'balance', perna: 'R' }, { t: 'balance', perna: 'L' }] },
        { t: 'pausa', tempos: 4 },
        { t: 'reverence' },
      ],
    },
  },
  {
    id: 'grandAllegro',
    nome: 'Centro: grand allegro',
    conceito: 'centro · grandes saltos',
    ensina: 'Glissade, grand jeté e assemblé: a sequência clássica do grand allegro, com os dois lados.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        { t: 'pausa', tempos: 2 },
        { t: 'glissade', perna: 'L' },
        { t: 'grandJete', perna: 'R' },
        { t: 'assemble', perna: 'L' },
        { t: 'glissade', perna: 'R' },
        { t: 'grandJete', perna: 'L' },
        { t: 'assemble', perna: 'R' },
        { t: 'pausa', tempos: 4 },
        { t: 'reverence' },
      ],
    },
  },
  {
    id: 'giros',
    nome: 'Centro: giros',
    conceito: 'centro · giros · repetir',
    ensina: 'Piqués que viajam, soutenus e fouettés en tournant. O "repetir" é perfeito para os fouettés!',
    programa: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        { t: 'pausa', tempos: 2 },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'pique', perna: 'R', forma: 'giro' }] },
        { t: 'soutenu', perna: 'R' },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'pique', perna: 'L', forma: 'giro' }] },
        { t: 'soutenu', perna: 'L' },
        { t: 'repetir', vezes: 4, corpo: [{ t: 'fouetteGiro', perna: 'R' }] },
        { t: 'fechar' },
        { t: 'pausa', tempos: 2 },
      ],
    },
  },
  {
    id: 'tombes',
    nome: 'Centro: tombé, chassé e penché',
    conceito: 'centro · ligações',
    ensina: 'Passos de ligação que viajam (tombé, pas de bourrée, chassé) e uma arabesque penchée para terminar.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        { t: 'pausa', tempos: 2 },
        { t: 'tombe', perna: 'R', dir: 'devant' },
        { t: 'pasDeBourree', perna: 'R' },
        { t: 'chasse', perna: 'R', dir: 'devant' },
        { t: 'penche', perna: 'L' },
        { t: 'pausa', tempos: 2 },
      ],
    },
  },
  {
    id: 'releves',
    nome: 'Relevés com port de bras',
    conceito: 'sequência',
    ensina: 'Sequência: a ordem dos blocos é a ordem dos movimentos. Braço em 5ª, sobe, desce, braço em 2ª.',
    programa: {
      funcoes: [],
      principal: [
        { t: 'preparacao', perna: D },
        {
          t: 'repetir',
          vezes: 2,
          corpo: [
            { t: 'bracos', perna: D, pos: 'quinta' },
            { t: 'releve' },
            { t: 'bracos', perna: D, pos: 'segunda' },
          ],
        },
        { t: 'finalizar', perna: D },
      ],
    },
  },
  {
    id: 'lados',
    nome: 'Combinação dos dois lados',
    conceito: 'função · parâmetro',
    ensina: 'Função com parâmetro: a mesma combinação com a perna direita e depois a esquerda.',
    programa: {
      funcoes: [
        {
          nome: 'combinação',
          params: ['perna'],
          corpo: [
            { t: 'demiPlie' },
            {
              t: 'paraCada',
              nome: 'direção',
              lista: EN_CROIX,
              corpo: [{ t: 'tendu', perna: { var: 'perna' }, dir: { var: 'direção' } }],
            },
            { t: 'demiPlie' },
          ],
        },
      ],
      principal: [
        { t: 'preparacao', perna: D },
        { t: 'chamar', fn: 'combinação', args: { perna: D } },
        { t: 'virar' },
        { t: 'preparacao', perna: E },
        { t: 'chamar', fn: 'combinação', args: { perna: E } },
        { t: 'finalizar', perna: E },
      ],
    },
  },
]


// texto: o mesmo programa escrito como codigo. perna e variavel aparecem pelo nome em portugues
const side = (s: Side) => (s === 'R' ? 'direita' : 'esquerda')
const v = <T extends string>(x: Val<T>, f: (t: T) => string) => (typeof x === 'object' ? x.var : f(x))

/*******************************************************************************
 * NOME
 * funcao: como cada passo e escrito no texto quando o nome dele e uma palavra
 * so (com acentos, em camelCase).
 ******************************************************************************/
const NOME: Partial<Record<Instr['t'], string>> = {
  tendu: 'tendu',
  glisse: 'glissé',
  jete: 'jeté',
  grandBattement: 'grandBattement',
  fondu: 'fondu',
  frappe: 'frappé',
  developpe: 'développé',
  cloche: 'enCloche',
  coupe: 'coupé',
  pasDeCheval: 'pasDeCheval',
  passe: 'passé',
  fouette: 'fouettéDeAdage',
  glissade: 'glissade',
  pasDeBourree: 'pasDeBourrée',
  balance: 'balancé',
  assemble: 'assemblé',
  sissonne: 'sissonne',
  grandJete: 'grandJeté',
  pasDeChat: 'pasDeChat',
  fouetteGiro: 'fouettéEnTournant',
  soutenu: 'soutenu',
  penche: 'penché',
}
// lista de um "para cada": direcoes pelo nome, posicoes como 1a, 2a...
const lista = (l: (Dir | PosPes)[]) => l.map((d) => (d in DIR_LABEL ? DIR_LABEL[d as Dir] : `${d}ª`)).join(', ')

/*******************************************************************************
 * instrLabel
 * funcao: escreve uma instrucao como uma linha de texto, ex: tendu com perna
 * direita e direcao devant. o parse.ts entende de volta tudo o que sai daqui.
 * recebe: i (Instr).
 * retorna: a linha, sem recuo.
 ******************************************************************************/
export function instrLabel(i: Instr): string {
  switch (i.t) {
    case 'preparacao':
      return `preparação(perna = ${v(i.perna, side)})`
    case 'finalizar':
      return `finalizar(perna = ${v(i.perna, side)})`
    case 'tendu':
    case 'glisse':
    case 'jete':
    case 'grandBattement':
    case 'fondu':
    case 'frappe':
    case 'developpe':
      return `${NOME[i.t]}(perna = ${v(i.perna, side)}, direção = ${v(i.dir, (d) => DIR_LABEL[d])})`
    case 'cloche':
    case 'coupe':
    case 'pasDeCheval':
    case 'passe':
    case 'fouette':
    case 'glissade':
    case 'pasDeBourree':
    case 'balance':
    case 'assemble':
    case 'sissonne':
    case 'grandJete':
    case 'pasDeChat':
    case 'fouetteGiro':
    case 'soutenu':
    case 'penche':
      return `${NOME[i.t]}(perna = ${v(i.perna, side)})`
    case 'pique':
      return `piqué(perna = ${v(i.perna, side)}, ${PIQUE_LABEL[i.forma]})`
    case 'tombe':
      return `tombé(perna = ${v(i.perna, side)}, direção = ${v(i.dir, (d) => DIR_LABEL[d])})`
    case 'chasse':
      return `chassé(perna = ${v(i.perna, side)}, ${DIR_LABEL[i.dir]})`
    case 'arabesque':
      return `arabesque(perna = ${v(i.perna, side)}${i.tipo ? `, ${i.tipo}ª` : ''})`
    case 'pirueta':
      return `pirueta(perna = ${v(i.perna, side)}, ${SENTIDO_LABEL[i.sentido ?? 'endehors']}${i.voltas === 2 ? ', dupla' : ''}${i.forma === 'attitude' ? ', attitude' : ''})`
    case 'local':
      return i.onde === 'centro' ? 'irParaOCentro()' : 'voltarParaABarra()'
    case 'direcao':
      return `direçãoDoCorpo(${DIRCORPO_LABEL[i.dir]})`
    case 'olharPonto':
      return `virarParaOPonto(${i.n})`
    case 'irPonto':
      return `irAtéOPonto(${i.n})`
    case 'saute':
      return 'sauté()'
    case 'changement':
      return 'changement()'
    case 'echappe':
      return 'échappéSauté()'
    case 'reverence':
      return 'révérence()'
    case 'attitude':
      return `attitude(perna = ${v(i.perna, side)}, ${DIR_LABEL[i.dir]})`
    case 'cambre':
      return `cambré(${DIR_LABEL[i.dir]})`
    case 'rond':
      return `rondDeJambe(perna = ${v(i.perna, side)}, ${SENTIDO_LABEL[i.sentido]})`
    case 'pes':
      return `pés(${v(i.pos, (p) => `${p}ª posição`)})`
    case 'demiPlie':
    case 'grandPlie':
    case 'releve': {
      const n = { demiPlie: 'demiPlié', grandPlie: 'grandPlié', releve: 'relevé' }[i.t]
      return i.pos === undefined ? `${n}()` : `${n}(${v(i.pos, (p) => `${p}ª posição`)})`
    }
    case 'fechar':
      return 'fechar()'
    case 'soltar':
      return 'soltarBarra()'
    case 'segurar':
      return 'segurarBarra()'
    case 'bracos':
      return `braço(${v(i.perna, side)}, ${ARM_LABEL[i.pos]})`
    case 'bracosAmbos':
      return `braços(${BRACOS_LABEL[i.pos]})`
    case 'virar':
      return 'virarParaOutroLado()'
    case 'pausa':
      return `pausa(${i.tempos} tempos)`
    case 'repetir':
      return `repetir ${i.vezes} vezes:`
    case 'paraCada':
      return `para cada ${i.nome} em [${lista(i.lista)}]:`
    case 'chamar':
      return `${i.fn}(${Object.entries(i.args)
        .map(([k, a]) => `${k} = ${a === 'R' || a === 'L' ? side(a) : DIR_LABEL[a as Dir]}`)
        .join(', ')})`
  }
}

/*******************************************************************************
 * toText
 * funcao: escreve o programa inteiro como texto: as funcoes primeiro e depois o
 * programa principal, com 4 espacos de recuo por nivel.
 * recebe: p (Program).
 * retorna: o texto.
 ******************************************************************************/
export function toText(p: Program): string {
  const lines: string[] = []

  /*****************************************************************************
   * walk
   * funcao: escreve uma lista de instrucoes, descendo nos lacos com um nivel a
   * mais de recuo.
   * recebe: list (Instr[]) e ind (nivel de recuo).
   * retorna: nada. as linhas vao para lines.
   ****************************************************************************/
  const walk = (list: Instr[], ind: number) => {
    for (const i of list) {
      lines.push('    '.repeat(ind) + instrLabel(i))
      if (i.t === 'repetir' || i.t === 'paraCada') walk(i.corpo, ind + 1)
    }
  }
  for (const f of p.funcoes) {
    lines.push(`função ${f.nome}(${f.params.join(', ')}):`)
    walk(f.corpo, 1)
    lines.push('')
  }
  walk(p.principal, 0)
  return lines.join('\n')
}
