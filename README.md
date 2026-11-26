# AERIS CONTROL

Simulador industrial web da **AERIS Automação Industrial**: supervisório SCADA didático de ventilação, exaustão e refrigeração para um galpão de 200 × 100 × 6 m.

## Executar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera dist/
npm test         # testes do motor de simulação
```

## Deploy (Vercel)

Projeto estático Vite. `vercel.json` já define `npm run build` e saída `dist`. Rotas por hash (`#/plant`, `#/memorial`…), compatíveis com hospedagem estática.

## Estrutura

- `src/sim/` — premissas, modelo térmico, cenários, matriz de E/S e lista de materiais
- `src/state/store.ts` — estado central compartilhado (Zustand) e laço de simulação
- `src/three/` — galpão 3D procedural (React Three Fiber)
- `src/pages/` — Visão geral, Planta 3D, Ventilação e refrigeração, Sistema elétrico, CLP e sensores, Alarmes, Memorial técnico, Lista de materiais

## Aviso

Simulador didático. Não é ferramenta certificada de segurança industrial; parâmetros didáticos; não se conecta a equipamentos reais.
