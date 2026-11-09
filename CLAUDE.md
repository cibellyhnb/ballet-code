# Ballet.code — contexto para o Claude Code

Jogo web estilo Scratch para ensinar programação e ballet ao mesmo tempo. A jogadora monta coreografias de ballet (método RAD) com blocos, e uma bailarina 3D fofinha (estilo Animal Crossing) dança no tempo da música.

- Público: quem já tem noção básica de ballet e de programação. Uso em casa.
- Idioma: interface em português do Brasil; termos de ballet em francês (tendu, plié, à la seconde…).
- Desenvolvedora solo, estudante de Ciência da Computação, faz ballet RAD há 1 ano. Ela valida a técnica olhando o render.

## Stack

Vite + React + TypeScript, Three.js via React Three Fiber + drei, Zustand. Sem backend. Deploy na Vercel (`npm run build` → `dist/`).
`npm run build:single` gera um único `index.html` (usado para publicar como artifact).

## Arquitetura

```
src/engine/state.ts    BodyState: estado do corpo em parâmetros de ballet (graus), não rotações cruas
src/engine/rig.ts      bailarina montada com primitivas Three.js + applyState()
src/engine/program.ts  Instr (blocos) → compile() → Timeline (movimentos com tempos, estado, bloco ativo, variáveis)
src/engine/presets.ts  combinações de exemplo + toText() (programa como código)
src/store.ts           tocar/pausar/andamento, evaluate(timeline, beat) interpola entre estados
src/components/Scene.tsx  sala, barra, luz, câmeras
src/App.tsx            barra superior e troca de modo (store.mode: inicio | estudio | glossario)
src/screens/Home.tsx   tela inicial: Aula, Estúdio, Glossário + "mais jogos" (Desafios, Conserta, Professora dita; Grand allegro em breve)
src/screens/StudioPanel.tsx   Estúdio livre: escolha da combinação, blocos/código, variáveis
src/screens/GlossaryPanel.tsx Glossário: termos com tradução e dica; a bailarina demonstra em loop
src/components/Stage.tsx      palco compartilhado: cena 3D, contagem 1–8, câmeras, player
src/components/Decor.tsx      sala: papel de parede, lambri, quadros (desenhados em canvas), janela, bandeirinhas, luzinhas, banco
src/ui/icons.tsx              ícones SVG próprios (não use emoji na interface)
src/engine/head.ts            cabeça e olhar AUTOMÁTICOS (calculados do corpo a cada quadro; não existe bloco de cabeça)
src/blocks/defs.ts            blocos do editor (Blockly, renderizador zelos), tema fofo e gaveta de blocos
src/engine/parse.ts           texto (aba "código") → Program, com erros por linha; ida e volta com toText()
src/blocks/convert.ts         blocos ↔ Program, com mensagens de erro amigáveis por bloco
src/data/fases.ts             modo Aula: fases (objetivo, combinação-alvo, gaveta, meta de blocos) e o tipo Fase
src/data/modos.ts             DESAFIOS (rigido/proibido/precisa), CONSERTOS (inicial com um erro), DITADOS (falas da professora)
src/data/trilhas.ts           as 4 trilhas (aula/desafios/conserta/ditado) = modos do store; acharFase(id)
src/screens/Aula.tsx          mapa e tela da fase das 4 trilhas. check() por trilha: aula (igual/conceito/blocos),
                              desafios (tudo ou nada se rigido; bloco proibido zera), conserta (igual/sem dicas/blocos do alvo),
                              ditado (igual/sem ver exemplo/blocos; exemplo só aparece após errar; professora desenhada com balão, sem voz)
src/components/BlockEditor.tsx editor: carrega modelos, recompila ao editar, destaca o bloco ativo, salva no localStorage
src/data/glossario.ts  textos do glossário + mini programa de demonstração de cada termo
src/audio.ts           pianista gerado com Web Audio: estilos adágio/valsa (3/4), polca/marcha (2/4); cada tempo da contagem = 1 compasso
```

### Sapatilha

`buildSlipper` em `rig.ts`: uma malha só (esfera deformada) com skinning em dois ossos (tornozelo e dedos), para dobrar suave na meia ponta. As cores são por vértice: cetim, abertura mostrando a meia, debrum e solas divididas. Elásticos em X são tubos (`ribbon`).

