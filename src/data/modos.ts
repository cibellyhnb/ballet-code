/*******************************************************************************
 * modos.ts
 * funcao principal: as fases dos modos desafios, conserta a combinacao,
 * professora dita e grand allegro. as fases de centro dos tres primeiros modos
 * ficam no fim do arquivo porque usam a gaveta do centro.
 ******************************************************************************/
import { EN_CROIX, POSICOES_PLIE, type Instr } from '../engine/program'
import type { Fase } from './fases'

const D = 'R' as const
const E = 'L' as const
// toda combinacao de barra comeca com a preparacao do braco e termina com o finalizar
const prep: Instr = { t: 'preparacao', perna: D }
const fim: Instr = { t: 'finalizar', perna: D }

/*******************************************************************************
 * croix
 * funcao: monta um "para cada direcao" en croix (devant, a la seconde,
 * derriere, a la seconde) com um passo dentro.
 * recebe: t (o passo: tendu, glisse, jete ou frappe) e perna (R, L ou uma
 * variavel; direita se nao vier).
 * retorna: a Instr do laco.
 ******************************************************************************/
const croix = (t: 'tendu' | 'glisse' | 'jete' | 'frappe', perna: 'R' | 'L' | { var: string } = D): Instr => ({
  t: 'paraCada',
  nome: 'direção',
  lista: EN_CROIX,
  corpo: [{ t, perna, dir: { var: 'direção' } } as Instr],
})
// gaveta padrao das fases de barra
const BARRA = ['bc_prep', 'bc_final', 'bc_pes', 'bc_plie', 'bc_grandplie', 'bc_tendu', 'bc_glisse', 'bc_jete', 'bc_frappe', 'bc_fechar', 'bc_repetir', 'bc_cada', 'bc_cadapos', 'bc_pausa']

// ===== desafios =====
/*******************************************************************************
 * DESAFIOS
 * funcao: desafios: combinacoes conhecidas com regras apertadas (poucos blocos,
 * bloco proibido). rigido quer dizer que so ganha estrela cumprindo a meta.
 ******************************************************************************/
export const DESAFIOS: Fase[] = [
  {
    id: 'd-oito',
    titulo: 'Oito tendus',
    conceito: 'até 4 blocos',
    objetivo: 'Preparação, OITO battements tendus devant com a direita e finalizar. Tudo em no máximo 4 blocos!',
    dica: 'Empilhar oito tendus gasta oito blocos… existe um bloco que repete por você.',
    alvo: { funcoes: [], principal: [prep, { t: 'repetir', vezes: 8, corpo: [{ t: 'tendu', perna: D, dir: 'devant' }] }, fim] },
    maxBlocos: 4,
    rigido: true,
    gaveta: BARRA,
  },
  {
    id: 'd-croix2',
    titulo: 'En croix em dobro',
    conceito: 'laço dentro de laço',
    objetivo: 'Tendus en croix duas vezes seguidas, entre a preparação e o finalizar, em no máximo 5 blocos.',
    dica: 'Um "repetir" por fora e um "para cada direção" por dentro.',
    alvo: { funcoes: [], principal: [prep, { t: 'repetir', vezes: 2, corpo: [croix('tendu')] }, fim] },
    maxBlocos: 5,
    rigido: true,
    gaveta: BARRA,
  },
  {
    id: 'd-pos',
    titulo: 'Quatro posições, uma vez só',
    conceito: 'variável (posição)',
    objetivo: 'Preparação e, em cada posição (1ª, 2ª, 4ª e 5ª), um demi-plié e um grand plié. Finalize e faça uma pausa de 2 tempos. Sem usar o bloco "pés em"!',
    dica: 'Os blocos de plié têm o menu "em": escolha (posição) dentro do "para cada posição".',
    alvo: {
      funcoes: [],
      principal: [
        prep,
        { t: 'paraCada', nome: 'posição', lista: POSICOES_PLIE, corpo: [{ t: 'demiPlie', pos: { var: 'posição' } }, { t: 'grandPlie', pos: { var: 'posição' } }] },
        fim,
        { t: 'pausa', tempos: 2 },
      ],
    },
    maxBlocos: 6,
    rigido: true,
    proibido: ['pes'],
    gaveta: BARRA,
  },
  {
    id: 'd-lados',
    titulo: 'Os dois lados, sem repetir nada',
    conceito: 'função',
    objetivo:
      'Glissés en croix com a direita (com preparação e finalizar), vira, e o mesmo com a esquerda. Termine com uma pausa de 4 tempos. Crie uma função para não montar tudo duas vezes.',
    dica: 'Dentro da função, use (perna) na preparação, no glissé e no finalizar.',
    alvo: {
      funcoes: [
        {
          nome: 'lado',
          params: ['perna'],
          corpo: [{ t: 'preparacao', perna: { var: 'perna' } }, croix('glisse', { var: 'perna' }), { t: 'finalizar', perna: { var: 'perna' } }],
        },
      ],
      principal: [{ t: 'chamar', fn: 'lado', args: { perna: D } }, { t: 'virar' }, { t: 'chamar', fn: 'lado', args: { perna: E } }, { t: 'pausa', tempos: 4 }],
    },
    maxBlocos: 9,
    rigido: true,
    precisa: 'chamar',
    gaveta: [...BARRA, 'bc_def', 'bc_chamar', 'bc_virar'],
  },
  {
    id: 'd-allegro',
    titulo: 'Allegro econômico',
    conceito: 'até 7 blocos',
    objetivo: 'No centro, pés em 5ª: oito changements, dois échappés sautés e uma pausa de 2 tempos, em no máximo 7 blocos.',
    dica: 'Dois laços resolvem.',
    alvo: {
      funcoes: [],
      principal: [
        { t: 'local', onde: 'centro' },
        { t: 'pes', pos: '5' },
        { t: 'repetir', vezes: 8, corpo: [{ t: 'changement' }] },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'echappe' }] },
        { t: 'pausa', tempos: 2 },
      ],
    },
    maxBlocos: 7,
    rigido: true,
    gaveta: ['bc_centro', 'bc_pes', 'bc_saute', 'bc_changement', 'bc_echappe', 'bc_repetir', 'bc_pausa'],
  },
]

