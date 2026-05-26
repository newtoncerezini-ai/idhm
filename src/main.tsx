import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  BookOpenText,
  ChevronDown,
  Download,
  LayoutDashboard,
  Map as MapIcon,
  Search,
  SlidersHorizontal,
  Table2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./styles.css";

type RankInfo = { position: number; total: number };
type RecordRow = {
  year: number;
  code: string;
  territory: string;
  region: string;
  values: Record<string, number | null>;
  ranks: Record<string, { br?: RankInfo | null; region?: RankInfo | null }>;
};
type DashboardData = {
  records: RecordRow[];
  regions: string[];
  indicators: string[];
  dimensions: string[];
  components: string[];
  years: number[];
  sourceNote: string;
};

type View = "overview" | "ranking" | "map" | "scorecard" | "charts" | "dictionary";

const IDHM = "IDHM";
const CORE = ["IDHM", "IDHM Renda", "IDHM Longevidade", "IDHM Educação"];
const COLORS = ["#006591", "#f97316", "#16a34a", "#7c3aed", "#dc2626", "#0f172a"];
const MAP_PALETTE = ["#005a8d", "#1597e5", "#8cc7f2", "#fff28a", "#f7bd08", "#ff922e", "#c94f55"];

function formatNumber(value: number | null | undefined, digits = 3) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatRank(rank?: RankInfo | null) {
  if (!rank) return "indisponível";
  return `${rank.position.toLocaleString("pt-BR")}/${rank.total.toLocaleString("pt-BR")}`;
}

function getValue(row: RecordRow, indicator: string) {
  return row.values[indicator] ?? null;
}

function getOptionalValue(row: RecordRow | undefined, indicator: string) {
  return row ? getValue(row, indicator) : null;
}

function isLowerBetter(indicator: string) {
  return indicator.includes("Perda pela desigualdade");
}

function rankRows(rows: RecordRow[], indicator: string) {
  const empty = isLowerBetter(indicator) ? Infinity : -Infinity;
  return [...rows].sort((a, b) => {
    const av = getValue(a, indicator) ?? empty;
    const bv = getValue(b, indicator) ?? empty;
    return isLowerBetter(indicator) ? av - bv : bv - av;
  });
}

