const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const htmlContent = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const idRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const missing = new Set();
while ((match = idRegex.exec(htmlContent)) !== null) {
  const id = match[1];
  if (!htmlContent.includes(`id="${id}"`) && !htmlContent.includes(`id='${id}'`)) {
    missing.add(id);
  }
}
console.log('Missing IDs:', Array.from(missing).join(', '));
