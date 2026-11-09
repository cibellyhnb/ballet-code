/*******************************************************************************
 * convert.ts
 * funcao principal: conversao entre o editor de blocos e o Program do motor,
 * nos dois sentidos. dos blocos para o programa, tambem acha os erros de
 * montagem (bloco vazio, variavel fora do lugar, funcao que nao existe). do
 * programa para os blocos, monta o JSON que o Blockly carrega (modelos, texto,
 * coreografias salvas).
 ******************************************************************************/
import type * as Blockly from 'blockly/core'
import {
  EN_CROIX,
  POSICOES_PLIE,
  type BracosPos,
  type Dir,
  type DirFB,
  type Fn,
  type Instr,
  type PosPes,
  type Program,
  type Sentido,
  type Val,
  type Arab,
  type DirCorpo,
  type DirFS,
  type FormaPique,
  type Ponto,
} from '../engine/program'
import type { ArmPos, Side } from '../engine/state'

/*******************************************************************************
 * BlockError
 * funcao: um erro de montagem. blockId, quando existe, faz o aviso aparecer em
 * cima do bloco.
 ******************************************************************************/
export type BlockError = { blockId?: string; msg: string }
// nomes de variaveis que existem naquele ponto do programa (perna, direcao, posicao)
type Scope = Set<string>

/*******************************************************************************
 * LEG_DIR, LEG_ONLY e PLAIN
 * funcao: tabelas de tipo de bloco para tipo de instrucao, para os blocos que
 * so tem perna e direcao, so perna, ou nenhum campo. os outros blocos sao
 * tratados um a um.
 ******************************************************************************/
export const LEG_DIR = {
  bc_tendu: 'tendu',
  bc_glisse: 'glisse',
  bc_jete: 'jete',
  bc_grandbattement: 'grandBattement',
  bc_fondu: 'fondu',
  bc_frappe: 'frappe',
  bc_developpe: 'developpe',
  bc_tombe: 'tombe',
} as const
export const LEG_ONLY = {
  bc_cloche: 'cloche',
  bc_coupe: 'coupe',
  bc_cheval: 'pasDeCheval',
  bc_passe: 'passe',
  bc_fouette: 'fouette',
  bc_glissade: 'glissade',
  bc_bourree: 'pasDeBourree',
  bc_balance: 'balance',
  bc_assemble: 'assemble',
  bc_sissonne: 'sissonne',
  bc_grandjete: 'grandJete',
  bc_pasdechat: 'pasDeChat',
  bc_fouettegiro: 'fouetteGiro',
  bc_soutenu: 'soutenu',
  bc_penche: 'penche',
} as const
export const PLAIN = {
  bc_virar: 'virar',
  bc_fechar: 'fechar',
  bc_soltar: 'soltar',
  bc_segurar: 'segurar',
  bc_saute: 'saute',
  bc_changement: 'changement',
  bc_echappe: 'echappe',
  bc_reverence: 'reverence',
} as const
// as mesmas tabelas ao contrario, para ir do programa para os blocos
const inv = <T extends Record<string, string>>(o: T) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k])) as Record<string, string>
const LEG_DIR_INV = inv(LEG_DIR)
const LEG_ONLY_INV = inv(LEG_ONLY)
const PLAIN_INV = inv(PLAIN)

/*******************************************************************************
 * useVar
 * funcao: le o valor de um campo que pode ser uma variavel. no menu, a variavel
 * aparece como "$nome".
 * recebe: v (valor do campo), name (nome da variavel), scope (variaveis
 * disponiveis ali), b (o bloco), errs (lista de erros) e onde (texto que diz
 * onde a variavel existe, para a mensagem).
 * retorna: { var: name } para variavel ou o valor fixo. variavel usada fora do
 * lugar gera um erro, mas o valor ainda volta.
 ******************************************************************************/
