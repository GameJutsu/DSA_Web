// Data loading and aggregation helpers
export const ACTIVE_YEAR = 2026;

export async function loadProblems() {
  const res = await fetch('nc250.json');
  if (!res.ok) throw new Error('Failed to load nc250.json');
  return res.json();
}

export async function loadSolved() {
  const res = await fetch('data/solved.json');
  if (!res.ok) throw new Error('Failed to load data/solved.json');
  return res.json();
}

export function buildProblemIndex(problems) {
  const byName = new Map();
  problems.forEach(sec => {
    sec.questions.forEach(q => {
      const info = { difficulty: q.difficulty, name: q.name };
      if (q.name) byName.set(q.name.toLowerCase(), info);
    });
  });
  return { byName };
}

export function annotateSolved(problems, solved) {
  const index = buildProblemIndex(problems);
  return solved.map(entry => {
    const num = entry.number != null ? Number(entry.number) : null;
    const info = entry.name ? index.byName.get(entry.name.toLowerCase()) : undefined;
    return {
      ...entry,
      number: num,
      isNeet: Boolean(info),
      difficulty: entry.difficulty || info?.difficulty || 'Unknown',
      name: entry.name || info?.name
    };
  });
}

export function buildSolvedLookup(solved) {
  const byName = new Set();
  solved.forEach(entry => {
    if (entry.name) byName.add(entry.name.toLowerCase());
  });
  return { byName };
}

export function computeStats(problems, solved) {
  const annotated = annotateSolved(problems, solved);
  const annotatedYear = annotated.filter(e => isInYear(e.date, ACTIVE_YEAR));
  const totalProblems = problems.reduce((acc, sec) => acc + sec.questions.length, 0);
  const solvedCountAll = annotatedYear.length;

  const neetSolved = annotatedYear.filter(e => e.isNeet);
  const solvedCountNeet = neetSolved.length;
  const remainingNeet = Math.max(totalProblems - solvedCountNeet, 0);

  const diffTotals = { Easy: 0, Medium: 0, Hard: 0 };
  problems.forEach(sec => {
    sec.questions.forEach(q => { diffTotals[q.difficulty] = (diffTotals[q.difficulty] || 0) + 1; });
  });

  const diffSolved = { Easy: 0, Medium: 0, Hard: 0 };
  annotatedYear.forEach(entry => { diffSolved[entry.difficulty] = (diffSolved[entry.difficulty] || 0) + 1; });

  const { dailyCounts, streak } = computeDailyCounts(annotatedYear);
  const monthlyCounts = computeMonthlyCounts(annotatedYear, ACTIVE_YEAR);
  const yearHeatmap = computeYearHeatmap(annotatedYear, ACTIVE_YEAR);
  const projections = computeProjections({ solvedCountNeet, solvedCountAll }, ACTIVE_YEAR);

  return {
    annotatedSolved: annotatedYear,
    totalProblems,
    solvedCountAll,
    solvedCountNeet,
    remainingNeet,
    diffTotals,
    diffSolved,
    dailyCounts,
    monthlyCounts,
    yearHeatmap,
    projections,
    year: ACTIVE_YEAR
  };
}

export function computeDailyCounts(solved) {
  const counts = new Map();
  solved.forEach(entry => {
    if (!entry.date) return;
    const key = normalizeDate(entry.date);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const today = new Date();
  const dailyCounts = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const key = formatDateLocal(d);
    dailyCounts.push({ date: key, count: counts.get(key) || 0 });
  }

  const streak = computeStreak(counts);
  return { dailyCounts, streak };
}

export function computeMonthlyCounts(solved, year = ACTIVE_YEAR) {
  const counts = new Map();
  solved.forEach(entry => {
    if (!entry.date || !isInYear(entry.date, year)) return;
    const key = normalizeDate(entry.date);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const months = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let month = 0; month < 12; month++) {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${monthKey}-${String(day).padStart(2, '0')}`;
      days.push({ day, date: dateKey, count: counts.get(dateKey) || 0 });
    }
    months.push({ key: monthKey, label: `${monthNames[month]} ${year}`, days });
  }

  return months;
}

export function computeYearHeatmap(solved, year = ACTIVE_YEAR) {
  const counts = new Map();
  solved.forEach(entry => {
    if (!entry.date || !isInYear(entry.date, year)) return;
    const key = normalizeDate(entry.date);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const first = new Date(Date.UTC(year, 0, 1));
  const last = new Date(Date.UTC(year, 11, 31));
  const days = [];
  for (let d = new Date(first); d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = formatDateUTC(d);
    days.push({ date: key, count: counts.get(key) || 0 });
  }
  return days;
}

function computeProjections({ solvedCountNeet, solvedCountAll }, year = ACTIVE_YEAR) {
  const start = new Date(year, 0, 1);
  const today = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const elapsed = Math.max(1, Math.floor((today - start) / dayMs) + 1);

  const avgNeetPerDay = solvedCountNeet / elapsed;
  const avgAllPerDay = solvedCountAll / elapsed;

  const neetGoal = 250;
  const allGoal = 500;

  const neetRemaining = Math.max(neetGoal - solvedCountNeet, 0);
  const allRemaining = Math.max(allGoal - solvedCountAll, 0);

  const daysToNeet = avgNeetPerDay > 0 ? Math.ceil(neetRemaining / avgNeetPerDay) : null;
  const daysToAll = avgAllPerDay > 0 ? Math.ceil(allRemaining / avgAllPerDay) : null;

  const etaNeet = daysToNeet != null ? addDays(today, daysToNeet) : null;
  const etaAll = daysToAll != null ? addDays(today, daysToAll) : null;

  return {
    neet: { daysRemaining: daysToNeet, eta: etaNeet, avgPerDay: avgNeetPerDay },
    all: { daysRemaining: daysToAll, eta: etaAll, avgPerDay: avgAllPerDay }
  };
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return formatDateLocal(d);
}

function computeStreak(counts) {
  let streak = 0;
  let d = new Date();
  for (;;) {
    const key = formatDateLocal(d);
    if (counts.get(key)) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function isInYear(dateStr, year = ACTIVE_YEAR) {
  if (!dateStr) return false;
  return String(dateStr).startsWith(String(year));
}

function formatDateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDate(dateStr) {
  // Accepts YYYY-MM-DD and returns normalized local date string
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return formatDateLocal(d);
  }
  const d = new Date(dateStr);
  return formatDateLocal(d);
}

export function difficultyClass(diff) {
  return diff ? diff.toLowerCase() : '';
}
