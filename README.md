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

Comece no telhado e elimine os três titãs. Ataque por trás, a menos de 7 metros da nuca e na altura correta. Resgatar os três civis é opcional. O posto azul na praça recupera gás, lâminas e vitalidade. Os titãs antecipam seus ataques com o movimento dos braços; saia do alcance antes do golpe.

| Controle | Ação |
| --- | --- |
| Mouse | Câmera; arrastar caso a captura do ponteiro não esteja disponível |
| WASD | Movimento relativo à câmera |
| Segurar Q / E | Prender o cabo esquerdo / direito à superfície sob a mira |
| Soltar Q / E | Soltar o cabo correspondente |
| Espaço | Salto no chão; impulso de gás com cabo preso |
| Clique esquerdo | Ataque com lâminas |
| R | Reabastecer a menos de 10 m do posto |
| G | Resgatar civis próximos |
| Escape | Pausa e instruções |

As configurações oferecem qualidade gráfica, sensibilidade, áudio, assistência de ancoragem e variação do campo de visão com velocidade. Q e E mostram destinos separados; cabos se soltam quando a trajetória encontra um obstáculo. O indicador de nuca exige alcance, direção e caminho livre para o golpe. A perda de foco pausa o jogo e limpa os comandos. A operação pode ser reiniciada após vitória ou derrota.

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
- `docs/ROADMAP.md`: escopo, limites e próximos marcos.

## Limites atuais

Esta é uma missão de treino não canônica em um distrito inspirado em Trost. O mapa ainda não é uma reconstrução conferida com episódios. O personagem é um cadete genérico. Não há transformação jogável, cinematografia da história, dublagem, desmembramento, titãs devorando pessoas, cavalos, suporte a controle ou salvamento persistente. A violência implementada se limita a impactos e partículas estilizadas.

As colisões dos telhados seguem os dois planos de inclinação, mas o corpo do jogador ainda usa um volume simplificado. A IA dos titãs fica na avenida central. Cabos se soltam nas obstruções; ainda não contornam quinas nem se enrolam nas estruturas. O protótipo não implementa ainda simulação completa do ODM. A arte procedural deve ser substituída por modelos e animações de produção depois que movimentação e combate forem aprovados.

Uma produção pública/comercial com a propriedade intelectual de Attack on Titan precisa tratar a autorização dos titulares. A pesquisa web e a conferência de referências continuam pendentes de acesso à rede.
