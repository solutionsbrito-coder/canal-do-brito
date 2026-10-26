## Diagnóstico (verificado no código e no schema)

**1. Banners cobrem só 6 categorias**
O tipo `banner_category` no banco tem apenas: `cover`, `football`, `basketball`, `ufc`, `other_sports`, `football_guide`. Ou seja: Atletismo, Automobilismo, Tênis, Vôlei, Futsal, Boxe, Hóquei, Baseball, Rugby, Surf, Ciclismo, Natação, Golfe, Handebol e eSports não têm categoria própria — tudo cai em "Demais Esportes". A página pública (`BannerSections.tsx`) e o admin (`AdminBanners.tsx`) montam as fileiras a partir dessa mesma lista, então o que falta no banco falta nas duas telas.

**2. A classificação de esportes não conhece Atletismo, Futsal, Handebol nem eSports**
`SportType` em `gameUtils.ts` tem 14 tipos e `detectSportType` termina com `return 'football'`. Consequência real: uma prova de atletismo, um jogo de futsal (LNF) ou de handebol entram como **Futebol** — inclusive com duração de 105 min, o que faz o "ao vivo" acabar na hora errada. O parser de seções (`ProgramacaoTexto.tsx`) também não reconhece cabeçalhos com 🏃 (atletismo), 🤾 (handebol) ou 🎮 (eSports), então esses blocos perdem o esporte da seção.

## O que vou fazer

### Etapa 1 — Novos tipos de esporte (base de tudo)
Adicionar em `gameUtils.ts`: `athletics`, `futsal`, `handball`, `esports`, e separar `motorsport` do rótulo genérico "F1" (mantendo `f1` como valor para não quebrar dados existentes, só ajustando o rótulo para "Automobilismo").
- Emoji, rótulo e duração realista para cada um (atletismo 180 min, futsal 90, handebol 100, eSports 180).
- `detectSportType`: reconhecer atletismo (Diamond League, World Athletics, maratona, meia maratona, salto, revezamento, 100m/200m/etc.), futsal (LNF, CBFS, futsal), handebol (handebol, EHF), eSports (CS2, Valorant, LoL, CBLOL, Dota, Free Fire, Rainbow Six).
- Marcar atletismo e eSports corretamente quanto a "evento único" (sem confronto).

### Etapa 2 — Parser da programação
- `SECTION_HEADER_SPORT_RE` e `detectSectionHeaderSport` ganham 🏃 (atletismo), 🤾 (handebol), 🎮 (eSports) e ⚽ FUTSAL passa a virar `futsal` quando o cabeçalho diz FUTSAL (hoje virava futebol).
- `KNOWN_SUBSECTIONS_RE` ganha as competições novas (Diamond League, LNF, EHF, CBLOL etc.) para não serem lidas como nome de time.
- Atualizar o prompt-modelo de banner (`AdminBanners.tsx` / `docs/prompts/banner-from-image.md`) com os emojis e sessões desses esportes, para a extração já sair no formato certo.

### Etapa 3 — Categorias de banner por esporte
- Migração ampliando o enum `banner_category` com: `athletics`, `motorsport`, `tennis`, `volleyball`, `futsal`, `boxing`, `mma`, `hockey`, `baseball`, `rugby`, `surf`, `cycling`, `swimming`, `golf`, `handball`, `esports`. `ufc` é mantido (dados existentes) e passa a ser rotulado "UFC/MMA"; `other_sports` continua como catch-all.
- `useBanners.ts`: `CATEGORY_LABELS`/`CATEGORY_LIST` com emoji + nome de todas, na ordem de relevância.
- `BannerSections.tsx`: gerar as fileiras a partir da lista central (não mais um array fixo de 5), continuando a esconder categorias vazias.
- `AdminBanners.tsx`: as pílulas de categoria já mapeiam `CATEGORY_LIST`; garantir scroll horizontal com muitas pílulas, contador de banners por categoria na pílula e busca por categoria.

### Etapa 4 — Auditoria da aba Banner (correções e melhorias)
- **Sugestão de categoria pelo arquivo**: ao subir uma imagem cujo nome contenha "atletismo", "f1", "ufc" etc., sugerir a categoria (com confirmação).
- **Cobertura por categoria**: painel no topo mostrando quantas categorias estão sem nenhum banner ativo — evita a fileira sumir da home sem ninguém perceber.
- **Aviso de categoria vazia com programação**: se houver jogos daquele esporte na programação de hoje/amanhã e a categoria não tiver banner ativo, mostrar alerta com atalho para subir.
- **Mover banner de categoria**: ação no card para trocar a categoria sem apagar e reenviar.
- Revisar overflow em 320-430px com as novas pílulas e manter alvos de toque de 44px.

## Detalhes técnicos
Arquivos: `src/lib/gameUtils.ts` (tipos, emoji, rótulo, duração, detecção), `src/components/admin/ProgramacaoTexto.tsx` (cabeçalhos de seção e subseções), `src/hooks/useBanners.ts` (labels/lista central), `src/components/public/BannerSections.tsx` (fileiras dinâmicas), `src/pages/admin/AdminBanners.tsx` + `src/components/admin/BannerCard.tsx` (pílulas, contadores, mover categoria, sugestão), `docs/prompts/banner-from-image.md`. Uma migração: `ALTER TYPE banner_category ADD VALUE` para cada nova categoria (sem remover valores existentes). Testes: novos casos em `gameUtils.test.ts` (atletismo/futsal/handebol/eSports), `sports_parser.test.ts` (cabeçalhos 🏃/🤾/🎮 e ⚽ FUTSAL) e `BannerSections.test.tsx` / `AdminBanners.test.tsx` para a lista ampliada.
