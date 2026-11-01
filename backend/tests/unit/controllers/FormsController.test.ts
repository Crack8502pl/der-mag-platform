import { polishFormErrorDetails } from '../../../src/controllers/FormsController';

describe('polishFormErrorDetails', () => {
  it('translates BOM planned quantity and failed completion errors', () => {
    expect(polishFormErrorDetails({
      errors: [
        'materials: BOM item plannedQty cannot be changed',
        'result: FAIL blocks completion',
      ],
    })).toEqual({
      errors: [
        'materials: nie można zmieniać planowanej ilości pozycji BOM',
        'result: odpowiedź „Nie OK” uniemożliwia ukończenie formularza',
      ],
    });
  });
});
