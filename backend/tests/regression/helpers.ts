// Wspólne narzędzia testów regresji R (docs/etap-2/REGRESJA.md).
// Testy wołają PRAWDZIWY, uruchomiony serwer po HTTP – bez mocków.
// Adres serwera: REGRESSION_BASE_URL (domyślnie http://127.0.0.1:3000).
import { randomBytes, randomInt } from 'crypto';

export const BASE_URL = (process.env.REGRESSION_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
export const ADMIN_CREDENTIALS = { username: 'admin', password: 'Admin123!' } as const;

export interface ApiResponse<T = any> {
  status: number;
  headers: Headers;
  body: T;
  raw: Buffer;
}

export interface RequestOptions {
  /** Ciało JSON. */
  json?: unknown;
  /** Ciało multipart (np. przesyłanie plików). */
  form?: FormData;
  /** Czy dołączyć nagłówek Authorization (domyślnie tak, jeśli sesja ma token). */
  auth?: boolean;
  /** Czy dołączyć nagłówek X-CSRF-Token (domyślnie tak dla metod zmieniających stan). */
  csrf?: boolean;
}

/** Krótki, unikalny sufiks do nazw danych testowych. */
export function unique(prefix = 'reg'): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

function parseSetCookie(headers: Headers): Array<[string, string]> {
  const values = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : (headers.get('set-cookie') ? [headers.get('set-cookie') as string] : []);
  return values.map(value => {
    const pair = value.split(';')[0];
    const index = pair.indexOf('=');
    return [pair.slice(0, index).trim(), pair.slice(index + 1).trim()];
  });
}

/**
 * Sesja HTTP jak w przeglądarce: token dostępu i ciasteczka (refreshToken, csrf-token).
 * Ciasteczka obsługujemy ręcznie, bo w produkcji mają flagę Secure, a test działa po HTTP.
 */
export class ApiSession {
  accessToken: string | null = null;
  readonly cookies = new Map<string, string>();

  get csrfToken(): string | undefined {
    return this.cookies.get('csrf-token');
  }

  async request<T = any>(method: string, path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {};
    const upper = method.toUpperCase();
    if (options.auth !== false && this.accessToken) headers.Authorization = ['Bearer', this.accessToken].join(' ');
    if (this.cookies.size) {
      headers.Cookie = [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    }
    const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(upper);
    if (mutating && options.csrf !== false && this.csrfToken) headers['X-CSRF-Token'] = this.csrfToken;
    let body: string | FormData | undefined;
    if (options.form) {
      body = options.form;
    } else if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.json);
    }

    const response = await fetch(`${BASE_URL}${path}`, { method: upper, headers, body, redirect: 'manual' });
    for (const [name, value] of parseSetCookie(response.headers)) {
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
    const raw = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || '';
    let parsed: any = raw;
    if (contentType.includes('application/json')) {
      parsed = raw.length ? JSON.parse(raw.toString('utf8')) : null;
    } else if (contentType.startsWith('text/')) {
      parsed = raw.toString('utf8');
    }
    return { status: response.status, headers: response.headers, body: parsed as T, raw };
  }

  get<T = any>(path: string, options?: RequestOptions) { return this.request<T>('GET', path, options); }
  post<T = any>(path: string, json?: unknown, options?: RequestOptions) { return this.request<T>('POST', path, { json, ...options }); }
  put<T = any>(path: string, json?: unknown, options?: RequestOptions) { return this.request<T>('PUT', path, { json, ...options }); }
  delete<T = any>(path: string, options?: RequestOptions) { return this.request<T>('DELETE', path, options); }
}

/** Loguje użytkownika i zwraca sesję oraz surową odpowiedź logowania. */
export async function login(username: string, password: string): Promise<{ session: ApiSession; response: ApiResponse }> {
  const session = new ApiSession();
  const response = await session.post('/api/auth/login', { username, password });
  if (response.status === 200) session.accessToken = response.body.data.accessToken;
  return { session, response };
}

/** Sesja administratora (dane z seedera). */
export async function loginAdmin(): Promise<ApiSession> {
  const { session, response } = await login(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
  if (response.status !== 200) {
    throw new Error(`Logowanie admina nie powiodło się: HTTP ${response.status} ${JSON.stringify(response.body)}`);
  }
  return session;
}

/** Zwraca ciało odpowiedzi albo rzuca czytelny błąd z jej treścią. */
export function expectStatus<T = any>(response: ApiResponse<T>, status: number, what: string): T {
  if (response.status !== status) {
    const body = Buffer.isBuffer(response.body) ? `<${response.raw.length} B>` : JSON.stringify(response.body);
    throw new Error(`${what}: oczekiwano HTTP ${status}, otrzymano ${response.status}: ${body}`);
  }
  return response.body;
}

export async function currentUserId(session: ApiSession): Promise<number> {
  const me = expectStatus(await session.get('/api/auth/me'), 200, 'GET /api/auth/me');
  return (me.data?.user?.id ?? me.data?.id) as number;
}

export async function roleIdByName(admin: ApiSession, name: string): Promise<number> {
  const body = expectStatus(await admin.get('/api/admin/roles'), 200, 'GET /api/admin/roles');
  const roles: Array<{ id: number; name: string }> = body.data ?? body;
  const role = roles.find(item => item.name === name);
  if (!role) throw new Error(`Brak roli ${name}`);
  return role.id;
}

function randomLetters(length: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('');
}

/** Tworzy użytkownika z podaną rolą i zwraca jego dane logowania. */
export async function createUser(admin: ApiSession, roleName: string): Promise<{ id: number; username: string; password: string }> {
  const roleId = await roleIdByName(admin, roleName);
  const username = unique(roleName).replace(/-/g, '_');
  const password = `Regresja!${randomBytes(4).toString('hex')}`;
  const response = await admin.post('/api/users', {
    username,
    email: `${username}@example.test`,
    firstName: 'Test',
    lastName: 'Regresji',
    roleId,
    password,
    employeeCode: randomLetters(5),
  });
  const body = expectStatus(response, 201, 'POST /api/users');
  return { id: body.data.id, username, password };
}

export async function firstTaskTypeId(session: ApiSession): Promise<number> {
  const body = expectStatus(await session.get('/api/task-types'), 200, 'GET /api/task-types');
  if (!body.data?.length) throw new Error('Brak typów zadań');
  return body.data[0].id;
}

export interface CreatedContract { id: number; contractNumber: string; customName: string }

export async function createContract(admin: ApiSession): Promise<CreatedContract> {
  const customName = unique('Kontrakt regresji');
  const response = await admin.post('/api/contracts', {
    customName,
    orderDate: new Date().toISOString().slice(0, 10),
    managerCode: 'REG',
    projectManagerId: await currentUserId(admin),
  });
  return expectStatus(response, 201, 'POST /api/contracts').data;
}

export interface CreatedTask { id: number; taskNumber: string; contractId: number | null; title: string }

export async function createTask(
  admin: ApiSession,
  input: { contractId?: number; taskTypeId?: number; title?: string } = {},
): Promise<CreatedTask> {
  const response = await admin.post('/api/tasks', {
    title: input.title ?? unique('Zadanie regresji'),
    taskTypeId: input.taskTypeId ?? await firstTaskTypeId(admin),
    ...(input.contractId !== undefined ? { contractId: input.contractId } : {}),
  });
  return expectStatus(response, 201, 'POST /api/tasks').data;
}

/** Minimalny poprawny obraz PNG 1×1 px. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export interface FormScenario {
  admin: ApiSession;
  contract: CreatedContract;
  task: CreatedTask;
  templateId: number;
  versionId: number;
  instanceId: number;
  headerText: string;
  footerText: string;
  bomCategory: string;
  materialName: string;
  plannedQty: number;
}

/**
 * Buduje scenariusz formularza R5: pozycja BOM dla typu zadania → kontrakt → zadanie →
 * nagłówek i stopka → szablon → wersja robocza → publikacja → formularz dla zadania.
 * Sekcje „Dane zadania” i „Materiały” są sprawdzane w PDF (R7).
 */
export async function createFormScenario(admin?: ApiSession): Promise<FormScenario> {
  const session = admin ?? await loginAdmin();
  const suffix = unique('r');
  const taskTypeId = await firstTaskTypeId(session);
  const bomCategory = `regresja-${suffix}`;
  const materialName = 'Kabel światłowodowy żółty';
  const plannedQty = 5;
  expectStatus(await session.post('/api/bom/templates', {
    taskTypeId, materialName, unit: 'm', defaultQuantity: plannedQty, category: bomCategory, active: true,
  }), 201, 'POST /api/bom/templates');

  const contract = await createContract(session);
  const task = await createTask(session, { contractId: contract.id, taskTypeId });

  const headerText = 'Nagłówek regresji';
  const footerText = 'Stopka regresji';
  const header = expectStatus(await session.post('/api/forms/branding', {
    name: `Nagłówek ${suffix}`, kind: 'HEADER', mode: 'CUSTOM', heightMm: 18, isDefault: false,
    layout: {
      columns: { left: [{ type: 'text', text: headerText }], center: [], right: [{ type: 'variable', source: 'task.number' }] },
      separator: true,
    },
  }), 201, 'POST /api/forms/branding (nagłówek)').data;
  const footer = expectStatus(await session.post('/api/forms/branding', {
    name: `Stopka ${suffix}`, kind: 'FOOTER', mode: 'CUSTOM', heightMm: 14, isDefault: false,
    layout: {
      columns: { left: [{ type: 'text', text: footerText }], center: [], right: [{ type: 'pageNumber' }] },
      separator: true,
    },
  }), 201, 'POST /api/forms/branding (stopka)').data;

  const template = expectStatus(await session.post('/api/forms/templates', {
    key: suffix,
    name: `Protokół regresji ${suffix}`,
    procedureType: 'FIELD_INSTALLATION',
  }), 201, 'POST /api/forms/templates').data;
  const draft = expectStatus(await session.post(`/api/forms/templates/${template.id}/draft`, {}), 201,
    'POST /api/forms/templates/:id/draft').data;

  expectStatus(await session.put(`/api/forms/versions/${draft.id}/draft`, {
    title: 'Protokół montażu – regresja',
    description: 'Formularz testu regresji Etapu 2.',
    headerId: header.id,
    footerId: footer.id,
    sections: [
      {
        key: 'dane', title: 'Dane zadania', sortOrder: 1,
        fields: [
          { key: 'numer_zadania', label: 'Numer zadania', fieldType: 'DATA', sortOrder: 1,
            options: { source: 'task.number', mode: 'readonly', valueType: 'string' } },
          { key: 'numer_kontraktu', label: 'Numer kontraktu', fieldType: 'DATA', sortOrder: 2,
            options: { source: 'task.contract.number', mode: 'readonly', valueType: 'string' } },
          { key: 'wynik', label: 'Wynik sprawdzenia', fieldType: 'PASS_FAIL', required: true, sortOrder: 3 },
        ],
      },
      {
        key: 'materialy', title: 'Materiały', sortOrder: 2,
        fields: [
          { key: 'bom', label: 'Zestawienie materiałów', fieldType: 'BOM_TABLE', sortOrder: 1,
            options: { columns: ['plannedQty', 'installedQty', 'installed', 'note'], filter: bomCategory } },
        ],
      },
      {
        key: 'uwagi', title: 'Uwagi końcowe', sortOrder: 3,
        fields: [{ key: 'opis', label: 'Opis prac', fieldType: 'TEXTAREA', sortOrder: 1 }],
      },
    ],
  }), 200, 'PUT /api/forms/versions/:id/draft');
  expectStatus(await session.post(`/api/forms/versions/${draft.id}/publish`, {}), 200, 'POST /api/forms/versions/:id/publish');

  const instance = expectStatus(await session.post('/api/forms/instances', {
    templateVersionId: draft.id, taskId: task.id, contractId: contract.id,
  }), 201, 'POST /api/forms/instances').data;

  // Długi opis wymusza kilka stron PDF (nagłówek i stopka muszą być na każdej).
  const longNote = Array.from({ length: 60 }, (_, index) =>
    `Punkt ${index + 1}: sprawdzono zamocowanie, oznaczenie i ciągłość połączeń – wynik zgodny z projektem.`).join(' ');
  expectStatus(await session.put(`/api/forms/instances/${instance.id}/values`, { responses: { opis: longNote } }), 200,
    'PUT /api/forms/instances/:id/values (opis)');

  return {
    admin: session, contract, task, templateId: template.id, versionId: draft.id, instanceId: instance.id,
    headerText, footerText, bomCategory, materialName, plannedQty,
  };
}

/** Wartości formularza jako mapa: klucz pola → wartość. */
export async function formValues(session: ApiSession, versionId: number, instanceId: number): Promise<Record<string, any>> {
  const version = expectStatus(await session.get(`/api/forms/versions/${versionId}`), 200, 'GET /api/forms/versions/:id').data;
  const values = expectStatus(await session.get(`/api/forms/instances/${instanceId}/values`), 200,
    'GET /api/forms/instances/:id/values').data;
  const keyById = new Map<number, string>(version.fields.map((field: { id: number; key: string }) => [field.id, field.key]));
  return Object.fromEntries(values.map((value: { fieldDefinitionId: number; value: unknown }) =>
    [keyById.get(value.fieldDefinitionId), value.value]));
}