### Convenções do rig (importante)

- A bailarina olha para +Z. A direita dela é −X. Y para cima. Começa com a mão ESQUERDA na barra (barra em +X).
- `s = -1` para o lado direito, `+1` para o esquerdo; o espelhamento é feito pelos sinais em `poseLeg`/`poseArm`.
- Perna: `gesture` (ordem XZY: `fwd` devant/derrière, `side` à la seconde) → `turnout` (en dehors, Y) → `flex` (plié) → `knee` → `ankle` (`point`) → `toes`.
- Braço: `shoulder` (ordem YZX: `abd` abertura, `swing` para a frente) → `elbow` → `wrist`.
- `applyState` faz três coisas depois de posar: dedos rentes ao chão nas pernas de base em relevé; apoia as pernas de base no chão (ajusta a altura); e, nas pernas de trabalho, procura o menor pointé que mantém o pé encostado no chão (é o que faz o tendu deslizar).
- `Move.weight` diz quais pernas sustentam o peso (`'both' | 'R' | 'L'`).
- Mão na barra: `holdBarre` (IK simples por descida de coordenadas) mantém a mão de apoio em `rig.barre` (x, y) no plié, relevé etc.
- Braços × cabeça: `keepArmsOffHead` testa várias direções e usa a menor mudança que tira o braço de dentro da cabeça (que é grande, estilo chibi). A 5ª foi medida para emoldurar a cabeça.
- `Move.ease`: 'sobe' (sai rápido e freia) / 'cai' (acelera) — usado nos saltos para a trajetória parecer física.
- `Move.slide` (padrão true): a perna de trabalho fica rente ao chão (o solver estica o pé). Use `slide: false` para perna no ar.
- `root.spin` é o giro da pirueta (acumula ±360), separado de `root.yaw` (lado da barra).
- Pés das pernas de base com o calcanhar levantado (relevé, grand plié) ficam com os dedos rentes ao chão automaticamente.

### Como adicionar um passo

1. Adicione o tipo em `Instr` (`program.ts`).
2. Em `step()`, emita os movimentos com `emit(ctx, [...])`: cada um tem `beats`, `label` em português/francês, `weight` e um `patch` parcial do `BodyState`.
3. Adicione o texto em `instrLabel()` (`presets.ts`), o bloco em `blocks/defs.ts` (definição + gaveta) e a conversão nos dois sentidos em `blocks/convert.ts`.
4. Confira visualmente (abaixo).

## Música e andamento

UMA peça por combinação (`Timeline.musica`): o caráter que ocupa mais tempos (`MUSICA` em program.ts).
As peças (adágio 3/4, tendu 4/4, valsa 3/4, marcha 2/4) são melodias originais de 16 tempos em `audio.ts`.
Andamento constante = bpm do slider × `speed` da peça. A jogadora pode escolher outra peça ou um arquivo de áudio próprio
(sincronizado com `syncFile`).

## Centro

Bloco "ir para o centro" (`{ t: 'local' }`): a bailarina vai para `CENTRO` (x, z), `root.c = 1`, e a câmera acompanha.
No centro: qualquer perna trabalha (`ctx.cWork`, `root.side`), os dois braços são livres, `direcao` gira o corpo
(croisé/effacé dependem do pé da frente), a cabeça faz épaulement. Passos só do centro: fouetté de adage.
Saltos usam `root.lift`. `Program.inicio = 'centro'` começa já no centro (demonstrações do glossário).

### Deslocamentos e grand allegro
glissade, pasDeBourree (dessous), balance, assemble (dessus), sissonne (fermée de côté), grandJete (en avant). Todos só no
centro e (menos o balancé) saindo da 5ª: `allegroPronto()`. A viagem é `destino(ctx, id, lado|'frente', dist)`, que usa
yaw+spin (direita dela = (-cos θ, sin θ); frente = (sin θ, cos θ)) e limita à SALA (dica quando bate no canto).
No ar, peso 'both' (a base é o pé mais baixo, contínuo durante o voo). No grand jeté o lift compensa a perna de trás
inclinada (`0.3 + LEG_LEN·(1−cos 52°)`), e a câmera sobe junto quando lift > 0.2 (Scene.tsx). Coupé dos passos que
viajam: `PDB_COUPE` (joelho aberto). Regra de ouro dos passos novos: só trocar o peso (weight) quando o pé que vai
receber o peso já está no chão; 'both' durante o voo (a base é o pé mais baixo).

