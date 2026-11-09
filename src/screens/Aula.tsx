/*******************************************************************************
 * Aula.tsx
 * funcao principal: as telas das trilhas com fases (aula, desafios, conserta,
 * professora dita e grand allegro): o mapa de fases com estrelas e cadeados, o
 * painel de uma fase com o editor de blocos e a conferencia com a professora,
 * que da as estrelas e explica a primeira diferenca em relacao ao exemplo.
 ******************************************************************************/
import { useEffect, useState } from 'react'
import { Professora } from '../components/Professora'
import { contarBlocos, usa, type Fase } from '../data/fases'
import { TRILHAS, acharFase, isTrilha, type Trilha } from '../data/trilhas'
import { compile, danceSignature, moveSignature, type Program, type Timeline } from '../engine/program'
import { safeCompile, useStore } from '../store'
import { BlockEditor } from '../components/BlockEditor'
import { Bubble, Lock, Play, Sparkle, Star } from '../ui/icons'
import { sfx, unlockAudio } from '../audio'

// "1 tempo" ou "n tempos"
const T = (n: number) => `${n} tempo${n === 1 ? '' : 's'}`
// nome que aparece nas mensagens para os blocos que um desafio pode proibir
const NOME_BLOCO: Record<string, string> = { pes: 'pés em', repetir: 'repetir', paraCada: 'para cada', chamar: 'chamar' }
const VAZIO: Program = { funcoes: [], principal: [] }

/*******************************************************************************
 * Stars
 * funcao: as tres estrelas, acesas ate n.
 * recebe: n (number, 0 a 3) e size (tamanho em px, 18 se nao vier).
 * retorna: as estrelas.
 ******************************************************************************/
function Stars({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <span className="stars">
      {[0, 1, 2].map((i) => (
        <Star key={i} size={size} className={i < n ? 'on' : ''} />
      ))}
    </span>
  )
}

/*******************************************************************************
 * useTrilha
 * funcao: hook que diz em qual trilha a jogadora esta.
 * recebe: nada.
 * retorna: a trilha do modo atual, ou 'aula' se o modo nao for uma trilha.
 ******************************************************************************/
function useTrilha(): Trilha {
  const mode = useStore((s) => s.mode)
  return isTrilha(mode) ? mode : 'aula'
}

/*******************************************************************************
 * Trail
 * funcao: um caminho de fases no mapa, com numero, nome, conceito e estrelas de
 * cada uma.
 * recebe: lista (as fases, em ordem) e titulo (opcional, o nome do caminho,
 * como barra ou centro).
 * retorna: o caminho de fases.
 ******************************************************************************/
