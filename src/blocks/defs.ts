/*******************************************************************************
 * defs.ts
 * funcao principal: definicao de todos os blocos do editor, do tema de cores
 * (Blockly com o renderizador "zelos", parecido com o Scratch) e da gaveta de
 * blocos, em lista no computador e por categorias no celular.
 ******************************************************************************/
import * as Blockly from 'blockly/core'
import { PONTOS, PONTO_LABEL } from '../engine/program'

/*******************************************************************************
 * PERNA_OPTS, DIR_OPTS, POS_OPTS, BRACOS_OPTS, PES_OPTS
 * funcao: opcoes dos menus dos blocos: [texto que aparece, valor guardado]. as
 * opcoes entre parenteses ("(perna)", "(direcao)", "(posicao)") sao as
 * variaveis, guardadas como "$nome".
 ******************************************************************************/
export const PERNA_OPTS: [string, string][] = [
  ['direita', 'R'],
  ['esquerda', 'L'],
  ['(perna)', '$perna'],
]
export const DIR_OPTS: [string, string][] = [
  ['devant', 'devant'],
  ['à la seconde', 'seconde'],
  ['derrière', 'derriere'],
  ['(direção)', '$direção'],
]
export const POS_OPTS: [string, string][] = [
  ['bras bas', 'brasBas'],
  ['1ª posição', 'primeira'],
  ['2ª posição', 'segunda'],
  ['5ª posição', 'quinta'],
  ['demi-seconde', 'demiSeconde'],
]
export const BRACOS_OPTS: [string, string][] = [
  ['bras bas', 'brasBas'],
  ['1ª posição', 'primeira'],
  ['2ª posição', 'segunda'],
  ['3ª posição', 'terceira'],
  ['4ª posição', 'quarta'],
  ['5ª posição', 'quinta'],
]
// os 8 pontos da sala, no menu com o nome junto, para quem ainda nao decorou os numeros
export const PONTO_OPTS: [string, string][] = PONTOS.map((n) => [`${n} · ${PONTO_LABEL[n]}`, String(n)])
export const PES_OPTS: [string, string][] = [
  ['1ª posição', '1'],
  ['2ª posição', '2'],
  ['3ª posição', '3'],
  ['4ª posição', '4'],
  ['5ª posição', '5'],
  ['(posição)', '$posição'],
]
const FB_OPTS: [string, string][] = [
  ['devant', 'devant'],
  ['derrière', 'derriere'],
]

// bloco que encaixa em cima e embaixo de outros (um passo comum)
const stmt = { previousStatement: null, nextStatement: null }

// os blocos so podem ser registrados uma vez no Blockly, mesmo com o editor sendo recriado
let defined = false

/*******************************************************************************
 * defineBlocks
 * funcao: registra no Blockly todos os blocos do jogo, com texto, menus, cor e
 * a explicacao que aparece ao parar o mouse em cima.
 * recebe: nada.
 * retorna: nada. chamadas depois da primeira nao fazem nada.
 ******************************************************************************/
