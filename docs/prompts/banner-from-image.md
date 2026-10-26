# Prompt-Modelo — Gerar Texto de Banner a partir de Imagem

Cole o prompt abaixo no ChatGPT / Gemini / Claude **junto com a imagem** da programação. A saída já vem no formato aceito pelos banners do admin.

---

## 📋 Prompt (copiar tudo abaixo)

```
Você é um EXTRATOR de programação esportiva. A partir da IMAGEM enviada, identifique TODOS os eventos visíveis (jogos, treinos, classificações, sprints, corridas, lutas, rodadas) e devolva SOMENTE o texto formatado abaixo — sem explicações, sem markdown, sem aspas, sem ```.

═══════════════════════════════════════════
FORMATO OBRIGATÓRIO — siga ao pé da letra
═══════════════════════════════════════════

TÍTULO: <até 60 caracteres, com emoji do esporte principal no início>

📅 Dia DD/MM

<linha 1 do evento>
<emoji do esporte> <Competição (Sessão/Fase)> / ⏰ HHhMM / #esporte
📺 <Canal1, Canal2>

<linha em branco>

<próximo evento...>

⚠️ CADA EVENTO OCUPA EXATAMENTE 3 LINHAS + 1 LINHA EM BRANCO. NUNCA junte tudo numa única linha. Quebre as linhas de verdade (Enter), mesmo que a imagem da programação esteja em formato compacto.

