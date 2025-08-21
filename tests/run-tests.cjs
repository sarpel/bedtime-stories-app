#!/usr/bin/env node
// Minimal custom test runner (no external deps) for production-hardened project
// Finds *.test.js files under tests/ and runs exported test functions.

const fs = require('fs');
const path = require('path');

const testsDir = __dirname;

let total = 0;
let passed = 0;
let failed = 0;
const failures = [];

function color(txt, c) {
  const codes = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', reset: '\x1b[0m' };
  return codes[c] + txt + codes.reset;
}

function logResult(ok, name, durationMs) {
  if (ok) {
    console.log(color(`✔ ${name} (${durationMs}ms)`, 'green'));
  } else {
    console.log(color(`✘ ${name} (${durationMs}ms)`, 'red'));
  }
}

async function run() {
  const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.cjs'));
  for (const file of files) {
    const testModule = require(path.join(testsDir, file));
    const cases = Object.entries(testModule).filter(([k, v]) => typeof v === 'function');
    for (const [name, fn] of cases) {
      total++;
      const started = Date.now();
      try {
        if (fn.length === 1) {
          await new Promise((res, rej) => {
            let doneCalled = false;
            const done = (err) => { 
              if (doneCalled) return; 
              doneCalled = true; 
              if (err) {
                rej(err);
              } else {
                res();
              }
            };
            try { fn(done); } catch (e) { rej(e); }
            setTimeout(() => done(new Error('Timeout after 5000ms')), 5000);
          });
        } else {
          await fn();
        }
        passed++;
        logResult(true, `${file}:${name}`, Date.now() - started);
      } catch (err) {
        failed++;
        failures.push({ file, name, error: err });
        logResult(false, `${file}:${name}`, Date.now() - started);
      }
    }
  }

  console.log('\n==============================');
  console.log(color(`Toplam: ${total}  Başarılı: ${passed}  Hatalı: ${failed}`, failed ? 'red' : 'green'));
  if (failed) {
    console.log(color('\nHatalar:', 'red'));
    failures.forEach(f => {
      console.log(`\n# ${f.file} :: ${f.name}\n${f.error.stack || f.error}`);
    });
    process.exitCode = 1;
  }
}

run().catch(e => { console.error(e); process.exit(1); });
