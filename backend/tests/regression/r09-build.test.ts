// R9 – Build. Tu: artefakty builda widoczne w uruchomionej aplikacji.
// `npm audit --audit-level=high` (oba projekty) i liczba błędów ESLint frontendu
// (scripts/check-eslint-baseline.mjs) są krokami workflow .github/workflows/regression.yml.
import fs from 'fs';
import path from 'path';
import { ApiSession } from './helpers';

describe('R9: build', () => {
  it('backend: dist/templates/emails istnieje i zawiera szablony', () => {
    const emails = path.resolve(__dirname, '../../dist/templates/emails');
    expect(fs.existsSync(emails)).toBe(true);
    expect(fs.readdirSync(emails).filter(file => file.endsWith('.hbs')).length).toBeGreaterThan(0);
  });

  it('frontend: zbudowana aplikacja jest serwowana przez backend', async () => {
    const response = await new ApiSession().get('/');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.body).toContain('<div id="root"></div>');
    const script = String(response.body).match(/src="(\/assets\/[^"]+\.js)"/);
    expect(script).not.toBeNull();
    const asset = await new ApiSession().get(script![1]);
    expect(asset.status).toBe(200);
  });
});
