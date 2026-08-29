const fs = require('fs');

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error('Usage: node build-data.js <parasite-similarity.json> <output.js>');
}

const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const cards = source.cards.map((card) => ({
  id: card.id,
  koreanName: card.korean_name,
  scientificName: card.scientific_name,
  lecture: card.lecture,
  lectureNumbers: card.lecture_numbers,
  macro: card.macro,
}));

fs.writeFileSync(outputPath, `window.TYPING_DATA = ${JSON.stringify({ version: '1.0.0', cards })};\n`, 'utf8');
console.log(`Generated ${cards.length} typing cards.`);
