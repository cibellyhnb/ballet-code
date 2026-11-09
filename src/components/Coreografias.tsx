/*******************************************************************************
 * Coreografias.tsx
 * funcao principal: a janela "minhas coreografias": salvar com nome, abrir,
 * renomear, apagar, baixar, abrir arquivo e copiar o codigo. tudo fica no
 * navegador (localStorage) e e guardado como texto do programa: assim continua
 * valendo mesmo se os blocos mudarem de versao, e o arquivo baixado e legivel
 * (e o mesmo codigo da aba "codigo").
 ******************************************************************************/
import { useMemo, useRef, useState } from 'react'
import { toText } from '../engine/presets'
import { parseProgram } from '../engine/parse'
import { compile } from '../engine/program'
import { useStore } from '../store'
import { Heart } from '../ui/icons'

/*******************************************************************************
 * Salva
 * funcao: uma coreografia salva: id, nome, o programa em texto, a musica e o
 * andamento escolhidos e quando foi salva (em, em milissegundos).
 ******************************************************************************/
type Salva = { id: string; nome: string; texto: string; musica: string; bpm: number; em: number }
const CHAVE = 'balletcode.coreografias.v1'

/*******************************************************************************
 * ler
 * funcao: le a lista de coreografias salvas.
 * recebe: nada.
 * retorna: a lista, ou uma lista vazia se nao houver nada ou se o que estiver
 * salvo nao for uma lista. nunca lanca erro.
 ******************************************************************************/
function ler(): Salva[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/*******************************************************************************
 * gravar
 * funcao: grava a lista de coreografias no localStorage.
 * recebe: l (lista de Salva).
 * retorna: true se gravou, false se o navegador nao deixou (por exemplo, espaco
 * cheio).
 ******************************************************************************/
function gravar(l: Salva[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(l))
    return true
  } catch {
    return false
  }
}
const quando = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

/*******************************************************************************
 * nomeArquivo
 * funcao: nome do arquivo para baixar a partir do nome da coreografia.
 * recebe: n (string), o nome da coreografia.
 * retorna: o nome sem acentos, com hifens no lugar de espacos e simbolos,
 * terminando em ".ballet.txt" ("coreografia.ballet.txt" se sobrar nada).
 ******************************************************************************/
const nomeArquivo = (n: string) =>
  (n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'coreografia') +
  '.ballet.txt'

/*******************************************************************************
 * paraArquivo
 * funcao: monta o texto do arquivo: duas linhas de cabecalho com nome, musica e
 * andamento, e depois o codigo normal.
 * recebe: s, com nome, texto, musica e bpm.
 * retorna: o texto completo do arquivo.
 ******************************************************************************/
function paraArquivo(s: Pick<Salva, 'nome' | 'texto' | 'musica' | 'bpm'>) {
  return `# ballet.code ♡ ${s.nome}\n# música: ${s.musica} · andamento: ${s.bpm}\n\n${s.texto}\n`
}

/*******************************************************************************
 * deArquivo
 * funcao: le um arquivo de coreografia. o cabecalho e opcional: um codigo
 * colado sem cabecalho tambem funciona.
 * recebe: txt (string), o conteudo do arquivo, e nomePadrao (string), usado
 * quando o arquivo nao traz nome.
 * retorna: nome, musica (auto se nao tiver), bpm (84 se nao tiver) e o texto do
 * programa sem as linhas que comecam com #.
 ******************************************************************************/
