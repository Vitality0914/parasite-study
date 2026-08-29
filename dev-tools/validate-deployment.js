const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const required = [
  'index.html', 'styles.css', '.nojekyll',
  'assets/fonts/PretendardVariable.woff2', 'assets/fonts/LICENSE.txt',
  'semantle/index.html', 'semantle/styles.css', 'semantle/app.js', 'semantle/data.js',
  'typing/index.html', 'typing/styles.css', 'typing/app.js', 'typing/data.js',
];
for (const file of required) check(fs.existsSync(path.join(root, file)), `missing ${file}`);

for (const relativeHtml of ['index.html', 'semantle/index.html', 'typing/index.html']) {
  const htmlPath = path.join(root, relativeHtml);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (/^(?:https?:|data:|mailto:)/.test(ref)) continue;
    let resolved = path.resolve(path.dirname(htmlPath), ref);
    if (ref.endsWith('/')) resolved = path.join(resolved, 'index.html');
    check(fs.existsSync(resolved), `broken reference ${relativeHtml} -> ${ref}`);
  }
}

const semantleContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'semantle/data.js'), 'utf8'), semantleContext);
const semantleData = semantleContext.window.PARASITE_DATA;
const typingContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'typing/data.js'), 'utf8'), typingContext);
const typingData = typingContext.window.TYPING_DATA;
check(semantleData.cards.length === 90 && semantleData.similarityMatrix.length === 90, 'invalid semantle data');
check(typingData.cards.length === 90, 'invalid typing data');

const semantleHtml = fs.readFileSync(path.join(root, 'semantle/index.html'), 'utf8');
const semantleApp = fs.readFileSync(path.join(root, 'semantle/app.js'), 'utf8');
check(semantleHtml.includes('value="easy"') && semantleHtml.includes('value="hard"'), 'difficulty controls missing');
check(semantleHtml.includes('id="suggestions"') && semantleApp.includes("difficulty !== 'easy'"), 'Easy suggestions missing');
const typingApp = fs.readFileSync(path.join(root, 'typing/app.js'), 'utf8');
const typingHtml = fs.readFileSync(path.join(root, 'typing/index.html'), 'utf8');
check(typingHtml.includes('id="passCard"') && typingApp.includes('function passCard()'), 'typing pass behavior missing');
check(typingApp.includes('오답 — 정답:') && typingApp.includes('scheduleAdvance(1400)'), 'typing reveal-and-advance behavior missing');

console.log(JSON.stringify({
  requiredFiles: required.length,
  semantleCards: semantleData.cards.length,
  typingCards: typingData.cards.length,
  errors,
}, null, 2));
process.exitCode = errors.length ? 1 : 0;
