/*******************************************************************************
 * parse.ts
 * funcao principal: le o programa escrito como texto (o mesmo formato da aba
 * "codigo") e transforma em Program. e tolerante: acentos, maiusculas, espacos
 * e "perna =" ou "direcao =" sao opcionais. os erros vem com o numero da linha
 * e uma explicacao em portugues.
 ******************************************************************************/
import { EN_CROIX, POSICOES_PLIE, isPonto, type Ponto, type FormaPique, type Arab, type Dir, type DirCorpo, type DirFB, type Instr, type PosPes, type Program, type Sentido, type Val } from './program'
import type { ArmPos, Side } from './state'
import type { BracosPos } from './program'

/*******************************************************************************
 * ParseError
 * funcao: um erro de leitura do texto: a linha (contando de 1) e a mensagem.
 ******************************************************************************/
export type ParseError = { linha: number; msg: string }

/*******************************************************************************
 * norm
 * funcao: deixa um texto comparavel: sem acentos, sem os sinais de ordinal e de
 * grau, em minusculas e com um espaco so entre as palavras.
 * recebe: s (string).
 * retorna: o texto normalizado.
 ******************************************************************************/
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[º°ª]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/*******************************************************************************
 * NOMES
 * funcao: todos os jeitos aceitos de escrever cada passo (ja normalizados e sem
 * espacos) e o tipo de instrucao de cada um.
 ******************************************************************************/
const NOMES: Record<string, string> = {
  preparacao: 'preparacao',
  finalizar: 'finalizar',
  tendu: 'tendu',
  battementtendu: 'tendu',
  glisse: 'glisse',
  battementglisse: 'glisse',
  jete: 'jete',
  battementjete: 'jete',
  grandbattement: 'grandBattement',
  encloche: 'cloche',
  cloche: 'cloche',
  rondejambe: 'rond',
  ronddejambe: 'rond',
  coupe: 'coupe',
  passe: 'passe',
  retire: 'passe',
  fondu: 'fondu',
  frappe: 'frappe',
  pasdecheval: 'pasDeCheval',
  developpe: 'developpe',
  arabesque: 'arabesque',
  attitude: 'attitude',
  cambre: 'cambre',
  pirueta: 'pirueta',
  piruetaendehors: 'pirueta',
  pirouette: 'pirueta',
  fouettededage: 'fouette',
  fouettedeadage: 'fouette',
  fouette: 'fouette',
  fechar: 'fechar',
  demiplie: 'demiPlie',
  plie: 'demiPlie',
  grandplie: 'grandPlie',
  releve: 'releve',
  pes: 'pes',
  braco: 'bracos',
  bracos: 'bracosAmbos',
  soltarbarra: 'soltar',
  soltar: 'soltar',
  segurarbarra: 'segurar',
  segurar: 'segurar',
  virarparaoutrolado: 'virar',
  virar: 'virar',
  pausa: 'pausa',
  irparaocentro: 'centro',
  centro: 'centro',
  voltarparaabarra: 'barra',
  barra: 'barra',
  direcaodocorpo: 'direcao',
  corpo: 'direcao',
  virarparaoponto: 'olharPonto',
  olharparaoponto: 'olharPonto',
  irateoponto: 'irPonto',
  iraoponto: 'irPonto',
  irparaoponto: 'irPonto',
  pasdebourreecouru: 'irPonto',
  saute: 'saute',
  changement: 'changement',
  echappesaute: 'echappe',
  echappe: 'echappe',
  reverence: 'reverence',
  glissade: 'glissade',
  pasdebourree: 'pasDeBourree',
  pasdebourreedessous: 'pasDeBourree',
  bourree: 'pasDeBourree',
  balance: 'balance',
  balancedecote: 'balance',
  assemble: 'assemble',
  assembledessus: 'assemble',
  sissonne: 'sissonne',
  sissonnefermee: 'sissonne',
  grandjete: 'grandJete',
  grandjeteenavant: 'grandJete',
  pasdechat: 'pasDeChat',
  pique: 'pique',
  piquet: 'pique',
  fouetteentournant: 'fouetteGiro',
  fouettes: 'fouetteGiro',
  soutenu: 'soutenu',
  soutenuentournant: 'soutenu',
  tombe: 'tombe',
  chasse: 'chasse',
  penche: 'penche',
  arabesquepenchee: 'penche',
}