// ===== conserta a combinacao =====
/*******************************************************************************
 * CONSERTOS
 * funcao: conserta a combinacao: inicial traz o programa ja montado com um
 * erro, e alvo e como deveria ser.
 ******************************************************************************/
export const CONSERTOS: Fase[] = [
  {
    id: 'c-perna',
    titulo: 'A perna errada',
    conceito: 'depuração',
    objetivo: 'A professora pediu tendus en croix com a perna de fora. Alguma coisa está impedindo de dançar…',
    dica: 'Passe o mouse no triângulo de aviso em cima do bloco.',
    inicial: { funcoes: [], principal: [prep, croix('tendu', E), fim] },
    alvo: { funcoes: [], principal: [prep, croix('tendu'), fim] },
    maxBlocos: 99,
    gaveta: BARRA,
  },
  {
    id: 'c-conta',
    titulo: 'Faltou um',
    conceito: 'depuração',
    objetivo: 'Eram para ser QUATRO tendus devant, mas a bailarina faz menos.',
    dica: 'Olhe o número dentro do "repetir".',
    inicial: { funcoes: [], principal: [prep, { t: 'repetir', vezes: 3, corpo: [{ t: 'tendu', perna: D, dir: 'devant' }] }, fim] },
    alvo: { funcoes: [], principal: [prep, { t: 'repetir', vezes: 4, corpo: [{ t: 'tendu', perna: D, dir: 'devant' }] }, fim] },
    maxBlocos: 99,
    gaveta: BARRA,
  },
  {
    id: 'c-finalizar',
    titulo: 'O finalizar fujão',
    conceito: 'depuração',
    objetivo: 'Dois demi-pliés e só no fim o braço desce. Mas aqui o braço fica subindo e descendo…',
    dica: 'Tudo que está dentro do laço se repete. O que deveria acontecer só uma vez?',
    inicial: { funcoes: [], principal: [prep, { t: 'repetir', vezes: 2, corpo: [{ t: 'demiPlie' }, fim] }] },
    alvo: { funcoes: [], principal: [prep, { t: 'repetir', vezes: 2, corpo: [{ t: 'demiPlie' }] }, fim] },
    maxBlocos: 99,
    gaveta: BARRA,
  },
  {
    id: 'c-direcao',
    titulo: 'Direção travada',
    conceito: 'depuração',
    objetivo: 'A ideia era fazer o en croix, mas ela só faz devant.',
    dica: 'Dentro do "para cada direção", o tendu precisa usar a variável (direção).',
    inicial: {
      funcoes: [],
      principal: [prep, { t: 'paraCada', nome: 'direção', lista: EN_CROIX, corpo: [{ t: 'tendu', perna: D, dir: 'devant' }] }, fim],
    },
    alvo: { funcoes: [], principal: [prep, croix('tendu'), fim] },
    maxBlocos: 99,
    gaveta: BARRA,
  },
  {
    id: 'c-quinta',
    titulo: 'O pé de trás',
    conceito: 'depuração',
    objetivo: 'Na 5ª, a professora pediu: glissé à la seconde e depois glissé derrière. A ordem ficou trocada!',
    dica: 'Na 5ª, o derrière sai com o pé de trás. O à la seconde troca o pé que está na frente.',
    inicial: {
      funcoes: [],
      principal: [{ t: 'pes', pos: '5' }, prep, { t: 'glisse', perna: D, dir: 'derriere' }, { t: 'glisse', perna: D, dir: 'seconde' }, fim, { t: 'pausa', tempos: 2 }],
    },
    alvo: {
      funcoes: [],
      principal: [{ t: 'pes', pos: '5' }, prep, { t: 'glisse', perna: D, dir: 'seconde' }, { t: 'glisse', perna: D, dir: 'derriere' }, fim, { t: 'pausa', tempos: 2 }],
    },
    maxBlocos: 99,
    gaveta: BARRA,
  },
  {
    id: 'c-virar',
    titulo: 'Depois de virar',
    conceito: 'depuração',
    objetivo: 'Tendus devant dos dois lados. Depois de virar para o outro lado, algo não funciona.',
    dica: 'Depois de virar, quem fica longe da barra é a outra perna (e o outro braço).',
    inicial: {
      funcoes: [],
      principal: [
        prep,
        { t: 'repetir', vezes: 2, corpo: [{ t: 'tendu', perna: D, dir: 'devant' }] },
        fim,
        { t: 'virar' },
        prep,
        { t: 'repetir', vezes: 2, corpo: [{ t: 'tendu', perna: D, dir: 'devant' }] },
        fim,
        { t: 'pausa', tempos: 4 },
      ],
    },
    alvo: {
      funcoes: [],
      principal: [
        prep,
        { t: 'repetir', vezes: 2, corpo: [{ t: 'tendu', perna: D, dir: 'devant' }] },
        fim,
        { t: 'virar' },
        { t: 'preparacao', perna: E },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'tendu', perna: E, dir: 'devant' }] },
        { t: 'finalizar', perna: E },
        { t: 'pausa', tempos: 4 },
      ],
    },
    maxBlocos: 99,
    gaveta: [...BARRA, 'bc_virar'],
  },
]

