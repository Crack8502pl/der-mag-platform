// R5 – Formularze: szablon → wersja → publikacja → formularz dla zadania, dane systemowe,
// pole tylko do odczytu, Tabela BOM, blokada FAIL, zakończenie i akceptacja.
import { createFormScenario, expectStatus, formValues, FormScenario } from './helpers';

describe('R5: formularze', () => {
  let scenario: FormScenario;

  beforeAll(async () => {
    scenario = await createFormScenario();
  });

  const putValues = (responses: Record<string, unknown>) =>
    scenario.admin.put(`/api/forms/instances/${scenario.instanceId}/values`, { responses });

  const bomRow = async () => (await formValues(scenario.admin, scenario.versionId, scenario.instanceId)).bom[0];

  it('pola „Dane z systemu” są wypełnione danymi zadania i kontraktu', async () => {
    const values = await formValues(scenario.admin, scenario.versionId, scenario.instanceId);
    expect(values.numer_zadania).toBe(scenario.task.taskNumber);
    expect(values.numer_kontraktu).toBe(scenario.contract.contractNumber);
  });

  it('pole tylko do odczytu odrzuca zmianę', async () => {
    const response = await putValues({ numer_zadania: 'Z99999999' });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_RESPONSES');
    const values = await formValues(scenario.admin, scenario.versionId, scenario.instanceId);
    expect(values.numer_zadania).toBe(scenario.task.taskNumber);
  });

  it('Tabela BOM zawiera pozycje zadania', async () => {
    const values = await formValues(scenario.admin, scenario.versionId, scenario.instanceId);
    expect(values.bom).toEqual([expect.objectContaining({
      name: scenario.materialName, unit: 'm', plannedQty: scenario.plannedQty, installedQty: null, installed: false,
    })]);
  });

  it('Tabela BOM odrzuca „zamontowane” przy ilości 0', async () => {
    const row = await bomRow();
    const response = await putValues({ bom: [{ ...row, installed: true, installedQty: 0 }] });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_RESPONSES');
  });

  it('Tabela BOM odrzuca ilość większą niż plan bez uwag', async () => {
    const row = await bomRow();
    const response = await putValues({ bom: [{ ...row, installed: true, installedQty: scenario.plannedQty + 2, note: '' }] });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_RESPONSES');
  });

  it('Tabela BOM odrzuca zmianę ilości planowanej', async () => {
    const row = await bomRow();
    const response = await putValues({ bom: [{ ...row, plannedQty: scenario.plannedQty + 1 }] });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_RESPONSES');
  });

  it('odpowiedź FAIL blokuje zakończenie; zakończenie i akceptacja działają', async () => {
    const row = await bomRow();
    expectStatus(await putValues({
      wynik: 'FAIL',
      bom: [{ ...row, installed: true, installedQty: scenario.plannedQty + 1, note: 'Dodatkowy odcinek zapasu' }],
    }), 200, 'zapis odpowiedzi FAIL');

    const blocked = await scenario.admin.post(`/api/forms/instances/${scenario.instanceId}/complete`, {});
    expect(blocked.status).toBe(400);
    expect(JSON.stringify(blocked.body.details ?? blocked.body)).toContain('wynik');

    expectStatus(await putValues({ wynik: 'PASS' }), 200, 'zapis odpowiedzi PASS');
    const completed = expectStatus(await scenario.admin.post(`/api/forms/instances/${scenario.instanceId}/complete`, {}),
      200, 'POST /complete');
    expect(completed.data.status).toBe('SUBMITTED');

    expectStatus(await scenario.admin.post(`/api/forms/instances/${scenario.instanceId}/approve`, { comment: 'Zatwierdzono w teście regresji' }),
      200, 'POST /approve');
    const instance = expectStatus(await scenario.admin.get(`/api/forms/instances/${scenario.instanceId}`), 200, 'GET instancji');
    expect(instance.data.status).toBe('APPROVED');
  });
});
