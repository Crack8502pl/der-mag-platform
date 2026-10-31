import { VariableEngineController } from '../../../src/controllers/VariableEngineController';

describe('VariableEngineController', () => {
  it('returns localized variable labels, groups and form availability for task sources', async () => {
    const response = { json: jest.fn() };
    await VariableEngineController.listVariables({} as any, response as any);
    const variables = response.json.mock.calls[0][0].data;

    expect(variables).toEqual(expect.arrayContaining([
      expect.objectContaining({
        expression: 'task.location',
        label: 'Lokalizacja zadania',
        group: 'Zadanie',
        usableInForms: true,
      }),
      expect.objectContaining({
        expression: 'task.brigade.name',
        label: 'Nazwa brygady przypisanej do zadania',
        group: 'Zadanie',
        usableInForms: true,
      }),
      expect.objectContaining({
        expression: 'contract.customer.nip',
        usableInForms: false,
      }),
    ]));
  });
});
