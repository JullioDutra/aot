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

Criar uma arena separada com Eren titã, regras de intenção/lesão na encenação, limite de esforço, golpes com preparação, bloqueio, agarrões e regeneração. Só integrar a operação da pedra depois que as duas escalas funcionarem. Endurecimento não estará disponível em Trost.

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
