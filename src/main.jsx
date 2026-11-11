import "./tokens.css";
import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Pause,
  Play,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  aggregate,
  selectCases,
  simulate,
  statusLabels,
  csvRows,
} from "./analytics.mjs";
import "./styles.css";

const number = new Intl.NumberFormat("fr-FR");
const dec = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
// fr-FR groups thousands with U+202F, which IBM Plex Sans draws almost
// zero-width; a regular no-break space keeps "17 228" legible.
const spaced = (s) => s.replace(/ /g, " ");
const n = (v) => spaced(number.format(v ?? 0));
const d = (v) =>
  v === null || v === undefined ? "—" : spaced(dec.format(v));
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
const typeLabel = (t) =>
  t === "New credit"
    ? "Nouveau crédit"
    : t === "Limit raise"
      ? "Relèvement de plafond"
      : t;
const navItems = [
  ["overview", "Vue d’ensemble"],
  ["journeys", "Parcours et dossiers"],
  ["simulation", "Laboratoire"],
  ["method", "Données et méthode"],
];
const pageHeads = {
  overview: (m) => [
    "Demandes de prêt, BPI Challenge 2017",
    `Parcours de ${n(m.cases)} demandes créées en 2016 et observées jusqu’au 1er février 2017. Les filtres recalculent chaque figure dans le navigateur.`,
  ],
  journeys: () => [
    "Variantes et dossiers",
    "Une variante est la suite exacte des états d’un dossier, retours compris. Le tableau ouvre la chronologie de chaque dossier, en UTC.",
  ],
  simulation: () => [
    "Scénario de réduction des délais",
    "Effet arithmétique d’une réduction des intervalles qui suivent une étape, calculé dossier par dossier sur les dossiers terminés du périmètre.",
  ],
  method: () => [
    "Données et méthode",
    "Origine du journal, contrôles de la source, définitions des indicateurs et limites d’interprétation.",
  ],
};
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
const NODE_W = 140;
const NODE_H = 60;
const terminalStatus = { 7: "pending", 8: "denied", 9: "cancelled" };

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

/* Theme: absent key = follow the system; "light" | "dark" = forced. */
const THEME_KEY = "bc-theme";
const themeNames = { auto: "automatique", light: "clair", dark: "sombre" };
const themeShort = { auto: "Auto", light: "Clair", dark: "Sombre" };
const nextTheme = { auto: "light", light: "dark", dark: "auto" };
function readTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}
function storeTheme(t) {
  try {
    if (t === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
}
function applyTheme(t) {
  const root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    const scheme = m.getAttribute("data-scheme");
    m.setAttribute(
      "media",
      t === "auto"
        ? `(prefers-color-scheme: ${scheme})`
        : scheme === t
          ? "all"
          : "not all",
    );
  });
}

function ThemeIcon({ mode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        fill={mode === "dark" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      />
      {mode === "auto" && <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />}
    </svg>
  );
}

function ThemeButton() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  const next = nextTheme[theme];
  return (
    <button
      type="button"
      className="theme-button"
      onClick={() => {
        storeTheme(next);
        setTheme(next);
      }}
      aria-label={`Thème ${themeNames[theme]}. Passer au thème ${themeNames[next]}.`}
      title={`Thème : ${themeNames[theme]}`}
    >
      <ThemeIcon mode={theme} />
      <span className="theme-label" aria-hidden="true">
        {themeShort[theme]}
      </span>
    </button>
  );
}

