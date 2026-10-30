const fs = require('fs');
const path = require('path');

const template = path.resolve(__dirname, '../dist/templates/emails/task-created.hbs');
if (!fs.existsSync(template)) {
  console.error(`Brak wymaganego szablonu po buildzie: ${template}`);
  process.exit(1);
}

console.log('Test zasobów builda zakończony pomyślnie.');
