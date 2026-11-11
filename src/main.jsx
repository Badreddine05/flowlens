import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  Workflow,
  LayoutDashboard,
  Route,
  SlidersHorizontal,
  BookOpen,
  ArrowUpRight,
  ArrowRight,
  Download,
  Play,
  Pause,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Clock3,
  Layers3,
  FileStack,
  RotateCcw,
  CircleCheck,
  GitBranch,
  Database,
  Info,
  ExternalLink,
  Filter,
  Sparkles,
  Check,
  Menu,
  CircleHelp,
} from "lucide-react";
import {
  aggregate,
  selectCases,
  simulate,
  statusLabels,
  statusColors,
  csvRows,
} from "./analytics.mjs";
import "./styles.css";

const number = new Intl.NumberFormat("fr-FR");
const dec = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const n = (v) => number.format(v ?? 0);
const d = (v) => (v === null || v === undefined ? "—" : dec.format(v));
const date = (ms) =>
  new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const monthLabel = (m) =>
  new Date(`${m}-15`).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
const navItems = [
  ["overview", "Vue d’ensemble", LayoutDashboard],
  ["journeys", "Parcours & dossiers", Route],
  ["simulation", "Laboratoire", SlidersHorizontal],
  ["method", "Données & méthode", BookOpen],
];
const positions = [
  [70, 205],
  [230, 88],
  [230, 307],
  [420, 205],
  [610, 205],
  [800, 205],
  [800, 365],
  [1000, 78],
  [1000, 310],
  [610, 385],
];

