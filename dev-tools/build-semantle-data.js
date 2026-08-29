const fs = require('fs');
const path = require('path');

const [jsonPath, cardsDir, outputPath] = process.argv.slice(2);
if (!jsonPath || !cardsDir || !outputPath) {
  throw new Error('Usage: node build-data.js <similarity.json> <cards-dir> <output.js>');
}

const source = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const files = fs.readdirSync(cardsDir).filter((name) => name.endsWith('.md'));
const sectionOrder = ['형태', '생활사', '역학', '병리', '증상', '진단', '치료', '예방', '기타'];

function slugify(value) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseSections(markdown) {
  const headings = [...markdown.matchAll(/^##\s+(.+?)\s*$/gm)];
  const sections = {};
  for (let i = 0; i < headings.length; i += 1) {
    const title = headings[i][1].trim();
    const start = headings[i].index + headings[i][0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index : markdown.length;
    const bullets = markdown
      .slice(start, end)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2).trim())
      .filter(Boolean);
    if (sectionOrder.includes(title)) sections[title] = bullets;
  }
  return sections;
}

const cards = source.cards.map((card) => {
  const prefix = `${card.id}. `;
  const file = files.find((name) => name.startsWith(prefix));
  if (!file) throw new Error(`Missing Markdown card ${card.id}`);
  const sections = parseSections(fs.readFileSync(path.join(cardsDir, file), 'utf8'));
  return {
    id: card.id,
    koreanName: card.korean_name,
    scientificName: card.scientific_name,
    lecture: card.lecture,
    lectureNumbers: card.lecture_numbers,
    macro: card.macro,
    slug: slugify(card.scientific_name),
    sections,
  };
});

const payload = {
  version: '1.0.0',
  generatedAt: source.created,
  cards,
  similarityMatrix: source.similarity_matrix,
  scoring: {
    lectureClass: 0.30,
    sectionSemantic: 0.40,
    structured: 0.20,
    scientificNameRelation: 0.10,
    semanticEngine: source.semantic_engine,
  },
};

fs.writeFileSync(outputPath, `window.PARASITE_DATA = ${JSON.stringify(payload)};\n`, 'utf8');
console.log(`Generated ${cards.length} cards and ${source.pair_lookup ? Object.keys(source.pair_lookup).length : 0} pairs.`);
