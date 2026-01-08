// Minimal canvas charts (no deps)
function clearCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#050a12';
  ctx.fillRect(0, 0, w, h);
}

const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit' });

export function renderDailyChart(canvas, data, tooltipEl, targetDateStr, deadlineDateStr) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;

  const max = Math.max(1, ...data.map(d => d.count));
  const barWidth = w / data.length;
  
  let startTimestamp = null;
  
  // Determine "relevant" bars for animation speed
  const now = new Date();
  if (now.getFullYear() < 2026) now.setFullYear(2026);
  const todayISO = now.toISOString().split('T')[0];
  
  let relevantCount = 0;
  data.forEach(d => {
      if (d.date <= todayISO) relevantCount++;
  });
  // If we are looking at a future month (relevantCount 0), animate fast like a full month
  if (relevantCount === 0) relevantCount = data.length;
  
  const TOTAL_DURATION = 1500;
  // This ensures the animation "visual" finishes in 1.5s for the days that have happened
  const barRiseDuration = TOTAL_DURATION / Math.max(1, relevantCount);


  function step(timestamp) {
    if (!startTimestamp) startTimestamp = timestamp;
    const globalElapsed = timestamp - startTimestamp;
    
    clearCanvas(ctx, w, h);

    // Draw grid lines
    ctx.lineWidth = 1 * devicePixelRatio;
    
    // Grid logic: Line at every integer unit
    // Opacity: Even = Darker (0.6), Odd = Lighter (0.2)
    // No text
    ctx.beginPath();
    
    // We only go up to 'max'. If max is huge (unlikely for daily), it might densely pack.
    // Assuming max ~ 10-15 usually.
    for (let i = 1; i <= max; i++) {
        // MATCH: (i/max) * available_height
        const availableHeight = h * 0.8;
        const ratio = i / max;
        // Y position relative to bottom baseline
        const y = h - (ratio * availableHeight) - 16 * devicePixelRatio;
        
        ctx.beginPath();
        // Alternating opacity
        // i % 2 === 0 (Even) -> Darker
        // i % 2 !== 0 (Odd)  -> Lighter
        if (i % 2 === 0) {
            ctx.strokeStyle = 'rgba(31, 45, 68, 0.5)'; 
        } else {
            ctx.strokeStyle = 'rgba(31, 45, 68, 0.15)';
        }
        
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    
    // No text labels requested

    let allDone = true;

    data.forEach((item, idx) => {
      // Logic for Sequential Animation (one after another)
      const myStart = idx * barRiseDuration;
      const myElapsed = globalElapsed - myStart;
      
      let p = 0;
      if (myElapsed < 0) {
          p = 0;
          allDone = false;
      } else if (myElapsed < barRiseDuration) {
          p = myElapsed / barRiseDuration;
          allDone = false;
      } else {
          p = 1;
      }
      
      // Use cubic ease out for individual bars to look like "wave"
      const eased = 1 - Math.pow(1 - p, 3); 
      
      const availableHeight = h * 0.8;
      const fullHeight = (item.count / max) * availableHeight;
      const height = fullHeight * eased;
      
      const x = idx * barWidth; 
      const barW = barWidth * 0.6;
      const barX = x + (barWidth - barW) / 2;
      // MATCH: h - height - 16*dpr
      // Note: fullHeight is calculated exactly same as grid lines y position relative to baseline
      const y = h - height - 16 * devicePixelRatio;
      
      if (height > 0) {
        const grad = ctx.createLinearGradient(barX, y, barX, y + height);
        grad.addColorStop(0, '#0dd28a');
        grad.addColorStop(1, '#0e7dd8');
        ctx.fillStyle = grad;
        ctx.fillRect(barX, y, barW, height);
      }

      // Draw Axis Dots
      const dotX = x + barWidth / 2;
      const dotY = h - 6 * devicePixelRatio;
      
      // Determine if weekend
      const parts = item.date.split('-');
      const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const dayOfWeek = dateObj.getDay(); // 0=Sun, 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, 1.5 * devicePixelRatio, 0, Math.PI * 2);
      
      if (isWeekend) {
          ctx.fillStyle = '#8da4c0'; // Darker for Sat/Sun
      } else {
          ctx.fillStyle = 'rgba(141, 164, 192, 0.25)'; // Light for weekdays
      }
      ctx.fill();

      // TROPHY/FLAG (Gold) - Projected NeetCode Finish
      if (targetDateStr && item.date === targetDateStr) {
          const markerY = h - (h * 0.8) - 16 * devicePixelRatio - 14 * devicePixelRatio; 
          ctx.fillStyle = '#f59e0b'; // Gold
          const s = devicePixelRatio;
          
          // Draw a flag (same shape as red flag)
          ctx.fillRect(dotX - 1*s, markerY, 2*s, 10*s); // Pole
          ctx.beginPath();
          ctx.moveTo(dotX, markerY);
          ctx.lineTo(dotX + 6*s, markerY + 3*s);
          ctx.lineTo(dotX, markerY + 6*s);
          ctx.fill();
      }
      
      // DEADLINE (Red Flag)
      if (deadlineDateStr && item.date === deadlineDateStr) {
         const markerY = h - (h * 0.8) - 16 * devicePixelRatio - 14 * devicePixelRatio;
         ctx.fillStyle = '#ef4444'; // Red
         const s = devicePixelRatio;
         
         // Draw a simple flag/banner
         ctx.fillRect(dotX - 1*s, markerY, 2*s, 10*s); // Pole
         ctx.beginPath();
         ctx.moveTo(dotX, markerY);
         ctx.lineTo(dotX + 6*s, markerY + 3*s);
         ctx.lineTo(dotX, markerY + 6*s);
         ctx.fill();
      }
    });

    if (!allDone) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);

  if (tooltipEl) {
    // Tooltips disabled for now
    canvas.onmousemove = null;
    canvas.onmouseleave = null;
  }
}