function average(rows: RecordRow[], indicator: string) {
  const values = rows.map((row) => getValue(row, indicator)).filter((value): value is number => typeof value === "number");
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function classify(value: number | null) {
  if (value == null) return "Sem dado";
  if (value >= 0.8) return "Muito alto";
  if (value >= 0.7) return "Alto";
  if (value >= 0.55) return "Médio";
  if (value >= 0.5) return "Baixo";
  return "Muito baixo";
}

function scoreColor(value: number | null) {
  if (value == null) return "#d8dadc";
  if (value >= 0.8) return "#006591";
  if (value >= 0.7) return "#1597e5";
  if (value >= 0.55) return "#f7bd08";
  if (value >= 0.5) return "#ff922e";
  return "#c94f55";
}

function rankTone(ranks?: { br?: RankInfo | null }) {
  const rank = ranks?.br;
  if (!rank) return "empty";
  const third = rank.total / 3;
  if (rank.position <= third) return "green";
  if (rank.position <= third * 2) return "yellow";
  return "red";
}

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [view, setView] = useState<View>("overview");
  const [year, setYear] = useState(2024);
  const [region, setRegion] = useState("Todas");
  const [indicator, setIndicator] = useState(IDHM);
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState("PERNAMBUCO");

  useEffect(() => {
    fetch("/data/dashboard.json")
      .then((response) => response.json())
      .then((payload: DashboardData) => {
        setData(payload);
        setYear(payload.years[payload.years.length - 1] ?? 2024);
      });
  }, []);

  const years = data?.years ?? [];
  const indicators = useMemo(() => {
    if (!data) return [IDHM];
    return [...CORE, ...data.indicators.filter((item) => !CORE.includes(item))];
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.records.filter((row) => row.year === year && row.territory !== "Brasil" && (region === "Todas" || row.region === region));
  }, [data, year, region]);

  const ranked = useMemo(() => rankRows(rows, indicator), [rows, indicator]);
  const selected = useMemo(
    () => data?.records.find((row) => row.year === year && row.code === selectedCode) ?? ranked[0],
    [data, year, selectedCode, ranked],
  );

  if (!data) return <div className="loading">Carregando dados do IDHM...</div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/assets/igpe.png" alt="Instituto de Gestão de Pernambuco" />
          <div>
            <strong>IDHM Brasil</strong>
            <span>Painel executivo</span>
          </div>
        </div>
        <nav className="nav-list">
          <NavButton active={view === "overview"} icon={<LayoutDashboard size={20} />} label="Visão Geral" onClick={() => setView("overview")} />
          <NavButton active={view === "ranking"} icon={<Table2 size={20} />} label="Ranking" onClick={() => setView("ranking")} />
          <NavButton active={view === "map"} icon={<MapIcon size={20} />} label="Comparativo" onClick={() => setView("map")} />
          <NavButton active={view === "scorecard"} icon={<SlidersHorizontal size={20} />} label="Scorecard" onClick={() => setView("scorecard")} />
          <NavButton active={view === "charts"} icon={<BarChart3 size={20} />} label="Gráficos" onClick={() => setView("charts")} />
          <NavButton active={view === "dictionary"} icon={<BookOpenText size={20} />} label="Dicionário" onClick={() => setView("dictionary")} />
        </nav>
        <div className="sidebar-note">
          <span>Fonte</span>
          <p>{data.sourceNote}</p>
        </div>
        <div className="sidebar-logo-footer">
          <img className="government-logo" src="/assets/governo-pe-brasao.png" alt="Governo de Pernambuco" />
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="breadcrumb">Brasil / Unidades da Federação</p>
            <h1>{titleFor(view)}</h1>
          </div>
          <div className="top-actions">
            {(view === "overview" || view === "ranking") && <SearchBox value={query} onChange={setQuery} />}
            <Select label="Ano" value={String(year)} onChange={(value) => setYear(Number(value))} options={years.map(String)} />
          </div>
        </header>

        {(view === "overview" || view === "ranking") && (
          <section className="filters">
            <Select label="Região" value={region} onChange={setRegion} options={["Todas", ...data.regions]} />
            <Select label="Indicador" value={indicator} onChange={setIndicator} options={indicators} wide />
            <button className="button ghost">
              <Download size={17} />
              Exportar CSV
            </button>
          </section>
        )}

        {view === "overview" && <Overview rows={ranked} year={year} indicator={indicator} setView={setView} setSelectedCode={setSelectedCode} />}
        {view === "ranking" && <Ranking rows={ranked} query={query} indicator={indicator} setView={setView} setSelectedCode={setSelectedCode} />}
        {view === "map" && <CompareView rows={ranked} year={year} indicator={indicator} setIndicator={setIndicator} indicators={indicators} />}
        {view === "scorecard" && selected && <Scorecard data={data} selected={selected} year={year} selectedCode={selectedCode} setSelectedCode={setSelectedCode} />}
        {view === "charts" && <ChartsPage data={data} year={year} />}
        {view === "dictionary" && <Dictionary data={data} />}
      </main>
    </div>
  );
}

function titleFor(view: View) {
  return {
    overview: "Visão Geral do IDHM",
    ranking: "Ranking das UFs",
    map: "Comparativo Territorial",
    scorecard: "Scorecard da UF",
    charts: "Análises Gráficas",
    dictionary: "Dicionário de Dados",
  }[view];
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="search-box">
      <Search size={18} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Buscar UF" />
    </label>
  );
}