// ===== professora dita =====
/*******************************************************************************
 * DITADOS
 * funcao: professora dita: ditado traz as falas da professora, uma por clique;
 * o exemplo so aparece depois de errar.
 ******************************************************************************/
export const DITADOS: Fase[] = [
  {
    id: 'p-plies',
    titulo: 'Pliés',
    conceito: 'ouvido',
    objetivo: 'Ouça a professora e monte a combinação.',
    dica: 'Pode ouvir quantas vezes quiser.',
    ditado: ['Preparação.', 'Dois demi-pliés.', 'Um grand plié.', 'Finaliza.', 'E pausa de quatro tempos.'],
    alvo: { funcoes: [], principal: [prep, { t: 'demiPlie' }, { t: 'demiPlie' }, { t: 'grandPlie' }, fim, { t: 'pausa', tempos: 4 }] },
    maxBlocos: 99,
    gaveta: BARRA,
  },
  {
    id: 'p-tendus',
    titulo: 'Tendus en croix',
    conceito: 'ouvido',
    objetivo: 'Ouça a professora e monte a combinação.',
    dica: 'Quando ela fala "en croix", pense no laço "para cada direção".',
    ditado: ['Preparação.', 'Tendus en croix: devant, à la seconde, derrière, à la seconde.', 'E repete tudo de novo!', 'Finaliza.'],
    alvo: { funcoes: [], principal: [prep, { t: 'repetir', vezes: 2, corpo: [croix('tendu')] }, fim] },
    maxBlocos: 99,
    gaveta: BARRA,
  },
  {
    id: 'p-quinta',
    titulo: 'Glissés na quinta',
    conceito: 'ouvido',
    objetivo: 'Ouça a professora e monte a combinação.',
    dica: 'Comece mudando a posição dos pés.',
    ditado: ['Pés em quinta.', 'Preparação.', 'Quatro glissés à la seconde.', 'Finaliza.', 'E pausa de seis tempos.'],
    alvo: {
      funcoes: [],
      principal: [{ t: 'pes', pos: '5' }, prep, { t: 'repetir', vezes: 4, corpo: [{ t: 'glisse', perna: D, dir: 'seconde' }] }, fim, { t: 'pausa', tempos: 6 }],
    },
    maxBlocos: 99,
    gaveta: BARRA,
  },
  {
    id: 'p-adage',
    titulo: 'Adage',
    conceito: 'ouvido',
    objetivo: 'Ouça a professora e monte a combinação.',
    dica: 'Développé e arabesque ficam na gaveta "adage".',
    ditado: ['Preparação.', 'Développé devant.', 'Développé à la seconde.', 'Arabesque.', 'Finaliza.', 'E pausa de quatro tempos.'],
    alvo: {
      funcoes: [],
      principal: [prep, { t: 'developpe', perna: D, dir: 'devant' }, { t: 'developpe', perna: D, dir: 'seconde' }, { t: 'arabesque', perna: D, tipo: '1' }, fim, { t: 'pausa', tempos: 4 }],
    },
    maxBlocos: 99,
    gaveta: [...BARRA, 'bc_developpe', 'bc_arabesque', 'bc_passe', 'bc_attitude'],
  },
  {
    id: 'p-centro',
    titulo: 'No centro',
    conceito: 'ouvido',
    objetivo: 'Ouça a professora e monte a combinação.',
    dica: 'Primeiro, ela precisa ir para o centro.',
    ditado: ['Vai para o centro.', 'Pés em quinta.', 'Quatro changements.', 'Pausa de seis tempos.', 'E révérence!'],
    alvo: {
      funcoes: [],
      principal: [{ t: 'local', onde: 'centro' }, { t: 'pes', pos: '5' }, { t: 'repetir', vezes: 4, corpo: [{ t: 'changement' }] }, { t: 'pausa', tempos: 6 }, { t: 'reverence' }],
    },
    maxBlocos: 99,
    gaveta: ['bc_centro', 'bc_pes', 'bc_saute', 'bc_changement', 'bc_echappe', 'bc_reverence', 'bc_repetir', 'bc_pausa'],
  },
]

