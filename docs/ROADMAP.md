# Plano de implementação

## Decisão inicial

A visão é uma campanha 3D linear com áreas amplas, fidelidade à cronologia do anime e movimentação técnica. O primeiro marco é uma operação curta em Trost. A Unreal Engine 5 é a candidata para produção de alta fidelidade; como não está instalada no ambiente, este primeiro estudo usa Three.js e Vite. O código não é diretamente portável para Unreal: regras, métricas e resultados de testes poderão orientar uma reimplementação.

## Marco 1 — protótipo mecânico atual

- Distrito navegável, muralhas com escala de 50 m e diferentes alturas de edifícios.
- Câmera em terceira pessoa, captura do ponteiro e alternativa por arraste.
- Ancoragem por raycast, tração unilateral, impulso, inércia, gravidade e colisões.
- Gás, lâminas, vitalidade, posto de abastecimento e resgate opcional.
- Três titãs com perseguição limitada, antecipação de ataque e vulnerabilidade na nuca.
- Pausa, vitória, derrota, reinício, qualidade gráfica e áudio procedural.
- Regras unitárias e verificações no navegador.

Critério para avançar: teste humano de conforto e diversão. Ainda são necessários ajuste fino de câmera, curva de aprendizado e domínio de trajetórias. Não interpretar o sucesso de testes automatizados como aprovação da qualidade do combate.

## Marco 2 — ODM e combate refinados

1. Implementado nesta rodada: contato com os dois planos inclinados dos telhados, apoio ao caminhar e soltura de cabos bloqueados. Corpo do jogador ainda simplificado.
2. Implementado nesta rodada: ancoragens independentes com indicadores Q/E, assistência configurável, opção de campo de visão fixo e marcador de nuca condicionado a alcance, direção e caminho livre.
3. Esqueleto animado, transições de voo e golpe, leitura dos acertos e reação física.
4. Titãs com variações de percepção, defesa da nuca, agarrões e dano localizado.
5. Testes humanos e perfis de GPU em hardware de referência antes de prometer 60 fps.

## Marco 3 — arena de transformação

Implementado: arena separada acessível pelo menu de Trost, com transformação/saída, mudança de escala, reserva de energia, resistência, soco, golpe forte, bloqueio frontal/quebra de defesa, esquiva, agarrão durante a recuperação do rival, regeneração com custo e estados de vitória/derrota/esgotamento. Há pausa, reinício e limite de duas transformações por ensaio.

Ainda pendente: modelo final de Eren, animações de combate e lesão preparatória mais fiéis, desenho de som de produção e testes humanos de equilíbrio. Os modelos e a preparação atual são procedurais; não se deve considerar o resultado uma cena canônica. Os números de duração, alcance e custo são parâmetros de jogo, não referências do anime. Só integrar a operação da pedra depois de avaliar as duas escalas. Endurecimento continua ausente.

## Entrega intermediária 4 — apresentação do combate

Implementado: modelo procedural articulado compartilhado entre Trost e arena; tronco contínuo, feições, mãos e cabelo; animações amostradas pelo tempo dos golpes; poses de guarda e reação; indicadores de dano e breve pausa de impacto. Sons sintetizados de passos, golpes, defesa, transformação, esquiva e vapor, com mute e interrupção na pausa. Tremor de câmera opcional e respeito à preferência de movimento reduzido.

Esta entrega melhora a leitura e a apresentação do protótipo. Não equivale ao marco de produção abaixo: ainda são necessários personagens/modelos de produção, animações finais, fontes visuais verificadas e avaliação humana.

## Entrega intermediária 5 — operação guiada de Trost

Implementado: sequência de resgate, recuperação do abastecimento, eliminação dos três titãs e confirmação de retirada no portão. Indicador de etapa, destino no cenário e seta de direção. Abates antecipados contam, mas não ignoram as demais etapas. Vitória exige a interação final.