### Giros, ligações e mais saltos
pasDeChat (perna de trás; `PULO_RETIRE` compensa as pernas dobradas), pique (giro/passe/arabesque), fouetteGiro
(encadeia: `ctx.emFouette`; o próximo passo ou "fechar" desce e fecha via `fechaFouette`), soutenu, tombe (dir),
chasse (devant/seconde), penche (barra e centro), pirueta com `voltas` 1|2 e `forma` passe|attitude.
Ângulo do tendu com a base em plié: `tenduEmPlie(f)`. Câmera sobe junto quando o quadril passa de 1,10 m.
Varredura de todos os passos: tools/scan.test.ts.txt (copiar para src/scan.test.ts e rodar com tsx; com
argumentos "<caso>" "a,b" mostra os ângulos quadro a quadro).

### Solvers da perna de trabalho (applyState)
- No ar (lift > 0) a referência de altura passa suavemente do pé de apoio para o pé mais baixo (`chao`), e o relevé
  (metatarso plantado) só vale para pé no chão e perna perto da vertical.
- Colisão entre pernas: perna esticada abre para o lado; perna dobrada vai para a frente (ou para trás, se está atrás),
  misturando as duas direções na passagem; as soluções de perna esticada e dobrada se misturam pelo joelho.
- Pé x chão: parte do `v.point` do estado. Se atravessa (tolerância 6 mm), desaponta só o necessário; se nem flexionado
  cabe (base em plié), dobra o joelho de trabalho. Com `slide`, se flutua, aponta até encostar.
- As correções (colisão, tornozelo, joelho) mudam no máximo um tanto por quadro (`l.mem`, `limita`): nada teleporta.
- Teste numérico de "pulos": tools/t.test.ts.txt (copiar para src/t.test.ts; `npx tsx src/t.test.ts preset:<id>`
  ou `<passo> <perna> [dir]`), marca quadros com deslocamento > 12 cm ou pé abaixo do chão. Trilha "Grand allegro" = `ALLEGRO` em modos.ts; modelos no Estúdio:
deslocamentos, balances, grandAllegro.

## Pontos da sala (diagonais)

- `Ponto` 1–8 (escola russa): 1 = frente/espelho, sentido horário visto de cima com ela olhando para o 1; a direita
  dela é −x, a frente é +z. `PONTO_POS` (onde ela para), `yawDoPonto`, `PONTO_LABEL` em program.ts.
- Blocos `bc_irponto` (`irPonto`: pas de bourrée couru sem virar o corpo (desliza de frente para onde já olha), peso 'both', passinhos de 1/4 com ease linear; num canto termina
  olhando para o canto oposto, numa parede en face) e `bc_olharponto` (`olharPonto`). Texto: `irAtéOPonto(6)`,
  `virarParaOPonto(2)`.
- `virarPara(ctx, yaw)`: gira pelo caminho mais curto; yaw fica em ±180 e o resto vai para o spin (usado também em
  `direcao`, révérence no centro — que agora volta en face — e na volta para a barra, que não "desgira" mais as piruetas).
- Ease `'linear'` nos Moves (velocidade constante). Adesivos numerados no chão (`PontosDaSala` em Scene.tsx) só quando
  o programa usa blocos de ponto. Fase `g-diagonal` no fim do Grand allegro.

## Aquecimento da tela inicial

`src/engine/warmup.ts`: linha do tempo montada à mão (não é programa de blocos), em loop na tela inicial.
Usa `weight: 'livre'` para sentar no chão (o corpo não se apoia nos pés; a altura do quadril vem de `root.lift`)
e `face.esforco` (0–1) para a carinha de esforço (olhos >< , boquinha, gotinha de suor).

## Camarim (visual da bailarina)