// ===== grand allegro: deslocamentos e saltos grandes no centro =====
/*******************************************************************************
 * CENTRO_G
 * funcao: gaveta das fases de centro: deslocamentos, saltos, giros, direcoes do
 * corpo e pontos da sala.
 ******************************************************************************/
const CENTRO_G = [
  'bc_centro', 'bc_pes', 'bc_direcao', 'bc_bracos', 'bc_glissade', 'bc_bourree', 'bc_balance', 'bc_changement',
  'bc_assemble', 'bc_sissonne', 'bc_grandjete', 'bc_reverence', 'bc_repetir', 'bc_def', 'bc_chamar', 'bc_pausa',
  'bc_pique', 'bc_soutenu', 'bc_fouettegiro', 'bc_fechar', 'bc_tombe', 'bc_chasse', 'bc_pasdechat', 'bc_penche',
  'bc_irponto', 'bc_olharponto',
]
// o comeco de toda fase de centro: ir para o centro e pes em 5a
const vaiCentro: Instr[] = [{ t: 'local', onde: 'centro' }, { t: 'pes', pos: '5' }]
// a variavel "perna" das funcoes com parametro
const P = { var: 'perna' }

/*******************************************************************************
 * ALLEGRO
 * funcao: grand allegro: passos que viajam pela sala e os saltos grandes do fim
 * da aula.
 ******************************************************************************/
