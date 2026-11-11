export const DAY = 86400;
export const statusLabels = {
  pending: "À financer",
  denied: "Refusé",
  cancelled: "Annulé",
  open: "Non résolu",
};
export const statusColors = {
  pending: "#389a87",
  denied: "#d67778",
  cancelled: "#9d8cbb",
  open: "#b98940",
};
export function quantile(values, p) {
  if (!values.length) return null;
  const a = [...values].sort((x, y) => x - y),
    at = (a.length - 1) * p,
    low = Math.floor(at);
  return a[low] + (a[Math.ceil(at)] - a[low]) * (at - low);
}
export function selectCases(
  cases,
  { month = "all", status = "all", type = "all", stage = null } = {},
) {
  return cases.filter(
    (c) =>
      (month === "all" || c.month === month) &&
      (status === "all" || c.status === status) &&
      (type === "all" || c.type === type) &&
      (stage === null || c.events.some((e) => e[0] === stage)),
  );
}
export function aggregate(cases) {
  const complete = cases.filter((c) => c.status !== "open");
  const durations = complete.map((c) => c.duration),
    statuses = {},
    edges = new Map(),
    stages = new Map(),
    variants = new Map(),
    months = new Map();
  let rework = 0;
  for (const c of cases) {
    statuses[c.status] = (statuses[c.status] || 0) + 1;
    if (c.events.filter((e) => e[0] === 5).length > 1) rework++;
    const path = c.events.map((e) => e[0]).join("-");
    const v = variants.get(path) || {
      path: c.events.map((e) => e[0]),
      count: 0,
      durations: [],
    };
    v.count++;
    if (c.status !== "open") v.durations.push(c.duration);
    variants.set(path, v);
    const mo = months.get(c.month) || {
      month: c.month,
      count: 0,
      durations: [],
    };
    mo.count++;
    if (c.status !== "open") mo.durations.push(c.duration);
    months.set(c.month, mo);
    for (const state of new Set(c.events.map((e) => e[0])))
      stages.set(state, (stages.get(state) || 0) + 1);
    c.events.slice(0, -1).forEach((e, i) => {
      const to = c.events[i + 1],
        key = `${e[0]}-${to[0]}`;
      const edge = edges.get(key) || {
        from: e[0],
        to: to[0],
        count: 0,
        days: [],
      };
      edge.count++;
      edge.days.push((to[1] - e[1]) / DAY);
      edges.set(key, edge);
    });
  }
  return {
    count: cases.length,
    completed: complete.length,
    median: quantile(durations, 0.5),
    p90: quantile(durations, 0.9),
    rework,
    statuses,
    applicationEvents: cases.reduce((s, c) => s + c.events.length, 0),
    rawEvents: cases.reduce((s, c) => s + c.rawEvents, 0),
    stages,
    edges: [...edges.values()]
      .map((e) => ({
        ...e,
        median: quantile(e.days, 0.5),
        mean: e.days.reduce((a, b) => a + b, 0) / e.days.length,
      }))
      .sort((a, b) => b.count - a.count),
    variants: [...variants.values()]
      .map((v) => ({ ...v, median: quantile(v.durations, 0.5) }))
      .sort((a, b) => b.count - a.count),
    months: [...months.values()]
      .map((m) => ({ ...m, median: quantile(m.durations, 0.5) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    histogram: histogram(durations),
  };
}
export function histogram(values) {
  const bounds = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, Infinity];
  return bounds
    .slice(0, -1)
    .map((low, i) => ({
      low,
      high: bounds[i + 1],
      label: bounds[i + 1] === Infinity ? "60+" : `${low}–${bounds[i + 1]}`,
      count: values.filter((v) => v >= low && v < bounds[i + 1]).length,
    }));
}
export function simulate(cases, stage, reduction) {
  if (!Number.isFinite(reduction) || reduction < 0 || reduction > 100)
    throw new RangeError("Reduction must be in [0, 100]");
  const complete = cases.filter((c) => c.status !== "open");
  let affected = 0;
  const before = complete.map((c) => c.duration);
  const after = complete.map((c) => {
    let interval = 0;
    for (let i = 0; i < c.events.length - 1; i++)
      if (c.events[i][0] === stage)
        interval += (c.events[i + 1][1] - c.events[i][1]) / DAY;
    if (interval > 0) affected++;
    return Math.max(0, c.duration - (interval * reduction) / 100);
  });
  return {
    before: quantile(before, 0.5),
    after: quantile(after, 0.5),
    affected,
    count: complete.length,
    histogram: histogram(after),
    oldHistogram: histogram(before),
  };
}
export function csvRows(rows) {
  return (
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map((value) => '"' + String(value ?? "").replaceAll('"', '""') + '"')
          .join(";"),
      )
      .join("\r\n")
  );
}