function useVar<T extends string>(v: string, name: string, scope: Scope, b: Blockly.Block, errs: BlockError[], onde: string): Val<T> {
  if (v === `$${name}`) {
    if (!scope.has(name)) errs.push({ blockId: b.id, msg: `(${name}) só existe dentro de ${onde}. Aqui, escolha um valor.` })
    return { var: name }
  }
  return v as T
}
// atalhos de useVar para cada variavel: perna (funcoes), direcao e posicao (lacos "para cada")
const side = (v: string, s: Scope, b: Blockly.Block, e: BlockError[]) => useVar<Side>(v, 'perna', s, b, e, 'uma função')
const dir = (v: string, s: Scope, b: Blockly.Block, e: BlockError[]) => useVar<Dir>(v, 'direção', s, b, e, '"para cada direção"')
const pos = (v: string, s: Scope, b: Blockly.Block, e: BlockError[]) => useVar<PosPes>(v, 'posição', s, b, e, '"para cada posição"')

/*******************************************************************************
 * chain
 * funcao: le uma pilha de blocos encaixados, de cima para baixo.
 * recebe: first (o primeiro bloco, ou null), scope (variaveis disponiveis) e
 * errs (lista de erros).
 * retorna: a lista de instrucoes. blocos que nao viram instrucao sao pulados.
 ******************************************************************************/
function chain(first: Blockly.Block | null, scope: Scope, errs: BlockError[]): Instr[] {
  const out: Instr[] = []
  for (let b = first; b; b = b.getNextBlock()) {
    const ins = one(b, scope, errs)
    if (ins) out.push(ins)
  }
  return out
}

/*******************************************************************************
 * one
 * funcao: transforma um bloco numa instrucao, lendo os campos dele.
 * recebe: b (o bloco), scope (variaveis disponiveis) e errs (lista de erros).
 * retorna: a Instr, ou null se o bloco nao for um passo (ex: o bloco de
 * inicio).
 ******************************************************************************/