/*******************************************************************************
 * Tok
 * funcao: o que foi entendido dos argumentos de uma linha. um mesmo argumento
 * pode preencher varios campos (ex: "5" serve de posicao dos pes, dos bracos e
 * de numero); cada passo pega so o que precisa.
 ******************************************************************************/
type Tok = { forma?: FormaPique; dupla?: boolean; attitude?: boolean; perna?: Val<Side>; dir?: Val<Dir>; pos?: Val<PosPes>; arm?: ArmPos; bracos?: BracosPos; sentido?: Sentido; corpo?: DirCorpo; n?: number; arab?: Arab; fb?: DirFB }

/*******************************************************************************
 * classify
 * funcao: entende um argumento e guarda em out o que ele significa.
 * recebe: raw (o argumento como foi escrito) e out (Tok, preenchido aqui).
 * retorna: true se entendeu (argumento vazio tambem conta), false se nao.
 ******************************************************************************/
function classify(raw: string, out: Tok): boolean {
  let a = norm(raw)
  const eq = a.indexOf('=')
  // "perna = direita" vale o mesmo que "direita": o que vem antes do sinal de igual e ignorado
  if (eq >= 0) a = a.slice(eq + 1).trim()
  a = a.replace(/ posicao$/, '').replace(/ tempos?$/, '').trim()
  if (a === '') return true
  if (a === 'direita') return (out.perna = 'R'), true
  if (a === 'esquerda') return (out.perna = 'L'), true
  if (a === 'perna') return (out.perna = { var: 'perna' }), true
  if (a === 'direcao') return (out.dir = { var: 'direção' }), true
  if (a === 'posicao') return (out.pos = { var: 'posição' }), true
  if (a === 'devant') return (out.dir = 'devant'), (out.fb = 'devant'), true
  if (a === 'a la seconde' || a === 'seconde' || a === 'ala seconde') return (out.dir = 'seconde'), true
  if (a === 'derriere') return (out.dir = 'derriere'), (out.fb = 'derriere'), true
  if (a === 'dupla' || a === '2 voltas' || a === 'duas voltas') return (out.dupla = true), true
  if (a === 'simples') return true
  if (a === 'attitude' || a === 'em attitude') return (out.attitude = true), true
  if (a === 'en dedans (giro)' || a === 'giro') return (out.forma = 'giro'), true
  if (a === 'em retire' || a === 'retire' || a === 'passe') return (out.forma = 'passe'), true
  if (a === 'em arabesque' || a === 'arabesque') return (out.forma = 'arabesque'), true
  if (a === 'en dehors') return (out.sentido = 'endehors'), true
  if (a === 'en dedans') return (out.sentido = 'endedans'), true
  if (a === 'en face') return (out.corpo = 'enface'), true
  if (a === 'croise') return (out.corpo = 'croise'), true
  if (a === 'efface') return (out.corpo = 'efface'), true
  if (a === 'ecarte') return (out.corpo = 'ecarte'), true
  if (a === 'bras bas') return (out.arm = 'brasBas'), (out.bracos = 'brasBas'), true
  if (a === 'demi-seconde' || a === 'demi seconde') return (out.arm = 'demiSeconde'), true
  // numero de 1 a 5: pode ser posicao dos pes, tipo de arabesque, posicao dos bracos ou so um numero
  if (/^[1-5]$/.test(a)) {
    const n = a as PosPes
    out.pos = n
    out.arab = (['1', '2', '3'].includes(n) ? n : undefined) as Arab | undefined
    const armMap: Record<string, ArmPos | undefined> = { '1': 'primeira', '2': 'segunda', '5': 'quinta' }
    const brMap: Record<string, BracosPos> = { '1': 'primeira', '2': 'segunda', '3': 'terceira', '4': 'quarta', '5': 'quinta' }
    out.arm = armMap[n]
    out.bracos = brMap[n]
    out.n = Number(n)
    return true
  }
  if (/^\d+$/.test(a)) return (out.n = Number(a)), true
  return false
}

/*******************************************************************************
 * precisa
 * funcao: confere se um argumento obrigatorio veio.
 * recebe: v (o valor ou undefined), linha (para o erro), oque (o nome do que
 * falta, para a mensagem) e errs (lista de erros).
 * retorna: o proprio v. se faltar, registra o erro e devolve undefined mesmo
 * assim.
 ******************************************************************************/
function precisa<T>(v: T | undefined, linha: number, oque: string, errs: ParseError[]): T {
  if (v === undefined) errs.push({ linha, msg: `Falta ${oque} aqui.` })
  return v as T
}

