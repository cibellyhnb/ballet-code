/*******************************************************************************
 * BoasVindas.tsx
 * funcao principal: o "como jogar", que aparece na primeira visita e no botao
 * da tela inicial. a professora explica o jogo em quatro partes ("1a, 2a, 3a,
 * 4a posicao") num cartao em arco, como a janela da tela inicial, e cada parte
 * tem uma ilustracao feita a mao com os blocos e as cores do jogo.
 ******************************************************************************/
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Bow, Heart } from '../ui/icons'
import { Professora } from './Professora'

// chave do localStorage que lembra que ela ja viu o "como jogar"
const CHAVE = 'balletcode.boasvindas.v1'

/*******************************************************************************
 * jaViuBoasVindas
 * funcao: diz se o "como jogar" ja foi visto neste navegador.
 * recebe: nada.
 * retorna: true se ja viu. se o localStorage falhar, devolve true para nao
 * abrir a janela toda vez.
 ******************************************************************************/
export const jaViuBoasVindas = () => {
  try {
    return localStorage.getItem(CHAVE) === '1'
  } catch {
    return true
  }
}

/*******************************************************************************
 * marcarVisto
 * funcao: grava que o "como jogar" ja foi visto.
 * recebe: nada. retorna: nada. se nao conseguir gravar, ignora.
 ******************************************************************************/
const marcarVisto = () => {
  try {
    localStorage.setItem(CHAVE, '1')
  } catch {
    /* tudo bem */
  }
}

/*******************************************************************************
 * COR
 * funcao: cor de fundo e de borda de cada tipo de bloco nas ilustracoes, as
 * mesmas do editor de blocos.
 ******************************************************************************/
const COR = {
  inicio: ['#efb440', '#cf9220'],
  pos: ['#e98fc7', '#cc6aa9'],
  passo: ['#f48bb0', '#d9618e'],
  centro: ['#7fb6d9', '#5a95bc'],
  adage: ['#c58ce0', '#a466c4'],
  laco: ['#f3a160', '#d9813e'],
} as const

/*******************************************************************************
 * Bloco
 * funcao: desenha um bloquinho parecido com os do editor, so com html e css.
 * recebe: cor (tipo do bloco em COR), children (o texto do bloco), chapeu (true
 * para o bloco de inicio, arredondado em cima) e campo (texto opcional da
 * caixinha branca de escolha).
 * retorna: o bloquinho.
 ******************************************************************************/
function Bloco({ cor, children, chapeu, campo }: { cor: keyof typeof COR; children: ReactNode; chapeu?: boolean; campo?: string }) {
  const [c, b] = COR[cor]
  return (
    <div className={`bv-bloco${chapeu ? ' chapeu' : ''}`} style={{ background: c, borderColor: b }}>
      {children}
      {campo && <span className="bv-campo">{campo} ▾</span>}
    </div>
  )
}

/*******************************************************************************
 * CenaBlocos
 * funcao: ilustracao da 1a parte: uma pilha de blocos, uma seta e a bailarina
 * dancando.
 * recebe: nada. retorna: a ilustracao.
 ******************************************************************************/
function CenaBlocos() {
  return (
    <div className="bv-cena">
      <div className="bv-pilha">
        <Bloco cor="inicio" chapeu>
          quando ▶ for clicado
        </Bloco>
        <Bloco cor="pos" campo="5ª posição">
          pés em
        </Bloco>
        <Bloco cor="passo" campo="direita">
          battement tendu
        </Bloco>
        <Bloco cor="adage" campo="en dehors">
          pirueta
        </Bloco>
      </div>
      <svg className="bv-seta" viewBox="0 0 60 30" aria-hidden>
        <path d="M4 18 C 20 4, 38 4, 52 14" fill="none" stroke="var(--pink-300)" strokeWidth="2.4" strokeDasharray="4 5" strokeLinecap="round" />
        <path d="M46 8 L54 15 L45 20" fill="none" stroke="var(--pink-300)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="bv-palquinho">
        <Bailarina />
        <span>ela dança!</span>
      </div>
    </div>
  )
}

/*******************************************************************************
 * CenaLaco
 * funcao: ilustracao da 2a parte: um bloco repetir com dois tendus dentro e um
 * bilhete da professora avisando um erro.
 * recebe: nada. retorna: a ilustracao.
 ******************************************************************************/
function CenaLaco() {
  return (
    <div className="bv-cena">
      <div className="bv-pilha">
        <div className="bv-laco" style={{ background: COR.laco[0], borderColor: COR.laco[1] }}>
          <div className="bv-laco-topo">
            repetir <span className="bv-campo">4</span> vezes
          </div>
          <div className="bv-laco-meio">
            <Bloco cor="passo" campo="devant">
              tendu
            </Bloco>
            <Bloco cor="passo" campo="à la seconde">
              tendu
            </Bloco>
          </div>
          <div className="bv-laco-pe" />
        </div>
      </div>
      <div className="bv-bilhete">
        <b>a professora avisa:</b>
        <span>“Feche a perna antes do relevé!”</span>
      </div>
    </div>
  )
}

