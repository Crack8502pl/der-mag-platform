// R4 – Kontrakty i zadania.
import { createContract, createTask, expectStatus, loginAdmin } from './helpers';

describe('R4: kontrakty i zadania', () => {
  it('tworzy kontrakt i zadanie z contractId; zadanie dostaje numer Z…', async () => {
    const admin = await loginAdmin();
    const contract = await createContract(admin);
    expect(contract.id).toEqual(expect.any(Number));
    expect(contract.contractNumber).toBeTruthy();

    const task = await createTask(admin, { contractId: contract.id });
    expect(task.taskNumber).toMatch(/^Z\d+/);
    expect(task.contractId).toBe(contract.id);

    const fetched = expectStatus(await admin.get(`/api/tasks/${task.taskNumber}`), 200, 'GET /api/tasks/:taskNumber');
    expect(fetched.data.contractId).toBe(contract.id);
  });
});
