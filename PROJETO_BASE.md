# Projeto IDHM Dashboard

Painel executivo em React/Vite para análise do IDHM por Brasil e Unidades da Federação.

## Estrutura

```text
data/raw/idhm.xlsx              # planilha original
public/data/dashboard.json      # payload gerado para o frontend
scripts/build_data.py           # processamento da planilha
src/main.tsx                    # aplicação React
src/styles.css                  # estilos
```

## Fluxo

1. Coloque a base em `data/raw/idhm.xlsx`.
2. Rode `python scripts/build_data.py`.
3. Rode `npm run dev` para desenvolvimento ou `npm run build` para produção.

## Telas

- Visão geral: KPIs, top 10 e destaques.
- Ranking: tabela das UFs por indicador.
- Comparativo: distribuição das UFs em barras.
- Scorecard: ficha da UF com dimensões e evolução temporal.
- Gráficos: comparação radar entre UFs.
- Dicionário: indicadores importados da base.
