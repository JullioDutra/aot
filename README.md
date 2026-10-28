# Trost — Asas da Liberdade

Primeiro protótipo independente de um jogo 3D inspirado em Attack on Titan. **Não é uma adaptação oficial nem uma demonstração de qualidade gráfica final.** Cenários, personagens e áudio são procedurais e originais; não há modelos, trilhas ou cenas extraídos do anime.

## Executar

Requer Node.js 22.12+ (validado com 24), npm e um navegador com WebGL 2. Trost aceita teclado/mouse ou controle com mapeamento padrão do navegador. Configurações e links ainda exigem teclado/mouse; a arena também aceita controle padrão. Não há serviços externos, banco de dados, variáveis secretas ou downloads de recursos durante o jogo.

```sh
cd /workspace/aot
npm ci --cache /workspace/.npm-cache
npm run dev -- --port 5173
```

Abra o servidor na porta 5173 usando o encaminhamento de portas do seu ambiente ou no seu computador. A interface de onboarding não oferece preview web. Para uma versão compilada: `npm run build` e `npm run preview`.

## Operação

Comece no telhado e siga quatro etapas: reúna os civis com G e acompanhe-os ao abrigo, recupere o abastecimento usando R na caixa azul, elimine os três titãs e confirme a retirada com G no sinal verde diante do portão. O marcador e a seta de direção acompanham o objetivo atual. Ataque por trás, a menos de 7 metros da nuca e na altura correta. O posto azul restaura gás, lâminas e vitalidade. Os titãs antecipam seus ataques com o movimento dos braços; saia do alcance antes do golpe.

| Controle | Ação |
| --- | --- |
| Mouse | Câmera; arrastar caso a captura do ponteiro não esteja disponível |
| WASD | Movimento relativo à câmera |
| Segurar Q / E | Prender o cabo esquerdo / direito à superfície sob a mira |
| Soltar Q / E | Soltar o cabo correspondente |
| Espaço | Salto no chão; impulso de gás com cabo preso |
| Clique esquerdo | Ataque com lâminas |
| R | Reabastecer a menos de 10 m do posto |
| G | Iniciar escolta dos civis / confirmar retirada no ponto final |
| Escape | Pausa e instruções |

As configurações oferecem qualidade gráfica, sensibilidade, áudio, assistência de ancoragem e variação do campo de visão com velocidade. Q e E mostram destinos separados; cabos se soltam quando a trajetória encontra um obstáculo. O indicador de nuca exige alcance, direção e caminho livre para o golpe. A perda de foco pausa o jogo e limpa os comandos. A operação pode ser reiniciada após vitória ou derrota.

## Checkpoints e operação guiada — fase 5

As quatro etapas são obrigatórias. Abates antecipados contam, mas não substituem o resgate ou o abastecimento; eliminar o último titã não encerra a operação. Só a interação no ponto de retirada confirma a vitória.

O jogo registra um checkpoint no início da operação, ao reunir os civis, nos pontos intermediários da escolta, após resgate/abastecimento e a cada abate. O menu inicial, a pausa e a tela de derrota oferecem retomada. Objetivos, abates e tempo registrado no checkpoint são preservados; posição e equipamento são recuperados em um ponto seguro, com dois segundos de proteção. Não se trata de salvamento a cada quadro: deslocamento e tempo depois do último checkpoint podem ser perdidos.

O progresso é salvo **neste navegador**, na chave `trost.operation.v1` do localStorage (formato interno agora na versão 2, com migração da versão 1); não há sincronização entre dispositivos ou com o GitHub. Dados incompatíveis ou corrompidos são ignorados. Se o navegador impedir a gravação, checkpoints continuam funcionando apenas durante a sessão e a interface informa essa limitação. Uma nova operação substitui o checkpoint; a conclusão não oferece retomada de uma missão já terminada.

A missão continua sendo um ensaio original inspirado no cenário de Trost, não uma reconstrução de cenas do anime. Os civis caminham em grupo até um abrigo. Ainda não há cenas de diálogo ou animações de produção.

## Escolta de civis — fase 6