function Trail({ lista, titulo }: { lista: Fase[]; titulo?: string }) {
  const stars = useStore((s) => s.stars)
  const openFase = useStore((s) => s.openFase)
  return (
    <div className="trail-part">
      {titulo && <h3 className="trail-title">{titulo}</h3>}
      <div className="trail">
        {lista.map((f, i) => {
          // liberada se a anterior tem estrela (ou se ela mesma ja tem: fases novas no meio nao trancam o que ja foi feito)
          const unlocked = i === 0 || (stars[lista[i - 1].id] ?? 0) > 0 || (stars[f.id] ?? 0) > 0
          const n = stars[f.id] ?? 0
          return (
            <button
              key={f.id}
              className={`stop ${unlocked ? '' : 'locked'} ${n === 3 ? 'perfect' : ''}`}
              style={{ ['--i' as string]: i }}
              disabled={!unlocked}
              onClick={() => (unlockAudio(), openFase(f.id))}
            >
              <span className="stop-dot">{unlocked ? i + 1 : <Lock size={20} />}</span>
              <span className="stop-name">{f.titulo}</span>
              <span className="stop-tag">{f.conceito}</span>
              <Stars n={n} size={15} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/*******************************************************************************
 * AulaMap
 * funcao: mapa da trilha atual: titulo, introducao, total de estrelas e o
 * caminho de fases. na aula, barra e centro viram dois caminhos separados.
 * recebe: nada.
 * retorna: a tela do mapa.
 ******************************************************************************/
export function AulaMap() {
  const trilha = useTrilha()
  const stars = useStore((s) => s.stars)
  const { titulo, intro, lista } = TRILHAS[trilha]
  const total = lista.reduce((n, f) => n + (stars[f.id] ?? 0), 0)
  return (
    <div className="aula-map">
      <div className="map-head">
        <h2>{titulo}</h2>
        <p>{intro}</p>
        <div className="map-total">
          <Star size={18} /> {total} de {lista.length * 3}
        </div>
      </div>
      {trilha === 'aula' ? (
        (['barra', 'centro'] as const).map((parte) => (
          <Trail key={parte} titulo={parte === 'barra' ? 'Barra' : 'Centro'} lista={lista.filter((f) => (f.parte ?? 'barra') === parte)} />
        ))
      ) : (
        <Trail lista={lista} />
      )}
    </div>
  )
}

/*******************************************************************************
 * Result
 * funcao: resultado de conferir uma fase: estrelas ganhas, os itens da lista de
 * conferencia (cada um certo ou nao) e a mensagem da professora.
 ******************************************************************************/
type Result = { stars: number; itens: { txt: string; ok: boolean }[]; msg: string }

/*******************************************************************************
 * firstDifference
 * funcao: acha o primeiro movimento em que a combinacao da jogadora difere da
 * professora e explica em palavras: passo trocado, duracao, perna, bracos,
 * direcao ou posicao das pernas.
 * recebe: mine (Timeline da jogadora) e alvo (Timeline do exemplo).
 * retorna: a frase da professora, ou "" se nao achar diferenca.
 ******************************************************************************/
function firstDifference(mine: Timeline, alvo: Timeline): string {
  const n = Math.max(mine.moves.length, alvo.moves.length)
  for (let k = 0; k < n; k++) {
    const a = alvo.moves[k]
    const m = mine.moves[k]
    if (!a) return `A sua combinação continua depois que a da professora termina (ela tem ${T(alvo.total)}).`
    if (!m) return `Faltou um pedaço: depois de "${mine.moves.at(-1)?.label ?? 'começar'}", a professora pediu "${a.label}".`
    if (a.label !== m.label || a.beats !== m.beats) {
      const b = Math.floor(alvo.starts[k])
      const onde = `Na frase ${Math.floor(b / 8) + 1}, tempo ${(b % 8) + 1}`
      // mesmo passo, mas com outra duracao (por exemplo, uma pausa de 2 no lugar de uma de 4)
      if (a.label === m.label)
        return `Quase! ${onde}, a professora pediu "${a.label}" com ${T(a.beats)}, mas a sua bailarina fez com ${T(m.beats)}.`
      return `Quase! ${onde}, a professora pediu "${a.label}", mas a sua bailarina fez "${m.label}".`
    }
    // mesmo passo e mesma duracao: compara a assinatura (rotulo, tempos, peso, pernas, bracos, lugar) para achar o que mudou
    const sa = moveSignature(alvo, k).split('#')
    const sm = moveSignature(mine, k).split('#')
    if (sa.join('#') !== sm.join('#')) {
      const b = Math.floor(alvo.starts[k])
      const onde = `Na frase ${Math.floor(b / 8) + 1}, tempo ${(b % 8) + 1} ("${a.label}")`
      const lado = (w: string) => (w === 'R' ? 'esquerda' : 'direita') // o peso numa perna = a outra trabalha
      if (sa[1] !== sm[1] && sa[1] !== 'both' && sm[1] !== 'both' && sa[1] !== 'livre' && sm[1] !== 'livre')
        return `Quase! ${onde}, a professora usou a perna ${lado(sa[1])}, mas a sua bailarina usou a ${lado(sm[1])}.`
      if (sa[3] !== sm[3]) return `Quase! ${onde}, o passo está certo, mas os braços estão diferentes dos da professora.`
      if (sa[4] !== sm[4]) return `Quase! ${onde}, o passo está certo, mas o corpo está virado para outra direção (ou em outro lugar da sala).`
      return `Quase! ${onde}, o passo está certo, mas as pernas estão em outra posição (confira a perna e a direção).`
    }
  }
  return ''
}

/*******************************************************************************
 * check
 * funcao: confere o programa da jogadora contra o exemplo da fase e calcula as
 * estrelas pela regra de cada trilha. desafios: tudo ou nada (ou 1 estrela se a
 * fase nao for rigida). conserta: certo, sem dica pendente e poucos blocos.
 * ditado: certo, sem ver o exemplo e poucos blocos. aula e grand allegro:
 * certo, usou o conceito e poucos blocos.
 * recebe: f (a fase), trilha (Trilha) e viuExemplo (boolean, se ela abriu o
 * exemplo no ditado).
 * retorna: o Result. com erro nos blocos, devolve 0 estrelas e o pedido para
 * consertar.
 ******************************************************************************/
function check(f: Fase, trilha: Trilha, viuExemplo: boolean): Result {
  const { program, errors, tips } = useStore.getState()
  const blocos = contarBlocos(program)
  if (errors.length) return { stars: 0, itens: [], msg: 'Conserte os blocos marcados antes de conferir.' }
  const ok = danceSignature(safeCompile(program)) === danceSignature(compile(f.alvo))
  const diff = ok ? '' : firstDifference(safeCompile(program), compile(f.alvo))

  if (trilha === 'desafios') {
    const proibido = (f.proibido ?? []).find((t) => usa(program, t))
    const regra = !proibido && (!f.precisa || usa(program, f.precisa))
    const poucos = blocos <= f.maxBlocos
    const itens = [
      { txt: 'dançou igual ao pedido', ok },
      { txt: f.proibido ? `sem usar o bloco "${NOME_BLOCO[f.proibido[0]] ?? f.proibido[0]}"` : f.precisa ? `usou ${f.conceito}` : 'seguiu a regra', ok: ok && regra },
      { txt: `até ${f.maxBlocos} blocos (você usou ${blocos})`, ok: ok && poucos },
    ]
    const cumprido = ok && regra && poucos
    const msg = proibido
      ? `Neste desafio o bloco "${NOME_BLOCO[proibido] ?? proibido}" é proibido! Tente outro caminho.`
      : !ok
        ? diff
        : !regra
          ? `Dançou certinho! Mas o desafio pede: ${f.conceito}.`
          : !poucos
            ? `Dançou certinho, mas com ${blocos} blocos. O desafio é fazer com até ${f.maxBlocos}.`
            : 'Desafio cumprido! Que programa elegante.'
    return { stars: cumprido ? 3 : f.rigido ? 0 : ok ? 1 : 0, itens, msg }
  }

  // fora da aula, o limite de blocos e o tamanho do proprio exemplo
  const meta = trilha === 'aula' ? f.maxBlocos : contarBlocos(f.alvo)
  const poucos = blocos <= meta
  if (trilha === 'conserta') {
    const limpo = tips.length === 0
    const itens = [
      { txt: 'a combinação ficou certa', ok },
      { txt: 'sem nenhuma dica pendente', ok: ok && limpo },
      { txt: `conserto enxuto: até ${meta} blocos (você usou ${blocos})`, ok: ok && poucos },
    ]
    const stars = ok ? 1 + (limpo ? 1 : 0) + (poucos ? 1 : 0) : 0
    const msg = !ok
      ? diff
      : stars === 3
        ? 'Consertado! Achou o erro e mexeu só no necessário.'
        : !limpo
          ? `Dançou certinho! Mas ainda tem uma dica: ${tips[0].msg}`
          : `Dançou certinho! Dá para consertar com ${meta} blocos.`
    return { stars, itens, msg }
  }

  if (trilha === 'ditado') {
    const itens = [
      { txt: 'montou igual ao ditado', ok },
      { txt: 'sem precisar ver o exemplo', ok: ok && !viuExemplo },
      { txt: `até ${meta} blocos (você usou ${blocos})`, ok: ok && poucos },
    ]
    const stars = ok ? 1 + (!viuExemplo ? 1 : 0) + (poucos ? 1 : 0) : 0
    const msg = !ok
      ? `${diff} Agora você já pode ver o exemplo da professora.`
      : stars === 3
        ? 'Ouvido de bailarina! Montou tudinho só ouvindo.'
        : viuExemplo
          ? 'Dançou certinho! Da próxima vez, tente sem olhar o exemplo.'
          : `Dançou certinho! Dá para montar com ${meta} blocos.`
    return { stars, itens, msg }
  }

  // aula e grand allegro: a 3a estrela so vem junto com o conceito da fase
  const conceito = !f.precisa || usa(program, f.precisa)
  const itens = [
    { txt: 'dançou igual ao exemplo', ok },
    { txt: `usou o conceito: ${f.conceito}`, ok: ok && conceito },
    { txt: `até ${f.maxBlocos} blocos (você usou ${blocos})`, ok: ok && conceito && poucos },
  ]
  const stars = ok ? 1 + (conceito ? 1 : 0) + (conceito && poucos ? 1 : 0) : 0
  const msg = !ok
    ? diff
    : stars === 3
      ? 'Perfeito! Dançou igualzinho e com um programa enxuto.'
      : !conceito
        ? `Dançou certinho! Para a próxima estrela, use o conceito da fase: ${f.conceito}.`
        : `Dançou certinho! Você usou ${blocos} blocos; dá para fazer com ${f.maxBlocos}.`
  return { stars, itens, msg }
}

/*******************************************************************************
 * Ditado
 * funcao: a professora desenhada com o balao do ditado. cada clique mostra a
 * proxima fala e as anteriores ficam numa listinha acima.
 * recebe: falas (lista de frases da combinacao) e faseId (para recomecar do
 * zero ao trocar de fase).
 * retorna: a professora com o balao.
 ******************************************************************************/
function Ditado({ falas, faseId }: { falas: string[]; faseId: string }) {
  const [n, setN] = useState(0)
  useEffect(() => setN(0), [faseId])
  const proxima = () => setN(n < falas.length ? n + 1 : 1)
  const atual = n === 0 ? 'Oi! Quando estiver pronta, é só me chamar que eu digo a combinação.' : falas[n - 1]
  return (
    <div className="ditado">
      <Professora />
      <div className="prof-balao">
        {n > 1 && (
          <ol className="ditado-falas">
            {falas.slice(0, n - 1).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        )}
        <div className="prof-atual" key={n}>
          {atual}
        </div>
        <button className="pill pink" onClick={proxima}>
          <Bubble size={13} /> {n === 0 ? 'começar o ditado' : n < falas.length ? 'e depois?' : 'de novo, do começo'}
        </button>
      </div>
    </div>
  )
}

/*******************************************************************************
 * FasePanel
 * funcao: painel de uma fase: volta para o mapa, numero e estrelas, objetivo ou
 * ditado, botoes de exemplo e recomecar, o editor de blocos, erros e dicas, o
 * botao de conferir e a janela do resultado.
 * recebe: nada (le a fase atual do store).
 * retorna: o painel lateral.
 ******************************************************************************/
export function FasePanel() {
  const trilha = useTrilha()
  const faseId = useStore((s) => s.faseId)!
  const openFase = useStore((s) => s.openFase)
  const preview = useStore((s) => s.preview)
  const setStars = useStore((s) => s.setStars)
  const resetEditor = useStore((s) => s.resetEditor)
  const errors = useStore((s) => s.errors)
  const tips = useStore((s) => s.tips)
  const best = useStore((s) => s.stars[faseId] ?? 0)
  const achado = acharFase(faseId)!
  const { fase: f, lista } = achado
  const idx = lista.indexOf(f)
  const info = TRILHAS[trilha]
  const [result, setResult] = useState<Result | null>(null)
  const [tentou, setTentou] = useState(false)
  const [viuExemplo, setViuExemplo] = useState(false)
  useEffect(() => {
    setTentou(false)
    setViuExemplo(false)
  }, [faseId])

  // no ditado o exemplo so aparece depois de uma tentativa conferida
  const mostraExemplo = !f.ditado || tentou
  const proxima = lista[idx + 1]
  // na aula, o botao de proxima fase nao pula da barra para o centro
  const mesmoBloco = proxima && (trilha !== 'aula' || (proxima.parte ?? 'barra') === (f.parte ?? 'barra'))
  const numero =
    trilha === 'aula'
      ? `${f.parte === 'centro' ? 'centro' : 'barra'} · fase ${lista.filter((x) => (x.parte ?? 'barra') === (f.parte ?? 'barra')).indexOf(f) + 1}`
      : `${info.item} ${idx + 1}`
  const meta = trilha === 'aula' || trilha === 'desafios' || trilha === 'allegro' ? f.maxBlocos : contarBlocos(f.alvo)
  const duracao = compile(f.alvo).total

  return (
    <aside className="panel studio">
      <div className="mission">
        <button className="back-link" onClick={() => openFase(null)}>
          ‹ {trilha === 'aula' ? 'fases' : info.titulo.toLowerCase()}
        </button>
        <div className="mission-head">
          <span className="mission-n">{numero}</span>
          <Stars n={best} />
        </div>
        <h3>{f.titulo}</h3>
        {f.ditado ? (
          <Ditado falas={f.ditado} faseId={f.id} />
        ) : (
          <>
            <p className="mission-goal">{f.objetivo}</p>
            <p className="mission-tip">
              <Sparkle size={11} /> {f.dica}
            </p>
          </>
        )}
        <div className="mission-actions">
          {mostraExemplo && (
            <button
              className="pill lilac"
              onClick={() => {
                unlockAudio()
                setViuExemplo(true)
                preview(f.alvo)
              }}
            >
              <Play size={14} /> {trilha === 'conserta' ? 'ver como deveria ser' : 'ver exemplo'}
            </button>
          )}
          <button className="pill ghost" onClick={() => resetEditor()}>
            {f.inicial ? 'desfazer tudo' : 'recomeçar'}
          </button>
          <span className="mission-meta">
            {T(duracao)} · {trilha === 'desafios' ? `meta: até ${meta} blocos` : `★ com até ${meta} blocos`}
          </span>
        </div>
      </div>

      <section className="notebook editor">
        <div className="editor-area">
          <BlockEditor key={f.id} storageKey={`balletcode.fase.${f.id}`} initial={f.inicial ?? VAZIO} allowed={f.gaveta} />
        </div>
        {errors.length > 0 && (
          <div className="oops">
            <b>Ops! Antes de dançar:</b>
            <ul>
              {errors.slice(0, 2).map((e, i) => (
                <li key={i}>{e.msg}</li>
              ))}
            </ul>
          </div>
        )}
        {errors.length === 0 && tips.length > 0 && (
          <div className="hint-box">
            <b>Dica:</b> {tips[0].msg}
          </div>
        )}
      </section>

      <button
        className="menu-btn pink check-btn"
        onClick={() => {
          const r = check(f, trilha, viuExemplo)
          if (r.stars > 0) {
            setStars(f.id, r.stars)
            if (useStore.getState().sound) sfx('estrela')
          }
          // itens vazios: nem chegou a conferir (tinha erro nos blocos), entao nao conta como tentativa
          if (r.itens.length) setTentou(true)
          setResult(r)
        }}
      >
        <span className="menu-txt">
          <b>conferir com a professora</b>
        </span>
      </button>

      {result && (
        <div className="modal-bg" onClick={() => setResult(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <Stars n={result.stars} size={40} />
            <h3>{result.stars === 0 ? 'Vamos tentar de novo?' : result.stars === 3 ? 'Brava!' : 'Muito bem!'}</h3>
            <p>{result.msg}</p>
            {result.itens.length > 0 && (
              <ul className="checklist">
                {result.itens.map((it, i) => (
                  <li key={i} className={it.ok ? 'yes' : ''}>
                    {it.txt}
                  </li>
                ))}
              </ul>
            )}
            <div className="modal-actions">
              <button className="pill ghost" onClick={() => setResult(null)}>
                {result.stars === 3 ? 'ficar aqui' : 'continuar tentando'}
              </button>
              {result.stars > 0 && mesmoBloco && (
                <button
                  className="pill pink"
                  onClick={() => {
                    setResult(null)
                    openFase(proxima.id)
                  }}
                >
                  próxim{info.item === 'fase' ? 'a' : 'o'} {info.item} ›
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