export const ALLEGRO: Fase[] = [
  {
    id: 'g-glissade',
    titulo: 'Glissades',
    parte: 'centro',
    conceito: 'repetir com dois passos',
    objetivo: 'No centro, pés em 5ª e braços em 2ª. Depois: glissade para a direita, glissade para a esquerda, e tudo isso duas vezes.',
    dica: 'A glissade viaja para o lado da perna escolhida. Dentro do "repetir" cabem vários blocos!',
    alvo: {
      funcoes: [],
      principal: [...vaiCentro, { t: 'bracosAmbos', pos: 'segunda' }, { t: 'repetir', vezes: 2, corpo: [{ t: 'glissade', perna: D }, { t: 'glissade', perna: E }] }],
    },
    maxBlocos: 6,
    precisa: 'repetir',
    gaveta: CENTRO_G,
  },
  {
    id: 'g-bourree',
    titulo: 'Viajando com pas de bourrée',
    parte: 'centro',
    conceito: 'função',
    objetivo: 'No centro, pés em 5ª. Crie a função "viajar": duas glissades, um pas de bourrée (com a mesma perna) e um changement. Chame para a direita, depois para a esquerda, e termine com pausa de 2 tempos.',
    dica: 'O changement no fim troca o pé da frente: assim a outra perna fica pronta para o outro lado.',
    alvo: {
      funcoes: [
        {
          nome: 'viajar',
          params: ['perna'],
          corpo: [{ t: 'glissade', perna: P }, { t: 'glissade', perna: P }, { t: 'pasDeBourree', perna: P }, { t: 'changement' }],
        },
      ],
      principal: [...vaiCentro, { t: 'chamar', fn: 'viajar', args: { perna: D } }, { t: 'chamar', fn: 'viajar', args: { perna: E } }, { t: 'pausa', tempos: 2 }],
    },
    maxBlocos: 10,
    precisa: 'chamar',
    gaveta: CENTRO_G,
  },
  {
    id: 'g-balance',
    titulo: 'Valsa de balancés',
    parte: 'centro',
    conceito: 'repetir',
    objetivo: 'No centro, pés em 5ª e braços em 2ª. Quatro pares de balancés (direita, esquerda), depois pausa de 4 tempos e révérence.',
    dica: 'O balancé é um passo de valsa: ele balança para o lado da perna escolhida.',
    alvo: {
      funcoes: [],
      principal: [
        ...vaiCentro,
        { t: 'bracosAmbos', pos: 'segunda' },
        { t: 'repetir', vezes: 4, corpo: [{ t: 'balance', perna: D }, { t: 'balance', perna: E }] },
        { t: 'pausa', tempos: 4 },
        { t: 'reverence' },
      ],
    },
    maxBlocos: 8,
    precisa: 'repetir',
    gaveta: CENTRO_G,
  },
  {
    id: 'g-petit',
    titulo: 'Assemblés e sissonnes',
    parte: 'centro',
    conceito: 'dois laços',
    objetivo: 'No centro, pés em 5ª e pausa de 2 tempos. Dois pares de assemblés (esquerda, direita) e dois pares de sissonnes (direita, esquerda).',
    dica: 'No assemblé dessus, quem escova é a perna de trás, e ela termina na frente.',
    alvo: {
      funcoes: [],
      principal: [
        ...vaiCentro,
        { t: 'pausa', tempos: 2 },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'assemble', perna: E }, { t: 'assemble', perna: D }] },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'sissonne', perna: D }, { t: 'sissonne', perna: E }] },
      ],
    },
    maxBlocos: 9,
    precisa: 'repetir',
    gaveta: CENTRO_G,
  },
  {
    id: 'g-jete',
    titulo: 'Grand jeté!',
    parte: 'centro',
    conceito: 'sequência',
    objetivo: 'No centro, pés em 5ª e pausa de 2 tempos. Glissade com a perna de trás, grand jeté com a da frente e assemblé com a de trás. Pausa de 4 tempos e révérence.',
    dica: 'Começando em 5ª com a direita na frente, a perna de trás é a esquerda.',
    alvo: {
      funcoes: [],
      principal: [
        ...vaiCentro,
        { t: 'pausa', tempos: 2 },
        { t: 'glissade', perna: E },
        { t: 'grandJete', perna: D },
        { t: 'assemble', perna: E },
        { t: 'pausa', tempos: 4 },
        { t: 'reverence' },
      ],
    },
    maxBlocos: 8,
    gaveta: CENTRO_G,
  },
  {
    id: 'g-lados',
    titulo: 'Grand allegro dos dois lados',
    parte: 'centro',
    conceito: 'função',
    objetivo: 'No centro, pés em 5ª e pausa de 2 tempos. Crie a função "voar": glissade e grand jeté com a mesma perna e um changement. Chame para a direita e para a esquerda. Pausa de 4 tempos e révérence.',
    dica: 'A glissade com a perna da frente não troca os pés, então o grand jeté sai com a mesma perna.',
    alvo: {
      funcoes: [{ nome: 'voar', params: ['perna'], corpo: [{ t: 'glissade', perna: P }, { t: 'grandJete', perna: P }, { t: 'changement' }] }],
      principal: [
        ...vaiCentro,
        { t: 'pausa', tempos: 2 },
        { t: 'chamar', fn: 'voar', args: { perna: D } },
        { t: 'chamar', fn: 'voar', args: { perna: E } },
        { t: 'pausa', tempos: 4 },
        { t: 'reverence' },
      ],
    },
    maxBlocos: 11,
    precisa: 'chamar',
    gaveta: CENTRO_G,
  },
  {
    id: 'g-giros',
    titulo: 'Piqués e soutenus',
    parte: 'centro',
    conceito: 'repetir',
    objetivo: 'No centro, pés em 5ª e pausa de 2 tempos. Dois piqués en dedans para a direita e um soutenu com a direita. Depois o mesmo para a esquerda. Termine com pausa de 4 tempos.',
    dica: 'O piqué viaja para o lado da perna que pisa. O soutenu deixa o outro pé na frente, pronto para o outro lado.',
    alvo: {
      funcoes: [],
      principal: [
        ...vaiCentro,
        { t: 'pausa', tempos: 2 },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'pique', perna: D, forma: 'giro' }] },
        { t: 'soutenu', perna: D },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'pique', perna: E, forma: 'giro' }] },
        { t: 'soutenu', perna: E },
        { t: 'pausa', tempos: 4 },
      ],
    },
    maxBlocos: 10,
    precisa: 'repetir',
    gaveta: CENTRO_G,
  },
  {
    id: 'g-fouettes',
    titulo: 'Fouettés!',
    parte: 'centro',
    conceito: 'repetir',
    objetivo: 'No centro, pés em 5ª: oito fouettés en tournant com a perna direita e depois feche a perna.',
    dica: 'Sem laço seriam oito blocos iguais... O fouetté já faz sozinho a preparação em demi-plié na primeira vez.',
    alvo: { funcoes: [], principal: [...vaiCentro, { t: 'repetir', vezes: 8, corpo: [{ t: 'fouetteGiro', perna: D }] }, { t: 'fechar' }] },
    maxBlocos: 5,
    precisa: 'repetir',
    gaveta: CENTRO_G,
  },
  {
    id: 'g-diagonal',
    titulo: 'A grande diagonal',
    parte: 'centro',
    conceito: 'pontos da sala',
    objetivo: 'No centro, pés em 5ª. Vá até o ponto 6 (o canto de trás, à esquerda). De lá, na diagonal: chassé devant e grand jeté com a direita, tudo isso duas vezes. Pausa de 4 tempos e révérence.',
    dica: 'Indo até um canto, ela já termina olhando para o canto oposto: o chassé devant e o grand jeté viajam para onde ela olha!',
    alvo: {
      funcoes: [],
      principal: [
        ...vaiCentro,
        { t: 'irPonto', n: 6 },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'chasse', perna: D, dir: 'devant' }, { t: 'grandJete', perna: D }] },
        { t: 'pausa', tempos: 4 },
        { t: 'reverence' },
      ],
    },
    maxBlocos: 8,
    precisa: 'repetir',
    gaveta: CENTRO_G,
  },
]