/*******************************************************************************
 * instr
 * funcao: monta a instrucao de uma linha a partir do nome do passo e dos
 * argumentos.
 * recebe: nome (o nome escrito), args (os argumentos separados), linha (numero
 * da linha), errs (lista de erros) e fnNames (nomes das funcoes do programa).
 * retorna: a Instr, ou null se o nome nao for um passo nem uma funcao.
 ******************************************************************************/
function instr(nome: string, args: string[], linha: number, errs: ParseError[], fnNames: Set<string>): Instr | null {
  const key = norm(nome).replace(/[^a-z]/g, '')
  const t = NOMES[key]
  const tok: Tok = {}
  for (const a of args) if (!classify(a, tok)) errs.push({ linha, msg: `Não entendi "${a.trim()}".` })
  if (!t) {
    // nome que nao e passo: pode ser uma chamada de funcao criada pela jogadora
    if (fnNames.has(nome.trim())) return { t: 'chamar', fn: nome.trim(), args: { perna: (tok.perna as Side) ?? 'R' } }
    errs.push({ linha, msg: `Não conheço o passo "${nome}". Confira o nome na aba de blocos.` })
    return null
  }
  const perna = () => precisa(tok.perna, linha, 'a perna (direita, esquerda ou perna)', errs)
  const dir = () => precisa(tok.dir, linha, 'a direção (devant, à la seconde, derrière ou direção)', errs)
  switch (t) {
    case 'preparacao':
    case 'finalizar':
    case 'cloche':
    case 'coupe':
    case 'passe':
    case 'pasDeCheval':
    case 'fouette':
    case 'glissade':
    case 'pasDeBourree':
    case 'balance':
    case 'assemble':
    case 'sissonne':
    case 'grandJete':
      return { t, perna: perna() } as Instr
    case 'tendu':
    case 'glisse':
    case 'jete':
    case 'grandBattement':
    case 'fondu':
    case 'frappe':
    case 'developpe':
      return { t, perna: perna(), dir: dir() } as Instr
    case 'rond':
      return { t, perna: perna(), sentido: tok.sentido ?? 'endehors' }
    case 'arabesque':
      return tok.arab ? { t, perna: perna(), tipo: tok.arab } : { t, perna: perna() }
    case 'attitude':
      return { t, perna: perna(), dir: tok.fb ?? 'derriere' }
    case 'cambre':
      return { t, dir: tok.fb ?? 'devant' }
    case 'pirueta':
      return { t, perna: perna(), sentido: tok.sentido ?? 'endehors', ...(tok.dupla ? { voltas: 2 as const } : {}), ...(tok.attitude ? { forma: 'attitude' as const } : {}) }
    case 'pasDeChat':
    case 'fouetteGiro':
    case 'soutenu':
    case 'penche':
      return { t, perna: perna() } as Instr
    case 'pique':
      return { t, perna: perna(), forma: tok.forma ?? 'giro' }
    case 'tombe':
      return { t, perna: perna(), dir: dir() }
    case 'chasse':
      return { t, perna: perna(), dir: tok.dir === 'seconde' ? 'seconde' : 'devant' }
    case 'demiPlie':
    case 'grandPlie':
    case 'releve':
      return tok.pos ? { t, pos: tok.pos } : { t }
    case 'pes':
      return { t, pos: precisa(tok.pos, linha, 'a posição (1ª a 5ª)', errs) }
    case 'bracos':
      return { t, perna: perna(), pos: precisa(tok.arm, linha, 'a posição do braço', errs) }
    case 'bracosAmbos':
      return { t, pos: precisa(tok.bracos, linha, 'a posição dos braços', errs) }
    case 'pausa':
      return { t, tempos: tok.n ?? 2 }
    case 'centro':
      return { t: 'local', onde: 'centro' }
    case 'barra':
      return { t: 'local', onde: 'barra' }
    case 'olharPonto':
    case 'irPonto': {
      const n = precisa(tok.n, linha, 'o número do ponto da sala (de 1 a 8)', errs)
      if (n !== undefined && !isPonto(n)) errs.push({ linha, msg: `A sala só tem os pontos de 1 a 8 (não ${n}).` })
      return { t, n: (isPonto(n) ? n : 1) as Ponto }
    }
    case 'direcao':
      return { t, dir: precisa(tok.corpo, linha, 'a direção do corpo (en face, croisé, effacé ou écarté)', errs) }
    default:
      return { t } as Instr
  }
}

