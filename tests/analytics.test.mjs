import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  aggregate,
  selectCases,
  simulate,
  quantile,
  csvRows,
} from "../src/analytics.mjs";

const make = (id, days, status = "pending", states = [0, 4, 5, 7]) => ({
  id,
  start: Date.UTC(2016, 0, 1),
  month: "2016-01",
  type: "New credit",
  status,
  duration: days,
  rawEvents: 10,
  events: states.map((s, i) => [s, (days * 86400 * i) / (states.length - 1)]),
});

test("quantiles interpolate and handle empty data", () => {
  assert.equal(quantile([], 0.5), null);
  assert.equal(quantile([40, 10, 30, 20], 0.5), 25);
  assert.equal(quantile([0, 10], 0.9), 9);
});
test("censored cases remain counted but excluded from completed duration", () => {
  const a = aggregate([make("1", 10), make("2", 20), make("3", 100, "open")]);
  assert.equal(a.count, 3);
  assert.equal(a.completed, 2);
  assert.equal(a.median, 15);
  assert.equal(a.p90, 19);
  assert.equal(
    a.histogram.reduce((s, b) => s + b.count, 0),
    2,
  );
});
test("a cohort containing only unresolved cases has no median", () => {
  const a = aggregate([make("1", 100, "open")]);
  assert.equal(a.median, null);
  assert.equal(a.p90, null);
  assert.equal(a.months[0].median, null);
  assert.equal(
    a.histogram.reduce((s, b) => s + b.count, 0),
    0,
  );
});
test("all filters compose and stage filter tests membership", () => {
  const rows = [
    make("1", 5),
    { ...make("2", 7, "denied"), month: "2016-02" },
    make("3", 8, "pending", [0, 1, 9]),
  ];
  assert.equal(
    selectCases(rows, { month: "2016-01", status: "pending", stage: 5 }).length,
    1,
  );
  assert.equal(selectCases(rows, { type: "nonexistent" }).length, 0);
});
test("rework requires multiple validation visits", () => {
  assert.equal(
    aggregate([make("1", 10), make("2", 10, "pending", [0, 5, 6, 5, 7])])
      .rework,
    1,
  );
});
test("edge counts conserve all transitions including loops", () => {
  const rows = [make("1", 10), make("2", 20, "pending", [0, 5, 6, 5, 7])];
  const a = aggregate(rows);
  assert.equal(
    a.edges.reduce((s, e) => s + e.count, 0),
    7,
  );
  assert.equal(a.applicationEvents, 9);
  assert.equal(a.stages.get(5), 2);
});
test("scenario zero reduction is identity; only selected intervals shrink", () => {
  const rows = [
    {
      ...make("1", 10),
      events: [
        [0, 0],
        [4, 86400],
        [5, 9 * 86400],
        [7, 10 * 86400],
      ],
    },
  ];
  assert.equal(simulate(rows, 4, 0).after, 10);
  assert.equal(simulate(rows, 4, 50).after, 6);
  assert.equal(simulate(rows, 6, 50).affected, 0);
  assert.equal(simulate(rows, 4, 100).after, 2);
  assert.throws(() => simulate(rows, 4, -1), RangeError);
});
test("scenarios exclude unresolved cases and never predict outcomes", () => {
  const s = simulate([make("1", 10), make("2", 100, "open")], 4, 25);
  assert.equal(s.count, 1);
  assert.equal(s.before, 10);
  assert.equal(s.affected, 1);
});
test("CSV fields escape delimiters and quotes with UTF-8 BOM", () => {
  assert.equal(csvRows([["a;b", 'say "yes"']]), '\ufeff"a;b";"say ""yes"""');
});
test("frozen public artifact matches full source identity and excludes sensitive attributes", () => {
  const { cases, states } = JSON.parse(
    readFileSync(new URL("../public/data/cases.json", import.meta.url)),
  );
  const m = JSON.parse(
    readFileSync(new URL("../public/data/manifest.json", import.meta.url)),
  );
  assert.equal(cases.length, 31509);
  assert.equal(m.quality.rawEvents, 1202267);
  assert.equal(m.quality.applicationEvents, 239595);
  assert.equal(states.length, 10);
  assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
  let events = 0,
    raw = 0,
    unresolved = 0;
  for (const c of cases) {
    assert.match(c.id, /^FL-\d{5}$/);
    assert.deepEqual(Object.keys(c).sort(), [
      "duration",
      "events",
      "id",
      "month",
      "rawEvents",
      "start",
      "status",
      "type",
    ]);
    assert.equal(c.events[0][1], 0);
    assert.ok(c.duration >= 0);
    assert.equal(c.month, new Date(c.start).toISOString().slice(0, 7));
    for (let i = 0; i < c.events.length; i++) {
      assert.ok(c.events[i][0] >= 0 && c.events[i][0] <= 9);
      if (i) assert.ok(c.events[i][1] >= c.events[i - 1][1]);
    }
    assert.ok(Math.abs(c.duration - c.events.at(-1)[1] / 86400) < 0.000001);
    const terminal =
      { 7: "pending", 8: "denied", 9: "cancelled" }[c.events.at(-1)[0]] ||
      "open";
    assert.equal(c.status, terminal);
    events += c.events.length;
    raw += c.rawEvents;
    if (c.status === "open") unresolved++;
  }
  assert.equal(events, m.quality.applicationEvents);
  assert.equal(raw, m.quality.rawEvents);
  assert.equal(unresolved, 98);
});
