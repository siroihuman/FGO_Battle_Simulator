'use strict';

const { readdirSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const testDirectory = __dirname;
const files = readdirSync(testDirectory)
  .filter((name) => name.endsWith('-tests.js'))
  .sort();

let failed = 0;
for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const result = spawnSync(process.execPath, [join(testDirectory, file)], {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    failed += 1;
    console.error(`FAILED: ${file}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed}件のテストファイルが失敗しました。`);
  process.exit(1);
}

console.log(`\n全${files.length}件のテストファイルに合格しました。`);