G reúne os três civis na praça. A etapa só termina quando o grupo chega ao abrigo, ao sul da praça, próximo ao posto de abastecimento. Eles seguem uma rota definida e permanecem visíveis no abrigo depois do resgate. O indicador mostra o progresso, enquanto o marcador acompanha o grupo.

O grupo aguarda se o jogador ficar a mais de 38 m (incluindo altura) e para se um titã vivo ficar a menos de 12 m na horizontal. Aproxime-se ou elimine a ameaça para retomar o percurso; abates feitos durante a escolta continuam contando na missão. Neste protótipo os civis não recebem dano nem morrem: a ameaça bloqueia a passagem, sem simular ainda ferimentos ou perdas. A rota foi desenhada para as ruas atuais e não usa navegação livre por toda a cidade.

Checkpoints intermediários preservam a posição na rota e retomam o jogador perto do grupo. A pausa também congela a escolta. Saves da fase 5 com o resgate já concluído são migrados automaticamente e colocam os civis no abrigo, sem exigir repetir a etapa. Posições e progresso inválidos são rejeitados.

## Arena de transformação — fase 3

No menu de Trost, escolha **Ensaio 03 · Transformação em titã**. A arena também está em `arena.html`, tanto no servidor de desenvolvimento quanto no build de produção. É um ensaio separado da campanha, com modelos procedurais; ainda não é uma representação final de Eren.

| Controle na arena | Ação |
| --- | --- |
| T | Iniciar a transformação com uma breve preparação |
| WASD / mouse | Movimento / câmera |
| Clique esquerdo | Soco rápido |
| Q | Golpe forte, com maior preparação e custo |
| Segurar botão direito | Defender ataques frontais |
| Espaço | Esquivar na direção do movimento, ou para trás |
| F | Agarrar durante a recuperação do adversário, a até 8,5 m |
| Segurar R | Regenerar após 2 segundos sem dano, consumindo reservas |
| E | Sair da forma titã |
| Tab | Alternar alvo fixado / mira livre |
| Escape | Pausar, consultar controles ou reiniciar |

Resistência limita ataques, defesa e esquiva. Reservas caem com o tempo e mais rapidamente durante a regeneração. A defesa reduz dano, mas pode quebrar sem resistência. A transformação leva 2,2 segundos; sair leva 1,6 segundo e causa 5 segundos de fadiga. Há no máximo duas transformações por ensaio. Esses números são decisões de equilíbrio do protótipo, **não afirmações sobre limites canônicos dos poderes**. O rival espera durante a preparação e a forma humana; é uma concessão deste laboratório. Não há endurecimento.

A arena possui vitória, derrota, saída por esgotamento e reinício. Os golpes só acertam no alcance e na direção válidos. Os modelos ainda usam animações procedurais simples; o agarrão é representado por uma aproximação de braços e deslocamento do rival, sem animação de luta final.

## Apresentação do combate — fase 4

Os titãs de Trost e da arena usam um modelo procedural com tronco contínuo, feições, mãos, cabelo e articulações de cotovelos e joelhos. Na arena, as poses de defesa, preparação, extensão e recuperação dos golpes acompanham a simulação; a extensão máxima coincide com o instante de acerto. Isso ainda não substitui modelos esculpidos, captura de movimento ou animações finais do anime.

A arena sintetiza sons de passos, impactos, bloqueio, transformação, esquiva e vapor com Web Audio, sem downloads. O botão **SOM** ativa/desativa esse áudio; pausar interrompe as vozes em andamento. **TREMOR** controla a reação da câmera aos golpes e começa desativado quando o navegador solicita movimento reduzido. O clarão da transformação também respeita essa preferência. Uma breve pausa de impacto e indicadores numéricos ajudam a reconhecer acertos e dano recebido.

A atualização é uma etapa intermediária de apresentação, não a conclusão da demonstração de produção prevista no roteiro. Não altera os custos, danos ou regras do ensaio anterior.

## Arquitetura do distrito — fase 7

As fachadas agora possuem molduras, caixilhos, peitoris e venezianas em relevo, além de vigas entre pavimentos e nos frontões dos telhados. Reboco, telhas e calçamento usam texturas procedurais com relevo de iluminação. O portão recebeu tábuas, cintas, rebites, pilares e um arco de cantaria decorativo para ajudar a ler sua escala.

