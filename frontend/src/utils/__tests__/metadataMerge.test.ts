import { describe, expect, it } from 'vitest';
import {
  mergeLcsConfigToMetadata,
  mergeNastawniConfigToMetadata,
  readLcsConfig,
  readNastawniConfig,
} from '../metadataMerge';

describe('metadataMerge', () => {
  it('readLcsConfig reads legacy configParams.lcsConfig path', () => {
    const result = readLcsConfig({
      configParams: { lcsConfig: { iloscKamer: 7 } },
    });
    expect(result).toEqual({ iloscKamer: 7 });
  });

  it('readLcsConfig reads new metadata.lcsConfig path', () => {
    const result = readLcsConfig({
      lcsConfig: { iloscKamer: 8 },
      configParams: { lcsConfig: { iloscKamer: 1 } },
    });
    expect(result).toEqual({ iloscKamer: 8 });
  });

  it('mergeLcsConfigToMetadata merges without overwriting unrelated fields', () => {
    const merged = mergeLcsConfigToMetadata(
      {
        subsystemType: 'SMOKIP_A',
        lcsConfig: { obserwowanePrzejazdy: [11] },
      },
      { iloscKamer: 5 }
    );
    expect(merged).toEqual({
      subsystemType: 'SMOKIP_A',
      lcsConfig: { obserwowanePrzejazdy: [11], iloscKamer: 5 },
    });
  });

  it('reads and merges nastawni config with backward compatibility', () => {
    const existing = readNastawniConfig({
      configParams: { nastawniConfig: { obserwowanePrzejazdy: [1, 2] } },
    });
    expect(existing).toEqual({ obserwowanePrzejazdy: [1, 2] });

    const merged = mergeNastawniConfigToMetadata(
      { configParams: { nastawniConfig: { obserwowanePrzejazdy: [1, 2] } } },
      { iloscKamer: 2 }
    );
    expect(merged.nastawniConfig).toEqual({ obserwowanePrzejazdy: [1, 2], iloscKamer: 2 });
  });

  it('never throws for null/undefined/garbage input', () => {
    expect(() => readLcsConfig(null as unknown as Record<string, unknown>)).not.toThrow();
    expect(() => readNastawniConfig(undefined as unknown as Record<string, unknown>)).not.toThrow();
    expect(() =>
      mergeLcsConfigToMetadata(undefined as unknown as Record<string, unknown>, { iloscKamer: 1 })
    ).not.toThrow();
  });
});