`src/engine/look.ts`: tipo `Look` e opções (cores, penteados, enfeites; alguns liberados por estrelas da Aula).
`buildRig(look)` aplica as cores em `COLORS` e monta penteado/enfeite; o `Dancer` reconstrói o rig quando o look muda.
Salvo em `localStorage` (`balletcode.look.v1`).

## Validador de ballet

`compile()` em `program.ts` confere regras enquanto monta a linha do tempo e gera `diags`:
`erro` (bloqueia dançar) ou `dica` (só avisa). O contexto do compilador guarda: posição dos pés (1ª–5ª), qual pé está à frente nas posições cruzadas,
onde está a perna de trabalho (fechada, coupé, coupé flex, passé, aberta) e se a barra está solta.
Passos que precisam da perna fechada fecham sozinhos (1 tempo) e geram uma dica.
Regras atuais: perna/braço de trabalho é o de fora da barra;
preparação antes dos passos; na 5ª, devant sai com o pé da frente e derrière com o de trás; rond de jambe começa da 1ª;
frase de 8 tempos; terminar com finalizar. A posição dos pés (1ª/5ª) e o pé da frente ficam no contexto do compilador.

## Verificação visual

A página expõe `window.__ballet = { setBeat(b), setPreset(id), setMode(m), setTerm(id), setCam(c) }` para congelar qualquer tempo e tirar screenshot (por exemplo com Playwright). Câmeras: `tres-quartos`, `frente`, `lado`, `perto`, `pes`, `cima`.
Sempre que mexer em pose ou geometria, tire screenshots dos tempos afetados e olhe antes de dizer que terminou.

## Regras

- Técnica de ballet segue a RAD. Se não tiver certeza de um detalhe técnico, pergunte em vez de inventar.
- Mantenha o visual cozy: cores pastel, formas arredondadas, nada de texturas realistas.
- Interface "menininha", delicada e com cara de jogo: rosa e lilás, bolinhas no fundo, bordas pespontadas, botões tipo bala com sombra embaixo, fontes Fredoka (títulos), Dancing Script (detalhes) e Nunito (texto). Evite cara de painel genérico.
- Todo texto de interface em português; nomes de passos em francês.
- Combinações devem fechar em frases de 8 tempos.
- Rode `npx tsc -b` e `npm run build` antes de terminar.

### Coreografias salvas, conquistas e ponta
- Estúdio → "♡ minhas coreografias" (components/Coreografias.tsx): salva o TEXTO do programa (toText) +
  música + andamento em `balletcode.coreografias.v1`; baixa/abre arquivo `.ballet.txt` (cabeçalho com `#`, que o
  parser ignora); copiar usa clipboard com plano B (textarea).
- Conquistas (data/conquistas.ts, components/Conquistas.tsx): calculadas das estrelas de todas as trilhas + nº de
  coreografias salvas (`store.salvas`). Aviso (toast) para as novas; as já feitas antes entram sem festa.
- Sapatilha de ponta: `look.ponta` (liberada com `ESTRELAS_PONTA` = 50 estrelas). No rig: caixa mais alta,
  plataforma e fitas (parte no pé, parte presa na canela). Em applyState o estado é convertido (`pontaDe`): pé
  esticado vai até ~92° com rampa suave pelo ângulo e pelo joelho (`joelhoReto`); no apoio, o que fica plantado é a
  plataforma. A perna que sai do apoio herda a abertura do relevé (`l.plant`) e solta aos poucos.

### Conferência das fases
- `danceSignature` = por movimento: nome@tempos#peso#pernas#braços#direção/lugar (arredondados): perna, braço ou
  direção trocados contam como diferença; `firstDifference` (Aula.tsx) explica o que mudou (inclusive duração).
- O painel da fase mostra a duração da combinação-alvo.
- tools/fases.test.ts.txt: confere se o texto de cada fase (objetivo/ditado) cita todos os passos do alvo e a
  duração de cada pausa, se o alvo compila sem avisos, fecha frases de 8 e cabe na meta de blocos. Rodar sempre
  que criar ou mudar uma fase. tools/todas.py resolve todas as fases no navegador (todas devem dar 3 estrelas).