// ===== fases de centro nos outros modos (ficam aqui embaixo porque usam a gaveta do centro) =====
DESAFIOS.push(
  {
    id: 'd-balance',
    titulo: 'Valsa enxuta',
    parte: 'centro',
    conceito: 'até 5 blocos',
    objetivo: 'No centro: oito balancés alternados (direita, esquerda…) e uma pausa de 4 tempos, em no máximo 5 blocos.',
    dica: 'O balancé sai da 1ª posição também: nem precisa do "pés em".',
    alvo: {
      funcoes: [],
      principal: [{ t: 'local', onde: 'centro' }, { t: 'repetir', vezes: 4, corpo: [{ t: 'balance', perna: D }, { t: 'balance', perna: E }] }, { t: 'pausa', tempos: 4 }],
    },
    maxBlocos: 5,
    rigido: true,
    gaveta: CENTRO_G,
  },
  {
    id: 'd-piques',
    titulo: 'Diagonal de piqués',
    parte: 'centro',
    conceito: 'até 5 blocos',
    objetivo: 'No centro, pés em 5ª: quatro piqués en dedans com a direita e um soutenu com a direita, em no máximo 5 blocos.',
    dica: 'Quatro piqués iguais… é trabalho para o "repetir".',
    alvo: { funcoes: [], principal: [...vaiCentro, { t: 'repetir', vezes: 4, corpo: [{ t: 'pique', perna: D, forma: 'giro' }] }, { t: 'soutenu', perna: D }] },
    maxBlocos: 5,
    rigido: true,
    precisa: 'repetir',
    gaveta: CENTRO_G,
  },
  {
    id: 'd-petit',
    titulo: 'Petit allegro',
    parte: 'centro',
    conceito: 'até 8 blocos',
    objetivo: 'No centro, pés em 5ª e pausa de 2 tempos. Duas vezes: assemblé com a esquerda, assemblé com a direita e pas de chat com a esquerda. Termine com pausa de 4 tempos. No máximo 8 blocos!',
    dica: 'O assemblé dessus e o pas de chat saem com a perna de trás: acompanhe qual pé está na frente.',
    alvo: {
      funcoes: [],
      principal: [
        ...vaiCentro,
        { t: 'pausa', tempos: 2 },
        { t: 'repetir', vezes: 2, corpo: [{ t: 'assemble', perna: E }, { t: 'assemble', perna: D }, { t: 'pasDeChat', perna: E }] },
        { t: 'pausa', tempos: 4 },
      ],
    },
    maxBlocos: 8,
    rigido: true,
    precisa: 'repetir',
    gaveta: CENTRO_G,
  },
)