As janelas compartilham três lotes instanciados; as demais peças estáticas entram no agrupamento por material já usado pelo cenário. Esses detalhes são visuais: as colisões e ancoragens continuam nas superfícies estruturais. Não é possível prender cabos individualmente em venezianas ou no arco ornamental. O portão permanece fechado.

Esta é uma melhoria da arquitetura procedural do protótipo. O distrito não foi conferido com plantas ou episódios e não representa a geometria final do anime. Ainda são necessários modelos de produção, revisão artística e medições em GPU real.

## Leitura dos ataques de Trost — fase 8

Os titãs perseguem alvos a menos de 42 m e abaixo de sua altura mais 9 m, desde que a linha entre o tronco e o jogador não atravesse construções. Giram antes de avançar e só iniciam golpes contra alvos à frente. A perseguição continua restrita à avenida central; ainda não há busca, memória do último avistamento ou navegação pelas ruas laterais.

O ataque tem 0,9 segundo de preparação, com direção travada, seguido de 1,4 segundo de recuperação. O setor alaranjado no chão mostra o alcance horizontal de 9 m e a abertura frontal do golpe; o texto informa o tempo restante. Sair desse setor, passar para trás, subir acima de 85% da altura do titã ou colocar uma construção na linha de visão evita o dano no instante de impacto. A área é um auxílio de combate, não uma colisão precisa com cada dedo. Receber um golpe causa 35 pontos de dano, como antes.

A recuperação termina mesmo se o jogador sair do campo de detecção. Ela oferece tempo para contornar o inimigo, mas atingir a nuca ainda exige alcance, altura, direção e caminho livre. Pausar congela os temporizadores e o setor; reiniciar ou retomar checkpoint reinicia os encontros vivos. Essas regras são decisões de equilíbrio do protótipo e não medidas canônicas. A arena de transformação mantém suas regras próprias.

## Golpe de lâminas — fase 9

Clique inicia uma preparação de 0,16 s; o corte é resolvido nesse instante, seguido de recuperação até completar 0,52 s. O indicador abaixo do objetivo mostra preparação, corte, recuperação ou prontidão. As poses dos braços e o rastro curto acompanham o tempo do golpe. Durante o voo, mantenha a nuca ao alcance e na mira até o corte: o clique não reserva um acerto contra um alvo que depois se afaste.

O gasto de até 5 pontos de lâmina acontece uma única vez no início, mesmo se o golpe errar ou for interrompido. Cliques durante o ciclo são ignorados, sem ataque enfileirado. A última carga parcial ainda permite um golpe. Receber dano cancela o ataque; pausa congela o tempo restante; reinício e retomada de checkpoint descartam ataques pendentes. Os requisitos de alcance, altura, aproximação por trás e caminho livre continuam iguais, assim como o limite de um abate por golpe. Não há combo, travamento automático no alvo ou colisão detalhada entre lâmina e pele.

## Perfis gráficos — fase 10

A qualidade de Trost pode ser alterada nas configurações e fica salva neste navegador, na chave `trost.graphics.v1`, separada dos checkpoints. Sem preferência válida, o jogo começa em Alta. Quando o armazenamento estiver bloqueado, a escolha funciona durante a sessão e a interface informa isso. A arena de transformação continua com suas próprias configurações.

| Perfil | Limite da escala de pixels | Sombras | Relevo dos materiais | Filtragem anisotrópica máxima |
| --- | --- | --- | --- | --- |
| Alta | 1,6 | 2048 × 2048 | Ativo | 8× |
| Equilibrada | 1,1 | 1024 × 1024 | Ativo | 4× |
| Desempenho | 0,8 | Desligadas | Desligado | 1× |

A escala efetiva também respeita a densidade da tela e a filtragem respeita o suporte da GPU. Desempenho mantém texturas de cor, geometria, colisões e regras da missão. Voltar para Alta restaura os mapas de relevo originais. Trocar a resolução das sombras libera os alvos de renderização anteriores; reaplicar o mesmo perfil não recompila materiais sem alteração. Redimensionar a janela mantém o perfil escolhido.