Checkpoints versionados guardam objetivos, abates e tempo registrado, com retorno a posições seguras e equipamento recuperado. Retomada no menu, pausa e derrota; persistência local no navegador, com fallback para a sessão quando armazenamento não estiver disponível. Não há sincronização em nuvem. Na entrega original da fase 5, civis eram encaminhados por interação; a fase 6 abaixo acrescenta escolta física.

A operação é original e ainda não adapta uma sequência canônica. Cinemáticas, personagens finais, direção de voz e uma operação de 15–20 minutos com arte de produção continuam pendentes.

## Entrega intermediária 6 — escolta de civis

Implementado: os três civis caminham por uma rota definida até um abrigo, com modelo articulado simples e animações de caminhada/espera. O resgate exige chegada ao destino. O grupo aguarda quando o jogador se afasta e para diante de um titã próximo. Abates antecipados continuam válidos. Marcador acompanha o grupo e HUD mostra progresso e motivo da espera.

Checkpoint intermediário preserva avanço na rota; pausa congela o grupo. O formato de save passa à versão 2, mantendo a chave de armazenamento e migrando resgates concluídos da versão 1. Civis permanecem visíveis no abrigo.

Limites: rota autoral para o mapa atual, sem navegação dinâmica, dano/morte de civis, diálogo ou animações finais. Não representa uma cena canônica específica.

## Entrega intermediária 7 — arquitetura do distrito

Implementado: janelas com molduras, caixilhos, peitoris e venezianas instanciadas; vigas entre pavimentos, postes de canto e frontões; texturas procedurais de reboco, telhas e calçamento com bump mapping. Portão fechado com tábuas, ferragens, pilares e arco de cantaria decorativo. Elementos estáticos compartilham lotes por material.

A geometria de detalhe é ornamental e não acrescenta ancoragens ou colisões individuais. A circulação e os volumes estruturais permanecem iguais. Não equivale a uma reconstrução de Trost validada por episódios nem a arte final. A nova tentativa de consulta a `shingeki.tv` também retornou HTTP 403 no ambiente.

## Entrega intermediária 8 — leitura dos ataques de Trost

Implementado: percepção condicionada à linha de visão contra construções, giro antes da perseguição e preparação apenas contra alvos à frente. Direção travada durante 0,9 s de preparação, setor de alcance no chão e aviso textual. Recuperação de 1,4 s não é cancelada quando o jogador sai da detecção; pausa congela os temporizadores. Regras isoladas da renderização e teste de navegador para antecipação, pausa e impacto.

Limites: detecção por segmento a partir do tronco, sem patrulha; a fase 13 abaixo acrescenta memória; navegação continua limitada à avenida. Setor representa o teste abstrato de alcance/direção, sem colisão de dedos. Não acrescenta agarrões, defesa da nuca, dano localizado ou animações finais. A arena não muda nesta entrega.

## Entrega intermediária 9 — golpe de lâminas com preparação

Implementado: preparação de 0,16 s, impacto único e recuperação até 0,52 s; poses dos braços e rastro curto amostrados pelo tempo do golpe. Verificação de nuca acontece no corte, usando posição, mira e obstáculos atuais. Indicador textual de prontidão/fase; custo único no início, bloqueio de cliques repetidos, pausa do ciclo e cancelamento por dano/reinício/checkpoint.

Mantém os critérios existentes de nuca e um abate por golpe. Não acrescenta combos, perseguição automática, desmembramento ou animações de produção. A arena de transformação mantém seu próprio combate.

## Entrega intermediária 10 — perfis gráficos persistentes

Implementado: Alta, Equilibrada e Desempenho controlam escala de renderização, resolução/ativação das sombras, relevo de materiais e filtragem de texturas. Desempenho remove bump mapping; retornar para Alta restaura os mapas originais. Trocas liberam os alvos de sombra anteriores e evitam recompilar materiais sem mudança. Preferência salva separadamente da missão, com fallback de sessão e recuperação de dados inválidos.

Testes cobrem restauração, liberação de recursos, persistência, armazenamento indisponível e alternância real no navegador. Geometria e regras de jogo permanecem iguais. Não há qualidade adaptativa por FPS, redução automática de geometria ou medição em GPU real; não afirmar meta de 60 fps a partir dos testes por software.

