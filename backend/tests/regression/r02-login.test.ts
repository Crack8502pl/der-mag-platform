// R2 – Logowanie, odświeżenie tokenu, CSRF.
import { ADMIN_CREDENTIALS, ApiSession, expectStatus, login, unique } from './helpers';

describe('R2: logowanie', () => {
  it('admin / Admin123! = 200 i wymuszenie zmiany hasła', async () => {
    const { session, response } = await login(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.username).toBe('admin');
    expect(response.body.data.requirePasswordChange).toBe(true);
    expect(typeof response.body.data.accessToken).toBe('string');
    expect(session.cookies.get('refreshToken')).toBeTruthy();
    expect(session.csrfToken).toBeTruthy();
  });

  it('złe hasło = 401 „Błędne hasło”', async () => {
    const { response } = await login(ADMIN_CREDENTIALS.username, 'Zle-haslo-123!');
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Błędne hasło');
  });

  it('nieistniejący login = 404', async () => {
    const { response } = await login(unique('nie_ma').replace(/-/g, '_'), 'Cokolwiek123!');
    expect(response.status).toBe(404);
  });

  it('odświeżenie tokenu działa', async () => {
    const { session } = await login(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    const oldToken = session.accessToken;
    const refreshed = expectStatus(await session.post('/api/auth/refresh', {}), 200, 'POST /api/auth/refresh');
    const newToken = refreshed.data.accessToken;
    expect(typeof newToken).toBe('string');
    expect(newToken).not.toBe(oldToken);
    session.accessToken = newToken;
    expectStatus(await session.get('/api/auth/me'), 200, 'GET /api/auth/me po odświeżeniu');
  });

  it('zapis bez nagłówka CSRF = 403', async () => {
    const { session } = await login(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    const response = await session.post('/api/wizard-drafts/contract-wizard', { draftData: { krok: 1 } }, { csrf: false });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CSRF_TOKEN_REQUIRED');
  });

  it('/api/users bez tokenu = 401', async () => {
    const response = await new ApiSession().get('/api/users');
    expect(response.status).toBe(401);
  });
});
