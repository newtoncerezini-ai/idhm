# Design do Painel IDHM

O projeto usa um layout executivo institucional, adaptado para uma base nacional de IDHM por territorialidade.

## Diretrizes

- Interface institucional, densa e voltada para análise.
- Sidebar fixa com navegação entre visão geral, ranking, comparativo, scorecard, gráficos e dicionário.
- Painéis brancos sobre fundo claro, com filtros de ano, região e indicador.
- Cores usadas para hierarquia, ranking e classificação do IDHM.
- Tabelas e gráficos priorizam leitura rápida em vez de ornamentação.

## Dados

O frontend consome `public/data/dashboard.json`, gerado por `scripts/build_data.py` a partir de `data/raw/idhm.xlsx`.

## Classificação IDHM

- Muito alto: 0,800 ou mais.
- Alto: 0,700 a 0,799.
- Médio: 0,550 a 0,699.
- Baixo: 0,500 a 0,549.
- Muito baixo: abaixo de 0,500.