## Entrega intermediária 11 — controle na operação de Trost

Implementado: Gamepad API padrão com movimento analógico, câmera, gatilhos independentes para cabos, salto/gás, ataque, interação, abastecimento e soltura. Start inicia/retoma/pausa; Back retoma checkpoint na pausa/derrota. Atalhos no HUD, pausa ao desconectar e exigência de controles neutros após interrupções. Teclado/mouse continuam disponíveis.

Limites da entrega 11: primeiro controle padrão, sem vibração, remapeamento ou navegação geral dos menus. A entrega 12 abaixo acrescenta suporte na arena. Testes usam API simulada; hardware físico e ergonomia ainda não foram avaliados. Não confundir compatibilidade da API padrão com homologação de modelos específicos.

## Entrega intermediária 12 — controle na arena de transformação

Implementado: mapeamento próprio para transformação, soco, golpe forte, agarrão, defesa, esquiva, regeneração, saída e fixação de alvo; movimento e câmera analógicos. Start entra/pausa/retoma e Back reinicia durante pausa/resultado. HUD, avisos e ajuda da pausa reconhecem o controle. A leitura reutiliza o módulo de Trost, com mapeamentos isolados.

Desconexão pausa e limpa ações contínuas; retomada exige controles neutros. Custos e regras da simulação não mudam. Testes cobrem mapeamentos independentes e um encontro no navegador com API simulada. Sem vibração, remapeamento, navegação completa dos menus ou homologação de controles físicos.

## Entrega intermediária 13 — busca após perder o jogador

Implementado: memória de 5 segundos da última observação válida, aproximação desse ponto projetado na avenida e espera até expirar. Posição oculta do jogador não alimenta movimento nem direção da busca. Reavistamento renova a memória; pausa congela, reinício/checkpoint limpa. Aviso contextual informa busca próxima. Preparação/recuperação dos golpes continuam mesmo ao perder a memória, mantendo verificação de visão no impacto.

Limites: sem patrulha, audição ou navegação fora da avenida. Não é uma simulação de inteligência canônica. Testes cobrem perda de visão, expiração, reavistamento, ausência de rastreamento através das paredes e pausa; diversão e equilíbrio ainda exigem avaliação humana.

## Entrega intermediária 14 — defesa da nuca

Implementado: o titã maior responde à aproximação elevada por trás com preparação vulnerável de 0,75 s, proteção de 1,2 s e recuperação vulnerável de 1,4 s. As mãos alcançam a nuca com articulação de dois segmentos; avisos distinguem cada momento. Cortes verificam proteção no impacto e retornam bloqueio sem abate; o marcador de acerto acompanha a proteção. Pausa e reinício respeitam o novo ciclo.

Somente o encontro de 18 m usa essa defesa. Sem colisão de dedos, dano localizado, desmembramento ou adaptação de comportamento canônico verificado. Testes de regras, posicionamento das mãos e renderização isolada da pose complementam a regressão de navegador; equilíbrio da manobra com ODM ainda precisa de avaliação humana.

## Entrega intermediária 15 — som direcional em Trost

Implementado: passos pelo deslocamento, preparação/impacto por transição de ataque e efeitos de defesa, bloqueio e abate. Posição estéreo acompanha o rumo da câmera; distância tridimensional atenua até 80 m; construções reduzem o volume. Sintetizador compartilhado com a arena, com limite de fontes e fallback centralizado quando estéreo não estiver disponível. Pausa, mute, resultado e reinício interrompem os sons ativos.

Limites: sons sintetizados, sem áudio oficial, reverberação, HRTF ou filtragem acústica. Mixagem amostrada no início de cada efeito. Testes de regras e navegador não substituem escuta humana; não afirmar qualidade sonora final. O som não altera a percepção da IA.

## Entrega intermediária 16 — ferramentas de desenvolvimento

CI no GitHub Actions com testes unitários, build e Playwright; `CLAUDE.md` com regras para sessões assistidas; chunk próprio do three.js. Sem mudança de jogabilidade.

