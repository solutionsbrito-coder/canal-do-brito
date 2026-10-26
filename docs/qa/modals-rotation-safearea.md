# Testes manuais — Rotação & Safe-areas (iPhone)

Roteiro para QA validar `ContentDetailSheet` e `TrailerModal` em dispositivos reais (iOS Safari + Chrome iOS) e simuladores. Os testes automatizados cobrem layout/regressão; este checklist garante o comportamento real do gesto, da rotação e da Dynamic Island.

## Pré-requisitos
- App publicado em https://canaldobrito.site (PWA instalada também é válida).
- Acessar a aba **Novidades** e tocar em qualquer card de filme/série para abrir o sheet de detalhes; usar o botão **"Trailer"** para abrir o modal.
- Testar em pelo menos: iPhone SE (sem notch), iPhone 13/14 (notch), iPhone 14/15 Pro Max (Dynamic Island).

## 1. Sheet de detalhes — portrait
- [ ] Abre com animação de baixo para cima e ocupa no máx. 90 % da altura.
- [ ] Botão **"Fechar"** (X) visível e clicável (≥ 44×44 px).
- [ ] Conteúdo final (links/TMDB) **não** fica encoberto pela home indicator nem pela BottomNav.
- [ ] Swipe para baixo no handle (barra superior) fecha após ~120 px.
- [ ] Scroll vertical interno funciona sem arrastar o sheet inteiro.
- [ ] Tap fora (backdrop) fecha o sheet.

## 2. Sheet de detalhes — rotação
- [ ] Abrir em portrait, rotacionar para landscape: sheet permanece aberto, conteúdo se reflowa, sem corte horizontal.
- [ ] Botão Fechar continua acessível em landscape (margens laterais respeitam safe-area esquerda/direita).
- [ ] Rotacionar de volta para portrait: sheet continua aberto e funcional.
- [ ] Após fechar, o scroll do body é restaurado (página rola normalmente).

## 3. Trailer modal — portrait
- [ ] Abre com fade + scale, vídeo carrega inline (sem fullscreen forçado).
- [ ] Botão fechar (X) acima do vídeo, sempre visível.
- [ ] ESC (em teclado externo) e tap no backdrop fecham.

## 4. Trailer modal — rotação
- [ ] Em landscape, o iframe ocupa o centro, mantendo aspect-video, com margens respeitando safe-area lateral.
- [ ] Rotacionar com o trailer tocando: vídeo continua tocando (não recarrega) **ou** reabre em ≤ 1 s.
- [ ] Sair do trailer e abrir outro card: BottomNav volta a ser interativa.

## 5. Safe-areas específicas
- [ ] **iPhone SE**: nenhum espaço extra abaixo do conteúdo (inset-bottom = 0).
- [ ] **iPhone 13/14**: ~34 px de respiro inferior, home indicator não sobrepõe conteúdo.
- [ ] **iPhone 14 Pro / 15 Pro (Dynamic Island)**: header do sheet (handle) não fica atrás da ilha em landscape.
- [ ] **PWA standalone**: `env(safe-area-inset-bottom)` continua sendo respeitado (testar adicionando à tela inicial).

## 6. Bugs a observar (regressões conhecidas)
- BottomNav reaparecendo por cima do sheet (z-index quebrado por ancestral com `transform`).
- Scroll do body não restaurado após swipe-to-dismiss interrompido.
- Trailer abrindo em fullscreen forçado no Safari iOS (deve usar `playsinline=1`).
- Drag do sheet capturando scroll interno (apenas o handle deve iniciar drag).

## Automação relacionada
- `src/components/public/__tests__/Modals.rotation-safearea.test.tsx` — vitest, 9 casos.
- `e2e/modals.rotation.spec.ts` — Playwright, viewports iPhone + rotação portrait↔landscape.
- `e2e/modals.spec.ts` — abertura/fechamento, swipe-to-dismiss, stacking sobre BottomNav.