═══════════════════════════════════════════
TAG DE ESPORTE (#esporte) — OBRIGATÓRIA
═══════════════════════════════════════════

A linha 2 SEMPRE termina com " / #esporte". A tag define o esporte no sistema; o emoji é decoração.

#futebol #futsal #basquete #volei #handebol #tenis
#f1 #motogp #stockcar #formulae #indycar #nascar #motocross
#mma #boxe #baseball #rugby #hoquei
#surfe #ciclismo #golfe #natacao #atletismo #ginastica #esports

Como escolher: olhe o ÍCONE/COR da coluna de competição da tabela, não o nome.
Bola de vôlei em "Copa Sul-Americ. Masc" → #volei. Nascar/Stock Car/Turismo Nacional/Bagger → automobilismo.
Luva 🥊: #mma só em UFC/Bellator/PFL/ONE, senão #boxe. LNF/CBFS → #futsal.
Proibido usar 🏆 como emoji de esporte.

Regras extras da tabela:
- Célula com vários confrontos separados por vírgula gera um bloco por confronto.
- Horário embutido na célula ("17h00 Udinese x Barcelona") vira evento próprio.
- Prefixos QF/SF/OF/classificação/sprint/card preliminar vão para os parênteses da linha 2.
- "Atlético-MG F" → "Atlético-MG (F)"; "youtube Canal GOAT" → "YouTube Canal GOAT"; "SPORTV-PREMIERE" → "SporTV, Premiere".


═══════════════════════════════════════════
TIPOS DE LINHA 1 (escolha UM por evento)
═══════════════════════════════════════════

▶ FORMATO A — confronto entre dois adversários (futebol, basquete, vôlei, baseball, rugby, hóquei, futsal):
   Time A x Time B
   (use "x" minúsculo. Times femininos recebem "(F)" depois do nome.)

▶ FORMATO B — eventos individuais ou de etapa (F1, MotoGP, Stock Car, Fórmula E, IndyCar, MotoE, Tênis, Golfe, Boxe, MMA, Surfe, Ciclismo, Natação, Atletismo):
   Nome do Evento — Sessão/Fase
   (NUNCA use "x ?" / "x TBD" / "x A definir". Se não há adversário, use FORMATO B.)
   Para Boxe/MMA com confronto nominado, use FORMATO A: "Lutador A x Lutador B".

═══════════════════════════════════════════
REGRAS CRÍTICAS — leia até o fim
═══════════════════════════════════════════

1. UMA ÚNICA data por bloco 📅. Se o dia 19/06 tem futebol, MotoGP, tênis e boxe, TUDO entra debaixo de UM único "📅 Dia 19/06". Nunca repita o mesmo dia em dois blocos.

2. Dentro de cada bloco 📅, ordene TODOS os eventos por horário crescente (HHhMM), independente do esporte.

3. Horário SEMPRE no padrão HHhMM (16h00, 04h45, 22h30). NUNCA "16:00", "4h45min", "22h30m".

4. SESSÃO/FASE entre parênteses é OBRIGATÓRIA para esportes que têm múltiplas sessões no mesmo dia:
   • F1/MotoGP/Moto2/Moto3/Stock Car/Fórmula E/IndyCar: (Treino Livre 1), (Treino Livre 2), (Treino Livre 3), (Classificação), (Sprint Shootout), (Sprint), (Corrida), (Warm Up)
   • Tênis (ATP/WTA/Slam): (1ª Rodada), (2ª Rodada), (Oitavas), (Quartas), (Semifinal), (Final)
   • Golfe: (1ª Rodada), (2ª Rodada), (3ª Rodada), (Rodada Final)
   • Boxe/MMA: (Card Preliminar), (Card Principal), (Luta Principal)
   • Futebol/copas: (Fase de Grupos), (Oitavas), (Quartas), (Semifinal), (Final)

5. ANTI-REDUNDÂNCIA: o que está na linha 1 NÃO se repete na linha do 🏆.
   ✅ CORRETO:
      MotoGP — GP da Chéquia (Classificação)
      🏎️ MotoGP / ⏰ 09h00
   ❌ ERRADO:
      MotoGP — GP da Chéquia (Classificação)
      🏎️ Grande Prêmio da Chéquia / ⏰ 09h00

6. NÃO DUPLIQUE eventos. Mesmo evento + mesma sessão + mesmo horário só aparece UMA vez. Se aparecer duas vezes na imagem (canais diferentes), junte os canais com vírgula.

7. Se uma seção/esporte não tem nenhum evento na imagem, OMITA. NUNCA escreva "Nenhum jogo identificado", "Sem eventos hoje", "—".

8. NÃO filtre por relevância. Liste TUDO o que está visível: treinos livres, classificações, jogos secundários, ligas regionais, eventos noturnos.

9. Múltiplos canais: separe por vírgula com espaço. Ex: "ESPN 4, Disney+, Cazé TV".

10. NÃO adicione introdução, rodapé, totalizadores, comentários, "Espero ter ajudado", etc.

═══════════════════════════════════════════
REGRA DO TÍTULO (1ª linha)
═══════════════════════════════════════════

• Se o dia tem 1 evento dominante (ex: só Copa do Mundo): use esse evento.
   Ex: "⚽ Copa do Mundo — Oitavas de Final"
• Se o dia tem múltiplos esportes relevantes: use formato genérico.
   Ex: "🗓️ Programação Esportiva — 19/06"
• ≤60 caracteres, sempre começa com 1 emoji.

═══════════════════════════════════════════
EMOJIS POR ESPORTE (use no 🏆 da linha 2)
═══════════════════════════════════════════
⚽ Futebol   🥅 Futsal   🏀 Basquete   🏐 Vôlei
🤾 Handebol   🎾 Tênis   🏎️ F1/MotoGP/Stock/F-E/IndyCar/NASCAR
🥊 MMA/Boxe   ⚾ Baseball   🏉 Rugby
🏒 Hóquei   🏄 Surfe   🚴 Ciclismo
⛳ Golfe   🏊 Natação   🏃 Atletismo   🤸 Ginástica   🎮 eSports

⚠️ O HORÁRIO NUNCA VAI NA LINHA 1. A linha 1 é só o nome do evento/confronto.
⚠️ A linha 2 (<emoji> Competição / ⏰ HHhMM / #esporte) é OBRIGATÓRIA em TODO evento, inclusive
   em evento único. Se não houver competição nomeada, repita o nome do esporte:
   ✅ CORRETO:
      Camp. Mundial Sub-20 — Dia 4
      🏃 Atletismo / ⏰ 13h00 / #atletismo
      📺 SporTV 3
   ❌ ERRADO:
      Atletismo / 13h00
      📺 SporTV 3


═══════════════════════════════════════════
EXEMPLO DE SAÍDA VÁLIDA (dia multi-esporte)
═══════════════════════════════════════════
TÍTULO: 🗓️ Programação Esportiva — 19/06

📅 Dia 19/06

Moto3 — GP da Chéquia (Treino Livre 1)
🏎️ MotoGP / ⏰ 03h55
📺 ESPN 4

Moto2 — GP da Chéquia (Treino Livre 1)
🏎️ MotoGP / ⏰ 04h45
📺 ESPN 4

MotoGP — GP da Chéquia (Treino Livre 1)
🏎️ MotoGP / ⏰ 05h45
📺 ESPN 4

Halle Open (2ª Rodada)
🎾 ATP 500 / ⏰ 06h30
📺 ESPN 2

França (F) x China (F)
🏐 VNL Feminina / ⏰ 10h00
📺 SporTV 2

EUA x Austrália
🏆 Copa do Mundo (Oitavas) / ⏰ 16h00
📺 Cazé TV

Brasil x Haiti
🏆 Copa do Mundo (Oitavas) / ⏰ 21h30
📺 SBT, Globo

Andrew Stewart x Zayne Havener
🥊 Boxe (Card Principal) / ⏰ 22h00
📺 ESPN 3

═══════════════════════════════════════════
CHECKLIST FINAL — antes de responder, confira:
═══════════════════════════════════════════
[ ] Cada evento tem EXATAMENTE 3 linhas + 1 linha em branco
[ ] Apenas 1 bloco 📅 por data
[ ] Eventos ordenados por horário crescente
[ ] Nenhum evento duplicado
[ ] Sessão/fase entre parênteses em F1, MotoGP, tênis, golfe, boxe
[ ] Linha do 🏆 não repete o nome do evento da linha 1
[ ] Nenhuma linha tem "x ?" ou "x TBD"
[ ] Horários no formato HHhMM
[ ] Nenhum texto extra (intro/rodapé/comentário)

Agora processe a imagem e devolva APENAS o texto formatado.
```

---

## 🎯 Como usar no Admin → Banners

1. Cole o prompt + envie a imagem no ChatGPT/Gemini.
2. Copie a primeira linha (`TÍTULO: ...`) **sem o prefixo `TÍTULO:`** e cole no campo **Título** do banner.
3. O bloco abaixo do título (📅 + eventos) pode ser usado como descrição interna ou colado na aba **Programação** do admin.

## ⚠️ Limites do banner

- **Título:** máx. 60 caracteres.
- **Imagem:** proporção 16:9, máx. 8MB, JPG/PNG/WEBP.
- **Categoria:** Capa, Futebol, Basquete, UFC/MMA, Demais Esportes, Guia do Futebol.