export function defineBlocks() {
  if (defined) return
  defined = true

  /*****************************************************************************
   * legDir
   * funcao: modelo de bloco com perna e direcao (ex: battement tendu direita
   * devant).
   * recebe: type (id do bloco), label (texto), style (estilo de cor) e tooltip
   * (explicacao).
   * retorna: a definicao em JSON do bloco.
   ****************************************************************************/
  const legDir = (type: string, label: string, style: string, tooltip: string) => ({
    type,
    message0: `${label} %1 %2`,
    args0: [
      { type: 'field_dropdown', name: 'PERNA', options: PERNA_OPTS },
      { type: 'field_dropdown', name: 'DIR', options: DIR_OPTS },
    ],
    ...stmt,
    style,
    tooltip,
  })

  /*****************************************************************************
   * legOnly
   * funcao: modelo de bloco so com a perna (ex: passe direita).
   * recebe: type, label, style e tooltip.
   * retorna: a definicao em JSON do bloco.
   ****************************************************************************/
  const legOnly = (type: string, label: string, style: string, tooltip: string) => ({
    type,
    message0: `${label} %1`,
    args0: [{ type: 'field_dropdown', name: 'PERNA', options: PERNA_OPTS }],
    ...stmt,
    style,
    tooltip,
  })
  // bloco sem nenhum campo (ex: fechar em 5a)
  const plain = (type: string, label: string, style: string, tooltip: string) => ({ type, message0: label, ...stmt, style, tooltip })

  /*****************************************************************************
   * withPos
   * funcao: modelo de bloco com a posicao dos pes (plie, grand plie, releve),
   * que aceita "posicao atual".
   * recebe: type, label, style e tooltip.
   * retorna: a definicao em JSON do bloco.
   ****************************************************************************/
  const withPos = (type: string, label: string, style: string, tooltip: string) => ({
    type,
    message0: `${label} em %1`,
    args0: [{ type: 'field_dropdown', name: 'POS', options: [['posição atual', 'atual'], ...PES_OPTS] }],
    ...stmt,
    style,
    tooltip,
  })

  /*****************************************************************************
   * loop
   * funcao: modelo de bloco de laco, com uma boca para encaixar passos dentro.
   * recebe: type, label e tooltip (a cor e sempre a dos lacos).
   * retorna: a definicao em JSON do bloco.
   ****************************************************************************/
  const loop = (type: string, label: string, tooltip: string) => ({
    type,
    message0: label,
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    ...stmt,
    style: 'laco_blocks',
    tooltip,
  })

  Blockly.common.defineBlocksWithJsonArray([
    { type: 'bc_start', message0: 'quando ▶ for clicado', nextStatement: null, style: 'inicio_blocks' },
    // posicoes e plies
    {
      type: 'bc_pes',
      message0: 'pés em %1',
      args0: [{ type: 'field_dropdown', name: 'POS', options: PES_OPTS }],
      ...stmt,
      style: 'pos_blocks',
      tooltip: 'Muda a posição dos pés. 2 tempos.',
    },
    withPos('bc_plie', 'demi-plié', 'pos_blocks', 'Dobra os joelhos sem tirar os calcanhares do chão. 4 tempos (+2 se mudar de posição).'),
    withPos('bc_grandplie', 'grand plié', 'pos_blocks', 'Plié profundo, com port de bras. Na 2ª, os calcanhares ficam no chão. 4 tempos (+2 se mudar de posição).'),
    // battements
    legDir('bc_tendu', 'battement tendu', 'passo_blocks', 'O pé desliza pelo chão até esticar e volta. 2 tempos.'),
    legDir('bc_glisse', 'battement glissé', 'passo_blocks', 'Como o tendu, mas o pé sai um pouquinho do chão. 2 tempos.'),
    legDir('bc_jete', 'battement jeté', 'passo_blocks', 'O pé é "jogado" a uns 45°. 2 tempos.'),
    legDir('bc_grandbattement', 'grand battement', 'passo_blocks', 'A perna sobe bem alto e desce controlada. 2 tempos.'),
    legOnly('bc_cloche', 'battement en cloche', 'passo_blocks', 'A perna balança como um sino: frente, passa pela 1ª, trás. 2 tempos.'),
    {
      type: 'bc_rond',
      message0: 'rond de jambe à terre %1 %2',
      args0: [
        { type: 'field_dropdown', name: 'PERNA', options: PERNA_OPTS },
        { type: 'field_dropdown', name: 'SENTIDO', options: [['en dehors', 'endehors'], ['en dedans', 'endedans']] },
      ],
      ...stmt,
      style: 'passo_blocks',
      tooltip: 'A ponta do pé desenha meio círculo no chão. 4 tempos.',
    },
    // cou-de-pied
    legOnly('bc_coupe', 'coupé', 'cou_blocks', 'Pé esticado no cou-de-pied (no tornozelo da perna de base). 2 tempos.'),
    legDir('bc_fondu', 'battement fondu', 'cou_blocks', 'Os dois joelhos dobram juntos e depois esticam juntos. 2 tempos.'),
    legDir('bc_frappe', 'battement frappé', 'cou_blocks', 'Do pé flexionado no cou-de-pied, a perna "bate" para fora. 1 tempo.'),
    legOnly('bc_cheval', 'pas de cheval', 'cou_blocks', 'O pé desenrola e pousa a ponta, como um cavalinho. 2 tempos.'),
    // adage
    legOnly('bc_passe', 'passé', 'adage_blocks', 'A ponta do pé sobe até o joelho (retiré). 2 tempos.'),
    legDir('bc_developpe', 'développé', 'adage_blocks', 'Sobe pelo passé e desenrola a perna bem alto. 4 tempos.'),
    {
      type: 'bc_arabesque',
      message0: '%1 arabesque %2',
      args0: [
        { type: 'field_dropdown', name: 'TIPO', options: [['1ª', '1'], ['2ª', '2'], ['3ª', '3']] },
        { type: 'field_dropdown', name: 'PERNA', options: PERNA_OPTS },
      ],
      ...stmt,
      style: 'adage_blocks',
      tooltip: 'Perna alongada atrás. No centro, a 1ª, 2ª e 3ª arabesque mudam os braços. 4 tempos.',
    },
    legOnly('bc_fouette', 'fouetté de adage', 'adage_blocks', 'Développé à la seconde e o corpo vira: a perna termina em arabesque. Só no centro. 8 tempos.'),
    {
      type: 'bc_attitude',
      message0: 'attitude %1 %2',
      args0: [
        { type: 'field_dropdown', name: 'PERNA', options: PERNA_OPTS },
        { type: 'field_dropdown', name: 'DIR', options: FB_OPTS },
      ],
      ...stmt,
      style: 'adage_blocks',
      tooltip: 'Perna no ar com o joelho dobrado e arredondado. 4 tempos.',
    },
    {
      type: 'bc_cambre',
      message0: 'cambré %1',
      args0: [{ type: 'field_dropdown', name: 'DIR', options: FB_OPTS }],
      ...stmt,
      style: 'adage_blocks',
      tooltip: 'O tronco se curva para a frente ou para trás, com o braço em 5ª. 4 tempos.',
    },
    withPos('bc_releve', 'relevé', 'adage_blocks', 'Sobe na meia ponta e desce. 4 tempos (+2 se mudar de posição).'),
    {
      type: 'bc_pirueta',
      message0: 'pirueta %1 %2 %3 %4',
      args0: [
        { type: 'field_dropdown', name: 'VOLTAS', options: [['simples', '1'], ['dupla', '2']] },
        { type: 'field_dropdown', name: 'SENTIDO', options: [['en dehors', 'endehors'], ['en dedans', 'endedans']] },
        { type: 'field_dropdown', name: 'PERNA', options: PERNA_OPTS },
        { type: 'field_dropdown', name: 'FORMA', options: [['em passé', 'passe'], ['em attitude', 'attitude']] },
      ],
      ...stmt,
      style: 'adage_blocks',
      tooltip: 'Prepara em plié, gira na meia ponta e fecha atrás. En dehors gira para o lado da perna de trabalho. Dupla = duas voltas. Em attitude só no centro. 3 tempos.',
    },
    // centro
    plain('bc_centro', 'ir para o centro', 'centro_blocks', 'Solta a barra e vai para o meio da sala. 4 tempos.'),
    {
      type: 'bc_direcao',
      message0: 'corpo %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'DIR',
          options: [
            ['en face', 'enface'],
            ['croisé', 'croise'],
            ['effacé', 'efface'],
            ['écarté', 'ecarte'],
          ],
        },
      ],
      ...stmt,
      style: 'centro_blocks',
      tooltip: 'Direção do corpo no centro (depende do pé da frente). 2 tempos.',
    },
    {
      type: 'bc_olharponto',
      message0: 'virar para o ponto %1',
      args0: [{ type: 'field_dropdown', name: 'PONTO', options: PONTO_OPTS }],
      ...stmt,
      style: 'centro_blocks',
      tooltip: 'Vira o corpo para um dos 8 pontos da sala (1 é o espelho; 2, 4, 6 e 8 são os cantos). Os passos "para a frente" viajam para esse lado: é assim que se faz uma diagonal! 2 tempos.',
    },
    {
      type: 'bc_irponto',
      message0: 'ir até o ponto %1',
      args0: [{ type: 'field_dropdown', name: 'PONTO', options: PONTO_OPTS }],
      ...stmt,
      style: 'centro_blocks',
      tooltip: 'Pas de bourrée couru: na meia ponta, em 5ª, ela corre com passinhos até o ponto da sala. Num canto, termina olhando para o canto oposto, pronta para a diagonal. Leva mais tempos quanto mais longe.',
    },
    plain('bc_barra', 'voltar para a barra', 'centro_blocks', 'Volta para a barra e segura com a mão esquerda. 4 tempos.'),
    plain('bc_reverence', 'révérence', 'centro_blocks', 'O agradecimento do fim da aula. 4 tempos.'),
    // saltos
    plain('bc_saute', 'sauté', 'salto_blocks', 'Pulinho com as pernas esticadas, saindo e caindo em demi-plié. 2 tempos.'),
    plain('bc_changement', 'changement', 'salto_blocks', 'Pulo da 5ª que troca o pé da frente no ar. 2 tempos.'),
    plain('bc_echappe', 'échappé sauté', 'salto_blocks', 'Da 5ª, pula abrindo para a 2ª e pula fechando na 5ª. 4 tempos.'),
    legOnly('bc_assemble', 'assemblé', 'salto_blocks', 'A perna de trás escova para o lado, as pernas se juntam no ar e ela cai em 5ª com essa perna na frente. 2 tempos.'),
    legOnly('bc_sissonne', 'sissonne', 'salto_blocks', 'Pula dos dois pés, abre a perna escolhida para o lado e viaja para o lado contrário; fecha na frente. 2 tempos.'),
    legOnly('bc_grandjete', 'grand jeté', 'grande_blocks', 'O grande salto em grand écart! Lança a perna da frente e viaja para a frente, caindo em arabesque. 4 tempos.'),
    legOnly('bc_pasdechat', 'pas de chat', 'salto_blocks', 'O "passo do gato": a perna de trás sobe em retiré, depois a outra, e ela viaja para o lado. 2 tempos.'),
    legOnly('bc_penche', 'arabesque penchée', 'adage_blocks', 'Da arabesque, o corpo desce para a frente e a perna sobe bem alto. 8 tempos.'),
    legOnly('bc_fouettegiro', 'fouetté en tournant', 'giro_blocks', 'O giro famoso: a perna chicoteia da frente para o lado e volta ao passé, girando. Use dentro do "repetir"! 2 tempos (+1 de preparação).'),
    legOnly('bc_soutenu', 'soutenu en tournant', 'giro_blocks', 'Tendu à la seconde, fecha na frente na meia ponta e gira; o outro pé termina na frente. 2 tempos.'),
    {
      type: 'bc_pique',
      message0: 'piqué %1 %2',
      args0: [
        { type: 'field_dropdown', name: 'PERNA', options: PERNA_OPTS },
        { type: 'field_dropdown', name: 'FORMA', options: [['en dedans (giro)', 'giro'], ['em retiré', 'passe'], ['em arabesque', 'arabesque']] },
      ],
      ...stmt,
      style: 'giro_blocks',
      tooltip: 'Pisa direto na meia ponta com a perna esticada e viaja. Pode girar en dedans, ficar em retiré ou em arabesque. 2 tempos.',
    },
    legDir('bc_tombe', 'tombé', 'viagem_blocks', 'A perna sai no ar e o corpo "cai" nela em demi-plié, viajando para essa direção. 2 tempos.'),
    {
      type: 'bc_chasse',
      message0: 'chassé %1 %2',
      args0: [
        { type: 'field_dropdown', name: 'PERNA', options: PERNA_OPTS },
        { type: 'field_dropdown', name: 'DIR', options: [['devant', 'devant'], ['à la seconde', 'seconde']] },
      ],
      ...stmt,
      style: 'viagem_blocks',
      tooltip: 'Desliza, passa o peso em demi-plié e a perna de trás "persegue" a da frente num pulinho. 2 tempos.',
    },
    // deslocamentos
    legOnly('bc_glissade', 'glissade', 'viagem_blocks', 'Desliza para o lado da perna escolhida, com um pulinho rente ao chão. Não troca os pés. 2 tempos.'),
    legOnly('bc_bourree', 'pas de bourrée', 'viagem_blocks', 'Dessous: a perna da frente pisa atrás, a outra ao lado, e a primeira fecha na frente. Três pisadinhas na meia ponta. 2 tempos.'),
    legOnly('bc_balance', 'balancé', 'viagem_blocks', 'O passo de valsa: pisa ao lado em demi-plié, troca o peso na meia ponta e volta ao demi-plié. 2 tempos.'),
    plain('bc_fechar', 'fechar a perna', 'pos_blocks', 'Fecha a perna de trabalho na posição dos pés atual. 2 tempos.'),
    // bracos
    legOnly('bc_prep', 'preparação', 'bracos_blocks', 'Braço de trabalho em 1ª e abre para 2ª. 4 tempos.'),
    {
      type: 'bc_braco',
      message0: 'braço %1 em %2',
      args0: [
        { type: 'field_dropdown', name: 'PERNA', options: PERNA_OPTS },
        { type: 'field_dropdown', name: 'POS', options: POS_OPTS },
      ],
      ...stmt,
      style: 'bracos_blocks',
      tooltip: 'Leva o braço de fora para uma posição. 2 tempos.',
    },
    plain('bc_soltar', 'soltar a barra', 'bracos_blocks', 'Solta a mão da barra: os dois braços ficam livres. 2 tempos.'),
    {
      type: 'bc_bracos',
      message0: 'os dois braços em %1',
      args0: [{ type: 'field_dropdown', name: 'POS', options: BRACOS_OPTS }],
      ...stmt,
      style: 'bracos_blocks',
      tooltip: 'As 5 posições de braços (precisa soltar a barra). 2 tempos.',
    },
    plain('bc_segurar', 'segurar a barra', 'bracos_blocks', 'Volta a mão para a barra. 2 tempos.'),
    legOnly('bc_final', 'finalizar', 'bracos_blocks', 'Braço volta para bras bas. 4 tempos.'),
    // lacos
    {
      type: 'bc_repetir',
      message0: 'repetir %1 vezes',
      args0: [{ type: 'field_number', name: 'N', value: 2, min: 1, max: 16, precision: 1 }],
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      ...stmt,
      style: 'laco_blocks',
      tooltip: 'Repete os blocos de dentro.',
    },
    loop('bc_cada', 'para cada direção em en croix', 'Repete os blocos de dentro com (direção) = devant, à la seconde, derrière, à la seconde.'),
    loop('bc_cadapos', 'para cada posição em 1ª, 2ª, 4ª, 5ª', 'Repete os blocos de dentro com (posição) = 1ª, 2ª, 4ª e 5ª.'),
    // funcoes
    {
      type: 'bc_def',
      message0: 'função %1 com (perna)',
      args0: [{ type: 'field_input', name: 'NOME', text: 'combinação' }],
      nextStatement: null,
      style: 'def_blocks',
      tooltip: 'Crie uma combinação reutilizável. Dentro dela, use (perna).',
    },
    {
      type: 'bc_chamar',
      message0: '%1 com perna %2',
      args0: [
        { type: 'field_input', name: 'NOME', text: 'combinação' },
        { type: 'field_dropdown', name: 'PERNA', options: PERNA_OPTS.slice(0, 2) },
      ],
      ...stmt,
      style: 'funcao_blocks',
      tooltip: 'Dança a função com esse nome.',
    },
    plain('bc_virar', 'virar para o outro lado', 'mov_blocks', 'Vira de frente para a barra e troca a mão. 4 tempos.'),
    {
      type: 'bc_pausa',
      message0: 'pausa de %1 tempos',
      args0: [{ type: 'field_number', name: 'N', value: 2, min: 1, max: 16, precision: 1 }],
      ...stmt,
      style: 'mov_blocks',
    },
  ])
}

