const fs = require('fs');
const filesHTML = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const htmlContent = filesHTML.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const filesGS = fs.readdirSync('.').filter(f => f.endsWith('.gs'));
const gsContent = filesGS.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const runRegex = /google\.script\.run(?:\.withSuccessHandler\([^)]+\))?(?:\.withFailureHandler\([^)]+\))?\.([a-zA-Z0-9_]+)\(/g;
let match;
const calledFuncs = new Set();
while ((match = runRegex.exec(htmlContent)) !== null) {
  calledFuncs.add(match[1]);
}

const missingGsFuncs = [];
for (const func of calledFuncs) {
  const funcRegex = new RegExp(`function\\s+${func}\\s*\\(`, 'g');
  if (!funcRegex.test(gsContent)) {
    missingGsFuncs.push(func);
  }
}
console.log('Missing/undefined GS functions called from frontend:', missingGsFuncs.join(', '));