CONSERTOS.push(
  {
    id: 'c-glissade',
    titulo: 'Só vai para um lado',
    parte: 'centro',
    conceito: 'parâmetro',
    objetivo: 'No centro, pés em 5ª e braços em 2ª, duas vezes: glissade para a direita e glissade para a esquerda. Mas ela foge sempre para o mesmo lado!',
    dica: 'A glissade viaja para o lado da perna escolhida.',
    inicial: {
      funcoes: [],
      principal: [...vaiCentro, { t: 'bracosAmbos', pos: 'segunda' }, { t: 'repetir', vezes: 2, corpo: [{ t: 'glissade', perna: D }, { t: 'glissade', perna: D }] }],
    },
    alvo: {
      funcoes: [],
      principal: [...vaiCentro, { t: 'bracosAmbos', pos: 'segunda' }, { t: 'repetir', vezes: 2, corpo: [{ t: 'glissade', perna: D }, { t: 'glissade', perna: E }] }],
    },
    maxBlocos: 99,
    gaveta: CENTRO_G,
  },
  {
    id: 'c-fouette',
    titulo: 'Fouettés pendurados',
    parte: 'centro',
    conceito: 'fechar',
    objetivo: 'No centro, pés em 5ª: quatro fouettés en tournant com a direita e depois feche a perna. Mas ela termina pendurada na meia ponta!',
    dica: 'Depois do último fouetté a perna continua em passé. Existe um bloco para fechar a perna.',
    inicial: { funcoes: [], principal: [...vaiCentro, { t: 'repetir', vezes: 4, corpo: [{ t: 'fouetteGiro', perna: D }] }, { t: 'pausa', tempos: 1 }] },
    alvo: { funcoes: [], principal: [...vaiCentro, { t: 'repetir', vezes: 4, corpo: [{ t: 'fouetteGiro', perna: D }] }, { t: 'fechar' }] },
    maxBlocos: 99,
    gaveta: CENTRO_G,
  },
  {
    id: 'c-jete',
    titulo: 'O grand jeté não sai',
    parte: 'centro',
    conceito: 'perna da frente',
    objetivo: 'No centro, pés em 5ª e pausa de 2 tempos: glissade com a esquerda, grand jeté, assemblé com a esquerda, pausa de 4 tempos e révérence. Mas o grand jeté está com a perna errada!',
    dica: 'O grand jeté en avant é lançado pela perna da frente. Qual pé está na frente depois da glissade?',
    inicial: {
      funcoes: [],
      principal: [
        ...vaiCentro,
        { t: 'pausa', tempos: 2 },
        { t: 'glissade', perna: E },
        { t: 'grandJete', perna: E },
        { t: 'assemble', perna: E },
        { t: 'pausa', tempos: 4 },
        { t: 'reverence' },
      ],
    },
    alvo: {
      funcoes: [],
      principal: [
        ...vaiCentro,
        { t: 'pausa', tempos: 2 },
        { t: 'glissade', perna: E },
        { t: 'grandJete', perna: D },
        { t: 'assemble', perna: E },
        { t: 'pausa', tempos: 4 },
        { t: 'reverence' },
      ],
    },
    maxBlocos: 99,
    gaveta: CENTRO_G,
  },
)

