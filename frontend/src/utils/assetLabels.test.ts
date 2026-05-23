// src/utils/assetLabels.test.ts
import {
  getAssetTypeLabel,
  getAssetStatusLabel,
  getAssetStatusBadgeClass,
} from './assetLabels';

describe('getAssetTypeLabel', () => {
  it('"PRZEJAZD" → "🚦 Przejazd"', () => {
    expect(getAssetTypeLabel('PRZEJAZD')).toBe('🚦 Przejazd');
  });

  it('"LCS" → "💻 LCS"', () => {
    expect(getAssetTypeLabel('LCS')).toBe('💻 LCS');
  });

  it('"CUID" → "📡 CUID"', () => {
    expect(getAssetTypeLabel('CUID')).toBe('📡 CUID');
  });

  it('"NASTAWNIA" → "🏢 Nastawnia"', () => {
    expect(getAssetTypeLabel('NASTAWNIA')).toBe('🏢 Nastawnia');
  });

  it('"SKP" → "🖥️ SKP"', () => {
    expect(getAssetTypeLabel('SKP')).toBe('🖥️ SKP');
  });

  it('nieznany typ → zwraca oryginalną wartość', () => {
    expect(getAssetTypeLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('pusty string → zwraca pusty string', () => {
    expect(getAssetTypeLabel('')).toBe('');
  });
});

describe('getAssetStatusLabel', () => {
  it('"planned" → "📅 Planowany"', () => {
    expect(getAssetStatusLabel('planned')).toBe('📅 Planowany');
  });

  it('"installed" → "🔧 Zainstalowany"', () => {
    expect(getAssetStatusLabel('installed')).toBe('🔧 Zainstalowany');
  });

  it('"active" → "✅ Aktywny"', () => {
    expect(getAssetStatusLabel('active')).toBe('✅ Aktywny');
  });

  it('"in_service" → "🛠️ W serwisie"', () => {
    expect(getAssetStatusLabel('in_service')).toBe('🛠️ W serwisie');
  });

  it('"faulty" → "⚠️ Awaria"', () => {
    expect(getAssetStatusLabel('faulty')).toBe('⚠️ Awaria');
  });

  it('"inactive" → "⚪ Nieaktywny"', () => {
    expect(getAssetStatusLabel('inactive')).toBe('⚪ Nieaktywny');
  });

  it('"decommissioned" → "🚫 Wycofany"', () => {
    expect(getAssetStatusLabel('decommissioned')).toBe('🚫 Wycofany');
  });

  it('nieznany status → zwraca oryginalną wartość', () => {
    expect(getAssetStatusLabel('unknown_status')).toBe('unknown_status');
  });
});

describe('getAssetStatusBadgeClass', () => {
  it('"planned" → "status-planned"', () => {
    expect(getAssetStatusBadgeClass('planned')).toBe('status-planned');
  });

  it('"installed" → "status-installed"', () => {
    expect(getAssetStatusBadgeClass('installed')).toBe('status-installed');
  });

  it('"active" → "status-active"', () => {
    expect(getAssetStatusBadgeClass('active')).toBe('status-active');
  });

  it('"in_service" → "status-in-service"', () => {
    expect(getAssetStatusBadgeClass('in_service')).toBe('status-in-service');
  });

  it('"faulty" → "status-faulty"', () => {
    expect(getAssetStatusBadgeClass('faulty')).toBe('status-faulty');
  });

  it('"inactive" → "status-inactive"', () => {
    expect(getAssetStatusBadgeClass('inactive')).toBe('status-inactive');
  });

  it('"decommissioned" → "status-decommissioned"', () => {
    expect(getAssetStatusBadgeClass('decommissioned')).toBe('status-decommissioned');
  });

  it('nieznany status → "status-default"', () => {
    expect(getAssetStatusBadgeClass('unknown')).toBe('status-default');
  });

  it('pusty string → "status-default"', () => {
    expect(getAssetStatusBadgeClass('')).toBe('status-default');
  });
});