function one(b: Blockly.Block, scope: Scope, errs: BlockError[]): Instr | null {
  const f = (n: string) => String(b.getFieldValue(n))
  const id = b.id
  if (b.type in LEG_DIR)
    return { id, t: LEG_DIR[b.type as keyof typeof LEG_DIR], perna: side(f('PERNA'), scope, b, errs), dir: dir(f('DIR'), scope, b, errs) } as Instr
  if (b.type in LEG_ONLY) return { id, t: LEG_ONLY[b.type as keyof typeof LEG_ONLY], perna: side(f('PERNA'), scope, b, errs) } as Instr
  if (b.type in PLAIN) return { id, t: PLAIN[b.type as keyof typeof PLAIN] } as Instr
  switch (b.type) {
    case 'bc_rond':
      return { id, t: 'rond', perna: side(f('PERNA'), scope, b, errs), sentido: f('SENTIDO') as Sentido }
    case 'bc_arabesque':
      // campos opcionais (TIPO, SENTIDO, VOLTAS, FORMA) podem faltar em blocos salvos antes deles existirem
      return { id, t: 'arabesque', perna: side(f('PERNA'), scope, b, errs), tipo: (b.getField('TIPO') ? f('TIPO') : '1') as Arab }
    case 'bc_pirueta':
      return {
        id,
        t: 'pirueta',
        perna: side(f('PERNA'), scope, b, errs),
        sentido: (b.getField('SENTIDO') ? f('SENTIDO') : 'endehors') as Sentido,
        ...(b.getField('VOLTAS') && f('VOLTAS') === '2' ? { voltas: 2 as const } : {}),
        ...(b.getField('FORMA') && f('FORMA') === 'attitude' ? { forma: 'attitude' as const } : {}),
      }
    case 'bc_pique':
      return { id, t: 'pique', perna: side(f('PERNA'), scope, b, errs), forma: f('FORMA') as FormaPique }
    case 'bc_chasse':
      return { id, t: 'chasse', perna: side(f('PERNA'), scope, b, errs), dir: f('DIR') as DirFS }
    case 'bc_centro':
      return { id, t: 'local', onde: 'centro' }
    case 'bc_barra':
      return { id, t: 'local', onde: 'barra' }
    case 'bc_direcao':
      return { id, t: 'direcao', dir: f('DIR') as DirCorpo }
    case 'bc_olharponto':
      return { id, t: 'olharPonto', n: Number(f('PONTO')) as Ponto }
    case 'bc_irponto':
      return { id, t: 'irPonto', n: Number(f('PONTO')) as Ponto }
    case 'bc_attitude':
      return { id, t: 'attitude', perna: side(f('PERNA'), scope, b, errs), dir: f('DIR') as DirFB }
    case 'bc_cambre':
      return { id, t: 'cambre', dir: f('DIR') as DirFB }
    case 'bc_pes':
      return { id, t: 'pes', pos: pos(f('POS'), scope, b, errs) }
    case 'bc_plie':
    case 'bc_grandplie':
    case 'bc_releve': {
      const t = b.type === 'bc_plie' ? 'demiPlie' : b.type === 'bc_grandplie' ? 'grandPlie' : 'releve'
      const v = f('POS')
      return v === 'atual' ? { id, t } : { id, t, pos: pos(v, scope, b, errs) }
    }
    case 'bc_prep':
      return { id, t: 'preparacao', perna: side(f('PERNA'), scope, b, errs) }
    case 'bc_final':
      return { id, t: 'finalizar', perna: side(f('PERNA'), scope, b, errs) }
    case 'bc_braco':
      return { id, t: 'bracos', perna: side(f('PERNA'), scope, b, errs), pos: f('POS') as ArmPos }
    case 'bc_bracos':
      return { id, t: 'bracosAmbos', pos: f('POS') as BracosPos }
    case 'bc_pausa':
      return { id, t: 'pausa', tempos: Number(f('N')) }
    case 'bc_repetir': {
      const corpo = chain(b.getInputTargetBlock('DO'), scope, errs)
      if (corpo.length === 0) errs.push({ blockId: id, msg: 'O "repetir" está vazio: encaixe passos dentro dele.' })
      return { id, t: 'repetir', vezes: Number(f('N')), corpo }
    }
    case 'bc_cada':
    case 'bc_cadapos': {
      // dentro do "para cada", a variavel do laco passa a existir so para os blocos de dentro
      const nome = b.type === 'bc_cada' ? 'direção' : 'posição'
      const inner = new Set(scope)
      inner.add(nome)
      const corpo = chain(b.getInputTargetBlock('DO'), inner, errs)
      if (corpo.length === 0) errs.push({ blockId: id, msg: 'O "para cada" está vazio: encaixe um passo dentro dele.' })
      return { id, t: 'paraCada', nome, lista: nome === 'direção' ? EN_CROIX : POSICOES_PLIE, corpo }
    }
    case 'bc_chamar':
      return { id, t: 'chamar', fn: f('NOME').trim(), args: { perna: f('PERNA') as Side } }
    default:
      return null
  }
}

/*******************************************************************************
 * workspaceToProgram
 * funcao: le o editor inteiro: as funcoes (blocos de definicao soltos) e o
 * programa embaixo do bloco de inicio.
 * recebe: ws (o espaco de trabalho do Blockly).
 * retorna: o Program e a lista de erros de montagem. sem bloco de inicio,
 * devolve o programa vazio com um erro.
 ******************************************************************************/
