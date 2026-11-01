import fs from 'fs';
import path from 'path';

const repositoryRoot = path.resolve(__dirname, '../../../..');
const readRepositoryFile = (file: string): string =>
  fs.readFileSync(path.join(repositoryRoot, file), 'utf8');

describe('szablony repozytorium Etapu 2', () => {
  it('udostępnia trzy szablony zgłoszeń i szablon pull requesta', () => {
    const templateDirectory = path.join(repositoryRoot, '.github/ISSUE_TEMPLATE');
    const templates = fs.readdirSync(templateDirectory);

    expect(templates).toEqual(expect.arrayContaining(['wdrozenie.yml', 'weryfikacja.yml', 'blad.yml']));
    expect(readRepositoryFile('.github/ISSUE_TEMPLATE/config.yml')).toContain('blank_issues_enabled: true');
    const issueTemplates = {
      'wdrozenie.yml': {
        label: 'typ:wdrożenie',
        fields: ['Wymaga', 'Cel', 'Przeczytaj najpierw', 'Zakres', 'Testy', 'Kryteria akceptacji', 'Poza zakresem'],
      },
      'weryfikacja.yml': {
        label: 'typ:weryfikacja',
        fields: ['Weryfikowane zgłoszenie', 'Punkty specyficzne', 'Lista R'],
      },
      'blad.yml': {
        label: 'typ:błąd',
        fields: ['Co się dzieje', 'Czego oczekiwano', 'Kroki', 'Znalezione w (numer V)', 'Wersja/commit'],
      },
    };

    for (const [file, { label, fields }] of Object.entries(issueTemplates)) {
      const template = readRepositoryFile(`.github/ISSUE_TEMPLATE/${file}`);
      expect(template).toContain(label);
      for (const field of fields) expect(template).toContain(`label: ${field}`);
    }

    const pullRequestTemplate = readRepositoryFile('.github/pull_request_template.md');
    for (const section of ['Closes #', '## Co zmieniono', '## Jak sprawdzić ręcznie', '## Zrzuty ekranu', '## Lista kontrolna']) {
      expect(pullRequestTemplate).toContain(section);
    }
  });

  it('definiuje wszystkie wymagane, unikalne etykiety', () => {
    const labels = readRepositoryFile('.github/labels.yml');
    const names = [...labels.matchAll(/^- name:\s*(?:"([^"]+)"|(.+))$/gm)]
      .map(([, quoted, plain]) => quoted ?? plain.trim());
    const definitions = labels.split(/(?=^- name:)/m).filter(entry => entry.startsWith('- name:'));

    expect(names).toEqual(expect.arrayContaining([
      'etap-2',
      'typ:wdrożenie',
      'typ:weryfikacja',
      'typ:błąd',
      'obszar:backend',
      'obszar:frontend',
      'obszar:baza',
      'obszar:ci',
      'obszar:repo',
      'ryzyko:wysokie',
    ]));
    expect(new Set(names).size).toBe(names.length);
    for (const definition of definitions) {
      expect(definition).toMatch(/^\s+color:/m);
      expect(definition).toMatch(/^\s+description:/m);
    }
  });
});
