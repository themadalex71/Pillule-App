const fs = require('fs');
const path = require('path');

const EXCLUDE = ['node_modules', '.git', 'dist', 'build', '.stackblitz', '.next'];
const EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css'];

function getFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const name = path.join(dir, file);
    if (EXCLUDE.some(ex => name.includes(ex))) return;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, allFiles);
    } else {
      if (EXTENSIONS.includes(path.extname(name))) allFiles.push(name);
    }
  });
  return allFiles;
}

let output = '';
getFiles('.').forEach(file => {
  output += `--- FILE: ${file} ---\n${fs.readFileSync(file, 'utf8')}\n\n`;
});

fs.writeFileSync('context_safe.txt', output);
console.log('✅ C\'est prêt ! Le fichier context_safe.txt a été généré.');