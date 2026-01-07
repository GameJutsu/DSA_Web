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

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('entry-form');
  const output = document.getElementById('payload-output');
  const card = document.getElementById('payload-card');
  const hashPill = document.getElementById('hash-pill');
  const copyBtn = document.getElementById('copy-btn');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const parsed = parseProblemLine(data.problemLine || '');
    if (!Number.isFinite(parsed.number)) {
      alert('Please include the problem number (e.g., "1929. Concatenation of Array").');
      return;
    }
    const payload = {
      date: data.date,
      number: parsed.number,
      name: parsed.name,
      difficulty: data.difficulty,
      code: data.code.trim(),
      myComplexity: '',
      betterApproach: '',
      betterComplexity: ''
    };
    const json = JSON.stringify(payload, null, 2);
    const hash = hashCode(json + data.code);
    hashPill.textContent = `hash: ${hash}`;
    output.textContent = json;
    card.style.display = 'block';
  });

  copyBtn.addEventListener('click', async () => {
    const text = output.textContent;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = 'Copied';
    setTimeout(() => (copyBtn.textContent = 'Copy JSON'), 1200);
  });
});