DITADOS.push(
  {
    id: 'p-balance',
    titulo: 'Valsa ditada',
    parte: 'centro',
    conceito: 'ouvir e montar',
    objetivo: 'Ouça a professora e monte a combinação.',
    dica: 'Quatro balancés alternados cabem num "repetir" com dois blocos.',
    ditado: ['Vai para o centro.', 'Braços em segunda.', 'Quatro balancés: direita, esquerda, direita, esquerda.', 'E pausa de dois tempos.'],
    alvo: {
      funcoes: [],
      principal: [{ t: 'local', onde: 'centro' }, { t: 'bracosAmbos', pos: 'segunda' }, { t: 'repetir', vezes: 2, corpo: [{ t: 'balance', perna: D }, { t: 'balance', perna: E }] }, { t: 'pausa', tempos: 2 }],
    },
    maxBlocos: 99,
    gaveta: CENTRO_G,
  },
  {
    id: 'p-giros',
    titulo: 'Giros ditados',
    parte: 'centro',
    conceito: 'ouvir e montar',
    objetivo: 'Ouça a professora e monte a combinação.',
    dica: 'O piqué en dedans é a opção "en dedans (giro)" do bloco piqué.',
    ditado: ['Vai para o centro.', 'Pés em quinta.', 'Dois piqués en dedans com a direita.', 'Soutenu com a direita.', 'E pausa de quatro tempos.'],
    alvo: {
      funcoes: [],
      principal: [...vaiCentro, { t: 'repetir', vezes: 2, corpo: [{ t: 'pique', perna: D, forma: 'giro' }] }, { t: 'soutenu', perna: D }, { t: 'pausa', tempos: 4 }],
    },
    maxBlocos: 99,
    gaveta: CENTRO_G,
  },
  {
    id: 'p-allegro',
    titulo: 'Grand allegro ditado',
    parte: 'centro',
    conceito: 'ouvir e montar',
    objetivo: 'Ouça a professora e monte a combinação.',
    dica: 'Começando com a direita na frente, a perna de trás é a esquerda.',
    ditado: [
      'Vai para o centro.',
      'Pés em quinta.',
      'Pausa de dois tempos.',
      'Glissade com a esquerda.',
      'Grand jeté com a direita.',
      'Assemblé com a esquerda.',
      'Révérence.',
      'E pausa de quatro tempos.',
    ],
    alvo: {
      funcoes: [],
      principal: [
        ...vaiCentro,
        { t: 'pausa', tempos: 2 },
        { t: 'glissade', perna: E },
        { t: 'grandJete', perna: D },
        { t: 'assemble', perna: E },
        { t: 'reverence' },
        { t: 'pausa', tempos: 4 },
      ],
    },
    maxBlocos: 99,
    gaveta: CENTRO_G,
  },
)