/*******************************************************************************
 * style
 * funcao: monta um estilo de bloco do Blockly.
 * recebe: primary (cor do bloco), secondary (cor dos campos), tertiary (cor da
 * borda) e hat ('cap' para os blocos de inicio, arredondados em cima).
 * retorna: o objeto de estilo.
 ******************************************************************************/
const style = (primary: string, secondary: string, tertiary: string, hat?: string) => ({
  colourPrimary: primary,
  colourSecondary: secondary,
  colourTertiary: tertiary,
  ...(hat ? { hat } : {}),
})

/*******************************************************************************
 * theme
 * funcao: o tema do editor: cor de cada familia de blocos, cores da area, da
 * gaveta e da barra de rolagem, e a fonte.
 ******************************************************************************/
export const theme = Blockly.Theme.defineTheme('balletcode', {
  name: 'balletcode',
  base: Blockly.Themes.Classic,
  blockStyles: {
    passo_blocks: style('#f48bb0', '#fbd3e2', '#d9618e'),
    pos_blocks: style('#e98fc7', '#f8d6ec', '#cc6aa9'),
    cou_blocks: style('#f59a9a', '#fcd8d8', '#d97575'),
    adage_blocks: style('#c58ce0', '#ecd6f6', '#a466c4'),
    centro_blocks: style('#7fb6d9', '#d2e8f5', '#5a95bc'),
    salto_blocks: style('#f2b066', '#fbe1c3', '#d78e40'),
    viagem_blocks: style('#8fc9a8', '#d6efe1', '#64a985'),
    giro_blocks: style('#b79be0', '#e7dcf6', '#9476c4'),
    grande_blocks: style('#e88f8f', '#f8d6d6', '#c96a6a'),
    bracos_blocks: style('#86abe8', '#d3e2fa', '#5f88cf'),
    laco_blocks: style('#f3a160', '#fbd8bb', '#d9813e'),
    funcao_blocks: style('#a487e0', '#ddd0f6', '#8263c7'),
    def_blocks: style('#a487e0', '#ddd0f6', '#8263c7', 'cap'),
    mov_blocks: style('#5fbea6', '#c8ece2', '#3e9e86'),
    inicio_blocks: style('#efb440', '#fbe5b3', '#cf9220', 'cap'),
  },
  categoryStyles: {},
  componentStyles: {
    workspaceBackgroundColour: '#fffbfd',
    toolboxBackgroundColour: '#fff0f5',
    toolboxForegroundColour: '#6a4774',
    flyoutBackgroundColour: '#fff3f8',
    flyoutForegroundColour: '#6a4774',
    flyoutOpacity: 1,
    scrollbarColour: '#f9aac6',
    scrollbarOpacity: 0.6,
    insertionMarkerColour: '#e46f9a',
    insertionMarkerOpacity: 0.35,
    cursorColour: '#e46f9a',
  },
  fontStyle: { family: 'Nunito, ui-rounded, sans-serif', weight: '800', size: 11 },
  startHats: true,
})

