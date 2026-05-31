/**
 * metadataMerge.ts
 * Bezpieczne funkcje do odczytu i zapisu task.metadata.
 * Zabezpieczają przed problemem podwójnych ścieżek (configParams.lcsConfig vs lcsConfig).
 */

/**
 * Odczytuje lcsConfig z metadanych w bezpieczny sposób.
 * Obsługuje obie ścieżki (stara: configParams.lcsConfig, nowa: lcsConfig).
 * Zawsze zwraca obiekt lub undefined — nigdy nie rzuca błędu.
 */
export function readLcsConfig(metadata: Record<string, unknown>): Record<string, unknown> | undefined {
  try {
    // Nowa ścieżka (docelowa): task.metadata.lcsConfig
    if (metadata?.lcsConfig && typeof metadata.lcsConfig === 'object') {
      return metadata.lcsConfig as Record<string, unknown>;
    }
    // Stara ścieżka (backward compat): task.metadata.configParams.lcsConfig
    const cp = metadata?.configParams;
    if (cp && typeof cp === 'object' && 'lcsConfig' in (cp as object)) {
      const legacy = (cp as Record<string, unknown>).lcsConfig;
      return legacy && typeof legacy === 'object' ? legacy as Record<string, unknown> : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Odczytuje nastawniConfig z metadanych w bezpieczny sposób.
 * Obsługuje obie ścieżki.
 */
export function readNastawniConfig(metadata: Record<string, unknown>): Record<string, unknown> | undefined {
  try {
    if (metadata?.nastawniConfig && typeof metadata.nastawniConfig === 'object') {
      return metadata.nastawniConfig as Record<string, unknown>;
    }
    const cp = metadata?.configParams;
    if (cp && typeof cp === 'object' && 'nastawniConfig' in (cp as object)) {
      const legacy = (cp as Record<string, unknown>).nastawniConfig;
      return legacy && typeof legacy === 'object' ? legacy as Record<string, unknown> : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Bezpieczne scalanie metadanych zadania z nowym lcsConfig.
 * Zawsze zapisuje na docelowej ścieżce: task.metadata.lcsConfig
 * NIGDY nie usuwa istniejących danych — merge, nie replace.
 */
export function mergeLcsConfigToMetadata(
  existingMetadata: Record<string, unknown>,
  lcsConfig: Record<string, unknown>
): Record<string, unknown> {
  const safeMetadata =
    existingMetadata && typeof existingMetadata === 'object'
      ? existingMetadata
      : ({} as Record<string, unknown>);
  const existing = readLcsConfig(safeMetadata) ?? {};
  return {
    ...safeMetadata,
    lcsConfig: { ...existing, ...lcsConfig },
  };
}

/**
 * Bezpieczne scalanie metadanych zadania z nowym nastawniConfig.
 */
export function mergeNastawniConfigToMetadata(
  existingMetadata: Record<string, unknown>,
  nastawniConfig: Record<string, unknown>
): Record<string, unknown> {
  const safeMetadata =
    existingMetadata && typeof existingMetadata === 'object'
      ? existingMetadata
      : ({} as Record<string, unknown>);
  const existing = readNastawniConfig(safeMetadata) ?? {};
  return {
    ...safeMetadata,
    nastawniConfig: { ...existing, ...nastawniConfig },
  };
}
