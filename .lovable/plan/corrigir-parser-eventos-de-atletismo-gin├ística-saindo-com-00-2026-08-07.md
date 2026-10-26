# Corrigir parser: eventos de Atletismo/Ginástica saindo com 00:00 e "Sem competição"

## Causa raiz (confirmada com o seu texto)

O texto que você colou está **no formato correto** (3 linhas por evento). O problema é no parser (`src/components/admin/ProgramacaoTexto.tsx`):

1. **Emojis faltando na lista de metadados.** `isMetadataLine` (linha 180) e `COMP_LINE_RE` (linha 43) reconhecem 🏆 ⚽ 🏀 🏐 🎾 🏎️ 🥊 ⚾ 🏉 🏒 🏄 🚴 ⛳ 🏊 — mas **não** reconhecem 🏃 (atletismo), 🤸 (ginástica), 🤾 (handebol), 🎮 (eSports), 🥅.
   Consequência para `🏃 Atletismo / ⏰ 13h00`: a linha não é vista como linha de competição, então:
   - a linha de título real (`Camp. Mundial Sub-20 — Dia 4`) é descartada, porque a linha seguinte não conta como metadado;
   - a própria linha `🏃 Atletismo / ⏰ 13h00` passa a ser tratada como **título** do evento (seguida de `📺 SporTV 3`), sem nenhuma linha de horário depois → `game_time` cai no default `00:00` e `competition` fica vazio.
   Resultado: exatamente os cards "Atletismo / 13h00" e "Ginástica Artística / 14h30" com os avisos da sua imagem.

2. **🤸 não existe em nenhuma lista de esporte**, então "Ginástica Artística" é classificada como **Futebol** (fallback de `detectSportType`).

3. **Risco adicional (mesma família de bug):** em `preprocessInlineFormatC`, a linha com travessão e sem horário (`MotoGP — GP da Grã-Bretanha (Classificação)`) é consumida como *cabeçalho de competição* e descartada, sem olhar a linha seguinte. Hoje isso não aparece porque o preprocess devolve o texto original quando não gera nenhum jogo, mas depois da correção nº 1 esse caminho pode ser ativado e apagar títulos de eventos únicos (F1, MotoGP, Stock Car, Surf, Ciclismo).

## Correções

### 1. Registrar todos os emojis de esporte nas listas do parser
Em `ProgramacaoTexto.tsx`, incluir 🏃 🤸 🤾 🎮 🥅 (e manter os existentes) em:
- `COMP_LINE_RE` (linha de competição),
- `isMetadataLine` (linha 180),
- `SPORT_EMOJI_LIST` / `SPORT_META_EMOJI_RE` (usado por `explodeSingleLineEvents`),
- `EMOJI_TO_SPORT` / `detectSportFromEmoji`,
- `detectSectionHeaderSport` (cabeçalhos 🤸).

Isso corrige de uma vez atletismo, ginástica, handebol, eSports e futsal com 🥅: título correto, horário correto, competição preenchida.

### 2. Novo esporte: ginástica
Em `src/lib/gameUtils.ts`: tipo `gymnastics` (emoji 🤸, rótulo "Ginástica", duração ~180 min, evento único sem "VS") e detecção por "ginástica", "artística", "rítmica", "trampolim", "FIG". Card e filtros de esporte passam a mostrar Ginástica em vez de Futebol.

### 3. Não engolir o título de eventos únicos com travessão
No `preprocessInlineFormatC`, o ramo "em-dash sem horário → cabeçalho" passa a olhar a linha seguinte: se a próxima linha é uma linha de competição/horário (`<emoji> ... / ⏰ HHhMM`), a linha com travessão é **título do evento** e é mantida; só vira cabeçalho quando a linha seguinte não é metadado. Isso protege MotoGP, Stock Car, Nascar, Turismo Nacional, World Surf League, Tour de France e Bagger World Cup do seu texto.

### 4. Rede de segurança no horário
Se, mesmo assim, um evento terminar sem horário, extrair `HHhMM`/`HH:MM` do fim da linha de título (`Atletismo / 13h00`) e removê-lo do nome, em vez de gravar `00:00`. Quando a competição ficar vazia, herdar o rótulo do esporte da seção/emoji.

### 5. Prompt-modelo (ajuste pequeno)
Em `BANNER_PROMPT_MODEL` (`src/pages/admin/AdminBanners.tsx`) e `docs/prompts/banner-from-image.md`: acrescentar 🏃 Atletismo, 🤸 Ginástica, 🤾 Handebol, 🎮 eSports, 🥅 Futsal na tabela de emojis e reforçar que o horário nunca vai na linha 1.

### 6. Testes
Em `src/components/admin/__tests__/sports_parser.test.ts`: usar o seu texto de 08/08 como caso real e verificar que (a) `Camp. Mundial Sub-20 — Dia 4` vira um evento de atletismo às 13:00 com competição "Atletismo" e canal SporTV 3; (b) `Camp. Brasileiro — Finais` vira ginástica às 14:30; (c) `MotoGP — GP da Grã-Bretanha (Classificação)` mantém título e horário 07:50; (d) nenhum evento do texto sai com `00:00`.

## Detalhes técnicos
Arquivos: `src/components/admin/ProgramacaoTexto.tsx` (regexes de emoji, `isMetadataLine`, `preprocessInlineFormatC` com lookahead, fallback de horário/competição), `src/lib/gameUtils.ts` (`gymnastics` em `SportType`, emoji, rótulo, duração, evento único, detecção), `src/pages/admin/AdminBanners.tsx` + `docs/prompts/banner-from-image.md` (prompt), testes do parser e de `gameUtils`. Sem migração de banco — `banner_category` já tem `athletics` e `other_sports` cobre ginástica.
