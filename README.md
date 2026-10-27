# Trost — Asas da Liberdade

Primeiro protótipo independente de um jogo 3D inspirado em Attack on Titan. **Não é uma adaptação oficial nem uma demonstração de qualidade gráfica final.** Cenários, personagens e áudio são procedurais e originais; não há modelos, trilhas ou cenas extraídos do anime.

## Executar

Requer Node.js 22.12+ (validado com 24), npm e um navegador com WebGL 2. Teclado e mouse são necessários. Não há serviços externos, banco de dados, variáveis secretas ou downloads de recursos durante o jogo.

```sh
cd /workspace/aot
npm ci --cache /workspace/.npm-cache
npm run dev -- --port 5173
```

Abra o servidor na porta 5173 usando o encaminhamento de portas do seu ambiente ou no seu computador. A interface de onboarding não oferece preview web. Para uma versão compilada: `npm run build` e `npm run preview`.

## Operação

Comece no telhado e siga quatro etapas: resgate os civis com G, recupere o abastecimento usando R na caixa azul, elimine os três titãs e confirme a retirada com G no sinal verde diante do portão. O marcador e a seta de direção acompanham o objetivo atual. Ataque por trás, a menos de 7 metros da nuca e na altura correta. O posto azul restaura gás, lâminas e vitalidade. Os titãs antecipam seus ataques com o movimento dos braços; saia do alcance antes do golpe.

| Controle | Ação |
| --- | --- |
| Mouse | Câmera; arrastar caso a captura do ponteiro não esteja disponível |
| WASD | Movimento relativo à câmera |
| Segurar Q / E | Prender o cabo esquerdo / direito à superfície sob a mira |
| Soltar Q / E | Soltar o cabo correspondente |
| Espaço | Salto no chão; impulso de gás com cabo preso |
| Clique esquerdo | Ataque com lâminas |
| R | Reabastecer a menos de 10 m do posto |
| G | Resgatar civis / confirmar retirada no ponto final |
| Escape | Pausa e instruções |

As configurações oferecem qualidade gráfica, sensibilidade, áudio, assistência de ancoragem e variação do campo de visão com velocidade. Q e E mostram destinos separados; cabos se soltam quando a trajetória encontra um obstáculo. O indicador de nuca exige alcance, direção e caminho livre para o golpe. A perda de foco pausa o jogo e limpa os comandos. A operação pode ser reiniciada após vitória ou derrota.

## Checkpoints e operação guiada — fase 5

As quatro etapas são obrigatórias. Abates antecipados contam, mas não substituem o resgate ou o abastecimento; eliminar o último titã não encerra a operação. Só a interação no ponto de retirada confirma a vitória.

O jogo registra um checkpoint no início da operação, após resgate/abastecimento e a cada abate. O menu inicial, a pausa e a tela de derrota oferecem retomada. Objetivos, abates e tempo registrado no checkpoint são preservados; posição e equipamento são recuperados em um ponto seguro, com dois segundos de proteção. Não se trata de salvamento a cada quadro: deslocamento e tempo depois do último checkpoint podem ser perdidos.

O progresso é salvo **neste navegador**, na chave `trost.operation.v1` do localStorage; não há sincronização entre dispositivos ou com o GitHub. Dados incompatíveis ou corrompidos são ignorados. Se o navegador impedir a gravação, checkpoints continuam funcionando apenas durante a sessão e a interface informa essa limitação. Uma nova operação substitui o checkpoint; a conclusão não oferece retomada de uma missão já terminada.

A missão continua sendo um ensaio original inspirado no cenário de Trost, não uma reconstrução de cenas do anime. Os civis são encaminhados por interação; ainda não há escolta física ou cenas de diálogo.

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
- `src/mechanics.js`: regras independentes de renderização, cobertas por testes.
- `src/collision.js`: contato com telhados inclinados e obstrução de segmentos.
- `src/targeting.js`: seleção independente das ancoragens e assistência.
- `src/trost-mission.js`: objetivos encadeados, validação de eventos e checkpoints versionados.
- `src/titan-combat.js`: simulação determinística de transformação e combate.
- `src/titan-main.js`: arena, efeitos, controles e visualização da simulação.
- `src/titan-model.js`: geometria procedural e hierarquia de articulações.
- `src/titan-animation.js`: poses amostradas pelo tempo da simulação.
- `src/arena-audio.js`: síntese de efeitos sonoros, limite de vozes, mute e pausa.
- `docs/ROADMAP.md`: escopo, limites e próximos marcos.

## Limites atuais

Esta é uma missão de treino não canônica em um distrito inspirado em Trost. O mapa ainda não é uma reconstrução conferida com episódios. O personagem é um cadete genérico. A transformação jogável existe somente no ensaio separado, não na missão de Trost. Não há cinematografia da história, dublagem, desmembramento, titãs devorando pessoas, cavalos ou suporte a controle. O salvamento local está restrito à operação de Trost; a arena não persiste o combate. A violência implementada se limita a impactos e partículas estilizadas.

As colisões dos telhados seguem os dois planos de inclinação, mas o corpo do jogador ainda usa um volume simplificado. A IA dos titãs fica na avenida central. Cabos se soltam nas obstruções; ainda não contornam quinas nem se enrolam nas estruturas. O protótipo não implementa ainda simulação completa do ODM. A arte procedural deve ser substituída por modelos e animações de produção depois que movimentação e combate forem aprovados.

Uma produção pública/comercial com a propriedade intelectual de Attack on Titan precisa tratar a autorização dos titulares. A pesquisa web e a conferência de referências continuam pendentes de acesso à rede.

## Entregas por fase

Cada fase concluída recebe uma branch, validação, commit, push e PR no GitHub. As fases 1–2 estão no [PR #1](https://github.com/JullioDutra/aot/pull/1), já integrado pelo fluxo externo a esta implementação. A fase 3 está no [PR #2](https://github.com/JullioDutra/aot/pull/2). A fase 4 está no [PR #3](https://github.com/JullioDutra/aot/pull/3). A fase 5 usa `feat/phase-05-trost-operation` e respeita a base integrada mais recente ou a branch predecessora quando o PR anterior ainda estiver aberto. Abertura de PR não implica autorização para merge automático; consulte AGENTS.md.