/*******************************************************************************
 * parseProgram
 * funcao: le o texto inteiro, linha por linha. o recuo (espacos no comeco)
 * decide o que fica dentro de "repetir", "para cada" e "funcao", como no
 * Python. o que vem depois de # e comentario.
 * recebe: texto (string).
 * retorna: o Program e a lista de erros. mesmo com erros, devolve o programa
 * com o que deu para entender.
 ******************************************************************************/
export function parseProgram(texto: string): { program: Program; errors: ParseError[] } {
  const errors: ParseError[] = []
  const linhas = texto.split('\n')
  // primeiro junta os nomes das funcoes, para uma chamada funcionar mesmo antes da definicao
  const fnNames = new Set<string>()
  for (const l of linhas) {
    const m = l.match(/^\s*fun[cç][aã]o\s+([^(:]+)/i)
    if (m) fnNames.add(m[1].trim())
  }
  type Frame = { indent: number; list: Instr[] }
  const program: Program = { funcoes: [], principal: [] }
  // pilha de listas abertas: cada nivel de recuo aponta para a lista onde as proximas linhas entram
  let stack: Frame[] = [{ indent: -1, list: program.principal }]
  let esperaBloco: { linha: number } | null = null

  linhas.forEach((orig, i) => {
    const linha = i + 1
    const semComentario = orig.replace(/#.*$/, '')
    if (!semComentario.trim()) return
    const indent = semComentario.match(/^\s*/)![0].replace(/\t/g, '    ').length
    const l = semComentario.trim()

    // a linha depois de um dois-pontos define o recuo do bloco que comecou
    if (esperaBloco) {
      if (indent <= stack[stack.length - 1].indent) errors.push({ linha: esperaBloco.linha, msg: 'Depois dos dois-pontos, as linhas de dentro precisam de recuo (espaços no começo).' })
      else stack[stack.length - 1].indent = indent - 1
      esperaBloco = null
    }
    // linha com menos recuo fecha os blocos abertos
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop()
    const top = stack[stack.length - 1]

    // funcao: so pode comecar sem recuo e sempre recebe o parametro perna
    const fn = l.match(/^fun[cç][aã]o\s+([^(:]+)\s*(\(([^)]*)\))?\s*:$/i)
    if (fn) {
      if (indent > 0) errors.push({ linha, msg: 'A função precisa começar sem recuo, fora de outros blocos.' })
      const f = { nome: fn[1].trim(), params: ['perna'], corpo: [] as Instr[] }
      program.funcoes.push(f)
      stack = [{ indent: -1, list: program.principal }, { indent, list: f.corpo }]
      esperaBloco = { linha }
      return
    }
    // repetir: o numero de vezes fica entre 1 e 16
    const rep = l.match(/^repetir\s+(\d+)\s*(vezes?)?\s*:$/i)
    if (rep) {
      const ins: Instr = { t: 'repetir', vezes: Math.max(1, Math.min(16, Number(rep[1]))), corpo: [] }
      top.list.push(ins)
      stack.push({ indent, list: ins.corpo })
      esperaBloco = { linha }
      return
    }
    // para cada: a variavel e posicao ou direcao, conforme o nome escrito; a lista vem pronta
    const pc = l.match(/^para cada\s+(\S+)\s+em\s+.*:$/i)
    if (pc) {
      const nome = norm(pc[1]).startsWith('pos') ? 'posição' : 'direção'
      const ins: Instr = { t: 'paraCada', nome, lista: nome === 'posição' ? POSICOES_PLIE : EN_CROIX, corpo: [] }
      top.list.push(ins)
      stack.push({ indent, list: ins.corpo })
      esperaBloco = { linha }
      return
    }
    if (l.endsWith(':')) {
      errors.push({ linha, msg: 'Só "repetir", "para cada" e "função" terminam com dois-pontos.' })
      return
    }
    // qualquer outra linha e um passo: nome(argumentos) ou so o nome
    const call = l.match(/^([^(]+?)\s*(\((.*)\))?$/)
    if (!call) {
      errors.push({ linha, msg: 'Não entendi esta linha.' })
      return
    }
    const args = call[3] !== undefined && call[3].trim() !== '' ? call[3].split(',') : []
    const ins = instr(call[1], args, linha, errors, fnNames)
    if (ins) top.list.push(ins)
  })
  if (esperaBloco) errors.push({ linha: (esperaBloco as { linha: number }).linha, msg: 'Este bloco terminou vazio: escreva passos embaixo, com recuo.' })
  return { program, errors }
}
