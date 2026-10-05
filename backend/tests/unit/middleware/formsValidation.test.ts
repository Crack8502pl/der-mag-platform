import { validate } from '../../../src/middleware/validate';
import { validateFormBody } from '../../../src/middleware/formsValidation';
import { hasUnsafeFormJson, RESERVED_FORM_KEYS } from '../../../src/utils/formJson';
import { validateFormDefinition } from '../../../src/services/FormRules';

jest.mock('../../../src/middleware/validate', () => ({ validate: jest.fn() }));

describe('Forms JSON preflight', () => {
  it.each(RESERVED_FORM_KEYS)('rejects reserved dictionary key %s and reserved persisted definition keys', key => {
    expect(hasUnsafeFormJson({ [key]: true })).toBe(true);
    expect(hasUnsafeFormJson({ safe: [{ deeper: { [key]: 'value' } }] })).toBe(true);
    expect(() => validateFormDefinition([{ id: 1, key } as any], [])).toThrow('Reserved section keys');
    expect(() => validateFormDefinition([{ id: 1, key: 'main', conditions: {} } as any], [{
      id: 2, sectionId: 1, key, fieldType: 'TEXT', conditions: {}, validation: {}, options: {},
    } as any])).toThrow('Duplicate, reserved or unlinked field');
  });

  it('accepts scalar/null, normal JSON, and prototype-null dictionaries without modifying them', () => {
    for (const value of [undefined, null, true, 1, 'value']) expect(hasUnsafeFormJson(value)).toBe(false);
    const dictionary = Object.assign(Object.create(null), { result: 'PASS', nested: [null, { count: 5 }] });
    const before = JSON.stringify(dictionary);
    expect(hasUnsafeFormJson(dictionary)).toBe(false);
    expect(JSON.stringify(dictionary)).toBe(before);
    expect(Object.getPrototypeOf(dictionary)).toBeNull();
  });

  it('rejects excessive nesting and cycles without recursive traversal', () => {
    let nested: unknown = {};
    for (let index = 0; index < 51; index++) nested = { next: nested };
    expect(hasUnsafeFormJson(nested)).toBe(true);
    const cycle: any = {};
    cycle.next = cycle;
    expect(hasUnsafeFormJson(cycle)).toBe(true);
  });
});

describe('Forms-local async validation wrapper', () => {
  class Body {}
  let validateDto: jest.Mock;
  let response: any;
  let next: jest.Mock;

  beforeEach(() => {
    validateDto = jest.fn(async (_req, _res, next) => next());
    (validate as jest.Mock).mockReturnValue(validateDto);
    response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    next = jest.fn();
  });

  it('rejects unsafe raw dictionaries before calling class-transformer/class-validator', async () => {
    await validateFormBody(Body)({ body: { responses: { constructor: 'x' } } } as any, response, next);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(validateDto).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('delegates normal payloads to the existing runtime DTO validator', async () => {
    const req = { body: { responses: { result: 'PASS' } } } as any;
    await validateFormBody(Body)(req, response, next);
    expect(validate).toHaveBeenCalledWith(Body);
    expect(validateDto).toHaveBeenCalledWith(req, response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards rejected async validation to Express4 next instead of leaving a hanging request', async () => {
    const error = new Error('Unexpected transform failure');
    validateDto.mockRejectedValue(error);
    await validateFormBody(Body)({ body: {} } as any, response, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});