## Entrega intermediária 17 — perfis de plataforma

Teclado/mouse, controle e toque com troca automática pelo último uso, controles de toque em Trost e na arena, HUD compacto para celular em paisagem, qualidade Desempenho como padrão no toque e tela cheia. Limites: sem vibração, remapeamento ou validação em aparelhos físicos.

## Entrega intermediária 18 — plano da campanha

Campanha completa (47 fases) como dados validados: elenco, linha do tempo de poderes e mortes, sub-fases, desafios, acontecimentos fixos e decisões convergentes, com hub de seleção. Nenhuma fase nova jogável nesta entrega; as referências de episódio precisam de conferência humana.

## Entregas intermediárias 19 e 20 — elenco e titãs

Personagens toon com rostos desenhados, cabelos por mechas, uniformes, emblemas e equipamento; titãs puros paramétricos e os Nove detalhados; galeria com escala e poses. Faltam o Fundador, os Colossais do Estrondo, skinning e tecido.

## Entrega intermediária 21 — transformação com raios

Regras de quem pode se transformar e quando, linha do tempo ferimento → raio → clarão → corpo, raios ramificados determinísticos com vapor, anel de choque e marca no chão; integrado à arena.

## Entregas intermediárias 22 e 23 — primeiras fases jogáveis

Motor de roteiro com falas, objetivos, escolhas convergentes, eventos, metas e falha com checkpoint. Fases 1 e 2 (Shiganshina, da árvore à morte de Carla) e fase 32 (a carga de Erwin e Levi contra o Bestial) jogáveis em teclado/mouse, controle e toque. Pendentes: as outras 44 fases, dublagem, cinemáticas autorais e teste humano de equilíbrio.

## Entrega intermediária 24 — co-op local

Tela dividida para dois jogadores com ODM, golpe combinado por distração, resgate de parceiro agarrado e reanimação; atribuição automática de controles e teclado compartilhado. Sem rede, sem celular e fora da continuidade.

## Entrega intermediária 25 — Ato I jogável

Fases 3 (a retirada e o Blindado), 4 (cerimônia, equilíbrio com o cinto quebrado, cabos e desarme) e 5 (floresta contra Jean e formatura). Kit compartilhado de história (atores, câmera, ODM, horda de titãs puros, titã controlável) e regras puras testadas. Os testes de navegador rodam a simulação 4× por quadro para caber no tempo com renderização por software.

## Entrega intermediária 26 — Trost, parte 1

Cidade de Trost compartilhada (muralhas, portões, quartel, praça da pedra, quarteirões mesclados por material) e as fases 6 (Colossal na muralha), 7 (esquadrão 34), 8 (Mikasa, cabana e o anormal no portão) e 9 (rotas táticas e o comando de Jean). Os pontos de retorno passam a guardar a sub-fase que começa.

## Entrega intermediária 27 — Trost, parte 2

Fases 10 (o titã desconhecido visto de fora e de dentro), 11 (o elevador e os sete cortes sincronizados; Marco) e 12 (Pyxis, a perda de controle, Armin na nuca, a pedra carregada, a guarda de elite, o portão selado, Levi e o tribunal). Os Atos I e II estão jogáveis por inteiro (fases 1–12).

## Entrega intermediária 28 — A Titã Fêmea, parte 1

Mundo fora das muralhas (planície, aldeia, floresta de árvores gigantes, castelo), cavalgada, sinalizadores e a Titã Fêmea. Fases 13 (castelo e formação de longo alcance), 14 (os padrões da Fêmea; Jean e Reiner) e 15 (a cavalgada pela floresta e a armadilha).

## Entrega intermediária 29 — A Titã Fêmea, parte 2

Fases 16 (arpões, nuca endurecida, o grito e a fuga), 17 (a queda do esquadrão de Levi, o duelo de titãs e o resgate em ordem) e 18 (Stohess, a escalada da muralha e o cristal). O Ato III está jogável por inteiro (fases 13–18).