Esses perfis reduzem trabalho gráfico de formas específicas; não garantem uma taxa de quadros. Ainda é necessário medir conforto e desempenho em hardware real. Não há ajuste automático por FPS nesta etapa.

## Controle em Trost — fase 11

Conecte um controle compatível com o mapeamento `standard` da Gamepad API e pressione um botão para o navegador detectá-lo. O primeiro controle padrão disponível é usado; modelos com mapeamento proprietário são ignorados. Se o navegador não disponibilizar a API, teclado/mouse continuam funcionando.

| Controle padrão | Ação |
| --- | --- |
| Analógico esquerdo | Movimento com intensidade gradual |
| Analógico direito | Câmera; respeita a sensibilidade configurada |
| LT/L2 e RT/R2 | Segurar cabo esquerdo/direito; soltar libera o cabo |
| A/× | Salto; segurar para gás com cabo preso |
| X/□ | Ataque de lâminas |
| Y/△ | Reunir civis / confirmar retirada |
| RB/R1 | Reabastecer |
| B/○ | Soltar os dois cabos |
| Start/Menu/Options | Iniciar ou continuar a operação; pausar/retomar; nova operação após o resultado |
| Back/View/Share | Retomar checkpoint durante pausa ou derrota |

Start no menu retoma um checkpoint disponível; sem checkpoint, inicia uma operação nova. Para escolher explicitamente uma operação nova com um save existente, use o botão do menu com mouse. As configurações e links ainda usam teclado/mouse; não há navegação geral de menus com o direcional. A arena tem seu mapeamento próprio descrito abaixo.

Após pausa, reconexão ou troca de controle, solte botões e centralize os analógicos antes de jogar. Desconectar o controle durante a operação pausa e solta os cabos. Zona morta radial de 18% reduz deriva; os gatilhos são tratados como comandos digitais. Não há vibração, remapeamento ou suporte simultâneo a vários jogadores. O HUD mostra os atalhos do controle quando conectado. Áudio pode exigir um clique/tecla inicial conforme a política do navegador.

A integração foi testada com Gamepad API simulada e controles lógicos; compatibilidade, conforto e latência com hardware físico continuam pendentes.

## Controle na arena — fase 12

A arena de transformação aceita o primeiro controle padrão detectado pelo navegador, usando a mesma zona morta e proteção contra comandos presos de Trost. Pressione um botão para detectar; Start entra no ensaio sem exigir captura do mouse. Os avisos e a ajuda da pausa mostram o mapeamento correspondente ao dispositivo conectado.

| Controle padrão | Ação na arena |
| --- | --- |
| Analógico esquerdo / direito | Movimento / câmera |
| RB/R1 | Transformar |
| X/□ / Y/△ | Soco / golpe forte |
| LB/L1 | Agarrar durante a recuperação do adversário |
| Segurar LT/L2 | Defender |
| A/× | Esquivar na direção do movimento |
| Segurar RT/R2 | Regenerar, respeitando os custos e requisitos do combate |
| B/○ | Sair da forma titã |
| R3 | Alternar alvo fixado / mira livre |
| Start/Menu/Options | Entrar, pausar, retomar ou iniciar novo ensaio após o resultado |
| Back/View/Share | Reiniciar o ensaio na pausa ou após o resultado |

Desconectar ou substituir o controle pausa e interrompe defesa/regeneração. Ao retomar, solte botões e centralize analógicos antes de agir. Golpes, transformação, esquiva e agarrão são acionados uma vez por pressão; segurar o botão não repete ataques. Os limites de energia, fadiga, alcance e resistência continuam os mesmos. Não há vibração, remapeamento ou navegação geral de menus; opções de áudio/gráficos e links continuam usando teclado/mouse. O áudio pode depender de um clique/tecla inicial por política do navegador.

Testes automatizados usam a Gamepad API simulada. Avaliação com controles físicos e ergonomia ainda está pendente.

## Validação

```sh
npm test
npm run build
npm run test:browser
```

