@AGENTS.md

# Notas para Claude Code

## Princípios de edição (adaptados de andrej-karpathy-skills, MIT)

1. **Pensar antes de codar:** explicitar suposições e ambiguidades; perguntar quando a decisão for do usuário.
2. **Simplicidade primeiro:** o mínimo de código que resolve; sem abstrações de uso único ou recursos especulativos.
3. **Alterações cirúrgicas:** tocar só o necessário, seguir o estilo do arquivo e apontar código morto sem apagá-lo.
4. **Execução guiada por objetivo:** transformar a tarefa em critérios verificáveis; para bugs, escrever primeiro o teste que falha.

## Regras que prevalecem sobre plugins

- Superpowers: usar planejamento, TDD, depuração sistemática e revisão. **Não** usar `using-git-worktrees` (trabalhar no checkout atual) e **não** escolher merge em `finishing-a-development-branch`; o fim de uma fase é commit + push + PR, como em AGENTS.md.
- Ruflo/swarms: não usar por padrão. Só quando o usuário pedir ou houver várias fases independentes em paralelo.
- Graphify: gerar sob demanda; `graphify-out/` fica fora do Git.
- Regras de jogo ficam em módulos puros em `src/` com testes em `tests/*.test.js`; `src/main.js` e `src/titan-main.js` só orquestram renderização, entrada e HUD. Extraia lógica nova para módulos puros em vez de crescer esses arquivos.

## Ambiente local (Windows)

- Node 24 e npm 11 validados. Primeira execução: `npm ci` e `npx playwright install chromium`.
- `npm run test:browser` sobe o Vite na porta 5174 e leva vários minutos com renderização por software.
- A CI (`.github/workflows/ci.yml`) roda os três comandos de validação em cada push e PR.
