// Minimal canvas charts (no deps)
function clearCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#050a12';
  ctx.fillRect(0, 0, w, h);
}

const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit' });

export function renderDailyChart(canvas, data, tooltipEl) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  clearCanvas(ctx, w, h);

  const max = Math.max(1, ...data.map(d => d.count));
  const barWidth = w / data.length;
  const bars = [];

  data.forEach((item, idx) => {
    const height = (item.count / max) * (h * 0.8);
    const x = idx * barWidth + barWidth * 0.15;
    const y = h - height - 8 * devicePixelRatio;
    const grad = ctx.createLinearGradient(x, y, x, y + height);
    grad.addColorStop(0, '#0dd28a');
    grad.addColorStop(1, '#0e7dd8');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth * 0.7, height);
    bars.push({ x, y, w: barWidth * 0.7, h: height, item });
  });

  if (tooltipEl) attachBarTooltip(canvas, bars, tooltipEl, (d) => `${dateFmt.format(new Date(d.item.date))}: ${d.item.count}`);
}

export function renderDifficultyPie(canvas, totals, solved, tooltipEl) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  clearCanvas(ctx, w, h);

  const keys = ['Easy', 'Medium', 'Hard'];
  const colors = { Easy: '#0dd28a', Medium: '#ffc35d', Hard: '#ff6d78' };
  const solvedCounts = keys.map(k => solved[k] || 0);
  const totalSolved = solvedCounts.reduce((a, b) => a + b, 0);
  if (totalSolved === 0) return;

  let start = -Math.PI / 2;
  const arcs = [];
  keys.forEach((k, idx) => {
    const value = solved[k] || 0;
    const angle = (value / totalSolved) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.32, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[k];
    ctx.fill();
    arcs.push({ start, end: start + angle, key: k, value, pct: totalSolved ? Math.round((value / totalSolved) * 100) : 0 });
    start += angle;
  });

  // Legend text
  ctx.fillStyle = '#8da4c0';
  ctx.font = `${12 * devicePixelRatio}px 'JetBrains Mono', monospace`;
  keys.forEach((k, i) => {
    const line = `${k}: ${solved[k] || 0}`;
    ctx.fillText(line, 10 * devicePixelRatio, (16 + i * 16) * devicePixelRatio);
  });

  if (tooltipEl) attachPieTooltip(canvas, arcs, w, h, tooltipEl, colors);
}

function attachBarTooltip(canvas, bars, tooltipEl, formatter) {
  const show = (x, y, text) => {
    tooltipEl.style.display = 'block';
    tooltipEl.textContent = text;
    tooltipEl.style.opacity = '1';
    tooltipEl.style.transform = 'translateY(0)';
    const rect = canvas.getBoundingClientRect();
    tooltipEl.style.left = `${x - rect.left + 8}px`;
    tooltipEl.style.top = `${y - rect.top - 12}px`;
  };
  const hide = () => {
    tooltipEl.style.opacity = '0';
    tooltipEl.style.transform = 'translateY(-2px)';
    setTimeout(() => { tooltipEl.style.display = 'none'; }, 140);
  };

  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * devicePixelRatio;
    const cy = (e.clientY - rect.top) * devicePixelRatio;
    const hit = bars.find(b => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h);
    if (hit) {
      show(e.clientX, e.clientY, formatter(hit));
    } else {
      hide();
    }
  };
  canvas.onmouseleave = hide;
}

function attachPieTooltip(canvas, arcs, w, h, tooltipEl, colors) {
  const radius = Math.min(w, h) * 0.32;
  const show = (x, y, text, color) => {
    tooltipEl.style.display = 'block';
    tooltipEl.textContent = text;
    tooltipEl.style.borderColor = color;
    tooltipEl.style.opacity = '1';
    tooltipEl.style.transform = 'translateY(0)';
    const rect = canvas.getBoundingClientRect();
    tooltipEl.style.left = `${x - rect.left + 8}px`;
    tooltipEl.style.top = `${y - rect.top - 12}px`;
  };
  const hide = () => {
    tooltipEl.style.opacity = '0';
    tooltipEl.style.transform = 'translateY(-2px)';
    setTimeout(() => { tooltipEl.style.display = 'none'; }, 140);
  };

  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * devicePixelRatio;
    const cy = (e.clientY - rect.top) * devicePixelRatio;
    const dx = cx - w / 2;
    const dy = cy - h / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) { hide(); return; }
    let ang = Math.atan2(dy, dx);
    if (ang < -Math.PI / 2) ang += Math.PI * 2;
    const hit = arcs.find(a => ang >= a.start && ang <= a.end);
    if (hit) {
      show(e.clientX, e.clientY, `${hit.key}: ${hit.value} (${hit.pct}%)`, colors[hit.key]);
    } else {
      hide();
    }
  };
  canvas.onmouseleave = hide;
}