/*******************************************************************************
 * JOGOS
 * funcao: os ingressos da 3a parte: nome de cada modo e a frase curta embaixo.
 ******************************************************************************/
const JOGOS: [string, string][] = [
  ['Aula', 'barra e centro'],
  ['Desafios', 'poucos blocos'],
  ['Conserta', 'ache o erro'],
  ['Professora dita', 'ouça e monte'],
  ['Grand allegro', 'saltos e viagens'],
  ['Estúdio & palco', 'crie e apresente'],
]

/*******************************************************************************
 * CenaIngressos
 * funcao: ilustracao da 3a parte: os modos do jogo como ingressos de teatro,
 * cada um um pouco torto.
 * recebe: nada. retorna: a ilustracao.
 ******************************************************************************/
function CenaIngressos() {
  return (
    <div className="bv-cena bv-ingressos">
      {JOGOS.map(([t, s], i) => (
        <div key={t} className="bv-ingresso" style={{ ['--r' as string]: `${(i % 3) - 1}deg` }}>
          <b>{t}</b>
          <small>{s}</small>
        </div>
      ))}
    </div>
  )
}

/*******************************************************************************
 * CenaPonta
 * funcao: ilustracao da 4a parte: tres estrelas, uma seta e a sapatilha de
 * ponta.
 * recebe: nada. retorna: a ilustracao.
 ******************************************************************************/
function CenaPonta() {
  return (
    <div className="bv-cena">
      <div className="bv-estrelas" aria-hidden>
        {[0, 1, 2].map((k) => (
          <svg key={k} viewBox="0 0 24 24" className={k === 1 ? 'grande' : ''}>
            <path d="M12 2.5l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8 6.2 20l1.4-6.4L2.7 9.2l6.5-.7z" fill="var(--butter)" stroke="#e0a93a" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        ))}
      </div>
      <svg className="bv-seta curta" viewBox="0 0 60 30" aria-hidden>
        <path d="M4 15 L50 15" fill="none" stroke="var(--pink-300)" strokeWidth="2.4" strokeDasharray="4 5" strokeLinecap="round" />
        <path d="M44 9 L52 15 L44 21" fill="none" stroke="var(--pink-300)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="bv-palquinho">
        <Ponta />
        <span>50 estrelas: ponta!</span>
      </div>
    </div>
  )
}

/*******************************************************************************
 * Bailarina
 * funcao: bailarina pequenininha em SVG, em releve com a perna em retire e os
 * bracos em 5a (en couronne).
 * recebe: nada. retorna: o svg.
 ******************************************************************************/
function Bailarina() {
  return (
    <svg viewBox="0 0 80 100" className="bv-bailarina" aria-hidden>
      <ellipse cx="40" cy="96" rx="14" ry="2.6" fill="#f6c9d8" opacity="0.7" />
      {/* bracos em couronne */}
      <path d="M35 33 C 24 27, 24 11, 37 9" stroke="#f3c9b2" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M45 33 C 56 27, 56 11, 43 9" stroke="#f3c9b2" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {/* pernas, a direita em retire */}
      <path d="M38 52 L 37.5 86" stroke="#f7d9cc" strokeWidth="4" strokeLinecap="round" />
      <path d="M42.5 52 L 52 64 L 39.5 70" stroke="#f7d9cc" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M37.5 84 L 37.3 92" stroke="#f48bb0" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M41 70 L 38.5 71" stroke="#f48bb0" strokeWidth="4" strokeLinecap="round" />
      {/* corpo e tutu */}
      <path d="M35 30 C 35 27 45 27 45 30 L 44 47 L 36 47 Z" fill="#c9a7e6" />
      <path d="M18 50 C 26 43, 54 43, 62 50 C 57 53, 52 50, 48 53 C 44 50, 36 50, 32 53 C 28 50, 23 53, 18 50 Z" fill="#fbd3e2" />
      <path d="M22 48 C 30 42, 50 42, 58 48 C 52 50, 28 50, 22 48 Z" fill="#f9b3cb" />
      {/* cabeca e coque */}
      <circle cx="40" cy="20" r="7.4" fill="#f9dcc8" />
      <path d="M32.8 19 C 33 12, 47 12, 47.2 19 C 45 15.5, 35 15.5, 32.8 19 Z" fill="#7a4b3a" />
      <circle cx="40" cy="11" r="3.6" fill="#7a4b3a" />
      <circle cx="37.3" cy="21" r="0.9" fill="#4a3048" />
      <circle cx="42.7" cy="21" r="0.9" fill="#4a3048" />
      <ellipse cx="35.5" cy="23.6" rx="1.6" ry="1" fill="#f7a8c0" />
      <ellipse cx="44.5" cy="23.6" rx="1.6" ry="1" fill="#f7a8c0" />
    </svg>
  )
}

/*******************************************************************************
 * Ponta
 * funcao: sapatilha de ponta em pe (en pointe) em SVG, com as fitas cruzando no
 * tornozelo e um laco.
 * recebe: nada. retorna: o svg.
 ******************************************************************************/
