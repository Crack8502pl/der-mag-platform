/**
 * cameraCountUtils.ts
 * Centralny moduł obliczania liczby kamer dla BOM Wizarda.
 *
 * Reguły priorytetyzacji:
 * 1. Live configValues z aktualnej sesji Wizarda (najwyższy priorytet)
 * 2. Wcześniej zapisane task.metadata.lcsConfig.iloscKamer / nastawniConfig.iloscKamer
 * 3. Dane strukturalne (serwerObrazu.maxKamer, przypisaneKamery.length)
 * 4. Fallback: obserwowanePrzejazdy * 2
 * 5. Zwróć 0 (nigdy nie rzucaj błędu)
 */

/**
 * Sumuje kamery z configValues (live dane z Wizarda).
 * Klucze zawierające "kamer" w nazwie (case-insensitive), z wykluczeniem kluczy modeli.
 */
export function sumCamerasFromConfigValues(
  configValues: Record<string, unknown>
): number {
  if (!configValues || typeof configValues !== 'object') {
    return 0;
  }

  return Object.entries(configValues)
    .filter(([key]) => {
      const lower = key.toLowerCase();
      return (
        lower.includes('kamer') &&
        !lower.includes('model') &&
        !lower.includes('selected')
      );
    })
    .reduce((sum, [, val]) => {
      const n = Number(val);
      return sum + (Number.isFinite(n) && n > 0 ? n : 0);
    }, 0);
}

export interface ExtractCameraCountParams {
  taskTypeCode: string;
  subsystemType: string;
  configValues: Record<string, unknown>;
  metadata: Record<string, unknown>;
  isStandaloneNastawnia: boolean;
}

/**
 * Główna funkcja obliczania cameraCount.
 * Nigdy nie rzuca błędu — zawsze zwraca liczbę >= 0.
 */
export function extractCameraCount(params: ExtractCameraCountParams): number {
  try {
    const { taskTypeCode, subsystemType, configValues, metadata, isStandaloneNastawnia } = params;

    // Priorytet 1: live configValues z Wizarda
    const liveCount = sumCamerasFromConfigValues(configValues);
    if (liveCount > 0) return liveCount;

    // Priorytet 2: SMOKIP_B LCS — serwer obrazu
    if (taskTypeCode === 'LCS' && subsystemType === 'SMOKIP_B') {
      const lcsB = safeGet<{ serwerObrazu?: { maxKamer?: unknown } }>(metadata, 'lcsConfig');
      return toPositiveInt(lcsB?.serwerObrazu?.maxKamer);
    }

    // Priorytet 3: SMOKIP_A LCS — zapisane iloscKamer lub przejazdy * 2
    if (taskTypeCode === 'LCS') {
      const lcsA = safeGet<{ iloscKamer?: unknown; obserwowanePrzejazdy?: unknown[] }>(metadata, 'lcsConfig');
      const storedCount = toPositiveInt(lcsA?.iloscKamer);
      if (storedCount > 0) return storedCount;
      return (Array.isArray(lcsA?.obserwowanePrzejazdy) ? lcsA.obserwowanePrzejazdy.length : 0) * 2;
    }

    // Priorytet 4: NASTAWNIA samodzielna
    if (taskTypeCode === 'NASTAWNIA' && isStandaloneNastawnia) {
      const nd = safeGet<{ iloscKamer?: unknown; obserwowanePrzejazdy?: unknown[] }>(metadata, 'nastawniConfig');
      const storedCount = toPositiveInt(nd?.iloscKamer);
      if (storedCount > 0) return storedCount;
      return Array.isArray(nd?.obserwowanePrzejazdy) ? nd.obserwowanePrzejazdy.length : 0;
    }

    // Priorytet 5: NASTAWNIA podległa (nie potrzebuje własnego rejestratora)
    if (taskTypeCode === 'NASTAWNIA' && !isStandaloneNastawnia) {
      const nd = safeGet<{ stacjaOperatorska?: { przypisaneKamery?: unknown[] } }>(metadata, 'nastawniConfig');
      return Array.isArray(nd?.stacjaOperatorska?.przypisaneKamery)
        ? nd.stacjaOperatorska.przypisaneKamery.length
        : 0;
    }

    return 0;
  } catch {
    // Defensywny fallback — nigdy nie przerywaj Wizarda
    return 0;
  }
}

/** Bezpieczne zagnieżdżone odczytanie klucza z obiektu */
function safeGet<T>(obj: unknown, key: string): T | undefined {
  if (obj && typeof obj === 'object' && key in (obj as object)) {
    return (obj as Record<string, unknown>)[key] as T;
  }
  return undefined;
}

/** Konwersja na dodatnią liczbę całkowitą, lub 0 */
function toPositiveInt(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}
