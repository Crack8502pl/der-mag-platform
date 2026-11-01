// R12 – Istniejące kreatory i wyzwalacze.
import { expectStatus, loginAdmin, unique } from './helpers';

describe('R12: kreatory i wyzwalacze', () => {
  it('POST i GET /api/wizard-drafts/contract-wizard zapisuje i zwraca wersję roboczą kreatora kontraktu', async () => {
    const admin = await loginAdmin();
    const marker = unique('Kontrakt z kreatora');
    const draftData = { contractData: { customName: marker, managerCode: 'REG' }, subsystems: [] };
    expectStatus(await admin.post('/api/wizard-drafts/contract-wizard', { draftData, currentStep: 2, metadata: { version: '1.0' } }),
      200, 'POST /api/wizard-drafts/contract-wizard');

    const draft = expectStatus(await admin.get('/api/wizard-drafts/contract-wizard'), 200, 'GET /api/wizard-drafts/contract-wizard').data;
    expect(draft.draftData).toEqual(draftData);
    expect(draft.currentStep).toBe(2);
  });

  it('GET /api/bom-triggers = 200 dla admina', async () => {
    const admin = await loginAdmin();
    const response = await admin.get('/api/bom-triggers');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