export function workspaceToProgram(ws: Blockly.Workspace): { program: Program; errors: BlockError[] } {
  const errors: BlockError[] = []
  const tops = ws.getTopBlocks(true)
  const funcoes: Fn[] = []
  for (const d of tops.filter((b) => b.type === 'bc_def')) {
    const nome = String(d.getFieldValue('NOME')).trim()
    if (funcoes.some((x) => x.nome === nome)) errors.push({ blockId: d.id, msg: `Já existe uma função chamada "${nome}".` })
    funcoes.push({ id: d.id, nome, params: ['perna'], corpo: chain(d.getNextBlock(), new Set(['perna']), errors) })
  }
  const starts = tops.filter((b) => b.type === 'bc_start')
  if (starts.length === 0) {
    errors.push({ msg: 'Falta o bloco amarelo "quando ▶ for clicado". Arraste ele e encaixe os passos embaixo.' })
    return { program: { funcoes, principal: [] }, errors }
  }
  if (starts.length > 1) errors.push({ blockId: starts[1].id, msg: 'Só pode ter um "quando ▶ for clicado".' })
  const principal = chain(starts[0].getNextBlock(), new Set(), errors)
  if (principal.length === 0) errors.push({ blockId: starts[0].id, msg: 'Encaixe passos embaixo do "quando ▶ for clicado".' })

  /*****************************************************************************
   * check
   * funcao: confere as chamadas de funcao: a funcao precisa existir e nao pode
   * chamar ela mesma.
   * recebe: list (instrucoes) e inside (nome da funcao onde a lista esta, se
   * estiver numa).
   * retorna: nada. os problemas vao para errors.
   ****************************************************************************/
  const check = (list: Instr[], inside?: string) => {
    for (const i of list) {
      if (i.t === 'chamar') {
        if (!funcoes.some((x) => x.nome === i.fn))
          errors.push({ blockId: i.id, msg: `Não existe função chamada "${i.fn}". Crie com o bloco "função".` })
        else if (i.fn === inside) errors.push({ blockId: i.id, msg: 'Uma função não pode chamar ela mesma aqui.' })
      }
      if (i.t === 'repetir' || i.t === 'paraCada') check(i.corpo, inside)
    }
  }
  check(principal)
  for (const fn of funcoes) check(fn.corpo, fn.nome)
  return { program: { funcoes, principal }, errors }
}

/*******************************************************************************
 * BJ
 * funcao: um bloco no formato JSON do Blockly: tipo, campos, blocos encaixados
 * dentro, o proximo bloco e a posicao (so para os blocos soltos).
 ******************************************************************************/
type BJ = {
  type: string
  fields?: Record<string, string | number>
  inputs?: Record<string, { block: BJ }>
  next?: { block: BJ }
  x?: number
  y?: number
}

// variavel volta a ser a opcao "$nome" do menu
const sv = (v: Val<Side>) => (typeof v === 'object' ? '$perna' : v)
const dv = (v: Val<Dir>) => (typeof v === 'object' ? '$direção' : v)
const pv = (v: Val<PosPes>) => (typeof v === 'object' ? '$posição' : v)

/*******************************************************************************
 * blockJson
 * funcao: transforma uma instrucao no JSON de um bloco (com os blocos de
 * dentro, para lacos).
 * recebe: i (Instr).
 * retorna: o BJ. lanca erro se a instrucao nao tiver bloco correspondente.
 ******************************************************************************/