- Layout do painel (fase/estúdio) em telas baixas: o painel rola se precisar, o botão "conferir" é sticky embaixo,
  avisos/dicas têm altura máxima com rolagem e o editor encolhe até 170px (120px abaixo de 680px de altura).
  tools/layout.py mede botão/aviso/dica em várias resoluções.

### Palco, fases de centro nos modos e músicas novas
- Modo `palco` (screens/Palco.tsx): Estúdio → "✿ palco" (ou "palco" numa coreografia salva). Cortina com título →
  abre → dança → fecha → "Brava!" com flores e `aplausos()` (audio.ts, sintetizado). Scene com `palco`: tablado,
  rotunda de veludo, canhão de luz que segue a bailarina (PalcoSet); barra portátil só se a coreografia não começa
  indo para o centro. Câmera 'plateia'.
- Desafios/Conserta/Ditados ganharam fases de centro (empurradas no fim de modos.ts porque usam CENTRO_G).
- Músicas: galope 2/4 (petit allegro e saltos), mazurca 3/4 (piqué, soutenu), valsa grande 3/4 (grand jeté, tombé,
  chassé; pesa em dobro na escolha da música da combinação).
- Checklist do projeto (Docs): https://claude.ai/artifact/R972KsDuBtywemX4nAZDZn — marcar os itens ao terminar.
- Camarim: "provar a ponta" (`provandoPonta`, demo de relevés) sem gravar no look. Boas-vindas na 1ª visita
  (components/BoasVindas.tsx; chave `balletcode.boasvindas.v1`; os testes em tools/ já pulam). Efeitos `sfx()`:
  estrela, encaixe de bloco, pouso de salto. Braços em bras bas acompanham saltos e deslocamentos (`bracosLivres`).
  Fondu com caminho mais alto (sem raspar o chão). Fases da barra: cloche, cheval, piruetas, penche (fase liberada
  também se ela mesma já tem estrela).

## Visual e aquecimento (rodada de ajustes)

- Fontes embutidas (src/fonts.css, woff2 latinos do @fontsource): sem Google Fonts, o visual é igual em qualquer lugar.
- "Como jogar" (components/BoasVindas.tsx): cartão em arco com renda, a professora (components/Professora.tsx,
  também usada no ditado) explica cada parte num balão; ilustrações feitas à mão (bloquinhos nas cores do editor,
  bailarina em retiré, ingressos dos modos, sapatilha de ponta); navegação "1ª 2ª 3ª 4ª posição".
- Aquecimento: borboleta com as solas encostadas (BORB/ASAS achados por busca: tools/pes.test.ts.txt mede pés,
  `show`, `busca`, `fino`, `asas`, `trilha a,b` aponta pés se atravessando); antes do abraço os pés se soltam (SOLTA);
  ABRACA e JOELHOS com os pés separados.

## Celular e tablet

- Celular (≤760px de largura) e celular deitado (altura ≤500px): estúdio e fases mostram um de cada vez, programa ou
  bailarina (`vistaMobile` no store, classe `vm-painel`/`vm-palco` na .workspace, botão `.vm-troca`). `play()` troca
  sozinho para a bailarina; `setMode`/`openFase` voltam para o programa. Glossário e camarim: bailarina em cima, lista
  embaixo (em pé) ou lado a lado (deitado).
- Tablet em pé (761–1100px, retrato): bailarina em cima (42%), painel embaixo.
- No celular a gaveta do Blockly vira categorias (`makeToolboxCategorias`, nomes curtos e cores), blocos em escala 0,64;
  o editor se reenquadra ao reaparecer (ResizeObserver). `.blocklyToolbox` com z-index 10 (o Blockly põe 70 e ficava
  por cima das janelas). Palco com z-index 60.
- Ferramentas: tools/mobile.py (LARGxALT prefixo: telas), tools/modais.py (janelas), tools/dom.py (medidas).
- Aquecimento: assento medido (tools/assento.test.ts.txt): sentada de verdade na borboleta, no abraço e na transição
  (BORB, ASAS, ABRE, MEIO_ABRACO, SOLTA, ABRACA; "dobra" com turnout 160 para o calcanhar não levantar o quadril).
