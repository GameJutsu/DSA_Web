#!/usr/bin/env node
/**
 * Commit Solved Entry Script
 * --------------------------
 * Validates and appends a new problem entry to data/solved.json.
 * Enforces the schema defined in data/schema.json.
 * 
 * Usage: node scripts/commit-entry.js payload.json
 */

const fs = require('fs');
const path = require('path');

// Helper: Read JSON file
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Helper: Write JSON file
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n'); // Unix EOL
}

// Helper: Validate payload against critical schema fields
function validatePayload(payload) {
  const errors = [];
  
  // 1. Check Required Fields
  const required = ['date', 'number', 'name', 'difficulty', 'code', 'review'];
  required.forEach(field => {
    if (!payload[field]) errors.push(`Missing required field: ${field}`);
  });

  // 2. Check Enums
  const difficulties = ['Easy', 'Medium', 'Hard'];
  if (payload.difficulty && !difficulties.includes(payload.difficulty)) {
    errors.push(`Invalid difficulty: ${payload.difficulty}. Must be one of [${difficulties.join(', ')}]`);
  }

  // 3. Check SRS Object Structure
  if (payload.review) {
    if (!payload.review.nextReviewDate) errors.push('Missing review.nextReviewDate');
    if (typeof payload.review.interval !== 'number') errors.push('Missing/Invalid review.interval');
    if (typeof payload.review.easeFactor !== 'number') errors.push('Missing/Invalid review.easeFactor');
    if (typeof payload.review.repetitions !== 'number') errors.push('Missing/Invalid review.repetitions');
  }

  return errors;
}

function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) {
    console.error('Usage: node scripts/commit-entry.js <path-to-payload.json>');
    process.exit(1);
  }

  // 1. Load Payload
  const payload = readJson(payloadPath);
  if (!payload) {
    console.error(`Error: Could not read payload file at ${payloadPath}`);
    process.exit(1);
  }

  // 2. Validate
  const errors = validatePayload(payload);
  if (errors.length > 0) {
    console.error('Validation Failed:');
    errors.forEach(e => console.error(` - ${e}`));
    process.exit(1);
  }

  // 3. Load Existing Data
  const solvedPath = path.join(__dirname, '../data/solved.json');
  let solved = readJson(solvedPath);
  
  if (!solved) {
    console.log('Initializing new data/solved.json database...');
    solved = [];
  }

  // 4. Duplicate Check (Prevent accidental double-submit)
  const exists = solved.find(e => e.number === payload.number && e.date === payload.date);
  if (exists) {
    console.error(`Error: Entry for Problem #${payload.number} on ${payload.date} already exists.`);
    process.exit(1);
  }

  // 5. Append & Sort
  solved.push(payload);
  
  // Sort by Date (Descending) -> Newest first is usually better for reading JSON, 
  // but timeline logic often sorts it anyway. Let's keep it chronologically sorted (ascending)
  // to match typical log formats.
  solved.sort((a, b) => a.date.localeCompare(b.date));

  // 6. Save
  writeJson(solvedPath, solved);
  console.log(`\n✅ Success! Problem ${payload.number}: "${payload.name}" added to database.`);
  console.log(`   Database now contains ${solved.length} entries.`);
}

main();