## Entrega intermediária 30 — Choque de Titãs

Muralha Rose e torre de Utgard no mundo de campo; fases 19 (Mike, o arco de Sasha, Ragako), 20 (o cerco da torre e Ymir), 21 (a confissão na muralha), 22 (o duelo contra o Blindado, os joelhos e a chave de braço), 23 (a carga de Erwin e a extração) e 24 (Hannes e o grito). O Ato IV está jogável por inteiro.

## Entrega intermediária 31 — A revolta

Atiradores humanos com linha de visada; fases 25 (o bar e os telhados), 26 (a troca, a investigação e o golpe), 27 (a caverna de cristal e o endurecimento) e 28 (Orvud, os barris, Historia, Kenny e a coroação). O Ato V está jogável por inteiro.

## Entrega intermediária 32 — Retorno a Shiganshina

Fases 29 (a marcha noturna e o portão), 30 (Reiner na muralha e as pedras sobre os cavalos), 31 (lanças do trovão e a explosão), 33 (o plano de Armin) e 34 (o soro, o porão e o mar). Com a fase 32 já existente, o Ato VI está jogável por inteiro (fases 1–34).

## Entrega intermediária 33 — O outro lado do mar

Fases 35 (Fort Slava), 36 (Liberio), 37 (a declaração e o Martelo de Guerra) e 38 (a extração e Sasha). O Ato VII está jogável por inteiro (fases 1–38).

## Entrega intermediária 34 — Guerra por Paradis, parte 1

Fases 39 (a floresta de Levi), 40 (Shiganshina em guerra), 41 (o grito e os Caminhos) e 42 (a aliança).

## Entrega intermediária 35 — Desfecho

Fases 43 (o porto de Odiha), 44 (o Estrondo e Hange), 45 (sobre o Fundador), 46 (a última travessia) e 47 (depois da batalha). As 47 fases do Modo História estão jogáveis; o próximo passo é revisão humana de ritmo, câmera e dificuldade em GPU real e no celular.

## Entrega intermediária 36 — Página inicial

Três quadros de Eren e Mikasa na abertura, sumário das 47 fases e como jogar por tipo de entrada.

## Entrega intermediária 37 — Gancho no titã

O corpo do titã aceita o gancho e o cabo o acompanha; no ar, A/D giram em volta da ancoragem e W/S controlam o cabo; atrás da nuca aparece FINALIZAR.

## Entrega intermediária 38 — Chefes

Fêmea, Blindado e Bestial golpeiam, pisam, arremessam e endurecem a nuca com aviso; cegueira e braços cortados encerram os ataques; a nuca do Bestial só abre por último.

## Entrega intermediária 39 — Rostos

Olhos no estilo do anime, queixo afinado, franjas, nove expressões automáticas pela pose e close de rosto na galeria.

## Entrega intermediária 40 — Roupas pela cronologia

Cadetes até Trost, Tropa com capa, Polícia Militar para Annie, uniforme escuro de 854, Eren de cabelo comprido, cicatrizes e tapa-olho no tempo certo; seletor de época na galeria.

## Entrega intermediária 41 — Titãs

Rostos de titã com órbitas fundas, narinas, lábios, fibras da bochecha no Titã de Ataque, cavidade nasal do Colossal e músculos da Fêmea; close de titã na galeria.

## Entrega intermediária 42 — Celular

Mira assistida larga no toque, FINALIZAR tocável, lâmina pulsando na janela de finalização, botões maiores e vibração.

## Fidelidade e jogabilidade (entregas 36–43)

Pedido após a campanha completa: equipamento com a sensação do anime, personagens e titãs mais parecidos, cenários mais fiéis, celular melhor e uma página inicial que apresente o jogo. Tudo continua gerado em código, sem modelos, imagens ou músicas oficiais.

