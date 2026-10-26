# Prompt + parser: extração confiável a partir da tabela @esportesnatv

## O que a imagem-modelo revela

A fonte é sempre uma tabela de 4 colunas: **Horário | Competição (com ícone) | Evento | Canais**, com cor de fundo por esporte. Os pontos que hoje geram dúvida na extração:

- A coluna de competição tem só o ícone (⚽, bola de vôlei, raquete, moto, luva, basquete) — nenhum texto de esporte. "Copa Sul-Americ. Masc" com bola de vôlei é **vôlei**, não futebol. "Bagger World Cup", "Turismo Nacional", "Nascar O'Reilly", "Stock Car" são **automobilismo**. "UFC Fight Night" e "Boxe" dividem a mesma luva.
- Uma célula pode conter **vários confrontos**: `Santo André x Jaraguá, Campo Mourão x Cascavel, Tubarão x ACBF, ...` (LNF Futsal 19h00) — precisa virar N eventos.
- Uma célula pode conter **outro horário embutido**: `Barcelona x Nottingham Forest, 17h00 Udinese x Barcelona`.
- Fase vem como prefixo no evento: `QF (ida) - São José-RS x Gama`, `SF - Brasil x ARG ou CHI`, `OF - Lehecka x Jodar`, `card preliminar`, `GP da Grã-Bretanha - classificação`.
- Times femininos aparecem como `Atlético-MG F`, `Ferroviária F`, `Fut. Feminino`.
- Canais misturam TV e YouTube: `youtube Canal GOAT`, `SPORTV-PREMIERE`, `BAND (N, NE, int. SP)`.

## Solução

### 1. Tag de esporte obrigatória (fim do palpite)

Linha 2 passa a terminar com uma tag canônica:

```text
<emoji> <Competição (Fase)> / ⏰ HHhMM / #esporte
```

```text
Brasil x ARG ou CHI
🏐 Copa Sul-Americana Masc. (Semifinal) / ⏰ 21h30 / #volei

Mateusz Gamrot x Quillan Salkilld
🥊 UFC Fight Night (Luta Principal) / ⏰ 21h00 / #mma

MotoGP — GP da Grã-Bretanha (Classificação)
🏎️ MotoGP / ⏰ 07h50 / #motogp
```

Tags: `#futebol #futsal #basquete #volei #handebol #tenis #f1 #motogp #stockcar #formulae #indycar #nascar #mma #boxe #baseball #rugby #hoquei #surfe #ciclismo #golfe #natacao #atletismo #ginastica #esports`. A tag manda; o emoji é decoração; `🏆` fica proibido como emoji de esporte.

### 2. Regras novas no prompt, ancoradas na tabela

- **Leia o ícone da coluna 2, não o nome.** Tabela de desempate ícone/cor → tag, com os casos-armadilha listados nominalmente (Copa Sul-Americ. Masc = vôlei; Nascar/Stock Car/Turismo Nacional/Bagger = automobilismo; luva = `#mma` só se UFC/Bellator/PFL, senão `#boxe`).
- **Uma linha da tabela pode gerar vários eventos.** Célula com confrontos separados por vírgula → um bloco de 3 linhas por confronto, mesmo horário e mesma competição.
- **Horário embutido na célula** (`17h00 Udinese x Barcelona`) vira evento próprio com aquele horário.
- **Prefixos de fase** viram parênteses na linha 2: `QF (ida)` → `(Quartas — Ida)`, `SF` → `(Semifinal)`, `OF` → `(Oitavas)`, `classificação/sprint/corrida 1` → `(Classificação)`, `(Sprint)`, `(Corrida 1)`, `card preliminar` → `(Card Preliminar)`.
- **Feminino**: `Atlético-MG F` → `Atlético-MG (F)`; competição recebe "Feminino" quando a tabela indicar.
- **Canais**: `youtube Canal GOAT` → `YouTube Canal GOAT`; `SPORTV-PREMIERE` → `SporTV, Premiere`; manter parênteses regionais como estão.
- Ordem crescente por horário, um único bloco `📅 Dia DD/MM`, sem duplicatas.

### 3. Parser lê a tag e as fases

Em `src/components/admin/ProgramacaoTexto.tsx`:

- `parseSportTag(line)` mapeia `#slug` → `SportType` (categorias de automobilismo colapsam em `f1`, guardando a categoria na competição);
- prioridade: **tag → emoji → texto** (o caminho atual continua como último recurso, sem regressão nos textos antigos);
- a tag é removida da competição/título e o `/ #tag` extra não interfere na leitura do horário.

### 4. Feedback no admin

Na pré-visualização dos eventos parseados, chip discreto indicando a origem da classificação (`tag` / `emoji` / `texto`), para o operador ver de imediato o que foi adivinhado. Sem mudança de banco.

### 5. Testes

- texto novo com tags: `#volei` em "Copa Sul-Americ. Masc" não vira futebol; `#mma` não vira boxe; `#nascar`/`#stockcar` classificam como automobilismo;
- célula multi-confronto do LNF Futsal gera 8 eventos às 19h00;
- retrocompatibilidade: o teste real de 08/08 (sem tags) continua passando.

## Detalhes técnicos

- Arquivos: `src/pages/admin/AdminBanners.tsx` (BANNER_PROMPT_MODEL), `docs/prompts/banner-from-image.md`, `src/components/admin/ProgramacaoTexto.tsx`, novo teste em `src/components/admin/__tests__/`.
- Sem migração: `sport_type` continua o enum atual.
- Checklist final do prompt ganha: "toda linha 2 termina com `#esporte`", "nenhum `🏆` como esporte", "célula com vírgulas foi expandida em vários eventos", "prefixo de fase movido para parênteses".

## Sugestões extras

- Botão "Validar texto" listando eventos sem tag, sem horário ou com competição vazia antes de salvar.
- Alerta de possível duplicata quando dois eventos tiverem mesmo horário e mesmo confronto.
