import { loadProblems, loadSolved, buildSolvedLookup, computeStats, difficultyClass } from './data.js';
import { renderDailyChart, renderDifficultyPie } from './charts.js';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const [problems, solved] = await Promise.all([loadProblems(), loadSolved()]);
    const stats = computeStats(problems, solved);
    const solvedLookup = buildSolvedLookup(stats.annotatedSolved.filter(e => e.isNeet));

    renderStats(stats);
    renderAccordion(problems, solvedLookup);
    renderTimeline(stats.annotatedSolved);
    renderMini(stats.dailyCounts);
    const dailyTooltip = document.createElement('div');
    dailyTooltip.className = 'tooltip';
    document.querySelector('#daily-chart').parentElement.appendChild(dailyTooltip);
    setupMonthlyChart(stats.monthlyCounts, dailyTooltip);
    const diffTooltip = document.createElement('div');
    diffTooltip.className = 'tooltip';
    document.querySelector('#difficulty-chart').parentElement.appendChild(diffTooltip);
    renderDifficultyPie(
      document.getElementById('difficulty-chart'),
      stats.diffTotals,
      stats.diffSolved,
      diffTooltip
    );
    renderHeatmap(stats.yearHeatmap);
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML('beforeend', `<div class="card" style="border-color:#ff6677;">${err.message}</div>`);
  }
}

function renderStats(stats) {
  const grid = document.getElementById('stats-grid');
  const cards = [
    { label: 'Total solved (all)', value: stats.solvedCountAll },
    { label: 'NeetCode', value: `${stats.solvedCountNeet}/250` },
    { label: 'Streak (days)', value: stats.streak ?? 0 },
    {
      label: 'Days to finish NeetCode 250',
      value: formatDays(stats.projections.neet.daysRemaining),
      sub: stats.projections.neet.avgPerDay ? `${stats.projections.neet.avgPerDay.toFixed(2)} / day` : 'No pace yet',
      title: stats.projections.neet.eta ? `ETA ${stats.projections.neet.eta}` : 'ETA unavailable'
    },
    {
      label: 'Days to 500 total',
      value: formatDays(stats.projections.all.daysRemaining),
      sub: stats.projections.all.avgPerDay ? `${stats.projections.all.avgPerDay.toFixed(2)} / day` : 'No pace yet',
      title: stats.projections.all.eta ? `ETA ${stats.projections.all.eta}` : 'ETA unavailable'
    },
  ];

  grid.innerHTML = cards.map(card => `
    <div class="card fade-in" ${card.title ? `title="${card.title}"` : ''}>
      <div class="stat-value accent">${card.value}</div>
      <div class="stat-label">${card.label}</div>
      ${card.sub ? `<div class="small">${card.sub}</div>` : ''}
    </div>
  `).join('');
}

function renderMini(dailyCounts) {
  const pill = document.getElementById('mini-pill');
  if (!pill || !dailyCounts?.length) return;
  const today = dailyCounts[dailyCounts.length - 1]?.count || 0;
  const last7 = dailyCounts.slice(-7).reduce((a, b) => a + b.count, 0);
  pill.textContent = `Today: ${today} | 7d: ${last7}`;
}

