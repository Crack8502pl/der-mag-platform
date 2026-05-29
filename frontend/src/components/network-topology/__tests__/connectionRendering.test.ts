import { buildConnectionLabelGeometry } from '../utils/connectionRendering';

describe('buildConnectionLabelGeometry', () => {
  it('rounds noisy distance labels to whole kilometers', () => {
    expect(buildConnectionLabelGeometry(0, 0, 100, 0, 'fiber', '0.13000000000000013 km'))
      .toMatchObject({
        connLabelText: 'FIBER 0 km',
        cx: 50,
        cy: 0,
        readableAngle: 0,
      });
  });

  it('normalizes the angle so text is never upside down', () => {
    expect(buildConnectionLabelGeometry(100, 100, 0, 90, 'lan', '12 km'))
      .toMatchObject({
        connLabelText: 'LAN 12 km',
      });

    const result = buildConnectionLabelGeometry(100, 100, 0, 90, 'lan', '12 km');
    expect(result?.readableAngle).toBeGreaterThan(-90);
    expect(result?.readableAngle).toBeLessThanOrEqual(90);
  });

  it('still renders technology-only labels when distance is missing', () => {
    expect(buildConnectionLabelGeometry(0, 0, 0, 100, 'fiber'))
      .toMatchObject({
        connLabelText: 'FIBER',
        readableAngle: 90,
      });
  });
});
