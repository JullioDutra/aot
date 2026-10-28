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