function renderAccordion(problems, solvedLookup) {
  const container = document.getElementById('accordion');
  const html = problems.map(section => {
    const solvedCount = section.questions.filter(q => isSolved(q, solvedLookup)).length;
    const total = section.questions.length;
    const pct = total ? Math.round((solvedCount / total) * 100) : 0;
    const body = section.questions.map(q => {
      const solved = isSolved(q, solvedLookup);
      return `
        <div class="question-row ${solved ? 'solved' : ''}">
          <div class="flex" style="gap:8px;">
            <span class="status-dot ${solved ? 'solved' : 'pending'}"></span>
            <div>
              <a class="question-title ${difficultyClass(q.difficulty)}" href="${q.link}" target="_blank" rel="noreferrer">${q.name}</a>
            </div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="accordion-item">
        <button class="accordion-header" type="button" style="width:100%; padding:0; border:none; background:transparent; display:block;">
          <div class="section-progress" style="position:relative; width:100%; height:50px; background:rgba(7,13,22,0.6);">
            <div class="progress-fill" style="position:absolute; left:0; top:0; bottom:0; width:${pct}%; background:linear-gradient(90deg, rgba(13,210,138,0.25), rgba(13,210,138,0.05)); border-right:1px solid rgba(13,210,138,0.3); transition:width 0.4s ease;"></div>
            <div class="progress-label" style="position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; padding:0 20px; height:100%; width:100%; box-sizing:border-box;">
              <span class="section-name" style="font-weight:800; font-size:16px; color:#f4f7ff; text-shadow:0 1px 2px rgba(0,0,0,0.5);">${section.section}</span>
              <span class="section-count" style="font-size:14px; color:#9cb4d0;">${solvedCount}/${section.questions.length}</span>
            </div>
          </div>
        </button>
        <div class="accordion-body">${body}</div>
      </div>
    `;
  }).join('');

  container.insertAdjacentHTML('beforeend', html);

  container.querySelectorAll('.accordion-item').forEach(item => {
    item.querySelector('.accordion-header').addEventListener('click', () => {
      item.classList.toggle('open');
    });
  });
}

function renderTimeline(solved) {
  const wrap = document.getElementById('timeline');
  const sorted = [...solved].sort((a, b) => b.date.localeCompare(a.date));
  wrap.innerHTML = sorted.slice(0, 15).map(entry => `
    <div class="timeline-item fade-in">
      <div class="flex" style="justify-content:space-between;">
        <div class="flex" style="gap:8px;">
          <span class="badge ${difficultyClass(entry.difficulty)}">${entry.difficulty}</span>
          <strong>${entry.number ? `${entry.number}. ` : ''}${entry.name}</strong>
        </div>
        <span class="small">${entry.date || ''}</span>
      </div>
      <div class="small" style="margin-top:4px; color:#9cb4d0;">${entry.isNeet ? 'NeetCode' : 'Not in NeetCode'}</div>
      <div class="small" style="margin-top:6px; color:#c3d7f5;">${entry.myComplexity || 'Complexity: pending'}</div>
      <div class="small" style="margin-top:4px; color:#9cb4d0;">${entry.betterApproach || 'Better approach: pending'}</div>
      <div class="small" style="margin-top:2px; color:#9cb4d0;">${entry.betterComplexity || ''}</div>
    </div>
  `).join('');
}

function isSolved(question, lookup) {
  const nameKey = question.name ? question.name.toLowerCase() : null;
  return Boolean(nameKey && lookup.byName.has(nameKey));
}

function setupMonthlyChart(months, tooltipEl) {
  const canvas = document.getElementById('daily-chart');
  const monthLabel = document.getElementById('month-label');
  const prevBtn = document.getElementById('month-prev');
  const nextBtn = document.getElementById('month-next');
  if (!canvas || !monthLabel || !prevBtn || !nextBtn || !months?.length) return;

  const today = new Date();
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  let idx = months.findIndex(m => m.key === currentKey);
  if (idx === -1) idx = months.length - 1;

  const renderMonth = () => {
    const month = months[idx];
    monthLabel.textContent = month.label;
    renderDailyChart(canvas, month.days, tooltipEl);
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx >= months.length - 1;
  };

  prevBtn.addEventListener('click', () => {
    if (idx > 0) {
      idx -= 1;
      renderMonth();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (idx < months.length - 1) {
      idx += 1;
      renderMonth();
    }
  });

  renderMonth();
}

function renderHeatmap(days) {
  const grid = document.getElementById('year-heatmap');
  if (!grid || !days?.length) return;
  const wrap = grid.parentElement;
  let tooltip = wrap.querySelector('.tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    wrap.appendChild(tooltip);
  }
  const levelFor = (count) => {
    if (count === 0) return 'level-0';
    if (count === 1) return 'level-1';
    if (count === 2) return 'level-2';
    if (count <= 4) return 'level-3';
    return 'level-4';
  };
  const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' });

  grid.innerHTML = '';
  const months = new Map();
  days.forEach(day => {
    const key = day.date.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(day);
  });

  months.forEach((monthDays, key) => {
    const monthWrap = document.createElement('div');
    monthWrap.className = 'month-block';
    const monthGrid = document.createElement('div');
    monthGrid.className = 'month-grid';

    // compute offset for first day
    const firstDay = new Date(monthDays[0].date).getDay();
    for (let i = 0; i < firstDay; i++) {
      const filler = document.createElement('div');
      filler.className = 'heat-cell filler';
      monthGrid.appendChild(filler);
    }

    monthDays.forEach(day => {
      const cell = document.createElement('div');
      cell.className = `heat-cell ${levelFor(day.count)}`;
      cell.dataset.date = day.date;
      cell.dataset.count = day.count;
      cell.addEventListener('mouseenter', (e) => {
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateY(0)';
        tooltip.textContent = `${dateFmt.format(new Date(day.date))}: ${day.count} solved`;
        
        // Position relative to the scrolling wrapper
        const wrapRect = wrap.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - wrapRect.left + 10}px`;
        tooltip.style.top = `${e.clientY - wrapRect.top + 10}px`;
      });
      cell.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateY(-2px)';
        setTimeout(() => { tooltip.style.display = 'none'; }, 140);
      });
      monthGrid.appendChild(cell);
    });

    const label = document.createElement('div');
    label.className = 'month-label';
    const monthName = new Date(key + '-01').toLocaleString('en', { month: 'short' });
    label.textContent = monthName;

    monthWrap.appendChild(monthGrid);
    monthWrap.appendChild(label);
    grid.appendChild(monthWrap);
  });
}

function formatDays(days) {
  if (days == null) return '∞';
  return days;
}
