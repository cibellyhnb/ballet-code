/*******************************************************************************
 * fases.test.ts
 * funcao principal: teste dos textos das fases: confere se o objetivo (ou o
 * ditado) de cada fase cita tudo o que a combinacao-alvo tem, inclusive a
 * duracao de cada pausa, se o alvo compila sem avisos, fecha frases de 8
 * tempos, cabe na meta de blocos e usa o conceito pedido. a trilha conserta
 * fica de fora (o texto descreve o erro, nao o alvo). roda com: npx tsx
 * tools/fases.test.ts
 ******************************************************************************/
import { compile, type Instr } from '../src/engine/program'
import { TRILHAS } from '../src/data/trilhas'
import { contarBlocos, usa } from '../src/data/fases'
// como cada numero de tempos pode aparecer escrito no texto
const NUM: Record<number, string[]> = { 1: ['1', 'um'], 2: ['2', 'dois'], 4: ['4', 'quatro'], 6: ['6', 'seis'], 8: ['8', 'oito'] }

/*******************************************************************************
 * PAL
 * funcao: para cada tipo de instrucao, as palavras que contam como "o texto
 * citou este passo" (basta uma).
 ******************************************************************************/
const PAL: Partial<Record<Instr['t'], string[]>> = {
  preparacao: ['preparação'], finalizar: ['finaliz'], demiPlie: ['demi-plié', 'plié'], grandPlie: ['grand plié'], tendu: ['tendu'],
  glisse: ['glissé'], frappe: ['frappé'], rond: ['rond'], grandBattement: ['grand'], developpe: ['développé'], arabesque: ['arabesque'],
  pes: ['pés em', 'quinta', '5ª', 'posição'], local: ['centro'], direcao: ['croisé', 'effacé', 'en face'], fouette: ['fouetté'],
  changement: ['changement'], echappe: ['échappé'], virar: ['vir'], bracos: ['braço'], bracosAmbos: ['braço'], fechar: ['fech'],
  reverence: ['révérence'], glissade: ['glissade'], pasDeBourree: ['pas de bourrée'], balance: ['balancé'], assemble: ['assemblé'],
  sissonne: ['sissonne'], grandJete: ['grand jeté'], pique: ['piqué'], soutenu: ['soutenu'], fouetteGiro: ['fouetté'], releve: ['relevé'],
  cloche: ['cloche'], pasDeCheval: ['pas de cheval'], pirueta: ['pirueta'], penche: ['penché'], pasDeChat: ['pas de chat'], tombe: ['tombé'], chasse: ['chassé'], irPonto: ['ponto'], olharPonto: ['ponto'],
  jete: ['jeté'], fondu: ['fondu'], passe: ['passé'], coupe: ['coupé'], attitude: ['attitude'], cambre: ['cambré'],
}

/*******************************************************************************
 * todas
 * funcao: junta todas as instrucoes de uma lista, entrando nos lacos.
 * recebe: l (Instr[]) e out (lista que vai sendo preenchida).
 * retorna: a lista com todas as instrucoes.
 ******************************************************************************/
function todas(l: Instr[], out: Instr[] = []): Instr[] {
  for (const i of l) {
    out.push(i)
    if ('corpo' in i && Array.isArray((i as { corpo?: Instr[] }).corpo)) todas((i as { corpo: Instr[] }).corpo, out)
  }
  return out
}
let probs = 0
// grupo unico: cada fase de cada trilha; imprime so as que tem problema
for (const [k, t] of Object.entries(TRILHAS)) for (const f of t.lista) {
  if (k === 'conserta') continue
  const texto = (f.ditado ? f.ditado.join(' ') : f.objetivo).toLowerCase()
  const ins = todas([...f.alvo.principal, ...f.alvo.funcoes.flatMap((fn) => fn.corpo)])
  const falta: string[] = []
  for (const i of ins) {
    if (i.t === 'pausa') {
      const n = (i as { tempos: number }).tempos
      if (!texto.includes('pausa') || !(NUM[n] ?? [String(n)]).some((w) => new RegExp(`pausa de ${w}\\b`).test(texto))) falta.push(`pausa de ${n}`)
    } else if (PAL[i.t] && !PAL[i.t]!.some((w) => texto.includes(w))) falta.push(i.t)
  }
  const tl = compile(f.alvo)
  if (tl.diags.length) falta.push('avisos: ' + tl.diags.map((d) => d.msg.slice(0, 50)).join(' / '))
  if (tl.total % 8) falta.push('total ' + tl.total)
  if (k !== 'ditado' && contarBlocos(f.alvo) > f.maxBlocos) falta.push('meta de blocos menor que o alvo')
  if (f.precisa && !usa(f.alvo, f.precisa)) falta.push('alvo não usa ' + f.precisa)
  if (falta.length) {
    probs++
    console.log(`${k} ${f.id}: ${[...new Set(falta)].join(', ')}`)
  }
}
console.log('fases com problema:', probs)
