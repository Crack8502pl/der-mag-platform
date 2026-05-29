import { buildPdfHorizontalSplitPlan, CONTINUATION_TAB_MM } from '../utils/pdfExport';

describe('buildPdfHorizontalSplitPlan', () => {
  const availW = 400;
  const availH = 277;
  const canvasHeight = 1000;

  it('returns numPages === 1 when topology fits one A3 page horizontally', () => {
    const plan = buildPdfHorizontalSplitPlan(1400, canvasHeight, availW, availH);
    expect(plan.numPages).toBe(1);
    expect(plan.slices).toHaveLength(1);
  });

  it('returns numPages === 1 when total width exactly equals availW', () => {
    const plan = buildPdfHorizontalSplitPlan(400, 277, availW, availH);
    expect(plan.numPages).toBe(1);
    expect(plan.slices).toHaveLength(1);
  });

  it('returns numPages === 2 when topology is ~2x A3 width', () => {
    const plan = buildPdfHorizontalSplitPlan(2888, canvasHeight, availW, availH);
    expect(plan.numPages).toBe(2);
    expect(plan.slices).toHaveLength(2);
  });

  it('returns numPages === 3 when topology is ~3x A3 width', () => {
    const plan = buildPdfHorizontalSplitPlan(4332, canvasHeight, availW, availH);
    expect(plan.numPages).toBe(3);
    expect(plan.slices).toHaveLength(3);
  });

  it('calculates correct sliceWidthPx for each page', () => {
    const plan = buildPdfHorizontalSplitPlan(4332, canvasHeight, availW, availH);
    expect(plan.slices.map(slice => slice.sliceWidthPx)).toEqual([1437, 1437, 1444]);
  });

  it('keeps last page slice within canvas.width', () => {
    const plan = buildPdfHorizontalSplitPlan(4300, canvasHeight, availW, availH);
    const lastSlice = plan.slices[plan.slices.length - 1];
    expect(lastSlice.startXPx + lastSlice.sliceWidthPx).toBeLessThanOrEqual(4300);
  });

  it('uses 2mm continuation tab on every non-last page', () => {
    const plan = buildPdfHorizontalSplitPlan(4332, canvasHeight, availW, availH);
    const nonLast = plan.slices.slice(0, -1);
    expect(nonLast.every(slice => slice.pageContentWidthMm === availW - CONTINUATION_TAB_MM)).toBe(true);
  });
});