function blockJson(i: Instr): BJ {
  if (i.t in LEG_DIR_INV) {
    const x = i as Extract<Instr, { dir: Val<Dir>; perna: Val<Side> }>
    return { type: LEG_DIR_INV[i.t], fields: { PERNA: sv(x.perna), DIR: dv(x.dir) } }
  }
  if (i.t in LEG_ONLY_INV) return { type: LEG_ONLY_INV[i.t], fields: { PERNA: sv((i as { perna: Val<Side> }).perna) } }
  if (i.t in PLAIN_INV) return { type: PLAIN_INV[i.t] }
  switch (i.t) {
    case 'rond':
      return { type: 'bc_rond', fields: { PERNA: sv(i.perna), SENTIDO: i.sentido } }
    case 'arabesque':
      return { type: 'bc_arabesque', fields: { PERNA: sv(i.perna), TIPO: i.tipo ?? '1' } }
    case 'pirueta':
      return { type: 'bc_pirueta', fields: { PERNA: sv(i.perna), SENTIDO: i.sentido ?? 'endehors', VOLTAS: String(i.voltas ?? 1), FORMA: i.forma ?? 'passe' } }
    case 'pique':
      return { type: 'bc_pique', fields: { PERNA: sv(i.perna), FORMA: i.forma } }
    case 'chasse':
      return { type: 'bc_chasse', fields: { PERNA: sv(i.perna), DIR: i.dir } }
    case 'local':
      return { type: i.onde === 'centro' ? 'bc_centro' : 'bc_barra' }
    case 'direcao':
      return { type: 'bc_direcao', fields: { DIR: i.dir } }
    case 'olharPonto':
      return { type: 'bc_olharponto', fields: { PONTO: String(i.n) } }
    case 'irPonto':
      return { type: 'bc_irponto', fields: { PONTO: String(i.n) } }
    case 'attitude':
      return { type: 'bc_attitude', fields: { PERNA: sv(i.perna), DIR: i.dir } }
    case 'cambre':
      return { type: 'bc_cambre', fields: { DIR: i.dir } }
    case 'pes':
      return { type: 'bc_pes', fields: { POS: pv(i.pos) } }
    case 'demiPlie':
    case 'grandPlie':
    case 'releve':
      return {
        type: i.t === 'demiPlie' ? 'bc_plie' : i.t === 'grandPlie' ? 'bc_grandplie' : 'bc_releve',
        fields: { POS: i.pos === undefined ? 'atual' : pv(i.pos) },
      }
    case 'preparacao':
      return { type: 'bc_prep', fields: { PERNA: sv(i.perna) } }
    case 'finalizar':
      return { type: 'bc_final', fields: { PERNA: sv(i.perna) } }
    case 'bracos':
      return { type: 'bc_braco', fields: { PERNA: sv(i.perna), POS: i.pos } }
    case 'bracosAmbos':
      return { type: 'bc_bracos', fields: { POS: i.pos } }
    case 'pausa':
      return { type: 'bc_pausa', fields: { N: i.tempos } }
    case 'repetir': {
      const inner = chainJson(i.corpo)
      return { type: 'bc_repetir', fields: { N: i.vezes }, ...(inner ? { inputs: { DO: { block: inner } } } : {}) }
    }
    case 'paraCada': {
      const inner = chainJson(i.corpo)
      return { type: i.nome === 'posição' ? 'bc_cadapos' : 'bc_cada', ...(inner ? { inputs: { DO: { block: inner } } } : {}) }
    }
    case 'chamar':
      return { type: 'bc_chamar', fields: { NOME: i.fn, PERNA: String(i.args.perna ?? 'R') } }
  }
  throw new Error(`bloco desconhecido: ${i.t}`)
}

/*******************************************************************************
 * chainJson
 * funcao: monta uma pilha de blocos a partir de uma lista de instrucoes.
 * recebe: list (Instr[]).
 * retorna: o primeiro BJ, com os outros encadeados em next, ou undefined se a
 * lista for vazia.
 ******************************************************************************/
function chainJson(list: Instr[]): BJ | undefined {
  let head: BJ | undefined
  // monta de baixo para cima: cada bloco aponta para o que vem depois
  for (let k = list.length - 1; k >= 0; k--) {
    const b = blockJson(list[k])
    if (head) b.next = { block: head }
    head = b
  }
  return head
}

/*******************************************************************************
 * programToJson
 * funcao: o programa inteiro no formato que o Blockly carrega: cada funcao numa
 * pilha solta e o programa principal embaixo do bloco de inicio.
 * recebe: p (Program).
 * retorna: o JSON do espaco de trabalho.
 ******************************************************************************/
export function programToJson(p: Program) {
  const blocks: BJ[] = []
  let y = 24
  for (const f of p.funcoes) {
    const body = chainJson(f.corpo)
    blocks.push({ type: 'bc_def', x: 24, y, fields: { NOME: f.nome }, ...(body ? { next: { block: body } } : {}) })
    y += 400
  }
  const main = chainJson(p.principal)
  blocks.push({ type: 'bc_start', x: 24, y, ...(main ? { next: { block: main } } : {}) })
  return { blocks: { languageVersion: 0, blocks } }
}