function download(name, rows) {
  const credit =
    "BPI Challenge 2017 — van Dongen (2017), 4TU.ResearchData; https://doi.org/10.4121/uuid:5f3067df-f10b-45da-b98b-86ae4c7a310b";
  const terms =
    "4TU General Terms of Use; non-commercial; conserver cette attribution; https://doi.org/10.4121/resource:terms_of_use";
  const attributed = rows.map((row, i) => [
    ...row,
    i === 0 ? "Source" : credit,
    i === 0 ? "Conditions des données" : terms,
  ]);
  const url = URL.createObjectURL(
    new Blob([csvRows(attributed)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Metric({ label, value, unit, detail, icon: Icon, tone = "purple" }) {
  return (
    <article className={`metric ${tone}`}>
      <div className="metric-top">
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <div className="metric-value" key={String(value)}>
        {value}
        <span>{unit}</span>
      </div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function ProcessGraph({ stats, labels, selected, onSelect }) {
  const [playing, setPlaying] = useState(false),
    [all, setAll] = useState(false),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(mq.matches);
      if (mq.matches) setPlaying(false);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const edges = all ? stats.edges : stats.edges.slice(0, 12),
    max = stats.edges[0]?.count || 1;
  const coverage = stats.edges.length
    ? (100 * edges.reduce((a, e) => a + e.count, 0)) /
      stats.edges.reduce((a, e) => a + e.count, 0)
    : 0;
  const edgePath = (e) => {
    const [x1, y1] = positions[e.from],
      [x2, y2] = positions[e.to];
    if (e.from === e.to)
      return `M ${x1 - 20},${y1 - 30} C ${x1 - 85},${y1 - 110} ${x1 + 85},${y1 - 110} ${x1 + 20},${y1 - 30}`;
    const dx = x2 - x1;
    const sy = y1 + (y2 - y1) * 0.08,
      ty = y2 - (y2 - y1) * 0.08;
    if (dx < 0)
      return `M ${x1 - 50},${sy} C ${x1 - 60},${sy - 100} ${x2 + 60},${ty - 100} ${x2 + 50},${ty}`;
    return `M ${x1 + 50},${sy} C ${x1 + Math.max(65, dx * 0.5)},${sy} ${x2 - Math.max(65, dx * 0.5)},${ty} ${x2 - 50},${ty}`;
  };
  return (
    <section className="panel process-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">EXPLORER LE PROCESSUS</span>
          <h2>Chaque dossier raconte un parcours.</h2>
        </div>
        <button
          className={`button small ${playing ? "selected" : ""}`}
          disabled={reduced}
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Mettre les flux en pause" : "Animer les flux"}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}{" "}
          {playing ? "Pause" : "Animer"}
        </button>
      </div>
      <p className="subtext graph-help">
        Cliquez sur une étape pour explorer les dossiers qui y sont passés.
      </p>
      <div className="graph-wrapper">
        <svg
          className={`process-svg ${playing && !reduced ? "is-playing" : ""}`}
          viewBox="0 0 1100 465"
          role="group"
          aria-label="Graphe des transitions entre états des demandes de prêt"
        >
          <defs>
            <marker
              id="arrow"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L6,3 L0,6" fill="#aaa2d1" />
            </marker>
            <pattern
              id="dots"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="#e5e2ee" />
            </pattern>
          </defs>
          <rect width="1100" height="465" fill="url(#dots)" />
          {edges.map((e, i) => (
            <g key={`${e.from}-${e.to}`}>
              <path
                id={`edge-${e.from}-${e.to}`}
                d={edgePath(e)}
                fill="none"
                stroke={e.from === 6 ? "#dcb785" : "#c7c0e7"}
                strokeWidth={1.2 + (3.8 * e.count) / max}
                markerEnd="url(#arrow)"
                opacity={
                  selected === null || e.from === selected || e.to === selected
                    ? 0.9
                    : 0.25
                }
              >
                <title>
                  {labels[e.from]} → {labels[e.to]} : {n(e.count)} transitions ;
                  délai médian {d(e.median)} j
                </title>
              </path>
              {playing && !reduced && (
                <circle
                  r="3.5"
                  fill={e.from === 6 ? "#c69b63" : "#7864df"}
                  className="flow-dot"
                >
                  <animateMotion
                    dur={`${3 + (i % 4)}s`}
                    repeatCount="indefinite"
                    begin={`${-i * 0.39}s`}
                  >
                    <mpath href={`#edge-${e.from}-${e.to}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          ))}
          {positions.map(([x, y], i) => {
            const inactive = !stats.stages.get(i),
              terminal = i >= 7;
            return (
              <g
                key={i}
                className={`process-node ${selected === i ? "active" : ""} ${inactive ? "inactive" : ""} ${terminal ? "terminal" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={selected === i}
                aria-label={`${labels[i]}, ${n(stats.stages.get(i))} dossiers. Filtrer.`}
                onClick={() => onSelect(selected === i ? null : i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(selected === i ? null : i);
                  }
                }}
                transform={`translate(${x},${y})`}
              >
                <rect x="-63" y="-33" width="126" height="66" rx="12" />
                <circle
                  cx="-44"
                  cy="-13"
                  r="4"
                  fill={
                    i === 7
                      ? "#389a87"
                      : i === 8
                        ? "#d67778"
                        : i === 6
                          ? "#c39759"
                          : "#8878d5"
                  }
                />
                <text className="node-number" x="-32" y="-8">
                  {n(stats.stages.get(i))}
                </text>
                <text className="node-label" x="0" y="16" textAnchor="middle">
                  {labels[i]}
                </text>
                <title>
                  {labels[i]} : {n(stats.stages.get(i))} dossiers distincts
                </title>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="graph-footer">
        <div className="legend">
          <span>
            <i className="legend-dot purple" /> Volume des transitions
          </span>
          <span>
            <i className="legend-dot amber" /> Retour pour pièces
          </span>
        </div>
        <button className="text-button" onClick={() => setAll(!all)}>
          {all ? "Simplifier le graphe" : "Toutes les transitions"}{" "}
          <ArrowRight size={14} />
        </button>
      </div>
      <p className="chart-note">
        {edges.length} transitions affichées · {d(coverage)} % des passages
        couverts. Animation illustrative, sans échelle temporelle.
      </p>
    </section>
  );
}

function Distribution({ bars, secondary }) {
  const max = Math.max(
    1,
    ...bars.map((b) => b.count),
    ...(secondary || []).map((b) => b.count),
  );
  return (
    <div
      className="distribution"
      role="img"
      aria-label={`Distribution des délais des dossiers terminés en jours. ${bars.map((b, i) => `${b.label} jours : ${n(b.count)} dossiers${secondary ? `, scénario ${n(secondary[i].count)}` : ""}`).join(". ")}`}
    >
      <div className="bar-chart">
        {bars.map((b, i) => (
          <div className="bar-group" key={b.label}>
            <div className="bar-track">
              <div
                className="bar primary"
                style={{ height: `${(b.count / max) * 100}%` }}
              >
                <span className="bar-tip">
                  {b.label} j : {n(b.count)} dossiers
                </span>
              </div>
              {secondary && (
                <div
                  className="bar secondary"
                  style={{ height: `${(secondary[i].count / max) * 100}%` }}
                >
                  <span className="bar-tip">
                    Scénario : {n(secondary[i].count)}
                  </span>
                </div>
              )}
            </div>
            <span>{b.label}</span>
          </div>
        ))}
      </div>
      <div className="axis-note">Délai calendaire en jours</div>
    </div>
  );
}

function CohortChart({ months }) {
  const observed = months.filter((m) => Number.isFinite(m.median));
  if (!observed.length)
    return (
      <div className="chart-empty">
        <Clock3 size={25} />
        <strong>Aucun dossier terminé</strong>
        <p>La médiane n’est pas définie pour ce périmètre.</p>
      </div>
    );
  const max = Math.max(1, ...observed.map((m) => m.median));
  const x = (i) => 45 + i * (630 / Math.max(1, months.length - 1));
  const y = (m) => 165 - (m.median / max) * 120;
  let previous = false;
  const path = months
    .map((m, i) => {
      if (!Number.isFinite(m.median)) {
        previous = false;
        return "";
      }
      const segment = `${previous ? "L" : "M"}${x(i)},${y(m)}`;
      previous = true;
      return segment;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 720 215"
      className="cohort-chart"
      role="img"
      aria-label={`Délai médian des dossiers terminés par mois de création. ${months.map((m) => `${monthLabel(m.month)} : ${Number.isFinite(m.median) ? `${d(m.median)} jours` : "aucun dossier terminé"}`).join(". ")}`}
    >
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line
            x1="45"
            x2="690"
            y1={165 - t * 120}
            y2={165 - t * 120}
            stroke="#eeecf5"
            strokeDasharray="4 5"
          />
          <text x="7" y={170 - t * 120}>
            {d(t * max)} j
          </text>
        </g>
      ))}
      <path
        d={path}
        fill="none"
        stroke="#8270d8"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {months.map((m, i) => (
        <g key={m.month}>
          {Number.isFinite(m.median) && (
            <circle
              cx={x(i)}
              cy={y(m)}
              r="4"
              fill="#8270d8"
              stroke="white"
              strokeWidth="2"
            >
              <title>
                {monthLabel(m.month)} : {d(m.median)} j, {n(m.count)} dossiers
              </title>
            </circle>
          )}
          <text textAnchor="middle" x={x(i)} y="200">
            {new Date(m.month + "-15").toLocaleDateString("fr-FR", {
              month: "short",
            })}
          </text>
        </g>
      ))}
    </svg>
  );
}

function VariantList({ variants, total, labels, onChoose, limit = 4 }) {
  return (
    <div className="variants">
      {variants.slice(0, limit).map((v, i) => (
        <button
          className="variant"
          key={v.path.join("-")}
          onClick={() => onChoose(v.path.join("-"))}
        >
          <div className="variant-line">
            <span className="rank">{String(i + 1).padStart(2, "0")}</span>
            <strong>{n(v.count)} dossiers</strong>
            <span>{d((100 * v.count) / (total || 1))} %</span>
            <span className="variant-time">{d(v.median)} j</span>
          </div>
          <div className="variant-track">
            <i
              style={{
                width: `${(100 * v.count) / (variants[0]?.count || 1)}%`,
              }}
            />
          </div>
          <div className="variant-path">
            {v.path.map((s, j) => (
              <React.Fragment key={j}>
                {j > 0 && <ChevronRight size={10} />}
                <span>{labels[s]}</span>
              </React.Fragment>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}

function Timeline({ item, labels, onClose }) {
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.getElementById("close-detail")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <section
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            document.getElementById("close-detail")?.focus();
          }
        }}
      >
        <div className="drawer-top">
          <span className="eyebrow">PARCOURS INDIVIDUEL</span>
          <button
            id="close-detail"
            className="icon-button"
            onClick={onClose}
            aria-label="Fermer le détail"
          >
            <X size={22} />
          </button>
        </div>
        <h2 id="drawer-title">{item.id}</h2>
        <div className="drawer-sub">
          <span
            className="status"
            style={{ "--status": statusColors[item.status] }}
          >
            {statusLabels[item.status]}
          </span>
          <span>{date(item.start)}</span>
        </div>
        <div className="drawer-metrics">
          <div>
            <span>Délai observé</span>
            <strong>{d(item.duration)} j</strong>
          </div>
          <div>
            <span>États métier</span>
            <strong>{item.events.length}</strong>
          </div>
        </div>
        <p className="subtext">
          Identifiant de substitution. Chronologie des états de la demande, en
          UTC.
        </p>
        <ol className="timeline">
          {item.events.map(([state, seconds], i) => (
            <li key={i}>
              <div className="timeline-dot" />
              <div>
                <strong>{labels[state]}</strong>
                <span>
                  {new Date(item.start + seconds * 1000).toLocaleString(
                    "fr-FR",
                    { timeZone: "UTC" },
                  )}
                </span>
                {i > 0 && (
                  <em>
                    + {d((seconds - item.events[i - 1][1]) / 86400)} j depuis
                    l’étape précédente
                  </em>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="chart-note">
          Le temps entre deux états inclut travail et attente ; il ne mesure pas
          une charge de travail.
        </p>
      </section>
    </div>
  );
}

function App() {
  const [data, setData] = useState(null),
    [manifest, setManifest] = useState(null),
    [error, setError] = useState("");
  const [tab, setTab] = useState("overview"),
    [month, setMonth] = useState("all"),
    [status, setStatus] = useState("all"),
    [type, setType] = useState("all"),
    [stage, setStage] = useState(null),
    [query, setQuery] = useState(""),
    [variant, setVariant] = useState(""),
    [sort, setSort] = useState("start-desc"),
    [page, setPage] = useState(0),
    [detail, setDetail] = useState(null),
    [reduction, setReduction] = useState(25),
    [scenarioStage, setScenarioStage] = useState(4),
    [toast, setToast] = useState(""),
    [mobileMenu, setMobileMenu] = useState(false);
  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/cases.json`).then((r) => {
        if (!r.ok) throw new Error("cases");
        return r.json();
      }),
      fetch(`${import.meta.env.BASE_URL}data/manifest.json`).then((r) => {
        if (!r.ok) throw new Error("manifest");
        return r.json();
      }),
    ])
      .then(([a, b]) => {
        setData(a);
        setManifest(b);
      })
      .catch(() =>
        setError(
          "Les données n’ont pas pu être chargées. Vérifiez la connexion puis réessayez.",
        ),
      );
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(
    () => setPage(0),
    [month, status, type, stage, query, variant, sort],
  );
  const filtered = useMemo(
    () => (data ? selectCases(data.cases, { month, status, type, stage }) : []),
    [data, month, status, type, stage],
  );
  const stats = useMemo(() => aggregate(filtered), [filtered]);
  const scenario = useMemo(
    () => simulate(filtered, scenarioStage, reduction),
    [filtered, scenarioStage, reduction],
  );
  const table = useMemo(
    () =>
      filtered
        .filter(
          (c) =>
            (!query || c.id.toLowerCase().includes(query.toLowerCase())) &&
            (!variant || c.events.map((e) => e[0]).join("-") === variant),
        )
        .sort((a, b) =>
          sort === "duration-desc"
            ? b.duration - a.duration
            : sort === "duration-asc"
              ? a.duration - b.duration
              : b.start - a.start,
        ),
    [filtered, query, variant, sort],
  );
  const activeFilters =
    month !== "all" || status !== "all" || type !== "all" || stage !== null;
  const chooseVariant = (path) => {
    setVariant(path);
    setTab("journeys");
  };
  const reset = () => {
    setMonth("all");
    setStatus("all");
    setType("all");
    setStage(null);
    setVariant("");
    setQuery("");
  };
  const exportCases = () => {
    download("flowlens-dossiers.csv", [
      [
        "Dossier",
        "Création UTC",
        "Type",
        "Dernier état",
        "Délai observé jours",
        "États métier",
      ],
      ...table.map((c) => [
        c.id,
        new Date(c.start).toISOString(),
        c.type,
        statusLabels[c.status],
        c.duration,
        c.events.length,
      ]),
    ]);
    setToast(`${n(table.length)} dossiers exportés`);
  };
  const navigate = (t) => {
    setTab(t);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  if (error)
    return (
      <main className="load-screen">
        <Workflow size={44} />
        <h1>Données indisponibles</h1>
        <p>{error}</p>
        <button className="button primary" onClick={() => location.reload()}>
          Réessayer
        </button>
      </main>
    );
  if (!data)
    return (
      <main className="load-screen" aria-live="polite">
        <Workflow size={44} className="loading-icon" />
        <h1>FlowLens</h1>
        <p>Lecture des parcours métier…</p>
        <span>Un jeu de données réel, une exploration locale.</span>
      </main>
    );
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-mark">
            <Workflow size={23} />
          </span>
          <span>
            flow<span>lens</span>
            <small>PROCESS INTELLIGENCE</small>
          </span>
        </a>
        <div className="workspace">
          <div className="workspace-icon">
            <FileStack size={19} />
          </div>
          <div>
            <strong>Demandes de prêt</strong>
            <small>BPI Challenge 2017</small>
          </div>
          <span className="workspace-dot" />
        </div>
        <span className="nav-label">ESPACE D’ANALYSE</span>
        <nav aria-label="Navigation principale">
          {navItems.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => navigate(key)}
              aria-current={tab === key ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {tab === key && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note">
            <span className="mini-orbit">
              <GitBranch size={20} />
            </span>
            <strong>Voir au-delà des étapes.</strong>
            <p>
              Des données aux parcours.
              <br />
              Des parcours aux décisions.
            </p>
            <button className="text-button" onClick={() => navigate("method")}>
              Comprendre la méthode <ArrowUpRight size={14} />
            </button>
          </div>
          <a
            className="author"
            href="https://github.com/Badreddine05/flowlens"
            target="_blank"
            rel="noreferrer"
          >
            <span className="avatar">BC</span>
            <span>
              <strong>Badreddine Channoufi</strong>
              <small>Projet personnel · MIAGE</small>
            </span>
            <ArrowUpRight size={15} />
          </a>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-toggle"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Ouvrir la navigation"
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              Espace d’analyse <ChevronRight size={13} />{" "}
              <strong>{navItems.find((v) => v[0] === tab)[1]}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="data-badge">
              <i /> Données historiques vérifiées
            </span>
            <a
              className="source-link"
              href="https://github.com/Badreddine05/flowlens"
              target="_blank"
              rel="noreferrer"
            >
              Code source <ArrowUpRight size={15} />
            </a>
          </div>
        </header>
        <main id="main">
          <section className="page-header t-stagger is-shown">
            <div>
              <span className="eyebrow t-stagger-line t-stagger-line--1">
                {tab === "overview"
                  ? "LE PROCESSUS, EN CLAIR"
                  : tab === "journeys"
                    ? "SUIVRE LE FIL"
                    : tab === "simulation"
                      ? "EXPLORER LES POSSIBLES"
                      : "LA CONFIANCE COMMENCE ICI"}
              </span>
              <h1 className="t-stagger-line t-stagger-line--2">
                {tab === "overview"
                  ? "Les parcours prennent vie."
                  : tab === "journeys"
                    ? "Du premier contact à l’issue."
                    : tab === "simulation"
                      ? "Et si le délai changeait ?"
                      : "Des données aux décisions."}
              </h1>
              <p>
                {tab === "overview"
                  ? "Comprenez les flux, repérez les retours et donnez du sens aux délais."
                  : tab === "journeys"
                    ? "Explorez chaque variante et retrouvez la chronologie de chaque dossier."
                    : tab === "simulation"
                      ? "Modifiez une hypothèse. Observez son effet théorique sur les parcours."
                      : "Une analyse reproductible, des définitions explicites et des limites visibles."}
              </p>
            </div>
            {tab !== "method" && (
              <button className="button" onClick={exportCases}>
                <Download size={16} /> Exporter les dossiers
              </button>
            )}
          </section>
          {tab !== "method" && (
            <>
              <div className="filters">
                <div className="filter-heading">
                  <Filter size={16} />
                  <span>Périmètre</span>
                </div>
                <label>
                  <span className="sr-only">Mois de création</span>
                  <select
                    aria-label="Mois de création"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    <option value="all">Toute l’année 2016</option>
                    {[...new Set(data.cases.map((c) => c.month))]
                      .sort()
                      .map((m) => (
                        <option key={m} value={m}>
                          {monthLabel(m)}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Issue du dossier</span>
                  <select
                    aria-label="Issue du dossier"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">Toutes les issues</option>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Type de demande</span>
                  <select
                    aria-label="Type de demande"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="all">Tous les types</option>
                    {[...new Set(data.cases.map((c) => c.type))].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <span className="filter-count">
                  {n(filtered.length)} dossiers
                </span>
                {activeFilters && (
                  <button className="text-button" onClick={reset}>
                    <RotateCcw size={13} /> Réinitialiser
                  </button>
                )}
              </div>
              {stage !== null && (
                <div className="filter-chip">
                  Passage par : {data.labels[stage]}
                  <button
                    aria-label="Retirer le filtre d’étape"
                    onClick={() => setStage(null)}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              {!filtered.length && (
                <section className="empty">
                  <Search size={30} />
                  <h2>Aucun dossier dans ce périmètre</h2>
                  <p>Essayez une autre période ou retirez un filtre.</p>
                  <button className="button" onClick={reset}>
                    Réinitialiser les filtres
                  </button>
                </section>
              )}
            </>
          )}
          {tab === "overview" && filtered.length > 0 && (
            <>
              <div className="metrics">
                <Metric
                  label="Dossiers explorés"
                  value={n(stats.count)}
                  detail={`${n(stats.applicationEvents)} états métier`}
                  icon={FileStack}
                />
                <Metric
                  label="Délai médian"
                  value={d(stats.median)}
                  unit="jours"
                  detail={`${n(stats.completed)} dossiers à issue connue`}
                  icon={Clock3}
                  tone="mint"
                />
                <Metric
                  label="90 % des dossiers sous"
                  value={d(stats.p90)}
                  unit="jours"
                  detail="90e percentile des dossiers terminés"
                  icon={Layers3}
                  tone="peach"
                />
                <Metric
                  label="Nouvelle vérification"
                  value={d((100 * stats.rework) / stats.count)}
                  unit="%"
                  detail={`${n(stats.rework)} dossiers revérifiés`}
                  icon={RotateCcw}
                  tone="lavender"
                />
              </div>
              <div className="process-grid">
                <ProcessGraph
                  stats={stats}
                  labels={data.labels}
                  selected={stage}
                  onSelect={setStage}
                />
                <aside className="insight-column">
                  <section className="insight-card">
                    <div className="insight-icon">
                      <Sparkles size={20} />
                    </div>
                    <span className="eyebrow">POINT D’ATTENTION</span>
                    <h3>Le délai se cache entre les étapes.</h3>
                    {stats.edges.length > 0 && (
                      <>
                        <p>
                          Parmi les transitions les plus fréquentes,{" "}
                          <strong>
                            {
                              data.labels[
                                [...stats.edges.slice(0, 12)].sort(
                                  (a, b) => b.median - a.median,
                                )[0].from
                              ]
                            }{" "}
                            →{" "}
                            {
                              data.labels[
                                [...stats.edges.slice(0, 12)].sort(
                                  (a, b) => b.median - a.median,
                                )[0].to
                              ]
                            }
                          </strong>{" "}
                          présente le délai médian le plus long.
                        </p>
                        <div className="insight-number">
                          {d(
                            [...stats.edges.slice(0, 12)].sort(
                              (a, b) => b.median - a.median,
                            )[0].median,
                          )}
                          <span> jours</span>
                        </div>
                      </>
                    )}
                    <button onClick={() => navigate("simulation")}>
                      Tester une hypothèse <ArrowRight size={16} />
                    </button>
                    <small>
                      Temps écoulé observé, pas une cause identifiée.
                    </small>
                  </section>
                  <section className="panel outcomes">
                    <div className="panel-heading compact">
                      <h3>Les issues du parcours</h3>
                      <CircleCheck size={16} />
                    </div>
                    <div className="outcome-strip">
                      {Object.keys(statusLabels).map((s) => (
                        <i
                          key={s}
                          style={{
                            width: `${(100 * (stats.statuses[s] || 0)) / stats.count}%`,
                            background: statusColors[s],
                          }}
                        />
                      ))}
                    </div>
                    {Object.entries(statusLabels).map(([s, l]) => (
                      <button
                        key={s}
                        onClick={() => setStatus(status === s ? "all" : s)}
                        className="outcome-row"
                      >
                        <i style={{ background: statusColors[s] }} />
                        <span>{l}</span>
                        <strong>{n(stats.statuses[s] || 0)}</strong>
                        <small>
                          {d((100 * (stats.statuses[s] || 0)) / stats.count)} %
                        </small>
                      </button>
                    ))}
                  </section>
                </aside>
              </div>
              <div className="two-columns">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">LA PERSPECTIVE TEMPORELLE</span>
                      <h2>Des délais qui évoluent</h2>
                    </div>
                    <span className="pill">Médiane · jours</span>
                  </div>
                  <CohortChart months={stats.months} />
                  <p className="chart-note">
                    Cohortes par mois de création. Dossiers terminés seulement ;
                    les cohortes récentes peuvent rester censurées.
                  </p>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">LES CHEMINS EMPRUNTÉS</span>
                      <h2>Parcours les plus fréquents</h2>
                    </div>
                    <button
                      className="icon-button"
                      onClick={() => navigate("journeys")}
                      aria-label="Voir tous les parcours"
                    >
                      <ArrowUpRight size={20} />
                    </button>
                  </div>
                  <VariantList
                    variants={stats.variants}
                    total={stats.count}
                    labels={data.labels}
                    onChoose={chooseVariant}
                  />
                </section>
              </div>
              <section className="panel distribution-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">AU-DELÀ D’UNE MOYENNE</span>
                    <h2>La distribution des délais</h2>
                  </div>
                  <span className="pill">
                    {n(stats.completed)} dossiers terminés
                  </span>
                </div>
                <Distribution bars={stats.histogram} />
              </section>
            </>
          )}
          {tab === "journeys" && filtered.length > 0 && (
            <>
              <div className="journey-summary">
                <div>
                  <strong>{n(stats.variants.length)}</strong>
                  <span>variantes observées</span>
                </div>
                <div>
                  <strong>
                    {d((100 * (stats.variants[0]?.count || 0)) / stats.count)} %
                  </strong>
                  <span>sur le parcours principal</span>
                </div>
                <div>
                  <strong>{d(stats.p90)} j</strong>
                  <span>au 90e percentile</span>
                </div>
                <p>
                  Les variantes conservent l’ordre exact des états, y compris
                  les retours.
                </p>
              </div>
              <div className="two-columns journey-panels">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Les six premiers parcours</h2>
                    <GitBranch size={18} />
                  </div>
                  <VariantList
                    variants={stats.variants}
                    total={stats.count}
                    labels={data.labels}
                    onChoose={chooseVariant}
                    limit={6}
                  />
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Les délais, dans le détail</h2>
                    <Clock3 size={18} />
                  </div>
                  <Distribution bars={stats.histogram} />
                  <div className="method-callout">
                    <Info size={18} />
                    <p>
                      Un délai long ne prouve pas un dysfonctionnement. Le
                      journal ne distingue pas systématiquement attente client
                      et traitement interne.
                    </p>
                  </div>
                </section>
              </div>
              <section className="panel table-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">EXPLORATEUR DE DOSSIERS</span>
                    <h2>Un parcours à la fois</h2>
                  </div>
                  <span className="pill">{n(table.length)} résultats</span>
                </div>
                <div className="table-controls">
                  <label className="search">
                    <Search size={16} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher un dossier FL-…"
                      aria-label="Rechercher un dossier"
                    />
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    aria-label="Trier les dossiers"
                  >
                    <option value="start-desc">Les plus récents</option>
                    <option value="duration-desc">Délai décroissant</option>
                    <option value="duration-asc">Délai croissant</option>
                  </select>
                  {variant && (
                    <button
                      className="filter-chip"
                      onClick={() => setVariant("")}
                    >
                      Parcours sélectionné <X size={13} />
                    </button>
                  )}
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Dossier</th>
                        <th>Création</th>
                        <th>Type de demande</th>
                        <th>Issue observée</th>
                        <th>Délai</th>
                        <th>États</th>
                        <th>
                          <span className="sr-only">Détails</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.slice(page * 12, (page + 1) * 12).map((c) => (
                        <tr key={c.id}>
                          <td>
                            <button
                              className="case-link"
                              onClick={() => setDetail(c)}
                            >
                              {c.id}
                            </button>
                          </td>
                          <td>{date(c.start)}</td>
                          <td>
                            {c.type === "New credit"
                              ? "Nouveau crédit"
                              : c.type === "Limit raise"
                                ? "Relèvement de plafond"
                                : c.type}
                          </td>
                          <td>
                            <span
                              className="status"
                              style={{ "--status": statusColors[c.status] }}
                            >
                              {statusLabels[c.status]}
                            </span>
                          </td>
                          <td>
                            <strong>{d(c.duration)} j</strong>
                          </td>
                          <td>{c.events.length}</td>
                          <td>
                            <button
                              className="icon-button"
                              onClick={() => setDetail(c)}
                              aria-label={`Ouvrir ${c.id}`}
                            >
                              <ArrowUpRight size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {table.length === 0 && (
                    <div className="empty small-empty">
                      <Search size={26} />
                      <h3>Aucun dossier trouvé</h3>
                      <p>
                        Modifiez l’identifiant ou retirez le filtre de parcours.
                      </p>
                    </div>
                  )}
                </div>
                <div className="pagination">
                  <span>
                    {table.length
                      ? `${n(page * 12 + 1)}–${n(Math.min((page + 1) * 12, table.length))}`
                      : "0"}{" "}
                    sur {n(table.length)}
                  </span>
                  <div>
                    <button
                      className="button small"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                      aria-label="Page précédente"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span>
                      Page {page + 1} /{" "}
                      {Math.max(1, Math.ceil(table.length / 12))}
                    </span>
                    <button
                      className="button small"
                      disabled={(page + 1) * 12 >= table.length}
                      onClick={() => setPage(page + 1)}
                      aria-label="Page suivante"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
          {tab === "simulation" && filtered.length > 0 && (
            <>
              <div className="scenario-notice">
                <SlidersHorizontal size={19} />
                <p>
                  <strong>Un scénario, pas une promesse.</strong> Nous réduisons
                  mathématiquement les intervalles après une étape, sans
                  supposer qu’une action réelle pourrait produire cet effet.
                </p>
              </div>
              <div className="simulation-layout">
                <section className="panel scenario-controls">
                  <span className="eyebrow">VOTRE HYPOTHÈSE</span>
                  <h2>Changez un paramètre.</h2>
                  <p className="subtext">
                    Le parcours et les issues restent identiques. Seule une part
                    du temps écoulé est retranchée.
                  </p>
                  <label className="field-label">
                    Intervalles après l’étape
                    <select
                      aria-label="Étape du scénario"
                      value={scenarioStage}
                      onChange={(e) => setScenarioStage(Number(e.target.value))}
                    >
                      {data.labels.slice(0, 7).map((l, i) => (
                        <option value={i} key={i}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="range-heading">
                    <label htmlFor="reduction">Réduction hypothétique</label>
                    <strong>
                      {reduction}
                      <span> %</span>
                    </strong>
                  </div>
                  <input
                    id="reduction"
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={reduction}
                    onChange={(e) => setReduction(Number(e.target.value))}
                  />
                  <div className="range-labels">
                    <span>0 % · statu quo</span>
                    <span>80 %</span>
                  </div>
                  <div className="scenario-formula">
                    <span>POUR CHAQUE DOSSIER TERMINÉ</span>
                    <p>
                      Délai simulé = délai observé − {reduction} % des
                      intervalles après « {data.labels[scenarioStage]} ».
                    </p>
                  </div>
                  <button
                    className="button"
                    onClick={() => {
                      setReduction(25);
                      setScenarioStage(4);
                    }}
                  >
                    <RotateCcw size={15} /> Réinitialiser l’hypothèse
                  </button>
                </section>
                <div>
                  <div className="scenario-results">
                    <article>
                      <span>Médiane observée</span>
                      <strong>
                        {d(scenario.before)}
                        <small> j</small>
                      </strong>
                      <p>{n(scenario.count)} dossiers terminés</p>
                    </article>
                    <ArrowRight size={24} />
                    <article className="simulated">
                      <span>Médiane du scénario</span>
                      <strong>
                        {d(scenario.after)}
                        <small> j</small>
                      </strong>
                      <p>{n(scenario.affected)} dossiers concernés</p>
                    </article>
                  </div>
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <span className="eyebrow">AVANT / SCÉNARIO</span>
                        <h2>Le déplacement de la distribution</h2>
                      </div>
                    </div>
                    <div className="legend">
                      <span>
                        <i className="legend-dot purple" /> Observé
                      </span>
                      <span>
                        <i className="legend-dot mint" /> Scénario
                      </span>
                    </div>
                    <Distribution
                      bars={scenario.oldHistogram}
                      secondary={scenario.histogram}
                    />
                    <p className="chart-note">
                      Les effets de capacité, coûts, ressources et délais
                      incompressibles ne sont pas modélisés. Les dossiers sans
                      issue connue sont exclus.
                    </p>
                  </section>
                  <button
                    className="text-button scenario-export"
                    onClick={() => {
                      download("flowlens-scenario.csv", [
                        [
                          "Étape",
                          "Réduction %",
                          "Dossiers terminés",
                          "Dossiers concernés",
                          "Médiane observée jours",
                          "Médiane scénario jours",
                        ],
                        [
                          data.labels[scenarioStage],
                          reduction,
                          scenario.count,
                          scenario.affected,
                          scenario.before,
                          scenario.after,
                        ],
                      ]);
                      setToast("Hypothèse et résultats exportés");
                    }}
                  >
                    <Download size={15} /> Exporter ce scénario
                  </button>
                </div>
              </div>
            </>
          )}
          {tab === "method" && (
            <>
              <div className="method-hero">
                <div className="method-icon">
                  <Database size={30} />
                </div>
                <div>
                  <span className="eyebrow">UNE SOURCE, UNE TRAÇABILITÉ</span>
                  <h2>BPI Challenge 2017</h2>
                  <p>
                    Journal d’événements d’un processus de demandes de prêt d’un
                    établissement financier néerlandais. Créations en 2016,
                    observations jusqu’au 1er février 2017.
                  </p>
                  <a href={manifest.doi} target="_blank" rel="noreferrer">
                    Consulter la source 4TU <ExternalLink size={15} />
                  </a>
                </div>
                <div className="method-volume">
                  <strong>{n(manifest.cases)}</strong>
                  <span>dossiers complets dans l’export</span>
                  <strong>{n(manifest.quality.rawEvents)}</strong>
                  <span>événements dans le journal source</span>
                </div>
              </div>
              <div className="two-columns">
                <section className="panel prose">
                  <span className="eyebrow">DU JOURNAL À L’INTERFACE</span>
                  <h2>Une chaîne vérifiable</h2>
                  <ol className="pipeline-steps">
                    <li>
                      <span>01</span>
                      <div>
                        <strong>Collecter & identifier</strong>
                        <p>
                          Source XES compressée officielle. Empreinte SHA-256 et
                          cardinalités contrôlées.
                        </p>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>Projeter les états métier</strong>
                        <p>
                          {n(manifest.quality.applicationEvents)} événements
                          Application conservés. Les événements Offer et
                          Workflow restent hors de la vue.
                        </p>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>Calculer & conserver</strong>
                        <p>
                          Ordre stable des événements, durées calendaires, SQL
                          analytique et export JSON des {n(manifest.cases)}{" "}
                          dossiers.
                        </p>
                      </div>
                    </li>
                    <li>
                      <span>04</span>
                      <div>
                        <strong>Explorer localement</strong>
                        <p>
                          Les filtres recalculent les indicateurs dans le
                          navigateur. Aucun suivi personnel ni serveur métier
                          nécessaire.
                        </p>
                      </div>
                    </li>
                  </ol>
                </section>
                <section className="panel prose">
                  <span className="eyebrow">CE QUE LES CHIFFRES DISENT</span>
                  <h2>Définitions & limites</h2>
                  <dl>
                    <dt>Délai médian et 90e percentile</dt>
                    <dd>
                      Temps entre premier et dernier état Application, sur les
                      dossiers dont le dernier état est A_Pending, A_Denied ou
                      A_Cancelled. Quantiles interpolés.
                    </dd>
                    <dt>« À financer »</dt>
                    <dd>
                      Traduction de A_Pending, un état du dossier après
                      acceptation. Ce n’est pas une preuve de décaissement
                      effectif.
                    </dd>
                    <dt>Nouvelle vérification</dt>
                    <dd>
                      Plus d’un passage par A_Validating. Cet indicateur décrit
                      une boucle ; il ne mesure pas une erreur.
                    </dd>
                    <dt>Dossiers non résolus</dt>
                    <dd>
                      {n(manifest.statusCounts.open)} dossiers exclus des
                      indicateurs de délai terminé. Les cohortes récentes
                      restent exposées à un biais de censure.
                    </dd>
                    <dt>Temps entre états</dt>
                    <dd>
                      Il mélange attente et traitement. Le graphe n’est pas une
                      cartographie causale et sa projection masque les activités
                      intermédiaires.
                    </dd>
                  </dl>
                </section>
              </div>
              <section className="panel provenance">
                <div className="panel-heading">
                  <h2>Contrôles de la source</h2>
                  <span className="verified">
                    <Check size={14} /> Contrôles exécutés
                  </span>
                </div>
                <div className="quality-grid">
                  <div>
                    <strong>{n(manifest.quality.duplicatesRemoved)}</strong>
                    <span>doublon exact retiré</span>
                  </div>
                  <div>
                    <strong>{n(manifest.quality.reorderedTraces)}</strong>
                    <span>trace réordonnée</span>
                  </div>
                  <div>
                    <strong>{n(manifest.quality.unknownStates)}</strong>
                    <span>état Application inconnu</span>
                  </div>
                  <div>
                    <strong>{d(manifest.sourceBytes / 1e6)} Mo</strong>
                    <span>fichier source compressé</span>
                  </div>
                </div>
                <div className="checksum">
                  <span>SHA-256 DU FICHIER SOURCE</span>
                  <code>{manifest.sha256}</code>
                </div>
                <p className="chart-note">
                  {manifest.citation} Licence :{" "}
                  <a
                    href={manifest.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {manifest.license}
                  </a>
                  . Les identifiants publiés sont remplacés ; aucun montant,
                  score de crédit ni identifiant d’employé n’est diffusé dans
                  l’application.
                </p>
              </section>
              <section className="reproduce">
                <div>
                  <GitBranch size={22} />
                  <div>
                    <h3>Comprendre, reproduire, prolonger.</h3>
                    <p>
                      Pipeline Python, requêtes SQL, tests et décisions de
                      conception sont documentés.
                    </p>
                  </div>
                </div>
                <a
                  className="button primary"
                  href="https://github.com/Badreddine05/flowlens"
                  target="_blank"
                  rel="noreferrer"
                >
                  Explorer le dépôt <ArrowUpRight size={17} />
                </a>
              </section>
            </>
          )}
          <footer className="footer">
            <span>
              <Workflow size={15} /> FlowLens · Badreddine Channoufi
            </span>
            <span>BPI Challenge 2017 · Données historiques 2016–2017</span>
            <button className="text-button" onClick={() => navigate("method")}>
              Sources & méthode <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      {detail && (
        <Timeline
          item={detail}
          labels={data.labels}
          onClose={() => setDetail(null)}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
