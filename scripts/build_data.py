from __future__ import annotations

import json
import math
import re
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
RAW_XLSX = ROOT / "data" / "raw" / "idhm.xlsx"
PUBLIC = ROOT / "public" / "data"

BASE_INDICATORS = [
    "IDHM",
    "IDHM Renda",
    "IDHM Longevidade",
    "IDHM Educação",
    "IDHM Ajustado à Desigualdade",
    "IDHM Renda Ajustado à Desigualdade",
    "IDHM Longevidade Ajustado à Desigualdade",
    "IDHM Educação Ajustado à Desigualdade",
    "IDHM Ajustado à Desigualdade - Perda pela desigualdade",
    "IDHM Renda Ajustado à Desigualdade - Perda pela desigualdade",
    "IDHM Longevidade Ajustado à Desigualdade - Perda pela desigualdade",
    "IDHM Educação Ajustado à Desigualdade - Perda pela desigualdade",
]

DIMENSIONS = ["IDHM Renda", "IDHM Longevidade", "IDHM Educação"]
COMPONENTS = [
    "IDHM Ajustado à Desigualdade",
    "IDHM Renda Ajustado à Desigualdade",
    "IDHM Longevidade Ajustado à Desigualdade",
    "IDHM Educação Ajustado à Desigualdade",
]

PANEL_START_YEAR = 2010

UF_REGIONS = {
    "Acre": "Norte",
    "Amapá": "Norte",
    "Amazonas": "Norte",
    "Pará": "Norte",
    "Rondônia": "Norte",
    "Roraima": "Norte",
    "Tocantins": "Norte",
    "Alagoas": "Nordeste",
    "Bahia": "Nordeste",
    "Ceará": "Nordeste",
    "Maranhão": "Nordeste",
    "Paraíba": "Nordeste",
    "Pernambuco": "Nordeste",
    "Piauí": "Nordeste",
    "Rio Grande do Norte": "Nordeste",
    "Sergipe": "Nordeste",
    "Distrito Federal": "Centro-Oeste",
    "Goiás": "Centro-Oeste",
    "Mato Grosso": "Centro-Oeste",
    "Mato Grosso do Sul": "Centro-Oeste",
    "Espírito Santo": "Sudeste",
    "Minas Gerais": "Sudeste",
    "Rio de Janeiro": "Sudeste",
    "São Paulo": "Sudeste",
    "Paraná": "Sul",
    "Rio Grande do Sul": "Sul",
    "Santa Catarina": "Sul",
}


def num(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and math.isnan(value):
            return None
        return round(float(value), 6)
    text = str(value).strip().replace(",", ".")
    try:
        return round(float(text), 6)
    except ValueError:
        return None


def parse_header(value: object) -> tuple[str, int] | None:
    header = str(value or "").strip()
    match = re.match(r"(.+?)\s+(\d{4})$", header)
    if not match:
        return None
    indicator, year = match.group(1).strip(), int(match.group(2))
    if year < PANEL_START_YEAR or indicator not in BASE_INDICATORS:
        return None
    return indicator, year


def rank_map(rows: list[dict], indicators: list[str]) -> dict[str, dict[str, dict]]:
    ranks: dict[str, dict[str, dict]] = {}
    for indicator in indicators:
        valid = [row for row in rows if row["values"].get(indicator) is not None]
        reverse = "Perda pela desigualdade" not in indicator
        valid.sort(key=lambda row: row["values"][indicator], reverse=reverse)
        for position, row in enumerate(valid, start=1):
            ranks.setdefault(row["code"], {})[indicator] = {
                "position": position,
                "total": len(valid),
            }
    return ranks


def main():
    if not RAW_XLSX.exists():
        raise FileNotFoundError(f"Base não encontrada: {RAW_XLSX}")

    wb = openpyxl.load_workbook(RAW_XLSX, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    headers = rows[0]
    parsed_headers = [(index, parsed) for index, header in enumerate(headers) if (parsed := parse_header(header))]

    records = []
    notes = []
    for source in rows[1:]:
        territory = str(source[0] or "").strip()
        if not territory:
            continue
        if territory.startswith("Elaboração:") or territory.startswith("Fontes:"):
            notes.append(territory)
            continue

        values_by_year: dict[int, dict[str, float | None]] = {}
        for index, (indicator, year) in parsed_headers:
            values_by_year.setdefault(year, {})[indicator] = num(source[index])

        region = "Brasil" if territory == "Brasil" else UF_REGIONS.get(territory, "Outros")
        code = "BR" if territory == "Brasil" else territory.upper()
        for year, values in sorted(values_by_year.items()):
            records.append(
                {
                    "year": year,
                    "code": code,
                    "territory": territory,
                    "region": region,
                    "values": values,
                    "ranks": {},
                }
            )

    indicators = sorted({indicator for record in records for indicator in record["values"]})
    by_year: dict[int, list[dict]] = {}
    for record in records:
        by_year.setdefault(record["year"], []).append(record)

    for year, year_rows in by_year.items():
        state_rows = [row for row in year_rows if row["territory"] != "Brasil"]
        national_ranks = rank_map(state_rows, indicators)
        regional_ranks = {
            region: rank_map([row for row in state_rows if row["region"] == region], indicators)
            for region in sorted({row["region"] for row in state_rows})
        }
        for record in year_rows:
            for indicator in indicators:
                record["ranks"][indicator] = {
                    "br": national_ranks.get(record["code"], {}).get(indicator),
                    "region": regional_ranks.get(record["region"], {}).get(record["code"], {}).get(indicator),
                }

    payload = {
        "records": records,
        "regions": sorted({row["region"] for row in records if row["region"] != "Brasil"}),
        "indicators": indicators,
        "indicatorPolarity": {
            indicator: ("lower" if "Perda pela desigualdade" in indicator else "higher")
            for indicator in indicators
        },
        "dimensions": DIMENSIONS,
        "components": COMPONENTS,
        "years": sorted(by_year),
        "sourceNote": "Base IDHM carregada de data/raw/idhm.xlsx. " + " ".join(notes),
    }

    PUBLIC.mkdir(parents=True, exist_ok=True)
    with (PUBLIC / "dashboard.json").open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Gerado {PUBLIC / 'dashboard.json'} com {len(records)} registros.")


if __name__ == "__main__":
    main()
