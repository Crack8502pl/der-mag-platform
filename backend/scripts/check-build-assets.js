const fs = require('fs');
const path = require('path');

for (const relative of [
  'templates/emails/task-created.hbs',
  'assets/fonts/NotoSans-Regular.ttf',
  'assets/fonts/NotoSans-Bold.ttf',
  'assets/fonts/OFL.txt',
]) {
  const asset = path.resolve(__dirname, '../dist', relative);
  if (!fs.existsSync(asset)) {
    console.error(`Brak wymaganego zasobu po buildzie: ${asset}`);
    process.exit(1);
  }
}

console.log('Test zasobów builda zakończony pomyślnie.');