function Ponta() {
  return (
    <svg viewBox="0 0 80 100" className="bv-bailarina" aria-hidden>
      <ellipse cx="40" cy="96" rx="12" ry="2.4" fill="#f6c9d8" opacity="0.7" />
      <path d="M33 8 L33 48 C 31 58, 33 70, 36 80 L 36 92 L 46 92 L 46 80 C 49 70, 51 58, 48 48 L48 8 Z" fill="#f9dcc8" />
      <path d="M33 48 C 31 58, 33 70, 36 80 L 36 93 L 46 93 L 46 80 C 49 70, 51 58, 48 48 C 44 52, 37 52, 33 48 Z" fill="#f9c3d5" stroke="#e48aab" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M36 52 C 39 55, 43 55, 46 52" stroke="#e48aab" strokeWidth="1.2" fill="none" />
      <rect x="35.5" y="90" width="11" height="4" rx="1.5" fill="#e48aab" />
      <path d="M32 30 L 49 42 M 49 30 L 32 42 M32 40 L 49 50" stroke="#f48bb0" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M49 30 C 58 26, 60 34, 52 34 C 60 36, 58 44, 49 38" fill="#f48bb0" />
      <path d="M52 34 C 56 44, 54 52, 58 58" stroke="#f48bb0" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/*******************************************************************************
 * PARTES
 * funcao: as quatro partes do "como jogar", em ordem: titulo, fala da
 * professora e ilustracao.
 ******************************************************************************/
const PARTES: { titulo: string; fala: ReactNode; cena: ReactNode }[] = [
  {
    titulo: 'Bem-vinda à aula!',
    fala: (
      <>
        Oi, eu sou a professora! Aqui você monta coreografias de ballet <b>encaixando blocos</b>, como no Scratch, e a
        bailarina dança exatamente o que você montou. Os passos são do método <b>RAD</b>, com os nomes em francês.
      </>
    ),
    cena: <CenaBlocos />,
  },
  {
    titulo: 'Encaixe e aperte o play',
    fala: (
      <>
        Arraste os passos para baixo do <b>quando ▶ for clicado</b>. Com <b>repetir</b>, <b>para cada</b> e{' '}
        <b>funções</b> o programa fica curtinho. Se algo não estiver certo no ballet, eu aviso antes de ela dançar.
      </>
    ),
    cena: <CenaLaco />,
  },
  {
    titulo: 'Escolha seu caminho',
    fala: (
      <>
        Comece pela <b>Aula</b>: cada fase vale até 3 estrelas. Depois tem desafios, consertos, ditados e o grand
        allegro. No <b>Estúdio</b> você cria do zero e apresenta no <b>palco</b>.
      </>
    ),
    cena: <CenaIngressos />,
  },
  {
    titulo: 'Estrelas e camarim',
    fala: (
      <>
        As estrelas liberam enfeites no <b>camarim</b> e, com 50, a <b>sapatilha de ponta</b>! O <b>glossário</b>{' '}
        explica cada passo, com a bailarina mostrando como se faz.
      </>
    ),
    cena: <CenaPonta />,
  },
]

/*******************************************************************************
 * BoasVindas
 * funcao: a janela do "como jogar", com navegacao entre as partes. fechar (pelo
 * botao, por "pular" ou clicando fora) grava que ja foi visto.
 * recebe: onClose (funcao chamada ao fechar).
 * retorna: a janela.
 ******************************************************************************/
export function BoasVindas({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const p = PARTES[i]
  const ultima = i === PARTES.length - 1

  /*****************************************************************************
   * fechar
   * funcao: grava que o "como jogar" foi visto e fecha a janela.
   * recebe: nada. retorna: nada.
   ****************************************************************************/
  const fechar = () => {
    marcarVisto()
    onClose()
  }
  return (
    <div className="modal-bg" onClick={fechar}>
      <div className="bv" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Como jogar">
        <div className="bv-arco">
          <Bow size={26} className="bv-laco-topo-ico" />
          <div className="tagline bv-tag">
            <i /> como jogar <i />
          </div>
          {/* o key muda a cada parte para o titulo, a cena e a fala refazerem a animacao de entrada */}
          <h3 className="bv-titulo" key={`t${i}`}>
            {p.titulo}
          </h3>
          <div className="bv-palco" key={`c${i}`}>
            {p.cena}
          </div>
          <div className="bv-conversa">
            <Professora className="prof bv-prof" />
            <p className="prof-balao bv-fala" key={`f${i}`}>
              {p.fala}
            </p>
          </div>
          <nav className="bv-posicoes" aria-label="partes">
            {PARTES.map((_, k) => (
              <button key={k} className={k === i ? 'on' : k < i ? 'feito' : ''} onClick={() => setI(k)}>
                {k + 1}ª
              </button>
            ))}
            <small>posição</small>
          </nav>
          <div className="bv-acoes">
            <button className="pill ghost" onClick={i > 0 ? () => setI(i - 1) : fechar}>
              {i > 0 ? '‹ voltar' : 'pular'}
            </button>
            <button className="pill pink" onClick={ultima ? fechar : () => setI(i + 1)}>
              {ultima ? (
                <>
                  <Heart size={13} /> vamos dançar!
                </>
              ) : (
                'próxima ›'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