// titulo de secao dentro da gaveta em lista
const label = (text: string) => ({ kind: 'label', text, 'web-class': 'tb-label' })

/*******************************************************************************
 * SECOES
 * funcao: as secoes da gaveta, em ordem, com os blocos de cada uma. a mesma
 * lista serve para a gaveta em lista e para as categorias do celular.
 ******************************************************************************/
const SECOES: [string, string[]][] = [
  ['♡ posições e pliés', ['bc_pes', 'bc_plie', 'bc_grandplie', 'bc_fechar']],
  ['♡ battements', ['bc_tendu', 'bc_glisse', 'bc_jete', 'bc_grandbattement', 'bc_cloche', 'bc_rond']],
  ['♡ cou-de-pied', ['bc_coupe', 'bc_fondu', 'bc_frappe', 'bc_cheval']],
  ['♡ adage, relevé e giro', ['bc_passe', 'bc_developpe', 'bc_arabesque', 'bc_attitude', 'bc_cambre', 'bc_releve', 'bc_pirueta']],
  ['♡ centro', ['bc_centro', 'bc_direcao', 'bc_irponto', 'bc_olharponto', 'bc_fouette', 'bc_penche', 'bc_reverence', 'bc_barra']],
  ['♡ giros', ['bc_pique', 'bc_soutenu', 'bc_fouettegiro']],
  ['♡ deslocamentos', ['bc_glissade', 'bc_bourree', 'bc_balance', 'bc_tombe', 'bc_chasse']],
  ['♡ saltos', ['bc_saute', 'bc_changement', 'bc_echappe', 'bc_assemble', 'bc_sissonne', 'bc_pasdechat', 'bc_grandjete']],
  ['♡ braços', ['bc_prep', 'bc_braco', 'bc_soltar', 'bc_bracos', 'bc_segurar', 'bc_final']],
  ['♡ laços', ['bc_repetir', 'bc_cada', 'bc_cadapos']],
  ['♡ funções', ['bc_def', 'bc_chamar']],
  ['♡ começo e outros', ['bc_start', 'bc_virar', 'bc_pausa']],
]