1. **36 — Página inicial:** três quadros de Eren e Mikasa (sob a árvore, o cachecol, prontos para a batalha), sumário das 47 fases por ato e como jogar no teclado, controle e toque.
2. **37 — Gancho no titã:** o corpo do titã aceita o gancho e o cabo acompanha o movimento; preso, o jogador controla o giro em volta dele; atrás da nuca, perto e com velocidade, aparece o botão de finalização. Arena e Modo História.
3. **38 — Chefes:** Fêmea, Blindado, Bestial, Colossal e Martelo de Guerra com etapas (tornozelo, braço, nuca) e desafios próprios, mais difíceis que os titãs comuns.
4. **39 — Rostos:** olhos, íris, cílios, sobrancelhas e franja próprios de cada personagem, cicatrizes da linha do tempo e expressões em cena (raiva, choro, grito).
5. **40 — Roupas pela cronologia:** civil em 845, cadete, Tropa com capa, uniforme preto de 854 e visuais que mudam com o tempo (Eren de cabelo comprido, Levi com cicatrizes).
6. **41 — Titãs:** proporções, rostos e silhuetas dos titãs puros e dos nove titãs mais próximos do anime.
7. **42 — Celular:** controles de toque redesenhados para o gancho no titã, o giro e a finalização, com mira assistida.
8. **43 — Cenários:** Shiganshina, Trost, a floresta de árvores gigantes e Liberio com mais detalhe e marcos reconhecíveis.

## Marco 4 — demonstração de produção

Uma operação de 15–20 minutos com arte e animação próprias de produção, referências verificadas, missão legível, resgate, abastecimento, destruição controlada e conclusão narrativa. Não será construída a campanha completa antes da aprovação desse marco.

## Campanha planejada

1. **Queda e formação:** Shiganshina antes e durante a queda, retirada, 104º Corpo e treinamento na floresta.
2. **Trost:** retorno do Colossal, queda do esquadrão, defesa de Mikasa, quartel, Eren titã e operação da pedra.
3. **Titã Fêmea:** expedição, perseguição, floresta, captura fracassada, perda do esquadrão e Stohess.
4. **Choque de Titãs:** aldeias, Ragako, Utgard, revelação na muralha, Blindado, resgate e o grito.
5. **Revolta:** perseguição de Kenny, investigação, caverna, endurecimento e Rod Reiss em Orvud.
6. **Retorno a Shiganshina:** cerco, lanças do trovão, carga de Erwin, Levi, plano de Armin, soro, porão e mar.
7. **Marley:** Fort Slava, cotidiano em Liberio, declaração, Martelo de Guerra, porto e extração.
8. **Desfecho:** floresta de Levi, guerra em Shiganshina, Caminhos, aliança, porto, Estrondo, Fundador e epílogo.

Os acontecimentos e mortes principais permanecem fixos; objetivos opcionais não oferecem falsas escolhas para revertê-los. Personagens jogáveis e poderes respeitarão cada fase da cronologia. O protótipo atual não valida essa fidelidade narrativa.

## Direção visual

Preservar silhuetas, composição, escala e identidade do anime com iluminação/materialidade cuidadosas. Evitar perseguir realismo fotográfico que descaracterize personagens. Reconstruir locais com plantas e referências por cena. Priorizar animação, peso, olhos e proporções dos titãs. Dividir destruição em pequenos objetos, peças preparadas e eventos dirigidos.

## Pesquisa pendente

As tentativas anteriores de consulta externa retornaram 403 pela política de rede. Não houve pesquisa web concluída. Conferir fontes oficiais, episódios e materiais licenciados antes de considerar mapas, cronologia de cenas e poderes documentalmente validados. Registrar origem, episódio, timestamp, informação extraída e grau de certeza. Links de partida: shingeki.tv, koeitecmoamerica.com/attackontitan2 e dev.epicgames.com/documentation/en-us/unreal-engine. Wikis são apoio secundário.

## Restrições de escopo

Não há assets oficiais disponíveis, orçamento ou hardware final definidos. A campanha completa é um projeto grande. Primeiro avaliar este estudo; depois dimensionar produção, motor definitivo, equipe e licenciamento. Trabalhar no checkout existente: o ambiente já é isolado, sem necessidade de worktrees.