export function renderDifficultyPie(canvas, totals, solved, tooltipEl) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;

  const keys = ['Easy', 'Medium', 'Hard'];
  const colors = { Easy: '#0dd28a', Medium: '#ffc35d', Hard: '#ff6d78' };
  const solvedCounts = keys.map(k => solved[k] || 0);
  const totalSolved = solvedCounts.reduce((a, b) => a + b, 0);
  if (totalSolved === 0) return;

  let startTimestamp = null;
  const duration = 1200;
  const radius = Math.min(w, h) * 0.35; 
  const thickness = 8 * devicePixelRatio; // Slightly thinner (was 14)

  // Pre-calculate target angles
  const slices = [];
  keys.forEach(k => {
      slices.push({
          key: k,
          value: solved[k] || 0,
          fraction: (solved[k] || 0) / totalSolved
      });
  });

  function draw(progress) {
    clearCanvas(ctx, w, h);
    
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentTotalSweep = Math.PI * 2 * eased;
    
    ctx.lineWidth = thickness;
    ctx.lineCap = 'butt'; 
    
    let startAngle = -Math.PI / 2; // Fixed start at top
    let accumulatedAngle = 0; // Relative to 0 start

    // Draw Donut Segments Sequentially
    slices.forEach(slice => {
        if (slice.value === 0) return;
        
        // Full angle this slice occupies in the final circle
        const sliceFullAngle = slice.fraction * (Math.PI * 2);
        
        // Calculate how much of this slice should be drawn based on global sweep
        // If currentTotalSweep is past this slice's start, we draw some of it.
        if (currentTotalSweep > accumulatedAngle) {
             const visibleAngle = Math.min(sliceFullAngle, currentTotalSweep - accumulatedAngle);
             
             ctx.beginPath();
             ctx.arc(w/2, h/2, radius, startAngle, startAngle + visibleAngle);
             ctx.strokeStyle = colors[slice.key];
             ctx.stroke();
        }
        
        // Move to next slice position
        startAngle += sliceFullAngle;
        accumulatedAngle += sliceFullAngle;
    });

    // Draw Legend Inside Circle
    // Larger text (13px), full labels (Easy/Medium/Hard)
    ctx.font = `600 ${13 * devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = 'middle';
    
    // Increased spacing for larger text
    const lineHeight = 16 * devicePixelRatio; 
    let yOffset = -lineHeight; 

    keys.forEach((k, i) => {
        const prefix = `${k}: `; // Full Name
        const value = `${solved[k] || 0}`;
        
        // Measure to center
        const prefixWidth = ctx.measureText(prefix).width;
        const valueWidth = ctx.measureText(value).width;
        const totalWidth = prefixWidth + valueWidth;
        
        const startX = (w/2) - (totalWidth/2);
        const y = h/2 + (i * lineHeight) + yOffset;
        
        // Draw Prefix (Standard Color)
        ctx.fillStyle = '#8da4c0'; 
        ctx.textAlign = 'left';
        ctx.fillText(prefix, startX, y);
        
        // Draw Value (Difficulty Color)
        ctx.fillStyle = colors[k]; 
        ctx.fillText(value, startX + prefixWidth, y);
    });
  }

  function step(timestamp) {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      draw(progress);
      if (progress < 1) requestAnimationFrame(step);
  }
  
  requestAnimationFrame(step);

  if (tooltipEl) {
    canvas.onmousemove = null;
    canvas.onmouseleave = null;
  }
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
