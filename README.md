# Trost — Asas da Liberdade

Primeiro protótipo independente de um jogo 3D inspirado em Attack on Titan. **Não é uma adaptação oficial nem uma demonstração de qualidade gráfica final.** Cenários, personagens e áudio são procedurais e originais; não há modelos, trilhas ou cenas extraídos do anime.

## Executar

Requer Node.js 22.12+ (validado com 24), npm e um navegador com WebGL 2. Trost aceita teclado/mouse ou controle com mapeamento padrão do navegador. Configurações e links ainda exigem teclado/mouse; a arena também aceita controle padrão. Não há serviços externos, banco de dados, variáveis secretas ou downloads de recursos durante o jogo.

```sh
npm ci
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

Os titãs perseguem alvos a menos de 42 m e abaixo de sua altura mais 9 m, desde que a linha entre o tronco e o jogador não atravesse construções. Giram antes de avançar e só iniciam golpes contra alvos à frente. A perseguição continua restrita à avenida central; a fase 13 acrescenta memória do último avistamento, mas ainda não há navegação pelas ruas laterais.

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

## Busca dos titãs — fase 13

Ao perder a linha de visão, o titã procura durante até 5 segundos na última posição observada, limitada à avenida central. Ele não acompanha a posição atual de um jogador escondido. Ao chegar perto desse ponto, aguarda até a memória expirar; um novo avistamento válido renova a busca. Sair do alcance ou subir além da altura de detecção também deixa apenas a última observação na memória.

O HUD avisa quando um titã próximo está procurando. Use construções para interromper a visão e mudar de posição. A busca não inicia golpes sem detectar o jogador; golpes já preparados continuam seu ciclo e só causam dano se houver visão e alcance no impacto. Pausa congela a memória e reinício/checkpoint limpa as observações. Os 5 segundos são um parâmetro de jogo, não uma regra canônica.

Não há patrulha, audição ou navegação pelas ruas laterais. A busca usa a projeção da última posição na avenida, sem calcular um caminho até telhados ou interiores. O comportamento foi verificado por testes determinísticos; equilíbrio e sensação de despistar ainda precisam de avaliação humana.

## Defesa da nuca — fase 14

O titã maior, de 18 m, reage quando detecta o jogador atrás de si, a menos de 12 m na horizontal e acima de 55% de sua altura. Ele para de andar e ergue as mãos durante 0,75 s: a nuca continua vulnerável nessa preparação. Em seguida, protege a nuca por 1,2 s e entra em recuperação por 1,4 s. A proteção termina quando começa a baixar os braços; aproveite essa abertura para cortar.

O aviso de combate distingue preparação, proteção e recuperação. Durante a proteção, o marcador de acerto da nuca desaparece. Um corte que alcançaria a nuca é bloqueado, com faíscas e aviso, sem registrar abate; o gasto normal de lâmina permanece. A proteção é conferida no impacto, não no clique. Os outros dois titãs mantêm seus comportamentos anteriores.

A defesa não interrompe golpes ou recuperações em andamento, não causa dano e completa seu ciclo mesmo se o jogador sair da vista. Pausa congela o ciclo; reinício/checkpoint limpa a defesa. A posição das mãos usa articulações procedurais. A proteção é uma regra abstrata da nuca, sem colisão detalhada de dedos, corte dos braços ou dano localizado. Trata-se de uma variação autoral de combate, não de uma cena ou poder canônico verificado. O equilíbrio ainda requer testes humanos.

## Som direcional dos titãs — fase 15

Passos, preparação de ataque, impacto, movimento de defesa da nuca, bloqueio de lâminas e abate agora usam sons sintetizados com posição estéreo em Trost. Esquerda/direita seguem a orientação horizontal da câmera. O volume diminui com a distância, incluindo altura, e chega a zero a 80 m. Uma construção entre a origem do som e o jogador reduz o volume para um quarto; é abafamento por volume, sem filtragem acústica ou reverberação.

Os passos são acionados pelo deslocamento real, a cada 16% da altura do titã percorridos. Parar não produz novos passos. Preparação e impacto soam uma vez por transição; o golpe produz som mesmo quando erra. Pausa, resultado, reinício e a opção de desligar áudio interrompem os sons ativos. Retomar não reproduz eventos acumulados. O sintetizador limita a 20 fontes simultâneas (até dez efeitos de duas fontes); os sinais simples de equipamento usam o mesmo contexto de áudio, mas não têm posição estéreo.

Os sons são originais e procedurais, sem gravações do anime. O navegador pode exigir clique/tecla para liberar áudio; falha ou ausência da API não impede jogar. Sem StereoPanner, os efeitos permanecem centralizados. A mixagem fica fixa durante cada efeito curto, sem HRTF, propagação física ou atualização contínua quando a câmera gira. Testes verificam as regras e o ciclo de áudio; clareza, conforto e qualidade sonora ainda precisam de escuta humana com fones e caixas.

## Plataformas, toque e tela cheia — fase 17

O jogo identifica três perfis de entrada — teclado/mouse, controle padrão e toque — e segue sempre o último usado: tocar a tela, mover um analógico ou apertar uma tecla troca os avisos, a ajuda da pausa e os rótulos dos marcadores na hora. Celulares e tablets (ponteiro grosso sem hover) começam no perfil de toque e na qualidade Desempenho enquanto o jogador não escolhe outra.

No toque, o polegar esquerdo usa um analógico flutuante (nasce onde o dedo encosta, com zona morta) e arrastar na metade direita gira a câmera. Em Trost, os botões são ◀ CABO e CABO ▶ (segurar prende, soltar libera), GÁS, LÂMINA, AGIR, ABASTECER e SOLTAR. Na arena: TITÃ, SOCO, FORTE, DEFESA, ESQUIVA, AGARRAR, REGENERAR, SAIR e ALVO. O HUD se compacta, os textos do tipo "pressione G" viram o nome do botão e em retrato aparece um pedido para girar o aparelho. Iniciar pelo toque pede tela cheia; o botão ⛶ (e a tecla F em Trost) alterna tela cheia em qualquer perfil, quando o navegador permitir.

Limites: sem vibração, sem remapeamento e sem layout personalizável dos botões. O toque foi validado com eventos simulados e emulação de celular no Chromium; ergonomia e desempenho em aparelhos reais ainda precisam de teste humano. Safari no iPhone não oferece tela cheia para páginas comuns; nesse caso o jogo continua em janela.

## Modo História — fase 18

`historia.html` (link **MODO HISTÓRIA** no menu de Trost) apresenta a campanha inteira como plano de produção navegável: 8 atos, 47 fases, 138 sub-fases, 50 desafios opcionais, 15 decisões e 32 mortes canônicas encenadas. Cada fase mostra sinopse, jogabilidade, sub-fases, desafios, acontecimentos fixos, decisões e as referências de episódio a conferir. As cenas dos 11 vídeos de referência estão associadas às fases correspondentes (Levi x Bestial e o discurso de Erwin na fase 32, por exemplo).

A fidelidade é verificada por código. `src/campaign/canon.js` rejeita personagens mortos fora de flashback, poderes antes de obtidos (endurecimento antes da fase 27, Colossal de Armin antes da 34, voo de Falco fora da 46), mortes fora da fase canônica ou sem encenação e opções de decisão que prometam evitar uma morte fixa. Toda decisão converge para um único desfecho (`resolves`): a escolha muda reflexão, diálogo e sobreviventes locais, nunca o rumo da história. O progresso (melhor nota S/A/B/C, decisões, desafios) fica neste navegador, na chave `aot.story.v1`.

Sinopses e falas são escritas para o projeto, em paráfrase; não há roteiro do anime. As fases aparecem como **planejadas** até ganharem implementação jogável; as referências de episódio (T1E01…T4E30) ainda precisam de conferência humana com fontes oficiais.

## Personagens, titãs e galeria — fases 19 e 20

`galeria.html` mostra o elenco em escala real (Levi, 1,60 m, ao lado de Erwin, 1,88 m), a infância em Shiganshina, cada personagem em giro de 360° com poses (parado, andar, correr, voo de ODM, golpe, carregado, luto, cavalgar, saudação, queda) e os titãs com Levi como referência de escala.

Os personagens usam sombreamento em estilo de anime (toon de três faixas e contorno por casco invertido). Os rostos são desenhados em canvas: olhos com íris, brilho e pálpebra pesada, sobrancelhas por expressão e marcas como sardas, olheiras, barba e bigode. Os cabelos são feitos de mechas que primeiro abraçam o crânio e depois caem com a gravidade: o cabelo bagunçado de Eren, o chanel de Mikasa, a "tigela" de Armin, a cortina com laterais raspadas de Levi, a risca lateral de Erwin, o rabo de Hange com óculos e o coque de Annie. Os uniformes trazem jaqueta curta aberta, arnês no peito e nas coxas, botas, cachecol, gravata e emblemas originais desenhados em canvas (asas, espadas, rosas), além do equipamento 3D com caixas de lâmina e cilindros de gás.

Os titãs puros saem de parâmetros que reproduzem a linguagem perturbadora do anime: a sorridente que devorou Carla, o barbudo de Trost, o anormal de membros longos, o do nariz, o de cabelo longo, o corpulento e o de 4 m. Os Nove têm detalhes próprios:

- **Ataque:** mandíbula sem lábios e cabelo longo.
- **Colossal:** 60 m, sem pele, com fibras e tendões.
- **Blindado:** placas e capacete.
- **Fêmea:** pele sobre a musculatura exposta.
- **Bestial:** pelagem e braços longos.
- **Carroça:** quadrúpede.
- **Mandíbula:** mandíbula endurecida.
- **Martelo de Guerra:** corpo claro, com as linhas de endurecimento.

Limites: modelos procedurais aproximados a partir das referências; não são arte de produção nem traçados de imagens oficiais. O Fundador e os Colossais do Estrondo ainda não têm modelo. Não há esqueleto com skinning: as articulações são rígidas e as roupas não simulam tecido.

## Transformação com raios — fase 21

`src/transformation.js` define quando um titã-transformante pode se transformar:

- o poder precisa existir naquela fase da história (Eren só a partir da 10, Armin com o Colossal só a partir da 34, Mikasa nunca);
- é preciso intenção e ferimento, exceto em cenas roteirizadas;
- a fadiga e o limite de transformações da missão bloqueiam novas tentativas;
- espaços fechados impedem a transformação.

A linha do tempo segue a obra: ferimento, faíscas, raio, clarão, corpo formando no vapor. O raio é gerado de forma determinística por deslocamento de ponto médio, com ramificações descendentes.

`src/transformation-fx.js` desenha:

- um raio principal e um secundário, em segmentos retos, com núcleo branco e halo amarelo que pisca;
- uma luz pontual e um anel de choque;
- uma marca queimada no chão e uma coluna de vapor.

Na arena, o efeito substitui a antiga linha de 1 px, acompanha a pausa e o reinício e some depois que o corpo se forma. O mesmo efeito, em escala de 60 m, anuncia o Colossal na fase 2 do Modo História.

Limites: o modelo do titã da arena ainda é o anterior às fases 19–20; os raios não iluminam sombras dinâmicas.

## Modo História jogável — fases 22 e 23

`story.html?fase=N` roda as fases implementadas com um casco comum: diálogo (Espaço/clique, A ou toque), escolhas (1/2/3, direcional + A ou toque), objetivos com marcador na tela, faixas de sub-fase, pausa, tela cheia, falha com retorno rápido ao início da sub-fase e tela final. A tela final mostra a reflexão das escolhas e os desafios. Ela não exibe nota nem medalha quando a fase tem morte canônica. Os roteiros são passos puros (`src/story/engine.js`) validados em testes: toda escolha converge, toda morte fixa é encenada, todo roteiro termina.

**Fase 1 — Um dia em Shiganshina:** começa como o anime, com Eren acordando sob a árvore na colina com lágrimas no rosto e Mikasa com a lenha. Sub-fases: o portão interno com Hannes bebendo em serviço, o sino e o retorno da Tropa de Exploração (a mãe de Moses e o comandante), a escolha diante dos curiosos, a casa com Carla e a promessa do porão de Grisha, e Armin no canal falando do mar. O distrito tem muralhas de 50 m, portões, canal, ponte, praça com sino, barco e casas com estrutura de madeira. Desafios: encontrar os três marcos da infância (que voltam na fase 29) e terminar sem correr.

**Fase 2 — O dia em que a muralha caiu:** o raio sobre a muralha (o mesmo efeito da transformação, em escala de 60 m), o Colossal erguendo a cabeça acima dela e o chute no portão. Os destroços caem em arco e derrubam casas, inclusive a dos Yeager. Titãs entram e devoram quem corre. A fuga é contra a corrente: um titã ao alcance agarra Eren e faz você voltar ao início da sub-fase. Depois vêm a viga que não sobe, Carla presa, a chegada de Hannes e a escolha dele (lutar ou recuar; as duas acabam no mesmo lugar), Eren carregado olhando para trás e a titã sorridente erguendo e devorando Carla, com sangue e corte para o preto. Desafios: soltar quatro civis presos no caminho e não perder Mikasa de vista.

**Fase 32 — A última carga:** a conversa de Erwin e Levi sobre o sonho e o discurso aos recrutas (falas originais em paráfrase). Depois a carga a cavalo sob a chuva de pedras do Bestial: sombras no chão marcam os impactos, sinalizadores disparados durante o arremesso o cegam e espalham as pedras, e recrutas e cavalos caem à sua volta. Erwin cai à frente da carga e o recruta do jogador (Marlo) é atingido; os dois eventos são fixos. Levi usa os titãs enfileirados como ancoragens móveis (o cabo acompanha o titã) e corta nucas no caminho. O Bestial é desmontado por partes: braços, olhos e tendões. Enquanto tiver os braços, ele dá golpes telegrafados; com as pernas cortadas, ajoelha. Só então a nuca expõe Zeke, e a Carroça o resgata. Desafios: chegar ao Bestial com mais de 60% de gás, desmontá-lo em menos de 20 s e disparar sinalizadores em três arremessos.

Controles do Modo História: WASD e mouse; Espaço avança e dá gás; G/R age; Shift corre; Q/E seguram os cabos; clique corta ou dispara o sinalizador. No controle: A avança/gás, X lâmina/sinalizador, Y age, B corre, gatilhos para os cabos. No toque: CONTINUAR, AGIR, CORRER e, nas fases de combate, ◀ CABO, CABO ▶, GÁS e LÂMINA.

Limites: as fases 1–18 e 32 são jogáveis; as demais seguem planejadas no hub. Falas são paráfrases originais, sem dublagem. Os mapas são aproximações e não plantas conferidas episódio a episódio. Não há cinemáticas animadas à mão nem captura de movimento. A violência é estilizada (partículas, cortes de câmera). Testes de navegador usam ganchos de depuração para pular deslocamentos longos; o equilíbrio da carga e do duelo precisa de teste humano.

## Ato I completo — fase 25 (fases 3, 4 e 5 da história)

As fases 3–5 usam um kit comum (`src/story/kit.js`): atores com rotas, câmera com planos fixos, jogador a pé, ODM com lâminas, titãs puros que caçam a presa mais próxima (anormais vão atrás da multidão) e um titã controlável. As regras ficam em `src/story/story-rules.js`, com testes.

**Fase 3 — A retirada:** o último barco no portão interno de Shiganshina. Chame os civis com G, leve-os até o cais e fuja dos titãs antes da sineta; um titã que agarra Eren faz a sub-fase recomeçar, e um civil agarrado é perdido diante de você. Do barco, o Blindado atravessa o distrito em disparada e arrebenta o portão interno (a Muralha Maria cai). No armazém de Rose: a fila do pão, o soldado que deseja mais mortos, o chute de Eren, Armin pedindo desculpas e o pão dividido. Desafio: embarcar os seis civis.

**Fase 4 — O 104º Corpo de Treinamento:** a cerimônia de Shadis (a batata de Sasha), o aparelho de equilíbrio com o cinto quebrado (a falha é da peça, não dos controles: nenhuma direção segura o corpo), o conselho de Reiner e Bertholdt à noite e a segunda tentativa com o cinto de Thomas. Depois, o circuito de cabos com quatro arcos e o treino de desarme: G no fim do aviso de Reiner desarma, cedo demais abre a guarda. Annie derruba Eren de qualquer jeito. Desafios: equilíbrio sem passar de 50% de inclinação e desarmar Reiner sem receber golpes.

**Fase 5 — Exercício na floresta:** floresta de árvores gigantes (todas servem de ancoragem) com 20 alvos de madeira, quatro escondidos. Só corte por trás vale ponto, e velocidade dá bônus. Jean voa a rota e pontua no próprio ritmo; quem tiver menos pontos quando o sino tocar repete a sub-fase. Na noite da formatura, os dez primeiros e a escolha da mesa (Jean e Marco, Sasha e Connie, Reiner e Bertholdt), cada uma com conversas próprias. Desafios: pontuação de top 10 e todos os alvos escondidos.

Limites: o refeitório, o armazém e a cabana são cenários simples; o duelo e o equilíbrio precisam de teste humano para calibrar o tempo de reação.

## Batalha de Trost, parte 1 — fase 26 (fases 6 a 9 da história)

Trost é uma cidade inteira (`src/story/trost-world.js`): muralha externa com o portão, muralha interna com a fila de evacuação, quartel de abastecimento, praça da pedra e quarteirões altos o bastante para o ODM. As construções são mescladas por material, o que deixa a cidade em poucas chamadas de desenho, e toda fachada serve de ancoragem. As fases 6–12 compartilham um adaptador (`src/story/trost-chapter.js`) e cada uma traz o próprio plano.

**Fase 6 — O retorno do Colossal:** manutenção dos canhões no alto da muralha (a carne roubada de Sasha), o raio, o Colossal erguendo a cabeça ao lado do esquadrão e o chute que abre o portão. O jato de vapor arranca todos do alto: prenda um cabo na face interna da muralha antes de cair (pegar Samuel no ar é o desafio). Depois, suba e corte a nuca enquanto o braço do Colossal varre o alto da muralha com aviso; o golpe acerta e ele some no vapor. Desafios: segurar Samuel e chegar à nuca em menos de 25 s.

**Fase 7 — A primeira missão:** o esquadrão 34 voa pelos telhados atrás de Thomas. Ficar longe da formação por 6 s faz a sub-fase recomeçar. O anormal salta da rua e engole Thomas no ar; a escolha de Eren (perseguir ou manter a formação) termina igual: um titã arranca a perna dele. Mina bate numa fachada e é puxada; Nack e Milieus são devorados. Eren rasteja até a boca do titã barbudo, arranca Armin e é engolido.

**Fase 8 — As asas de Mikasa:** o anormal desce a avenida em direção à fila do portão interno e precisa morrer antes de chegar. Mikasa ameaça o mercador da carroça. Na cabana nas montanhas, os pais são mortos pelos traficantes; Eren mata dois, o terceiro o estrangula e Mikasa pega a faca. De volta a Trost, ela abre caminho sozinha com o gás acabando duas vezes e meia mais rápido, cai num beco e escolhe viver; o titã desconhecido derruba o titã que vinha atrás dela. Desafios: cinco titãs com até cinco cortes e chegar ao beco com mais de 10% de gás.

**Fase 9 — Sem combustível:** visão tática sobre a cidade com três rotas até o quartel (telhados perto do titã desconhecido, avenida, canal), cada uma com titãs, cobertura e risco. A rota escolhida decide quais titãs ficam no caminho, e os titãs da rota dos telhados vão atrás do desconhecido. Jean lidera com 42% de gás; três cadetes comuns voam atrás dele e podem ser agarrados se você não limpar o caminho. No meio, um cadete fica preso: voltar salva ele e custa outro; seguir deixa ele para trás. Desafio: chegar sem perder nenhum cadete além do da escolha.

Limites: os prédios de Trost são blocos com telhado de quatro águas; a câmera do ODM ainda atravessa telhados vizinhos em ângulos fechados. Os titãs andam através das casas.

## Batalha de Trost, parte 2 — fase 27 (fases 10 a 12 da história)

**Fase 10 — O titã desconhecido:** como Armin, acompanhe de longe um titã que anda até o titã puro mais próximo e o derruba a socos. A observação só conta entre 15 e 70 m, e chegar a menos de 16 m de um titã puro estando baixo conta como ser visto (o desafio é não ser visto). Depois a câmera entra no titã: como Eren, ande e soque (cada soco esmaga a cabeça de um titã puro), enquanto mordidas de titãs que cercam você gastam o corpo. O titã desaba em vapor e Eren sai da nuca, com braço e perna de volta.

**Fase 11 — Recuperar o quartel:** depósito com galeria, vigas e o elevador. Armin gira a manivela e o elevador desce com oito atiradores enquanto sete titãs pequenos se juntam embaixo. A rajada os cega e, como Jean na viga, você ataca quando o sinal acende: cedo demais o titã vê você, tarde demais ele recupera a visão, e as duas coisas fazem a sub-fase recomeçar. Sasha e Connie erram (como no anime) e Mikasa e Annie terminam os titãs delas. No fim, Jean encontra o corpo de Marco num beco. Desafios: corte perfeito (até 0,25 s do sinal) e acertar na primeira tentativa.

**Fase 12 — A pedra de Trost:** o discurso de Pyxis no alto da muralha, o desertor e a ordem a Ian. Eren se transforma com o raio ao lado da pedra e perde o controle: como Mikasa, aguente 15 s de socos telegrafados sem ficar onde ele mira. O sinal vermelho sobe, Armin crava a lâmina na nuca e fala do mar até Eren voltar. Como o titã de Eren, carregue a pedra (o peso e o cansaço reduzem a velocidade) enquanto a guarda de elite segura os titãs. A escolha de Ian (ficar ou recuar) termina igual: Ian e Mitabi são agarrados e devorados. Como Mikasa, mate os titãs que vão para cima de Eren até a pedra tapar o portão; o sinal amarelo sobe, Levi chega cortando dois titãs e a fase termina no tribunal: Zackly, Nile, Erwin e Levi chutando Eren. Desafio: nenhum titã encostar em Eren.

Limites: o titã de Eren usa o modelo da galeria; carregar a pedra não tem colisão com prédios; o tribunal é um cenário simples.

## A Titã Fêmea, parte 1 — fase 28 (fases 13 a 15 da história)

Fora das muralhas há um mundo próprio (`src/story/field-world.js`): a planície com árvores isoladas e uma aldeia abandonada (poucas ancoragens), a floresta de árvores gigantes com uma trilha no meio e uma clareira, e o castelo do esquadrão de Levi. As fases de campo compartilham `src/story/field-chapter.js`, que acrescenta cavalgar (controle `ride`: WASD vira e esporeia, Shift galopa; troncos e paredes param o cavalo), soldados montados, sinalizadores de fumaça e a Titã Fêmea (`src/story/female-titan.js`). As regras novas ficam em `src/story/act3-rules.js` com testes.

**Fase 13 — Além das muralhas:** o castelo com Levi, Petra, Oluo e Hange; os titãs capturados mortos de madrugada; a pergunta de Erwin. Na formação de longo alcance, como Armin a cavalo, fique no seu posto (sair por 8 s falha) e repita cada sinal do posto vizinho com a mesma cor (clique vermelho, G verde) em até 6 s; cor errada conta como erro. Depois da fumaça negra, repita o sinal com Espaço e cavalgue até o mensageiro do flanco direito. Desafio: dez sinais sem erro.

**Fase 14 — A perseguidora:** a Fêmea atravessa a ala direita. A cavalo, acompanhe-a entre 15 e 70 m e observe três padrões nos soldados que a enfrentam: ela olha o rosto de quem pega, cobre a nuca com a mão endurecida e varre quem chega pela frente. Chegar ao alcance dela ou perdê-la de vista falha. Ela derruba Armin, levanta o capuz e vai embora. Na aldeia abandonada, como Jean, fique perto da cabeça dela por 20 s: na frente das mãos ela varre, embaixo ela chuta. Reiner é agarrado e sai cortando; Armin a provoca com o apelido de Marco.

**Fase 15 — A floresta das árvores gigantes:** como Eren a cavalo, mantenha-se a até 18 m de Levi entre os troncos enquanto a retaguarda morre tentando parar a Fêmea; se ela chegar a 14 m, alcança o cavalo. A escolha de confiar ou morder a mão termina com Eren cavalgando; a armadilha de Erwin dispara os arpões quando ela entra na clareira. Desafio: atravessar sem sair da formação.

Limites: o mundo de campo é procedural e sem relevo; a Fêmea usa o modelo da galeria com cristal simplificado; os soldados que a enfrentam são encenados, não simulados.

## A Titã Fêmea, parte 2 — fase 29 (fases 16 a 18 da história)

**Fase 16 — A captura fracassa:** a Fêmea presa por arpões na clareira. Como Mikasa, corte 5 titãs da floresta que vão atrás das equipes dos canhões (três canhões perdidos falham). Levi encontra a nuca endurecida em cristal. Ela grita e os titãs da floresta inteira correm para ela: corte 6 nucas enquanto eles começam a devorá-la. Coberta pelos titãs, ela some em vapor. Desafio: nenhum canhão destruído.

**Fase 17 — A decisão de Eren:** como Eren, voe entre as árvores atrás do esquadrão. Gunther é cortado em pleno voo, Eld, Petra e Oluo cegam a Fêmea e caem um a um (mordido, esmagado contra o tronco, golpeado depois da nuca endurecida). Como o titã de Eren, o duelo segue regras puras: ela alterna guarda, preparação, chute e recuo; soco na guarda bate em antebraço endurecido e custa corpo, soco no recuo acerta, segurar Shift durante o chute desvia. Depois de 3 socos ela vence, como no anime, e leva Eren na boca. Como Levi (gás rende mais), corte olhos, ombros e boca nessa ordem; a lâmina acerta o ponto mais próximo e resvala fora de ordem; sem os olhos ela desacelera. Desafio: resgatar antes de Mikasa se expor (45 s).

**Fase 18 — Stohess:** como Armin, vá até a escada da passagem subterrânea; Annie recusa e se transforma. Como o titã de Eren, acerte 4 socos com as mesmas regras de duelo; cada prédio que os titãs atravessam conta como destruído. Annie corre para a muralha e escala com os dedos endurecidos: como Mikasa, corte as duas mãos — uma mão cortada sozinha volta a crescer em 3 s. Ela cai, se encerra em cristal e a muralha mostra um rosto de titã. Desafios: menos de dez prédios destruídos e cortar os dedos.

Limites: Stohess reaproveita a cidade de Trost com o portão inteiro; os prédios contam como destruídos mas não desabam; o cristal e o rosto na muralha são formas simples.

## Co-op local — fase 24

`coop.html` (no Modo História, em "Fora da continuidade") é um modo em tela dividida para dois jogadores, fora da história canônica. A dupla escolhe personagens do elenco e precisa limpar um campo de 12 titãs em 4 minutos usando ODM.

- **Golpe combinado:** quando um titã persegue seu parceiro e você corta a nuca dele, o abate devolve 8 s ao relógio (a lógica de distração e corte do anime).
- **Agarrado:** o parceiro só se solta se você matar o titã que o segura.
- **Caído:** levanta quando você segura o botão de ação perto dele; soltar o botão faz a barra cair aos poucos.
- **Controles:** com dois controles, um para cada jogador. Com um controle, o J1 usa teclado e mouse e o J2 o controle. Sem controle, os dois dividem o teclado (WASD/Q/E/Espaço/clique e IJKL/U/O/Shift direito/Enter).

Limites: só local, sem rede. Sem tela dividida no celular (o toque continua para um jogador). Os titãs usam uma perseguição simples. Não há progresso salvo.

## Validação

```sh
npm test
npm run build
npm run test:browser
```

Antes do primeiro teste de navegador, instale o Chromium correspondente à versão do Playwright com `npx playwright install chromium` (Windows, macOS ou Linux). Em Linux, um Chromium em `/usr/bin/chromium` é usado automaticamente; defina `CHROMIUM_PATH` para outro executável. A CI do GitHub (`.github/workflows/ci.yml`) roda os três comandos em cada push para `main` e em cada PR. Capturas e relatórios são gravados em `test-results/` e ignorados pelo Git. Testes headless com renderização por software não medem desempenho em GPU real.

## Organização

- `src/main.js`: estado da missão, física, controles, IA, câmera, áudio e interface.
- `src/world.js`: cenário, personagens, materiais e geometria procedural.
- `src/architecture.js`: detalhes instanciados de fachada e ornamentação do portão.
- `src/blade-strike.js`: ciclo, custo e poses do golpe de lâminas.
- `src/graphics-quality.js`: perfis gráficos, restauração de materiais e persistência da preferência.
- `src/gamepad-input.js`: leitura de controle padrão, zona morta, bordas de botão e retorno ao neutro.
- `src/campaign/`: elenco com linha do tempo de poderes e mortes, 47 fases, validador canônico e progresso.
- `src/story-hub.js` / `historia.html`: seleção de capítulos e detalhes de cada fase.
- `src/character-specs.js`, `src/character-model.js`, `src/character-animation.js`: elenco, modelo toon e poses.
- `src/titan-forms.js`: titãs puros paramétricos e os Nove.
- `src/gallery-main.js` / `galeria.html`: galeria de modelos.
- `src/transformation.js` / `src/transformation-fx.js`: regras, linha do tempo e efeitos da transformação.
- `src/story-main.js` / `story.html`: casco das fases jogáveis; `src/story/`: motor de roteiro, Shiganshina (mundo, roteiro, adaptador), A última carga (roteiro, regras, adaptador), controlador de ODM e adereços.
- `src/coop-main.js` / `src/coop-rules.js` / `coop.html`: co-op local em tela dividida.
- `src/platform.js`: perfis de entrada, mescla de frames, rótulos por perfil e tela cheia.
- `src/touch-controls.js` / `src/touch-controls.css`: analógico flutuante, câmera por arraste e botões de toque.
- `src/mechanics.js`: regras independentes de renderização, cobertas por testes.
- `src/collision.js`: contato com telhados inclinados e obstrução de segmentos.
- `src/targeting.js`: seleção independente das ancoragens e assistência.
- `src/trost-titan-ai.js`: percepção, busca, ataque e defesa da nuca dos titãs de Trost.
- `src/nape-guard-pose.js`: alcance articulado dos braços para cobrir a nuca.
- `src/trost-mission.js`: objetivos encadeados, validação de eventos e checkpoints versionados.
- `src/civilian-escort.js`: rota, progresso, espera, ameaça e chegada do grupo.
- `src/civilian-model.js`: personagens civis procedurais e animação de caminhada.
- `src/titan-combat.js`: simulação determinística de transformação e combate.
- `src/titan-main.js`: arena, efeitos, controles e visualização da simulação.
- `src/titan-model.js`: geometria procedural e hierarquia de articulações.
- `src/titan-animation.js`: poses amostradas pelo tempo da simulação.
- `src/arena-audio.js`: sintetizador compartilhado, posição estéreo, limite de fontes, mute e pausa.
- `src/titan-audio-cues.js`: distância, direção, abafamento e eventos sonoros dos titãs de Trost.
- `docs/ROADMAP.md`: escopo, limites e próximos marcos.
- `CLAUDE.md`: notas para sessões do Claude Code; importa `AGENTS.md`.

## Limites atuais

Esta é uma missão de treino não canônica em um distrito inspirado em Trost. O mapa ainda não é uma reconstrução conferida com episódios. O personagem é um cadete genérico. A transformação jogável existe somente no ensaio separado, não na missão de Trost. Não há cinematografia da história, dublagem, desmembramento, titãs devorando pessoas, ou cavalos. O salvamento local está restrito à operação de Trost; a arena não persiste o combate. A violência implementada se limita a impactos e partículas estilizadas.

As colisões dos telhados seguem os dois planos de inclinação, mas o corpo do jogador ainda usa um volume simplificado. A IA dos titãs fica na avenida central. Cabos se soltam nas obstruções; ainda não contornam quinas nem se enrolam nas estruturas. O protótipo não implementa ainda simulação completa do ODM. A arte procedural deve ser substituída por modelos e animações de produção depois que movimentação e combate forem aprovados.

Uma produção pública/comercial com a propriedade intelectual de Attack on Titan precisa tratar a autorização dos titulares. A pesquisa web e a conferência de referências continuam pendentes de acesso à rede.

## Entregas por fase

Cada fase concluída recebe uma branch, validação, commit, push e PR no GitHub. As fases 1–2 estão no [PR #1](https://github.com/JullioDutra/aot/pull/1), já integrado pelo fluxo externo a esta implementação. A fase 3 está no [PR #2](https://github.com/JullioDutra/aot/pull/2). A fase 4 está no [PR #3](https://github.com/JullioDutra/aot/pull/3). A fase 5 foi integrada pelo [PR #4](https://github.com/JullioDutra/aot/pull/4). A fase 6 foi integrada pelo [PR #5](https://github.com/JullioDutra/aot/pull/5). As fases 7 a 11 foram integradas juntas pelo [PR #6](https://github.com/JullioDutra/aot/pull/6). A fase 12 usa `feat/phase-12-arena-gamepad`, com base em `main`. A fase 13 usa `feat/phase-13-titan-search`, baseada na fase 12 enquanto ela aguarda integração. A fase 14 usa `feat/phase-14-nape-defense`, baseada na fase 13 enquanto ela aguarda integração. A fase 15 usa `feat/phase-15-titan-spatial-audio`, baseada na fase 14 enquanto ela aguarda integração. A base de revisão acompanha a versão integrada mais recente ou a branch predecessora quando necessário. Abertura de PR não implica autorização para merge automático; consulte AGENTS.md.
