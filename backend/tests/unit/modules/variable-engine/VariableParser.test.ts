/**
 * Unit tests – VariableParser
 */

import { VariableParser } from '../../../../src/modules/variable-engine/parser/VariableParser';

describe('VariableParser', () => {
  let parser: VariableParser;

  beforeEach(() => {
    parser = new VariableParser();
  });

  // ── Happy-path ───────────────────────────────────────────────────────────────

  it('returns an empty array for a string with no placeholders', () => {
    expect(parser.parse('Hello world')).toEqual([]);
  });

  it('extracts a single placeholder', () => {
    const tokens = parser.parse('Hello ${name}!');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      raw: '${name}',
      expression: 'name',
      offset: 6
    });
  });

  it('extracts multiple placeholders in order', () => {
    const tokens = parser.parse('${a} and ${b.c}');
    expect(tokens).toHaveLength(2);
    expect(tokens[0].expression).toBe('a');
    expect(tokens[1].expression).toBe('b.c');
  });

  it('trims whitespace inside the expression', () => {
    const tokens = parser.parse('${ camera.total }');
    expect(tokens[0].expression).toBe('camera.total');
  });

  it('records the correct offset for each token', () => {
    const template = 'x${foo}y${bar}z';
    const tokens = parser.parse(template);
    expect(tokens[0].offset).toBe(1);  // after 'x'
    expect(tokens[1].offset).toBe(8);  // after 'x${foo}y'
  });

  it('handles dot-notation expressions', () => {
    const tokens = parser.parse('${fiber.length.total}');
    expect(tokens[0].expression).toBe('fiber.length.total');
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it('skips empty placeholder ${}', () => {
    expect(parser.parse('${}   ${}')).toEqual([]);
  });

  it('skips whitespace-only placeholder', () => {
    expect(parser.parse('${   }')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parser.parse('')).toEqual([]);
  });

  it('handles template with only a placeholder', () => {
    const tokens = parser.parse('${camera.total}');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].raw).toBe('${camera.total}');
    expect(tokens[0].offset).toBe(0);
  });

  it('handles duplicate placeholders', () => {
    const tokens = parser.parse('${x} and ${x}');
    expect(tokens).toHaveLength(2);
    expect(tokens[0].expression).toBe('x');
    expect(tokens[1].expression).toBe('x');
  });

  it('raw field contains the full placeholder including delimiters', () => {
    const tokens = parser.parse('Hello ${ camera.total }');
    expect(tokens[0].raw).toBe('${ camera.total }');
  });

  it('does not extract incomplete placeholder without closing brace', () => {
    expect(parser.parse('${incomplete')).toEqual([]);
  });

  it('does not extract text that looks like placeholder but lacks opening brace', () => {
    expect(parser.parse('name}')).toEqual([]);
  });
});