/*******************************************************************************
 * makeToolbox
 * funcao: monta a gaveta em lista, com os titulos das secoes.
 * recebe: allowed (opcional), os blocos permitidos na fase. sem allowed, entram
 * todos.
 * retorna: a definicao da gaveta. o bloco de inicio sempre aparece; secoes sem
 * nenhum bloco permitido somem.
 ******************************************************************************/
export function makeToolbox(allowed?: string[]) {
  const ok = (t: string) => !allowed || t === 'bc_start' || allowed.includes(t)
  return {
    kind: 'flyoutToolbox',
    contents: SECOES.flatMap(([nome, tipos]) => {
      const items = tipos.filter(ok)
      return items.length ? [label(nome), ...items.map((type) => ({ kind: 'block', type }))] : []
    }),
  }
}

/*******************************************************************************
 * CATEGORIA
 * funcao: para cada secao, o nome curto e a cor da categoria no celular (a
 * gaveta abre por cima e fecha ao arrastar um bloco).
 ******************************************************************************/
const CATEGORIA: Record<string, [string, string]> = {
  '♡ posições e pliés': ['pliés', '#e98fc7'],
  '♡ battements': ['battements', '#f48bb0'],
  '♡ cou-de-pied': ['cou-de-pied', '#f59a9a'],
  '♡ adage, relevé e giro': ['adage', '#c58ce0'],
  '♡ centro': ['centro', '#7fb6d9'],
  '♡ giros': ['giros', '#b79be0'],
  '♡ deslocamentos': ['viagens', '#8fc9a8'],
  '♡ saltos': ['saltos', '#f2b066'],
  '♡ braços': ['braços', '#86abe8'],
  '♡ laços': ['laços', '#f3a160'],
  '♡ funções': ['funções', '#a487e0'],
  '♡ começo e outros': ['começo', '#efb440'],
}

/*******************************************************************************
 * makeToolboxCategorias
 * funcao: monta a gaveta por categorias, usada no celular.
 * recebe: allowed (opcional), os blocos permitidos.
 * retorna: a definicao da gaveta, com a mesma regra de makeToolbox.
 ******************************************************************************/
export function makeToolboxCategorias(allowed?: string[]) {
  const ok = (t: string) => !allowed || t === 'bc_start' || allowed.includes(t)
  return {
    kind: 'categoryToolbox',
    contents: SECOES.flatMap(([nome, tipos]) => {
      const items = tipos.filter(ok)
      const [curto, cor] = CATEGORIA[nome] ?? [nome, '#f48bb0']
      return items.length ? [{ kind: 'category', name: curto, colour: cor, contents: items.map((type) => ({ kind: 'block', type })) }] : []
    }),
  }
}

// gaveta completa pronta (o editor monta a sua com gaveta(), entao esta hoje nao e usada)
export const toolbox = makeToolbox()