function deArquivo(txt: string, nomePadrao: string) {
  const nome = txt.match(/^#\s*ballet\.code\s*♡?\s*(.+)$/m)?.[1]?.trim() || nomePadrao
  const musica = txt.match(/^#\s*música:\s*([a-z]+)/m)?.[1] ?? 'auto'
  const bpm = Number(txt.match(/andamento:\s*(\d+)/)?.[1] ?? 84)
  const corpo = txt
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n')
    .trim()
  return { nome, musica, bpm, texto: corpo }
}

/*******************************************************************************
 * Coreografias
 * funcao: a janela das coreografias, com a lista salva e as acoes de cada uma.
 * recebe: onClose (funcao chamada ao fechar).
 * retorna: a janela.
 ******************************************************************************/
export function Coreografias({ onClose }: { onClose: () => void }) {
  const program = useStore((s) => s.program)
  const loadProgram = useStore((s) => s.loadProgram)
  const musicaEscolha = useStore((s) => s.musicaEscolha)
  const bpm = useStore((s) => s.bpm)
  const [lista, setLista] = useState<Salva[]>(ler)
  const [nome, setNome] = useState('')
  const [aviso, setAviso] = useState('')
  const [apagando, setApagando] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [mostraCodigo, setMostraCodigo] = useState<string | null>(null)
  const arquivo = useRef<HTMLInputElement>(null)
  const textoAtual = useMemo(() => toText(program), [program])
  const vazio = program.principal.length === 0 && program.funcoes.length === 0
  // so para mostrar quantos tempos a atual tem; se o programa nao compilar, mostra 0
  const tempos = useMemo(() => {
    try {
      return compile(program).total
    } catch {
      return 0
    }
  }, [program])

  /*****************************************************************************
   * avisa
   * funcao: mostra um aviso curto na janela por 2,4 segundos.
   * recebe: t (string), o texto do aviso.
   * retorna: nada.
   ****************************************************************************/
  const avisa = (t: string) => {
    setAviso(t)
    window.setTimeout(() => setAviso(''), 2400)
  }

  /*****************************************************************************
   * atualiza
   * funcao: grava a lista nova e, se deu certo, atualiza a tela e a contagem
   * usada pelas conquistas.
   * recebe: l (lista de Salva).
   * retorna: nada. se nao gravar, so mostra o aviso de erro.
   ****************************************************************************/
  const atualiza = (l: Salva[]) => {
    if (gravar(l)) {
      setLista(l)
      useStore.getState().setSalvas(l.length)
    }
    else avisa('Não consegui salvar neste navegador (o espaço pode estar cheio).')
  }
  // musica de arquivo nao vai junto (o arquivo de audio nao fica salvo): guarda como automatica
  const musicaGuardada = musicaEscolha === 'arquivo' ? 'auto' : musicaEscolha

  /*****************************************************************************
   * salvar
   * funcao: salva o programa atual com o nome digitado. se ja existir uma com o
   * mesmo nome (sem diferenciar maiusculas), substitui.
   * recebe: nada. retorna: nada.
   ****************************************************************************/
  const salvar = () => {
    const n = nome.trim() || `Coreografia ${lista.length + 1}`
    const existente = lista.find((s) => s.nome.toLowerCase() === n.toLowerCase())
    const nova: Salva = { id: existente?.id ?? String(Date.now()), nome: n, texto: textoAtual, musica: musicaGuardada, bpm, em: Date.now() }
    atualiza([nova, ...lista.filter((s) => s.id !== nova.id)])
    setNome('')
    avisa(existente ? `"${n}" foi atualizada ♡` : `"${n}" foi salva ♡`)
  }

  /*****************************************************************************
   * abrir
   * funcao: carrega uma coreografia salva no estudio, com a musica e o
   * andamento dela, e fecha a janela.
   * recebe: s (Salva).
   * retorna: nada. se o texto tiver erro, so avisa a linha e nao carrega.
   ****************************************************************************/
  const abrir = (s: Salva) => {
    const r = parseProgram(s.texto)
    if (r.errors.length) return avisa(`Essa coreografia tem um erro na linha ${r.errors[0].linha}: ${r.errors[0].msg}`)
    loadProgram(r.program)
    const st = useStore.getState()
    st.setBpm(s.bpm || 84)
    st.setMusica((s.musica || 'auto') as never)
    onClose()
  }

  /*****************************************************************************
   * baixar
   * funcao: baixa a coreografia como arquivo .ballet.txt. publicado no Claude
   * usa a capacidade de downloads da pagina; solto no navegador usa um link de
   * download comum.
   * recebe: s, com nome, texto, musica e bpm.
   * retorna: uma Promise sem valor. se nenhum jeito funcionar, mostra o texto
   * para a pessoa copiar a mao.
   ****************************************************************************/
  const baixar = async (s: Pick<Salva, 'nome' | 'texto' | 'musica' | 'bpm'>) => {
    const filename = nomeArquivo(s.nome)
    const data = paraArquivo(s)
    // publicado no Claude: a pagina pede para salvar e a pessoa confirma
    const use = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude?.use
    if (use) {
      try {
        const dl = (await use('downloads')) as { save: (r: { filename: string; data: string }) => Promise<unknown> } | null
        if (dl) {
          await dl.save({ filename, data })
          return avisa('Arquivo salvo ♡')
        }
      } catch (e) {
        const code = (e as { code?: string })?.code
        // declined: a pessoa recusou no aviso de salvar, entao nao mostra nada
        if (code === 'declined') return
        if (code === 'rate_limited') return avisa('Espere um pouquinho e tente de novo.')
      }
      return setMostraCodigo(data)
    }
    // rodando solto no navegador: link de download comum
    try {
      const blob = new Blob([data], { type: 'text/plain;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    } catch {
      setMostraCodigo(data)
    }
  }

  /*****************************************************************************
   * copiar
   * funcao: copia o texto para a area de transferencia.
   * recebe: texto (string).
   * retorna: uma Promise sem valor. se o navegador nao deixar copiar, mostra o
   * texto para copiar a mao.
   ****************************************************************************/
  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      avisa('Código copiado! É só colar para uma amiga ♡')
    } catch {
      setMostraCodigo(texto)
    }
  }

  /*****************************************************************************
   * abrirArquivo
   * funcao: le um arquivo de coreografia escolhido pela pessoa e coloca na
   * lista (nao abre no estudio).
   * recebe: f (File).
   * retorna: uma Promise sem valor. arquivo com erro ou ilegivel so gera um
   * aviso.
   ****************************************************************************/
  const abrirArquivo = async (f: File) => {
    try {
      const txt = await f.text()
      const d = deArquivo(txt, f.name.replace(/\.ballet\.txt$|\.txt$/i, ''))
      const r = parseProgram(d.texto)
      if (r.errors.length) return avisa(`Esse arquivo tem um erro na linha ${r.errors[0].linha}: ${r.errors[0].msg}`)
      // guarda o texto ja reescrito pelo programa, no formato padrao, e nao o texto cru do arquivo
      const nova: Salva = { id: String(Date.now()), nome: d.nome, texto: toText(r.program), musica: d.musica, bpm: d.bpm, em: Date.now() }
      atualiza([nova, ...lista])
      avisa(`"${d.nome}" entrou na sua lista ♡`)
    } catch {
      avisa('Não consegui ler esse arquivo.')
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal coreos" onClick={(e) => e.stopPropagation()}>
        <h3>
          <Heart size={20} /> Minhas coreografias
        </h3>

        <div className="coreo-salvar">
          <input
            value={nome}
            maxLength={40}
            placeholder={vazio ? 'monte alguma coisa primeiro…' : 'nome da coreografia'}
            disabled={vazio}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !vazio && salvar()}
          />
          <button className="pill pink" disabled={vazio} onClick={salvar}>
            salvar a atual
          </button>
        </div>
        <p className="muted coreo-sub">
          A atual tem {tempos} tempos. Salvar com o mesmo nome atualiza a que já existe.
        </p>

        <div className="coreo-lista">
          {lista.length === 0 && <p className="muted">Nenhuma coreografia salva ainda. Que tal a primeira?</p>}
          {lista.map((s) => (
            <div key={s.id} className="coreo-item">
              {editando === s.id ? (
                <input
                  autoFocus
                  defaultValue={s.nome}
                  maxLength={40}
                  onBlur={(e) => {
                    const n = e.target.value.trim()
                    if (n) atualiza(lista.map((x) => (x.id === s.id ? { ...x, nome: n } : x)))
                    setEditando(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
              ) : (
                <button className="coreo-nome" onClick={() => abrir(s)} title="abrir no estúdio">
                  <b>{s.nome}</b>
                  <small>
                    {quando(s.em)} · {s.texto.split('\n').length} linhas
                  </small>
                </button>
              )}
              <div className="coreo-acoes">
                <button className="mini" onClick={() => abrir(s)}>
                  abrir
                </button>
                <button
                  className="mini"
                  onClick={() => {
                    abrir(s)
                    useStore.getState().apresentar(s.nome)
                  }}
                >
                  palco
                </button>
                <button className="mini" onClick={() => setEditando(s.id)}>
                  renomear
                </button>
                <button className="mini" onClick={() => baixar(s)}>
                  baixar
                </button>
                <button className="mini" onClick={() => copiar(paraArquivo(s))}>
                  copiar
                </button>
                {/* apagar pede confirmacao: o primeiro clique troca o botao por "certeza?" */}
                {apagando === s.id ? (
                  <button
                    className="mini perigo"
                    onClick={() => {
                      atualiza(lista.filter((x) => x.id !== s.id))
                      setApagando(null)
                    }}
                  >
                    certeza?
                  </button>
                ) : (
                  <button className="mini" onClick={() => setApagando(s.id)}>
                    apagar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="coreo-rodape">
          <button className="pill ghost" onClick={() => arquivo.current?.click()}>
            abrir arquivo…
          </button>
          <button className="pill ghost" disabled={vazio} onClick={() => copiar(paraArquivo({ nome: nome.trim() || 'minha coreografia', texto: textoAtual, musica: musicaGuardada, bpm }))}>
            copiar a atual
          </button>
          <button className="pill ghost" onClick={onClose}>
            fechar
          </button>
          <input
            ref={arquivo}
            type="file"
            accept=".txt,text/plain"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) abrirArquivo(f)
              e.target.value = ''
            }}
          />
        </div>
        <p className="muted coreo-sub">
          Para receber a coreografia de uma amiga: abra o arquivo dela aqui, ou cole o código na aba <b>código</b> do estúdio.
        </p>
        {aviso && <div className="coreo-aviso">{aviso}</div>}

        {mostraCodigo && (
          <div className="coreo-codigo">
            <p className="muted">O navegador não deixou copiar sozinho. Selecione e copie (Ctrl+C):</p>
            <textarea readOnly value={mostraCodigo} onFocus={(e) => e.currentTarget.select()} />
            <button className="pill ghost" onClick={() => setMostraCodigo(null)}>
              ok
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
