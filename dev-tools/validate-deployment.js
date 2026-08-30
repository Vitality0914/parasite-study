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
  'typing-practice/index.html', 'typing-practice/styles.css', 'typing-practice/app.js', 'typing-practice/data.js',
];
for (const file of required) check(fs.existsSync(path.join(root, file)), `missing ${file}`);

for (const relativeHtml of ['index.html', 'semantle/index.html', 'typing/index.html', 'typing-practice/index.html']) {
  const htmlPath = path.join(root, relativeHtml);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (/^(?:https?:|data:|mailto:)/.test(ref)) continue;
    const fileRef = ref.split('?')[0];
    let resolved = path.resolve(path.dirname(htmlPath), fileRef);
    if (fileRef.endsWith('/')) resolved = path.join(resolved, 'index.html');
    check(fs.existsSync(resolved), `broken reference ${relativeHtml} -> ${ref}`);
  }
}

const semantleContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'semantle/data.js'), 'utf8'), semantleContext);
const semantleData = semantleContext.window.PARASITE_DATA;
const typingContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'typing/data.js'), 'utf8'), typingContext);
const typingData = typingContext.window.TYPING_DATA;
const practiceContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'typing-practice/data.js'), 'utf8'), practiceContext);
const practiceData = practiceContext.window.TYPING_DATA;
check(semantleData.cards.length === 90 && semantleData.similarityMatrix.length === 90, 'invalid semantle data');
check(typingData.cards.length === 90, 'invalid typing data');
check(practiceData.cards.length === 90, 'invalid typing practice data');

const semantleHtml = fs.readFileSync(path.join(root, 'semantle/index.html'), 'utf8');
const semantleApp = fs.readFileSync(path.join(root, 'semantle/app.js'), 'utf8');
const frontHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const practiceCardPosition = frontHtml.indexOf('./typing-practice/index.html');
const testCardPosition = frontHtml.indexOf('./typing/index.html');
const semantleCardPosition = frontHtml.indexOf('./semantle/index.html');
check(practiceCardPosition >= 0 && practiceCardPosition < testCardPosition && testCardPosition < semantleCardPosition, 'front page game order is invalid');
check(frontHtml.includes('mode-card practice-card') && frontHtml.includes('mode-card typing-card') && frontHtml.includes('mode-card semantle-card'), 'front page game colors are not mapped');
const frontStyles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
check(frontStyles.includes('.practice-card { --mode-accent: var(--coral)') && frontStyles.includes('.typing-card { --mode-accent: var(--forest)') && frontStyles.includes('.semantle-card { --mode-accent: #6574a8'), 'front page color order is invalid');
check(semantleHtml.includes('value="easy"') && semantleHtml.includes('value="hard"'), 'difficulty controls missing');
check(semantleHtml.includes('id="suggestions"') && semantleApp.includes("difficulty !== 'easy'"), 'Easy suggestions missing');
const typingApp = fs.readFileSync(path.join(root, 'typing/app.js'), 'utf8');
const typingHtml = fs.readFileSync(path.join(root, 'typing/index.html'), 'utf8');
check(typingHtml.includes('id="passCard"') && typingApp.includes('function passCard()'), 'typing pass behavior missing');
check(typingApp.includes('오답 — 정답:') && typingApp.includes('scheduleAdvance(1000)'), 'typing reveal-and-advance behavior missing');
const practiceApp = fs.readFileSync(path.join(root, 'typing-practice/app.js'), 'utf8');
const practiceHtml = fs.readFileSync(path.join(root, 'typing-practice/index.html'), 'utf8');
check(practiceHtml.includes('id="scientificPrompt"') && practiceApp.includes('els.scientificPrompt.textContent = card.scientificName'), 'typing practice scientific-name prompt missing');
check(practiceApp.includes('parasite-typing-practice-lectures') && !typingApp.includes('parasite-typing-practice-lectures'), 'typing practice storage isolation missing');
check(practiceHtml.includes('id="passCard"') && practiceApp.includes('scheduleAdvance(1000)'), 'typing practice shared behavior missing');

console.log(JSON.stringify({
  requiredFiles: required.length,
  semantleCards: semantleData.cards.length,
  typingCards: typingData.cards.length,
  typingPracticeCards: practiceData.cards.length,
  errors,
}, null, 2));
process.exitCode = errors.length ? 1 : 0;