function Mark({ size = 22 }) {
  return (
    <svg
      className="mark"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12H6" />
      <path d="M6 12C8 7.6 9.8 6 12 6s4 1.6 6 6" />
      <path d="M6 12c2 4.4 3.8 6 6 6s4-1.6 6-6" />
      <path d="M18 12h3.5" />
      <circle cx="12" cy="6" r="2.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ExternalArrow() {
  return (
    <svg
      className="glyph"
      viewBox="0 0 12 12"
      width="11"
      height="11"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg
      className="glyph"
      viewBox="0 0 12 12"
      width="12"
      height="12"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6h8M7 3l3 3-3 3" />
    </svg>
  );
}

/* Rounded axis bounds (1, 2, 2.5, 5 × 10^k) so tick labels stay readable. */
function niceScale(max, { count = 4, integer = false } = {}) {
  if (!(max > 0)) return { top: 1, ticks: [0, 1] };
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const mults = integer && mag < 10 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  let step = mults.map((m) => m * mag).find((s) => s >= raw - 1e-12);
  if (integer) step = Math.max(1, step);
  const top = Math.max(step, Math.ceil(max / step - 1e-9) * step);
  const ticks = [];
  for (let v = 0; v <= top + step / 1e6; v += step)
    ticks.push(Math.round(v * 1e6) / 1e6);
  return { top, ticks };
}

function useElementWidth(fallback = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () =>
      setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function Figure({ label, value, unit, detail }) {
  return (
    <div className="figure">
      <dt>{label}</dt>
      <dd className="figure-value" key={String(value)}>
        {value}
        {unit && <span className="figure-unit">{unit}</span>}
      </dd>
      {detail && <dd className="figure-detail">{detail}</dd>}
    </div>
  );
}

function Select({ className = "", ...props }) {
  return (
    <span className={`select ${className}`}>
      <select {...props} />
    </span>
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
  const hw = NODE_W / 2,
    hh = NODE_H / 2;
  // Edges leave a node's border and stop 9 units before the target's border,
  // where the 8-unit arrowhead takes over.
  const edgePath = (e) => {
    const [x1, y1] = positions[e.from],
      [x2, y2] = positions[e.to];
    if (e.from === e.to)
      return `M ${x1 - 20},${y1 - hh} C ${x1 - 85},${y1 - hh - 80} ${x1 + 85},${y1 - hh - 80} ${x1 + 20},${y1 - hh - 9}`;
    const dx = x2 - x1;
    if (dx === 0) {
      // Stacked nodes: straight connector, one lane per direction.
      const dir = y2 > y1 ? 1 : -1,
        lane = dir > 0 ? -16 : 16;
      return `M ${x1 + lane},${y1 + dir * hh} L ${x2 + lane},${y2 - dir * (hh + 9)}`;
    }
    const side = dx > 0 ? 1 : -1;
    const sy = y1 + (y2 - y1) * 0.08,
      ty = y2 - (y2 - y1) * 0.08,
      sx = x1 + side * hw,
      ex = x2 - side * (hw + 9),
      k = Math.max(0, (ex - sx) * side) * 0.5;
    return `M ${sx},${sy} C ${sx + side * k},${sy} ${ex - side * k},${ty} ${ex},${ty}`;
  };
  return (
    <section className="panel block graph-panel" aria-labelledby="fig-graph">
      <header className="panel-head">
        <div>
          <span className="fig-label">Fig. 1</span>
          <h2 id="fig-graph" className="panel-title">
            Transitions entre états de la demande
          </h2>
          <p className="panel-desc">
            Cliquez sur une étape pour explorer les dossiers qui y sont passés.
          </p>
        </div>
        <button
          type="button"
          className={`button ${playing ? "is-on" : ""}`}
          disabled={reduced}
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Mettre les flux en pause" : "Animer les flux"}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
          {playing ? "Pause" : "Animer"}
        </button>
      </header>
      <p className="graph-hint" aria-hidden="true">
        Faire défiler le graphe horizontalement
        <ArrowGlyph />
      </p>
      <div className="graph-scroll">
        <svg
          className={`process-svg ${playing && !reduced ? "is-playing" : ""}`}
          viewBox="-10 28 1120 404"
          role="group"
          aria-label="Graphe des transitions entre états des demandes de prêt"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 8 8"
              markerWidth="8"
              markerHeight="8"
              refX="0"
              refY="4"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0.6 L8,4 L0,7.4 Z" className="arrow-head" />
            </marker>
            <marker
              id="arrow-return"
              viewBox="0 0 8 8"
              markerWidth="8"
              markerHeight="8"
              refX="0"
              refY="4"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0.6 L8,4 L0,7.4 Z" className="arrow-head is-return" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const isReturn = e.from === 6;
            const dim = !(
              selected === null ||
              e.from === selected ||
              e.to === selected
            );
            return (
              <g
                key={`${e.from}-${e.to}`}
                className={`edge-group ${isReturn ? "is-return" : ""} ${dim ? "is-dim" : ""}`}
              >
                <path
                  id={`edge-${e.from}-${e.to}`}
                  className="edge"
                  d={edgePath(e)}
                  strokeWidth={1.2 + (3.8 * e.count) / max}
                  markerEnd={`url(#${isReturn ? "arrow-return" : "arrow"})`}
                >
                  <title>
                    {labels[e.from]} → {labels[e.to]} : {n(e.count)} transitions ;
                    délai médian {d(e.median)} j
                  </title>
                </path>
                {playing && !reduced && (
                  <circle r="3.5" className="flow-dot">
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
            );
          })}
          {positions.map(([x, y], i) => {
            const count = stats.stages.get(i),
              inactive = !count,
              terminal = i >= 7;
            return (
              <g
                key={i}
                className={`process-node ${selected === i ? "active" : ""} ${inactive ? "inactive" : ""} ${terminal ? "terminal" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={selected === i}
                aria-label={`${labels[i]}, ${n(count)} dossiers. Filtrer.`}
                onClick={() => onSelect(selected === i ? null : i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(selected === i ? null : i);
                  }
                }}
                transform={`translate(${x},${y})`}
              >
                <rect
                  className="node-focus"
                  x={-hw - 4}
                  y={-hh - 4}
                  width={NODE_W + 8}
                  height={NODE_H + 8}
                  rx="5"
                />
                <rect
                  className="node-box"
                  x={-hw}
                  y={-hh}
                  width={NODE_W}
                  height={NODE_H}
                  rx="3"
                />
                {terminal && (
                  <rect
                    className={`node-swatch status-${terminalStatus[i]}`}
                    x={hw - 15}
                    y={-hh + 9}
                    width="7"
                    height="7"
                    rx="1"
                  />
                )}
                <text className="node-label" x="0" y="-3" textAnchor="middle">
                  {labels[i]}
                </text>
                <text className="node-number" x="0" y="17" textAnchor="middle">
                  {n(count)}
                </text>
                <title>
                  {labels[i]} : {n(count)} dossiers distincts
                </title>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="graph-foot">
        <div className="legend">
          <span>
            <svg className="legend-mark" viewBox="0 0 24 8" aria-hidden="true">
              <line x1="1" y1="4" x2="23" y2="4" className="legend-line" />
            </svg>
            Volume des transitions
          </span>
          <span>
            <svg className="legend-mark" viewBox="0 0 24 8" aria-hidden="true">
              <line
                x1="1"
                y1="4"
                x2="23"
                y2="4"
                className="legend-line is-return"
              />
            </svg>
            Retour pour pièces
          </span>
        </div>
        <button type="button" className="text-link" onClick={() => setAll(!all)}>
          {all ? "Simplifier le graphe" : "Toutes les transitions"}
          <ArrowGlyph />
        </button>
      </div>
      <p className="note">
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
  const { top, ticks } = niceScale(max, { integer: true });
  return (
    <div
      className={`distribution ${secondary ? "is-compared" : ""}`}
      role="img"
      aria-label={`Distribution des délais des dossiers terminés en jours. ${bars.map((b, i) => `${b.label} jours : ${n(b.count)} dossiers${secondary ? `, scénario ${n(secondary[i].count)}` : ""}`).join(". ")}`}
    >
      <div className="dist-body">
        <div className="dist-grid" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="dist-tick" style={{ "--t": t / top }}>
              <em>{n(t)}</em>
            </span>
          ))}
        </div>
        <div className="dist-rows">
          {bars.map((b, i) => (
            <div className="dist-row" key={b.label}>
              <span className="dist-label">{b.label}</span>
              <div className="dist-track">
                <div className="bar primary" style={{ "--v": b.count / top }}>
                  <span className="bar-tip">
                    {b.label} j : {n(b.count)} dossiers
                  </span>
                </div>
                {secondary && (
                  <div
                    className="bar secondary"
                    style={{ "--v": secondary[i].count / top }}
                  >
                    <span className="bar-tip">
                      Scénario : {n(secondary[i].count)}
                    </span>
                  </div>
                )}
              </div>
              {!secondary && <span className="dist-value">{n(b.count)}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="axis-note">Délai calendaire en jours</div>
    </div>
  );
}

function CohortChart({ months }) {
  const [ref, width] = useElementWidth();
  const observed = months.filter((m) => Number.isFinite(m.median));
  const H = 232,
    top = 14,
    bottom = 198,
    left = 44,
    right = 8,
    pad = 18;
  const { top: yMax, ticks } = niceScale(
    Math.max(1, ...observed.map((m) => m.median)),
    { count: 3 },
  );
  const span = width - left - right - 2 * pad;
  const x = (i) =>
    months.length === 1
      ? left + pad + span / 2
      : left + pad + (i * span) / (months.length - 1);
  const y = (v) => bottom - (v / yMax) * (bottom - top);
  const every = span / Math.max(1, months.length) < 44 ? 2 : 1;
  let previous = false;
  const path = months
    .map((m, i) => {
      if (!Number.isFinite(m.median)) {
        previous = false;
        return "";
      }
      const segment = `${previous ? "L" : "M"}${x(i)},${y(m.median)}`;
      previous = true;
      return segment;
    })
    .join(" ");
  return (
    <div className="cohort" ref={ref}>
      {!observed.length ? (
        <div className="chart-empty">
          <strong>Aucun dossier terminé</strong>
          <p>La médiane n’est pas définie pour ce périmètre.</p>
        </div>
      ) : (
        <svg
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          className="cohort-chart"
          role="img"
          aria-label={`Délai médian des dossiers terminés par mois de création. ${months.map((m) => `${monthLabel(m.month)} : ${Number.isFinite(m.median) ? `${d(m.median)} jours` : "aucun dossier terminé"}`).join(". ")}`}
        >
          {ticks.map((t) => (
            <g key={t} className="grid">
              <line
                className={t === 0 ? "base" : ""}
                x1={left}
                x2={width - right}
                y1={y(t)}
                y2={y(t)}
              />
              <text x={left - 8} y={y(t) + 4} textAnchor="end">
                {d(t)} j
              </text>
            </g>
          ))}
          <path d={path} className="cohort-line" />
          {months.map((m, i) => (
            <g key={m.month}>
              {Number.isFinite(m.median) && (
                <circle cx={x(i)} cy={y(m.median)} r="3.5" className="cohort-dot">
                  <title>
                    {monthLabel(m.month)} : {d(m.median)} j, {n(m.count)} dossiers
                  </title>
                </circle>
              )}
              {i % every === 0 && (
                <text textAnchor="middle" x={x(i)} y={H - 8}>
                  {new Date(m.month + "-15").toLocaleDateString("fr-FR", {
                    month: "short",
                  })}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

function VariantList({ variants, total, labels, onChoose, limit = 4 }) {
  const first = variants[0]?.count || 1;
  return (
    <ol className="variants">
      {variants.slice(0, limit).map((v, i) => (
        <li key={v.path.join("-")}>
          <button
            type="button"
            className="variant"
            onClick={() => onChoose(v.path.join("-"))}
          >
            <span className="variant-head">
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              <strong>{n(v.count)} dossiers</strong>
              <span className="variant-share">
                {d((100 * v.count) / (total || 1))} %
              </span>
              <span className="variant-time">médiane {d(v.median)} j</span>
            </span>
            <span className="variant-track" aria-hidden="true">
              <i style={{ width: `${(100 * v.count) / first}%` }} />
            </span>
            <span className="variant-path">
              {v.path.map((s, j) => (
                <React.Fragment key={j}>
                  {j > 0 && <ChevronRight size={12} aria-hidden="true" />}
                  <span>{labels[s]}</span>
                </React.Fragment>
              ))}
            </span>
          </button>
        </li>
      ))}
    </ol>
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
          <span className="drawer-kicker">Parcours individuel</span>
          <button
            type="button"
            id="close-detail"
            className="icon-button"
            onClick={onClose}
            aria-label="Fermer le détail"
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="drawer-title" className="drawer-id">
          {item.id}
        </h2>
        <div className="drawer-sub">
          <span className={`status status-${item.status}`}>
            <i className="swatch" aria-hidden="true" />
            {statusLabels[item.status]}
          </span>
          <span className="mono">{date(item.start)}</span>
        </div>
        <dl className="figures cols-2 drawer-figures">
          <Figure label="Délai observé" value={d(item.duration)} unit="jours" />
          <Figure label="États métier" value={item.events.length} />
        </dl>
        <p className="note">
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
        <p className="note">
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
    [toast, setToast] = useState("");
  const tabsRef = useRef(null);
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
  // Keep the active view visible in the horizontally scrolling tab row.
  useEffect(() => {
    const row = tabsRef.current;
    const active = row?.querySelector('[aria-current="page"]');
    if (!row || !active) return;
    const start = active.offsetLeft,
      end = start + active.offsetWidth;
    if (start < row.scrollLeft || end > row.scrollLeft + row.clientWidth)
      row.scrollTo({ left: Math.max(0, start - 16) });
  }, [tab]);
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
  const monthOptions = useMemo(
    () => (data ? [...new Set(data.cases.map((c) => c.month))].sort() : []),
    [data],
  );
  const typeOptions = useMemo(
    () => (data ? [...new Set(data.cases.map((c) => c.type))] : []),
    [data],
  );
  const slowest = useMemo(
    () =>
      [...stats.edges.slice(0, 12)].sort((a, b) => b.median - a.median)[0],
    [stats],
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
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  if (error)
    return (
      <main className="load-screen">
        <p className="load-brand">
          <Mark /> FlowLens
        </p>
        <h1>Données indisponibles</h1>
        <p>{error}</p>
        <button
          type="button"
          className="button primary"
          onClick={() => location.reload()}
        >
          Réessayer
        </button>
      </main>
    );
  if (!data)
    return (
      <main className="load-screen" aria-live="polite">
        <h1 className="load-brand">
          <Mark /> FlowLens
        </h1>
        <p>Lecture des parcours métier…</p>
        <span className="load-bar" aria-hidden="true" />
      </main>
    );
  const [title, lead] = pageHeads[tab](manifest);
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="brand-group">
            <a
              className="brand"
              href="./"
              onClick={(e) => {
                e.preventDefault();
                navigate("overview");
              }}
            >
              <Mark />
              <span>FlowLens</span>
            </a>
            <a className="author-link" href="../">
              Badreddine Channoufi
            </a>
          </div>
          <div className="site-links">
            <a className="case-study-link" href="../projets/flowlens/">
              Étude de cas
            </a>
            <a
              href="https://github.com/Badreddine05/flowlens"
              target="_blank"
              rel="noreferrer"
            >
              Code
              <ExternalArrow />
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
            <ThemeButton />
          </div>
        </div>
      </header>
      <div className="tabbar">
        <nav
          className="wrap tabs"
          aria-label="Navigation principale"
          ref={tabsRef}
        >
          {navItems.map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => navigate(key)}
              aria-current={tab === key ? "page" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      <main id="main" className="wrap" tabIndex={-1}>
        <section className="page-head">
          <div>
            <h1>{title}</h1>
            <p className="lead">{lead}</p>
          </div>
          {tab !== "method" && (
            <button type="button" className="button" onClick={exportCases}>
              <Download size={16} /> Exporter les dossiers
            </button>
          )}
        </section>
        {tab !== "method" && (
          <>
            <div
              className="toolbar"
              role="group"
              aria-label="Périmètre de l’analyse"
            >
              <span className="toolbar-label" aria-hidden="true">
                Périmètre
              </span>
              <Select
                className="wide"
                aria-label="Mois de création"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="all">Toute l’année 2016</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </Select>
              <Select
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
              </Select>
              <Select
                aria-label="Type de demande"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="all">Tous les types</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {typeLabel(t)}
                  </option>
                ))}
              </Select>
              {stage !== null && (
                <span className="chip">
                  Passage par : {data.labels[stage]}
                  <button
                    type="button"
                    aria-label="Retirer le filtre d’étape"
                    onClick={() => setStage(null)}
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
              <span className="toolbar-count">
                {n(filtered.length)} dossiers
              </span>
              {activeFilters && (
                <button type="button" className="text-link" onClick={reset}>
                  <RotateCcw size={14} /> Réinitialiser
                </button>
              )}
            </div>
            {!filtered.length && (
              <section className="empty">
                <h2>Aucun dossier dans ce périmètre</h2>
                <p>Essayez une autre période ou retirez un filtre.</p>
                <button type="button" className="button" onClick={reset}>
                  Réinitialiser les filtres
                </button>
              </section>
            )}
          </>
        )}
        {tab === "overview" && filtered.length > 0 && (
          <>
            <dl className="figures">
              <Figure
                label="Dossiers explorés"
                value={n(stats.count)}
                detail={`${n(stats.applicationEvents)} états métier`}
              />
              <Figure
                label="Délai médian"
                value={d(stats.median)}
                unit="jours"
                detail={`${n(stats.completed)} dossiers à issue connue`}
              />
              <Figure
                label="90 % des dossiers sous"
                value={d(stats.p90)}
                unit="jours"
                detail="90e percentile des dossiers terminés"
              />
              <Figure
                label="Nouvelle vérification"
                value={d((100 * stats.rework) / stats.count)}
                unit="%"
                detail={`${n(stats.rework)} dossiers revérifiés`}
              />
            </dl>
            <ProcessGraph
              stats={stats}
              labels={data.labels}
              selected={stage}
              onSelect={setStage}
            />
            <div className="row">
              <section className="panel" aria-labelledby="slowest-title">
                <h2 id="slowest-title" className="panel-title">
                  Délai médian le plus long
                </h2>
                {slowest && (
                  <>
                    <p className="panel-desc">
                      Parmi les transitions les plus fréquentes,{" "}
                      <strong className="transition-name">
                        {data.labels[slowest.from]}
                        <ArrowGlyph />
                        <span className="sr-only"> vers </span>
                        {data.labels[slowest.to]}
                      </strong>{" "}
                      présente le délai médian le plus long.
                    </p>
                    <p className="figure-value standalone" key={slowest.median}>
                      {d(slowest.median)}
                      <span className="figure-unit">jours</span>
                    </p>
                  </>
                )}
                <p className="note">
                  Temps écoulé observé, pas une cause identifiée.
                </p>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => navigate("simulation")}
                >
                  Tester une hypothèse
                  <ArrowGlyph />
                </button>
              </section>
              <section className="panel" aria-labelledby="outcomes-title">
                <h2 id="outcomes-title" className="panel-title">
                  Issue des dossiers
                </h2>
                <p className="panel-desc">
                  Dernier état observé. Cliquer sur une issue filtre le
                  périmètre.
                </p>
                <div className="outcome-strip" aria-hidden="true">
                  {Object.keys(statusLabels)
                    .filter((s) => stats.statuses[s])
                    .map((s) => (
                      <i
                        key={s}
                        className={`status-${s}`}
                        style={{
                          width: `${(100 * stats.statuses[s]) / stats.count}%`,
                        }}
                      />
                    ))}
                </div>
                <ul className="outcome-list">
                  {Object.entries(statusLabels).map(([s, l]) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => setStatus(status === s ? "all" : s)}
                        className={`outcome-row status-${s}`}
                        aria-pressed={status === s}
                      >
                        <i className="swatch" aria-hidden="true" />
                        <span>{l}</span>
                        <strong>{n(stats.statuses[s] || 0)}</strong>
                        <small>
                          {d((100 * (stats.statuses[s] || 0)) / stats.count)} %
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <div className="row">
              <section className="panel" aria-labelledby="fig-cohort">
                <header className="panel-head">
                  <div>
                    <span className="fig-label">Fig. 2</span>
                    <h2 id="fig-cohort" className="panel-title">
                      Délai médian par mois de création
                    </h2>
                    <p className="panel-desc">
                      Une cohorte regroupe les dossiers créés le même mois.
                    </p>
                  </div>
                </header>
                <CohortChart months={stats.months} />
                <p className="note">
                  Cohortes par mois de création. Dossiers terminés seulement ;
                  les cohortes récentes peuvent rester censurées.
                </p>
              </section>
              <section className="panel" aria-labelledby="top-variants">
                <header className="panel-head">
                  <div>
                    <h2 id="top-variants" className="panel-title">
                      Parcours les plus fréquents
                    </h2>
                    <p className="panel-desc">
                      Séquences exactes d’états. Un parcours ouvre la liste de
                      ses dossiers.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => navigate("journeys")}
                  >
                    Tous les parcours
                    <ArrowGlyph />
                  </button>
                </header>
                <VariantList
                  variants={stats.variants}
                  total={stats.count}
                  labels={data.labels}
                  onChoose={chooseVariant}
                />
              </section>
            </div>
            <section className="panel block" aria-labelledby="fig-dist">
              <header className="panel-head">
                <div>
                  <span className="fig-label">Fig. 3</span>
                  <h2 id="fig-dist" className="panel-title">
                    Distribution des délais
                  </h2>
                  <p className="panel-desc">
                    Nombre de dossiers terminés par tranche de délai.
                  </p>
                </div>
                <span className="meta">
                  {n(stats.completed)} dossiers terminés
                </span>
              </header>
              <Distribution bars={stats.histogram} />
            </section>
          </>
        )}
        {tab === "journeys" && filtered.length > 0 && (
          <>
            <dl className="figures">
              <Figure
                label="Variantes observées"
                value={n(stats.variants.length)}
              />
              <Figure
                label="Sur le parcours principal"
                value={d((100 * (stats.variants[0]?.count || 0)) / stats.count)}
                unit="%"
              />
              <Figure label="Au 90e percentile" value={d(stats.p90)} unit="jours" />
              <div className="figure figure-note">
                <dt>Lecture</dt>
                <dd>
                  Les variantes conservent l’ordre exact des états, y compris
                  les retours.
                </dd>
              </div>
            </dl>
            <div className="row">
              <section className="panel" aria-labelledby="journey-variants">
                <header className="panel-head">
                  <div>
                    <h2 id="journey-variants" className="panel-title">
                      Six parcours les plus fréquents
                    </h2>
                    <p className="panel-desc">
                      Cliquer sur un parcours filtre le tableau des dossiers.
                    </p>
                  </div>
                </header>
                <VariantList
                  variants={stats.variants}
                  total={stats.count}
                  labels={data.labels}
                  onChoose={chooseVariant}
                  limit={6}
                />
              </section>
              <section className="panel" aria-labelledby="journey-dist">
                <header className="panel-head">
                  <div>
                    <span className="fig-label">Fig. 1</span>
                    <h2 id="journey-dist" className="panel-title">
                      Distribution des délais
                    </h2>
                    <p className="panel-desc">
                      Nombre de dossiers terminés par tranche de délai.
                    </p>
                  </div>
                </header>
                <Distribution bars={stats.histogram} />
                <p className="margin-note">
                  <span>Lecture</span>
                  Un délai long ne prouve pas un dysfonctionnement. Le journal
                  ne distingue pas systématiquement attente client et
                  traitement interne.
                </p>
              </section>
            </div>
            <section className="panel block" aria-labelledby="cases-title">
              <header className="panel-head">
                <div>
                  <h2 id="cases-title" className="panel-title">
                    Dossiers du périmètre
                  </h2>
                  <p className="panel-desc">
                    Douze dossiers par page. Un identifiant ouvre la chronologie
                    du dossier.
                  </p>
                </div>
                <span className="meta">{n(table.length)} résultats</span>
              </header>
              <div className="table-controls">
                <label className="search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un dossier FL-…"
                    aria-label="Rechercher un dossier"
                  />
                </label>
                <Select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Trier les dossiers"
                >
                  <option value="start-desc">Les plus récents</option>
                  <option value="duration-desc">Délai décroissant</option>
                  <option value="duration-asc">Délai croissant</option>
                </Select>
                {variant && (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => setVariant("")}
                  >
                    Parcours sélectionné <X size={14} />
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
                      <th className="num">Délai</th>
                      <th className="num">États</th>
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
                            type="button"
                            className="case-link"
                            onClick={() => setDetail(c)}
                          >
                            {c.id}
                          </button>
                        </td>
                        <td className="mono">{date(c.start)}</td>
                        <td>{typeLabel(c.type)}</td>
                        <td>
                          <span className={`status status-${c.status}`}>
                            <i className="swatch" aria-hidden="true" />
                            {statusLabels[c.status]}
                          </span>
                        </td>
                        <td className="num">{d(c.duration)} j</td>
                        <td className="num">{c.events.length}</td>
                        <td className="row-action">
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => setDetail(c)}
                            aria-label={`Ouvrir ${c.id}`}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {table.length === 0 && (
                  <div className="empty small-empty">
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
                    type="button"
                    className="button"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                    aria-label="Page précédente"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>
                    Page {n(page + 1)} /{" "}
                    {n(Math.max(1, Math.ceil(table.length / 12)))}
                  </span>
                  <button
                    type="button"
                    className="button"
                    disabled={(page + 1) * 12 >= table.length}
                    onClick={() => setPage(page + 1)}
                    aria-label="Page suivante"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
        {tab === "simulation" && filtered.length > 0 && (
          <>
            <p className="margin-note notice">
              <span>Lecture</span>
              Les intervalles qui suivent l’étape choisie sont réduits
              mathématiquement, sans supposer qu’une action réelle pourrait
              produire cet effet. Le résultat n’est pas une prévision.
            </p>
            <div className="sim-layout">
              <section className="panel sim-controls" aria-labelledby="sim-title">
                <h2 id="sim-title" className="panel-title">
                  Hypothèse
                </h2>
                <p className="panel-desc">
                  Le parcours et les issues restent identiques. Seule une part
                  du temps écoulé est retranchée.
                </p>
                <label className="field">
                  <span className="field-label">Intervalles après l’étape</span>
                  <Select
                    aria-label="Étape du scénario"
                    value={scenarioStage}
                    onChange={(e) => setScenarioStage(Number(e.target.value))}
                  >
                    {data.labels.slice(0, 7).map((l, i) => (
                      <option value={i} key={i}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="range-head">
                  <label htmlFor="reduction" className="field-label">
                    Réduction hypothétique
                  </label>
                  <strong className="range-value">
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
                  aria-valuetext={`${reduction} %`}
                  onChange={(e) => setReduction(Number(e.target.value))}
                />
                <div className="range-labels">
                  <span>0 % · statu quo</span>
                  <span>80 %</span>
                </div>
                <div className="formula">
                  <span className="field-label">Pour chaque dossier terminé</span>
                  <p>
                    Délai simulé = délai observé − {reduction} % des
                    intervalles après « {data.labels[scenarioStage]} ».
                  </p>
                </div>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setReduction(25);
                    setScenarioStage(4);
                  }}
                >
                  <RotateCcw size={15} /> Réinitialiser l’hypothèse
                </button>
              </section>
              <div className="sim-results">
                <dl className="figures cols-2">
                  <Figure
                    label="Médiane observée"
                    value={d(scenario.before)}
                    unit="jours"
                    detail={`${n(scenario.count)} dossiers terminés`}
                  />
                  <Figure
                    label="Médiane du scénario"
                    value={d(scenario.after)}
                    unit="jours"
                    detail={`${n(scenario.affected)} dossiers concernés`}
                  />
                </dl>
                <section className="panel" aria-labelledby="fig-sim">
                  <header className="panel-head">
                    <div>
                      <span className="fig-label">Fig. 1</span>
                      <h2 id="fig-sim" className="panel-title">
                        Distribution observée et simulée
                      </h2>
                      <p className="panel-desc">
                        Dossiers terminés par tranche de délai, avant et après
                        l’hypothèse.
                      </p>
                    </div>
                  </header>
                  <div className="legend chart-legend">
                    <span>
                      <i className="legend-swatch is-observed" aria-hidden="true" />
                      Observé
                    </span>
                    <span>
                      <i className="legend-swatch" aria-hidden="true" />
                      Scénario
                    </span>
                  </div>
                  <Distribution
                    bars={scenario.oldHistogram}
                    secondary={scenario.histogram}
                  />
                  <p className="note">
                    Les effets de capacité, coûts, ressources et délais
                    incompressibles ne sont pas modélisés. Les dossiers sans
                    issue connue sont exclus.
                  </p>
                  <button
                    type="button"
                    className="button scenario-export"
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
                    <Download size={16} /> Exporter ce scénario
                  </button>
                </section>
              </div>
            </div>
          </>
        )}
        {tab === "method" && (
          <>
            <section className="method-source" aria-labelledby="source-title">
              <div>
                <h2 id="source-title" className="section-title">
                  BPI Challenge 2017
                </h2>
                <p className="source-text">
                  Journal d’événements d’un processus de demandes de prêt d’un
                  établissement financier néerlandais. Créations en 2016,
                  observations jusqu’au 1er février 2017.
                </p>
                <a
                  className="text-link"
                  href={manifest.doi}
                  target="_blank"
                  rel="noreferrer"
                >
                  Consulter la source 4TU
                  <ExternalArrow />
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              </div>
              <dl className="figures cols-2">
                <Figure
                  label="Dossiers complets dans l’export"
                  value={n(manifest.cases)}
                />
                <Figure
                  label="Événements dans le journal source"
                  value={n(manifest.quality.rawEvents)}
                />
              </dl>
            </section>
            <div className="row">
              <section className="panel" aria-labelledby="pipeline-title">
                <h2 id="pipeline-title" className="panel-title">
                  Du journal à l’interface
                </h2>
                <ol className="steps">
                  <li>
                    <span>01</span>
                    <div>
                      <strong>Collecter et identifier</strong>
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
                        Application conservés. Les événements Offer et Workflow
                        restent hors de la vue.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <strong>Calculer et conserver</strong>
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
              <section className="panel" aria-labelledby="defs-title">
                <h2 id="defs-title" className="panel-title">
                  Définitions et limites
                </h2>
                <dl className="defs">
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
                    indicateurs de délai terminé. Les cohortes récentes restent
                    exposées à un biais de censure.
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
            <section className="panel block" aria-labelledby="checks-title">
              <header className="panel-head">
                <div>
                  <h2 id="checks-title" className="panel-title">
                    Contrôles de la source
                  </h2>
                </div>
                <span className="meta verified">
                  <Check size={14} aria-hidden="true" /> Contrôles exécutés
                </span>
              </header>
              <dl className="figures plain">
                <Figure
                  label="Doublon exact retiré"
                  value={n(manifest.quality.duplicatesRemoved)}
                />
                <Figure
                  label="Trace réordonnée"
                  value={n(manifest.quality.reorderedTraces)}
                />
                <Figure
                  label="État Application inconnu"
                  value={n(manifest.quality.unknownStates)}
                />
                <Figure
                  label="Fichier source compressé"
                  value={d(manifest.sourceBytes / 1e6)}
                  unit="Mo"
                />
              </dl>
              <div className="checksum">
                <span className="field-label">SHA-256 du fichier source</span>
                <code>{manifest.sha256}</code>
              </div>
              <p className="note">
                {manifest.citation} Licence :{" "}
                <a href={manifest.licenseUrl} target="_blank" rel="noreferrer">
                  {manifest.license}
                </a>
                . Les identifiants publiés sont remplacés ; aucun montant, score
                de crédit ni identifiant d’employé n’est diffusé dans
                l’application.
              </p>
            </section>
            <section className="reproduce" aria-labelledby="repro-title">
              <div>
                <h2 id="repro-title" className="panel-title">
                  Reproduire l’analyse
                </h2>
                <p>
                  Pipeline Python, requêtes SQL, tests et décisions de
                  conception sont documentés dans le dépôt.
                </p>
              </div>
              <a
                className="button primary"
                href="https://github.com/Badreddine05/flowlens"
                target="_blank"
                rel="noreferrer"
              >
                Voir le dépôt
                <ExternalArrow />
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            </section>
          </>
        )}
        <footer className="footer">
          <span>
            FlowLens · <a href="../">Badreddine Channoufi</a> · projet personnel
          </span>
          <span>
            BPI Challenge 2017 · données historiques{" "}
            <span className="nowrap">2016–2017</span>
          </span>
          <span className="footer-links">
            <a className="text-link" href="../projets/flowlens/">
              Étude de cas
            </a>
            <button
              type="button"
              className="text-link"
              onClick={() => navigate("method")}
            >
              Sources et méthode
            </button>
          </span>
        </footer>
      </main>
      {detail && (
        <Timeline
          item={detail}
          labels={data.labels}
          onClose={() => setDetail(null)}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} aria-hidden="true" />
          {toast}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