O teste de navegador usa Chromium em `/usr/bin/chromium`; defina `CHROMIUM_PATH` se necessário. Também é possível instalar o navegador do Playwright com `npx playwright install chromium` e usar a configuração adaptada ao ambiente. Capturas e relatórios são gravados em `test-results/` e ignorados pelo Git. Testes headless com renderização por software não medem desempenho em GPU real.

## Organização

- `src/main.js`: estado da missão, física, controles, IA, câmera, áudio e interface.
- `src/world.js`: cenário, personagens, materiais e geometria procedural.
- `src/architecture.js`: detalhes instanciados de fachada e ornamentação do portão.
- `src/blade-strike.js`: ciclo, custo e poses do golpe de lâminas.
- `src/graphics-quality.js`: perfis gráficos, restauração de materiais e persistência da preferência.
- `src/gamepad-input.js`: leitura de controle padrão, zona morta, bordas de botão e retorno ao neutro.
- `src/mechanics.js`: regras independentes de renderização, cobertas por testes.
- `src/collision.js`: contato com telhados inclinados e obstrução de segmentos.
- `src/targeting.js`: seleção independente das ancoragens e assistência.
- `src/trost-titan-ai.js`: percepção, perseguição, preparação e recuperação dos titãs de Trost.
- `src/trost-mission.js`: objetivos encadeados, validação de eventos e checkpoints versionados.
- `src/civilian-escort.js`: rota, progresso, espera, ameaça e chegada do grupo.
- `src/civilian-model.js`: personagens civis procedurais e animação de caminhada.
- `src/titan-combat.js`: simulação determinística de transformação e combate.
- `src/titan-main.js`: arena, efeitos, controles e visualização da simulação.
- `src/titan-model.js`: geometria procedural e hierarquia de articulações.
- `src/titan-animation.js`: poses amostradas pelo tempo da simulação.
- `src/arena-audio.js`: síntese de efeitos sonoros, limite de vozes, mute e pausa.
- `docs/ROADMAP.md`: escopo, limites e próximos marcos.

## Limites atuais

Esta é uma missão de treino não canônica em um distrito inspirado em Trost. O mapa ainda não é uma reconstrução conferida com episódios. O personagem é um cadete genérico. A transformação jogável existe somente no ensaio separado, não na missão de Trost. Não há cinematografia da história, dublagem, desmembramento, titãs devorando pessoas, ou cavalos. O salvamento local está restrito à operação de Trost; a arena não persiste o combate. A violência implementada se limita a impactos e partículas estilizadas.

As colisões dos telhados seguem os dois planos de inclinação, mas o corpo do jogador ainda usa um volume simplificado. A IA dos titãs fica na avenida central. Cabos se soltam nas obstruções; ainda não contornam quinas nem se enrolam nas estruturas. O protótipo não implementa ainda simulação completa do ODM. A arte procedural deve ser substituída por modelos e animações de produção depois que movimentação e combate forem aprovados.

Uma produção pública/comercial com a propriedade intelectual de Attack on Titan precisa tratar a autorização dos titulares. A pesquisa web e a conferência de referências continuam pendentes de acesso à rede.

## Entregas por fase

Cada fase concluída recebe uma branch, validação, commit, push e PR no GitHub. As fases 1–2 estão no [PR #1](https://github.com/JullioDutra/aot/pull/1), já integrado pelo fluxo externo a esta implementação. A fase 3 está no [PR #2](https://github.com/JullioDutra/aot/pull/2). A fase 4 está no [PR #3](https://github.com/JullioDutra/aot/pull/3). A fase 5 foi integrada pelo [PR #4](https://github.com/JullioDutra/aot/pull/4). A fase 6 foi integrada pelo [PR #5](https://github.com/JullioDutra/aot/pull/5). As fases 7 a 11 foram integradas juntas pelo [PR #6](https://github.com/JullioDutra/aot/pull/6). A fase 12 usa `feat/phase-12-arena-gamepad`, com base em `main`. A base de revisão acompanha a versão integrada mais recente ou a branch predecessora quando necessário. Abertura de PR não implica autorização para merge automático; consulte AGENTS.md.