function Select({ label, value, onChange, options, wide = false }: { label: string; value: string; onChange: (value: string) => void; options: string[]; wide?: boolean }) {
  return (
    <label className={`select-wrap ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <div>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </div>
    </label>
  );
}

function Overview({ rows, year, indicator, setView, setSelectedCode }: { rows: RecordRow[]; year: number; indicator: string; setView: (view: View) => void; setSelectedCode: (code: string) => void }) {
  const top = rows[0];
  const pe = rows.find((row) => row.territory === "Pernambuco");
  const avg = average(rows, indicator);
  const chartRows = rows.slice(0, 10).map((row) => ({ name: row.territory, value: getValue(row, indicator) }));

  return (
    <div className="page-stack">
      <section className="metric-grid">
        <Metric title={`Média das UFs em ${year}`} value={formatNumber(avg)} detail={indicator} />
        <Metric title="Melhor posição" value={top?.territory ?? "-"} detail={`${formatNumber(getValue(top, indicator))} · ${classify(getValue(top, indicator))}`} />
        <Metric title="Pernambuco" value={formatNumber(getOptionalValue(pe, indicator))} detail={`Ranking Brasil: ${formatRank(pe?.ranks[indicator]?.br)}`} />
      </section>

      <section className="content-grid">
        <div className="panel">
          <PanelTitle title="Top 10 UFs" subtitle={`Ordenado por ${indicator}.`} />
          <div className="chart tall">
            <ResponsiveContainer>
              <BarChart data={chartRows} layout="vertical" margin={{ top: 10, right: 24, bottom: 10, left: 120 }}>
                <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={["dataMin", "dataMax"]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatNumber(Number(value))} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]} fill="#006591" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <PanelTitle title="Destaques" subtitle="Clique para abrir o scorecard." />
          <div className="highlight-list">
            {rows.slice(0, 8).map((row, index) => (
              <button key={row.code} onClick={() => { setSelectedCode(row.code); setView("scorecard"); }}>
                <span>{index + 1}</span>
                <strong>{row.territory}</strong>
                <em>{formatNumber(getValue(row, indicator))}</em>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function Ranking({ rows, query, indicator, setView, setSelectedCode }: { rows: RecordRow[]; query: string; indicator: string; setView: (view: View) => void; setSelectedCode: (code: string) => void }) {
  const filtered = rows.filter((row) => row.territory.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="panel">
      <div className="table-header">
        <PanelTitle title="Unidades da Federação" subtitle={`Mostrando ${filtered.length} de ${rows.length} UFs.`} />
        <span className="legend-dot">{indicator}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Posição</th>
              <th>UF</th>
              <th>Região</th>
              <th>Valor</th>
              <th>Classe</th>
              <th>Scorecard</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={row.code}>
                <td><span className={`rank-pill ${index < 3 ? "top" : ""}`}>{index + 1}</span></td>
                <td><strong>{row.territory}</strong></td>
                <td>{row.region}</td>
                <td className="score-cell">{formatNumber(getValue(row, indicator))}</td>
                <td>{classify(getValue(row, indicator))}</td>
                <td>
                  <button className="link-button" onClick={() => { setSelectedCode(row.code); setView("scorecard"); }}>
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CompareView({ rows, year, indicator, setIndicator, indicators }: { rows: RecordRow[]; year: number; indicator: string; setIndicator: (value: string) => void; indicators: string[] }) {
  const chartRows = rows.map((row) => ({ name: row.territory, value: getValue(row, indicator), region: row.region }));
  return (
    <div className="map-workspace">
      <div className="map-toolbar">
        <Select label="Indicador" value={indicator} onChange={setIndicator} options={indicators} wide />
      </div>
      <section className="panel map-panel">
        <PanelTitle title="Distribuição das UFs" subtitle={`Comparativo nacional por ${indicator}, ${year}.`} />
        <div className="chart tall">
          <ResponsiveContainer>
            <BarChart data={chartRows} margin={{ top: 16, right: 18, bottom: 70, left: 8 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" tick={{ fontSize: 11 }} height={86} />
              <YAxis tick={{ fontSize: 12 }} domain={["dataMin", "dataMax"]} />
              <Tooltip formatter={(value) => formatNumber(Number(value))} />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {chartRows.map((item, index) => (
                  <Cell key={item.name} fill={MAP_PALETTE[index % MAP_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function Scorecard({ data, selected, year, selectedCode, setSelectedCode }: { data: DashboardData; selected: RecordRow; year: number; selectedCode: string; setSelectedCode: (value: string) => void }) {
  const rows = data.records.filter((row) => row.year === year && row.territory !== "Brasil").sort((a, b) => a.territory.localeCompare(b.territory, "pt-BR"));
  const trend = data.years.map((itemYear) => {
    const row = data.records.find((record) => record.year === itemYear && record.code === selected.code);
    return { year: itemYear, IDHM: row ? getValue(row, IDHM) : null };
  });

  return (
    <div className="scorecard-page">
      <section className="scorecard-header">
        <div className="scorecard-identity">
          <Select label="UF" value={selectedCode} onChange={setSelectedCode} options={rows.map((row) => row.code)} />
          <p>{selected.territory}</p>
          <span>{selected.region}</span>
        </div>
        <div className="scorecard-kpis">
          <ScoreKpi title="IDHM" subtitle={String(year)} value={formatNumber(getValue(selected, IDHM))} tone={rankTone(selected.ranks[IDHM])} rank={formatRank(selected.ranks[IDHM]?.br)} />
          <ScoreKpi title="Renda" subtitle="Dimensão" value={formatNumber(getValue(selected, "IDHM Renda"))} tone={rankTone(selected.ranks["IDHM Renda"])} rank={formatRank(selected.ranks["IDHM Renda"]?.br)} />
          <ScoreKpi title="Educação" subtitle="Dimensão" value={formatNumber(getValue(selected, "IDHM Educação"))} tone={rankTone(selected.ranks["IDHM Educação"])} rank={formatRank(selected.ranks["IDHM Educação"]?.br)} />
        </div>
      </section>

      <section className="scorecard-summary">
        <div className="panel">
          <PanelTitle title="Evolução do IDHM" subtitle="Série histórica disponível na base." />
          <TrendChart data={trend} />
        </div>
        <div className="panel">
          <PanelTitle title="Dimensões" subtitle="Leitura sintética da UF selecionada." />
          <div className="dimension-list">
            {CORE.map((item) => (
              <Progress key={item} label={item} value={getValue(selected, item)} />
            ))}
          </div>
        </div>
      </section>

      <section className="dimension-card-grid">
        {[...data.components, ...data.indicators.filter((item) => item.includes("Perda pela desigualdade"))].slice(0, 6).map((item) => (
          <article className="dimension-card" key={item}>
            <header>
              <h2>{item}</h2>
              <div>
                <span>Valor</span>
                <strong>{formatNumber(getValue(selected, item))}</strong>
                <RankPair ranks={selected.ranks[item]} />
              </div>
              <div className={`status-square ${rankTone(selected.ranks[item])}`} />
            </header>
          </article>
        ))}
      </section>
    </div>
  );
}

function ScoreKpi({ title, subtitle, value, tone, rank }: { title: string; subtitle: string; value: string; tone: string; rank: string }) {
  return (
    <article className="score-kpi">
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div className={`status-square ${tone}`} />
      <p>{value}</p>
      <footer><span>Ranking Brasil: {rank}</span></footer>
    </article>
  );
}

function RankPair({ ranks }: { ranks?: { br?: RankInfo | null; region?: RankInfo | null } }) {
  return (
    <div className="rank-pair compact">
      <span>Brasil: {formatRank(ranks?.br)}</span>
      <span>Região: {formatRank(ranks?.region)}</span>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number | null }) {
  const width = Math.max(0, Math.min(100, (value ?? 0) * 100));
  return (
    <div className="progress-row">
      <div>
        <span>{label}</span>
        <strong>{formatNumber(value)}</strong>
      </div>
      <div className="track"><span style={{ width: `${width}%`, background: scoreColor(value) }} /></div>
    </div>
  );
}

function TrendChart({ data }: { data: { year: number; IDHM: number | null }[] }) {
  return (
    <div className="trend-chart">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 20, right: 24, bottom: 20, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
          <Line type="monotone" dataKey="IDHM" stroke="#006591" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartsPage({ data, year }: { data: DashboardData; year: number }) {
  const [codes, setCodes] = useState(["PERNAMBUCO", "SÃO PAULO", "CEARÁ"]);
  const rows = data.records.filter((row) => row.year === year && row.territory !== "Brasil");
  const selectedRows = codes.map((code) => rows.find((row) => row.code === code)).filter((row): row is RecordRow => Boolean(row));
  const radarData = CORE.map((indicator) => {
    const item: Record<string, string | number | null> = { indicator };
    selectedRows.forEach((row) => { item[row.territory] = getValue(row, indicator); });
    return item;
  });

  return (
    <section className="panel chart-panel">
      <PanelTitle title="Comparação de UFs" subtitle="Radar com IDHM e dimensões principais." />
      <div className="chip-list">
        {rows.map((row) => (
          <button key={row.code} onClick={() => setCodes(codes.includes(row.code) ? codes.filter((code) => code !== row.code) : [...codes, row.code].slice(-6))}>
            {row.territory}
          </button>
        ))}
      </div>
      <div className="large-chart">
        <ResponsiveContainer>
          <RadarChart data={radarData} outerRadius="76%">
            <PolarGrid />
            <PolarAngleAxis dataKey="indicator" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Legend />
            {selectedRows.map((row, index) => (
              <Radar key={row.code} name={row.territory} dataKey={row.territory} stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.1} strokeWidth={2} />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Dictionary({ data }: { data: DashboardData }) {
  return (
    <div className="dictionary-page">
      <section className="panel dictionary-hero">
        <div>
          <PanelTitle title="Dicionário do IDHM" subtitle="Indicadores importados da planilha base." />
        </div>
        <div className="dictionary-note">
          <strong>{data.indicators.length} indicadores</strong>
          <span>{data.years[0]} a {data.years[data.years.length - 1]}</span>
        </div>
      </section>
      <section className="dictionary-section">
        <div className="dictionary-list">
          {data.indicators.map((indicator) => (
            <article className="dictionary-item" key={indicator}>
              <strong>{indicator}</strong>
              <span>{isLowerBetter(indicator) ? "Menor valor indica menor perda pela desigualdade." : "Maior valor indica melhor desempenho."}</span>
              <p>{CORE.includes(indicator) ? "Indicador principal" : "Indicador complementar"}</p>
              <em>{data.years.length} anos</em>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
