import { loadProblems, loadSolved, buildSolvedLookup, computeStats, difficultyClass, ACTIVE_YEAR } from './data.js';
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
    setupMonthlyChart(stats.monthlyCounts, dailyTooltip, stats.projections);
    
    // Update active days text
    const heatmapHeader = document.querySelector('#year-heatmap').closest('.card').querySelector('.timeline-header');
    if (heatmapHeader && !heatmapHeader.querySelector('.active-days-tag')) {
       heatmapHeader.insertAdjacentHTML('beforeend', `<span class="small active-days-tag" style="color:#7cf2d4; font-weight:600;">Total active days : ${stats.activeDays}</span>`);
    }

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
      trophy: 'gold'
    },
    {
      label: 'Days to 500 total',
      value: formatDays(stats.projections.all.daysRemaining),
      sub: stats.projections.all.avgPerDay ? `${stats.projections.all.avgPerDay.toFixed(2)} / day` : 'No pace yet',
      trophy: 'red'
    },
  ];

  grid.innerHTML = cards.map(card => {
    let content = card.value;
    let target = null;
    let suffix = '';

    if (typeof card.value === 'number') {
      target = card.value;
      content = '0';
    } else if (typeof card.value === 'string' && card.value.includes('/')) {
      const parts = card.value.split('/');
      const num = parseInt(parts[0], 10);
      if (!isNaN(num)) {
        target = num;
        suffix = '/' + parts[1];
        content = '0' + suffix;
      }
    }

    const animateAttr = target !== null ? `data-animate-target="${target}" data-suffix="${suffix}"` : '';
    
    // Trophy Icon SVG (Small cup)
    const trophyIcon = card.trophy ? `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; top:12px; right:12px; color:${card.trophy === 'gold' ? '#f59e0b' : '#f87171'}; opacity:0.8;">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
        <path d="M4 22h16"></path>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
      </svg>
    ` : '';

    return `
    <div class="card" style="position:relative;">
      ${trophyIcon}
      <div class="stat-value accent" ${animateAttr}>${content}</div>
      <div class="stat-label">${card.label}</div>
      ${card.sub ? `<div class="small">${card.sub}</div>` : ''}
    </div>
  `;
  }).join('');

  grid.querySelectorAll('[data-animate-target]').forEach(el => {
    const target = parseInt(el.dataset.animateTarget, 10);
    const suffix = el.dataset.suffix || '';
    
    // Fixed duration 1.2s for all
    animateCounter(el, 0, target, 1200, suffix);
  });
}

function animateCounter(el, start, end, duration, suffix) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    
    // Linear (no easing)
    const current = Math.floor(progress * (end - start) + start);
    
    if (progress === 1) {
      el.textContent = end + suffix;
    } else {
      el.textContent = current + suffix;
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
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
            <div class="progress-fill" data-width="${pct}%" style="position:absolute; left:0; top:0; bottom:0; width:0%; background:linear-gradient(90deg, rgba(13,210,138,0.25), rgba(13,210,138,0.05)); border-right:1px solid rgba(13,210,138,0.3); transition:width 1s cubic-bezier(0.22, 1, 0.36, 1);"></div>
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

  // Animate progress bars when they scroll into view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        bar.style.width = bar.dataset.width;
        observer.unobserve(bar);
      }
    });
  }, { threshold: 0.2 });

  container.querySelectorAll('.progress-fill').forEach(bar => observer.observe(bar));

  container.querySelectorAll('.accordion-item').forEach(item => {
    item.querySelector('.accordion-header').addEventListener('click', () => {
      item.classList.toggle('open');
    });
  });
}

function renderTimeline(solved) {
  const wrap = document.getElementById('timeline');
  const sorted = [...solved].sort((a, b) => b.date.localeCompare(a.date));
  wrap.innerHTML = sorted.slice(0, 15).map((entry, i) => `
    <div class="timeline-item">
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

function setupMonthlyChart(months, tooltipEl, projections) {
  const canvas = document.getElementById('daily-chart');
  const monthLabel = document.getElementById('month-label');
  const prevBtn = document.getElementById('month-prev');
  const nextBtn = document.getElementById('month-next');
  if (!canvas || !monthLabel || !prevBtn || !nextBtn || !months?.length) return;

  const today = new Date();
  if (today.getFullYear() < ACTIVE_YEAR) today.setFullYear(ACTIVE_YEAR);

  // Calculate projected date (NeetCode 250)
  // We can derive "Today + daysRemaining"
  let targetDateStr = null;
  if (projections && projections.neet && typeof projections.neet.daysRemaining === 'number') {
      const target = new Date(today);
      target.setDate(today.getDate() + projections.neet.daysRemaining);
      // Format to YYYY-MM-DD
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const d = String(target.getDate()).padStart(2, '0');
      targetDateStr = `${y}-${m}-${d}`;
  }

  // Calculate projected date (500 Questions)
  let deadlineDateStr = null;
  if (projections && projections.all && typeof projections.all.daysRemaining === 'number') {
      const target = new Date(today);
      target.setDate(today.getDate() + projections.all.daysRemaining);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const d = String(target.getDate()).padStart(2, '0');
      deadlineDateStr = `${y}-${m}-${d}`; 
  }

  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  let idx = months.findIndex(m => m.key === currentKey);
  if (idx === -1) idx = months.length - 1;

  const renderMonth = () => {
    const month = months[idx];
    monthLabel.textContent = month.label;
    renderDailyChart(canvas, month.days, tooltipEl, targetDateStr, deadlineDateStr);
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
      // Removed mouseenter/mouseleave events for heatmap cells
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
