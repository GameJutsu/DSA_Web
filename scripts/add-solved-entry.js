#!/usr/bin/env node
// Append a solved entry payload into data/solved.json
// Usage: node scripts/add-solved-entry.js payload.json

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) {
    console.error('Provide a payload file: node scripts/add-solved-entry.js payload.json');
    process.exit(1);
  }

  const payload = readJson(payloadPath);
  const solvedPath = path.join(__dirname, '../data/solved.json');
  const solved = fs.existsSync(solvedPath) ? readJson(solvedPath) : [];

  const exists = solved.find(e => e.number === payload.number && e.date === payload.date);
  if (exists) {
    console.error('Entry already exists for this problem and date. Abort.');
    process.exit(1);
  }

  solved.push(payload);
  solved.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  writeJson(solvedPath, solved);
  console.log('Appended entry to data/solved.json');
}

main();
