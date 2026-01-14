function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // keep 32-bit
  }
  return (hash >>> 0).toString(16);
}

function parseProblemLine(line) {
  const trimmed = line.trim();
  const match = trimmed.match(/^(\d+)\.\s*(.+)$/);
  if (match) {
    return { number: Number(match[1]), name: match[2] };
  }
  const maybeNum = Number(trimmed.split(/\s+/)[0]);
  return {
    number: Number.isFinite(maybeNum) ? maybeNum : null,
    name: trimmed
  };
}

function generateAutoNotes({ problemName, difficulty, code }) {
  const snippet = (code || '').split('\n').slice(0, 6).join(' ').trim();
  const safeName = problemName || 'the problem';
  return {
    myApproach: `Auto-generated draft: Solved ${safeName} in C++ using a standard approach suitable for ${difficulty || 'Unknown'} difficulty. Review and adjust if needed. Snippet: ${snippet}`,
    myComplexity: 'Auto-generated draft: Time O(?), Space O(?) — refine after review.',
    betterApproach: 'Auto-generated draft: Consider alternative optimizations if applicable.',
    betterComplexity: ''
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('entry-form');
  const output = document.getElementById('payload-output');
  const card = document.getElementById('payload-card');
  const hashPill = document.getElementById('hash-pill');
  const copyBtn = document.getElementById('copy-btn');

  // Pre-fill date with today
  const dateInput = form.querySelector('[name="date"]');
  if (dateInput) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${y}-${m}-${d}`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const parsed = parseProblemLine(data.problemLine || '');

    if (!Number.isFinite(parsed.number)) {
      alert('Please include the problem number (e.g., "1929. Concatenation of Array").');
      return;
    }

    const autoNotes = generateAutoNotes({
      problemName: parsed.name,
      difficulty: data.difficulty,
      code: data.code,
    });

    const payload = {
      date: data.date,
      number: parsed.number,
      name: parsed.name,
      difficulty: data.difficulty,
      link: `https://leetcode.com/problems/${parsed.name.toLowerCase().replace(/\s+/g, '-')}/`,
      solvedInPython: data.solvedInPython === 'true',
      code: data.code.trim(),
      myApproach: autoNotes.myApproach,
      myComplexity: autoNotes.myComplexity,
      betterApproach: autoNotes.betterApproach,
      betterComplexity: autoNotes.betterComplexity,
      // Initialize SRS Data (Spaced Repetition)
      review: {
        nextReviewDate: data.date, // Due immediately/today
        interval: 0,
        easeFactor: 2.50,
        repetitions: 0
      }
    };

    // Filter out empty optional fields to keep JSON clean
    if (!payload.betterApproach) delete payload.betterApproach;
    if (!payload.betterComplexity) delete payload.betterComplexity;

    const json = JSON.stringify(payload, null, 2);
    const hash = hashCode(json + data.code);
    
    hashPill.textContent = `hash: ${hash}`;
    output.textContent = json;
    card.style.display = 'block';
    
    // Auto scroll to result
    card.scrollIntoView({ behavior: 'smooth' });
  });

  copyBtn.addEventListener('click', async () => {
    const text = output.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy JSON'), 1200);
    } catch (err) {
      console.error('Failed to copy', err);
      alert('Clipboard access failed. Please select and copy manually.');
    }
  });
});

