import React, { useCallback, useEffect, useState } from 'react';
import { warehouseStockService } from '../../services/warehouseStock.service';
import slicanAudioService from '../../services/slicanAudio.service';
import type { WarehouseStock } from '../../types/warehouseStock.types';
import type {
  SlicanCentralSpecification,
  SlicanCentralSpecificationDTO,
  SlicanLicenseDemandField,
  SlicanLicensePackageSize,
  SlicanLicenseSpecification,
  SlicanLicenseSpecificationDTO,
  SlicanLicenseType
} from '../../types/slicanAudio.types';
import '../../styles/grover-theme.css';
import './SlicanAudioTab.css';

interface SlicanAudioTabProps {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

type Section = 'centrals' | 'licenses';

const centralLimitFields = [
  ['maxSipVoipSubscribers', 'Maks. abonenci VoIP'],
  ['maxDphIpDevices', 'Maks. urządzenia DPH.IP'],
  ['maxAudioIpDevices', 'Maks. urządzenia Audio.IP'],
  ['maxIvrChannels', 'Maks. kanały IVR'],
  ['maxConferenceChannels', 'Maks. kanały konferencyjne']
] as const;

const licenseTypes: Array<{ value: SlicanLicenseType; label: string }> = [
  { value: 'VOIP_SUBSCRIBER', label: 'Abonenci VoIP' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'IVR', label: 'IVR' },
  { value: 'CONFERENCE', label: 'Konferencje' }
];

const demandFields: Array<{ value: SlicanLicenseDemandField; label: string }> = [
  { value: 'sipVoipSubscribers', label: 'Abonenci VoIP' },
  { value: 'audioDevices', label: 'Urządzenia Audio' },
  { value: 'ivrChannels', label: 'Kanały IVR' },
  { value: 'conferenceChannels', label: 'Kanały konferencyjne' }
];

const demandFieldByType: Record<SlicanLicenseType, SlicanLicenseDemandField> = {
  VOIP_SUBSCRIBER: 'sipVoipSubscribers',
  AUDIO: 'audioDevices',
  IVR: 'ivrChannels',
  CONFERENCE: 'conferenceChannels'
};

const licenseTypeLabel = (type: SlicanLicenseType) =>
  licenseTypes.find(option => option.value === type)?.label || type;

const apiErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const err = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
    return err.response?.data?.error || err.response?.data?.message || err.message || 'Błąd komunikacji z API';
  }
  return 'Błąd komunikacji z API';
};

const formatStockLabel = (item?: Pick<WarehouseStock, 'id' | 'catalogNumber' | 'materialName'>) =>
  item ? `[${item.catalogNumber}] ${item.materialName} (ID: ${item.id})` : '';

export const SlicanAudioTab: React.FC<SlicanAudioTabProps> = ({ canCreate, canUpdate, canDelete }) => {
  const [section, setSection] = useState<Section>('centrals');
  const [centrals, setCentrals] = useState<SlicanCentralSpecification[]>([]);
  const [licenses, setLicenses] = useState<SlicanLicenseSpecification[]>([]);
  const [stockLabels, setStockLabels] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filterType, setFilterType] = useState<SlicanLicenseType | 'ALL'>('ALL');
  const [editingCentral, setEditingCentral] = useState<SlicanCentralSpecification | null>(null);
  const [creatingCentral, setCreatingCentral] = useState(false);
  const [editingLicense, setEditingLicense] = useState<SlicanLicenseSpecification | null>(null);
  const [creatingLicense, setCreatingLicense] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState('');

  const loadSpecifications = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [centralRows, licenseRows] = await Promise.all([
        slicanAudioService.getCentrals(),
        slicanAudioService.getLicenses()
      ]);
      setCentrals(centralRows);
      setLicenses(licenseRows);

      const ids = [...new Set([...centralRows, ...licenseRows].map(row => row.warehouseStockId))];
      const results = await Promise.allSettled(ids.map(id => warehouseStockService.getById(id)));
      const labels: Record<number, string> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          labels[ids[index]] = formatStockLabel(result.value.data);
        }
      });
      setStockLabels(labels);
    } catch (error) {
      setLoadError(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSpecifications();
  }, [loadSpecifications]);

  const handleDelete = async (kind: Section, id: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę konfigurację?')) return;
    setDeleting(id);
    setMutationError('');
    try {
      if (kind === 'centrals') await slicanAudioService.deleteCentral(id);
      else await slicanAudioService.deleteLicense(id);
      await loadSpecifications();
    } catch (error) {
      setMutationError(apiErrorMessage(error));
    } finally {
      setDeleting(null);
    }
  };

  const activeCentralCount = centrals.filter(central => central.isActive).length;
  const activeLicenseCount = licenses.filter(license => license.isActive).length;
  const shownLicenses = filterType === 'ALL' ? licenses : licenses.filter(item => item.licenseType === filterType);

  return (
    <section className="slican-audio">
      <div className="slican-audio__tabs" role="tablist" aria-label="Konfiguracja Slican audio">
        <button role="tab" aria-selected={section === 'centrals'} className={section === 'centrals' ? 'active' : ''} onClick={() => setSection('centrals')}>
          Centrale
        </button>
        <button role="tab" aria-selected={section === 'licenses'} className={section === 'licenses' ? 'active' : ''} onClick={() => setSection('licenses')}>
          Licencje
        </button>
      </div>

      {loading ? <p role="status">Ładowanie konfiguracji Slican…</p> : null}
      {loadError ? (
        <div className="slican-audio__error" role="alert">
          Nie udało się wczytać konfiguracji: {loadError}
          <button className="btn btn-secondary" onClick={() => void loadSpecifications()}>Ponów</button>
        </div>
      ) : null}
      {mutationError ? <p className="slican-audio__error" role="alert">{mutationError}</p> : null}

      {!loading && !loadError && section === 'centrals' ? (
        <div role="tabpanel">
          <div className="slican-audio__heading">
            <h2>Centrale Slican</h2>
            <button className="btn btn-primary" disabled={!canCreate} onClick={() => { setMutationError(''); setCreatingCentral(true); }}>
              Dodaj centralę
            </button>
          </div>
          <div className="slican-audio__preview">
            <strong>Podgląd reguł doboru:</strong> resolver bierze pod uwagę tylko aktywne centrale mieszczące się w limitach. Remisy rozstrzyga niższy priorytet, następnie niższy limit abonentów VoIP i ID.
          </div>
          {activeLicenseCount === 0 ? (
            <p className="slican-audio__warning" role="status">⚠️ Brak aktywnych licencji — resolver nie dobierze pakietów licencyjnych.</p>
          ) : null}
          {centrals.length === 0 ? <p>Brak konfiguracji central.</p> : (
            <div className="slican-audio__table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pozycja magazynowa</th><th>Model</th>
                    {centralLimitFields.map(([field, label]) => <th key={field}>{label}</th>)}
                    <th>Priorytet</th><th>Aktywność</th><th>Działania</th>
                  </tr>
                </thead>
                <tbody>
                  {centrals.map(central => (
                    <tr key={central.id} className={!central.isActive ? 'inactive' : ''}>
                      <td>{stockLabels[central.warehouseStockId] || `ID: ${central.warehouseStockId}`}</td>
                      <td>{central.modelName}</td>
                      <td>{central.maxSipVoipSubscribers}</td><td>{central.maxDphIpDevices}</td>
                      <td>{central.maxAudioIpDevices}</td><td>{central.maxIvrChannels}</td>
                      <td>{central.maxConferenceChannels}</td><td>{central.priority}</td>
                      <td>{central.isActive ? 'Aktywna' : 'Nieaktywna — pomijana przez resolver'}</td>
                      <td className="slican-audio__actions">
                        <button className="btn btn-secondary" disabled={!canUpdate} aria-label={`Edytuj centralę ${central.modelName}`} onClick={() => { setMutationError(''); setEditingCentral(central); }}>✏️</button>
                        <button className="btn btn-secondary" disabled={!canDelete || deleting === central.id} aria-label={`Usuń centralę ${central.modelName}`} onClick={() => void handleDelete('centrals', central.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {!loading && !loadError && section === 'licenses' ? (
        <div role="tabpanel">
          <div className="slican-audio__heading">
            <h2>Licencje Slican</h2>
            <button className="btn btn-primary" disabled={!canCreate} onClick={() => { setMutationError(''); setCreatingLicense(true); }}>
              Dodaj licencję
            </button>
          </div>
          <div className="slican-audio__preview">
            <strong>Podgląd reguł doboru:</strong> resolver używa aktywnych pakietów kolejno 100, 10, 1; resztę 99 zaokrągla do pakietu 100, a 9 do pakietu 10.
          </div>
          {activeCentralCount === 0 ? (
            <p className="slican-audio__warning" role="status">⚠️ Brak aktywnej centrali, do której można dobrać licencje.</p>
          ) : null}
          {licenseTypes.map(type => {
            const available = new Set(licenses.filter(item => item.licenseType === type.value && item.isActive).map(item => item.packageSize));
            const missing = ([1, 10, 100] as const).filter(size => !available.has(size));
            return missing.length ? (
              <p className="slican-audio__warning" role="status" key={type.value}>
                ⚠️ {licenseTypeLabel(type.value)}: brakuje aktywnych pakietów {missing.join(', ')}.
              </p>
            ) : null;
          })}
          <label className="slican-audio__filter">
            Filtr typu licencji
            <select value={filterType} onChange={event => setFilterType(event.target.value as SlicanLicenseType | 'ALL')}>
              <option value="ALL">Wszystkie</option>
              {licenseTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          {shownLicenses.length === 0 ? <p>Brak konfiguracji licencji.</p> : (
            <div className="slican-audio__table-wrap">
              <table>
                <thead><tr><th>Pozycja magazynowa</th><th>Typ</th><th>Pakiet</th><th>Pole zapotrzebowania</th><th>Aktywność</th><th>Priorytet</th><th>Działania</th></tr></thead>
                <tbody>
                  {shownLicenses.map(license => (
                    <tr key={license.id} className={!license.isActive ? 'inactive' : ''}>
                      <td>{stockLabels[license.warehouseStockId] || `ID: ${license.warehouseStockId}`}</td>
                      <td>{licenseTypeLabel(license.licenseType)}</td><td>{license.packageSize}</td><td>{license.demandField}</td>
                      <td>{license.isActive ? 'Aktywna' : 'Nieaktywna — pomijana przez resolver'}</td><td>{license.priority}</td>
                      <td className="slican-audio__actions">
                        <button className="btn btn-secondary" disabled={!canUpdate} aria-label={`Edytuj licencję ${licenseTypeLabel(license.licenseType)} ${license.packageSize}`} onClick={() => { setMutationError(''); setEditingLicense(license); }}>✏️</button>
                        <button className="btn btn-secondary" disabled={!canDelete || deleting === license.id} aria-label={`Usuń licencję ${licenseTypeLabel(license.licenseType)} ${license.packageSize}`} onClick={() => void handleDelete('licenses', license.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {(creatingCentral || editingCentral) ? (
        <CentralForm
          central={editingCentral || undefined}
          stockLabel={editingCentral ? stockLabels[editingCentral.warehouseStockId] : undefined}
          centrals={centrals}
          onClose={() => { setCreatingCentral(false); setEditingCentral(null); }}
          onSave={async data => {
            if (editingCentral) await slicanAudioService.updateCentral(editingCentral.id, data);
            else await slicanAudioService.createCentral(data);
            setCreatingCentral(false);
            setEditingCentral(null);
            await loadSpecifications();
          }}
        />
      ) : null}

      {(creatingLicense || editingLicense) ? (
        <LicenseForm
          license={editingLicense || undefined}
          stockLabel={editingLicense ? stockLabels[editingLicense.warehouseStockId] : undefined}
          licenses={licenses}
          onClose={() => { setCreatingLicense(false); setEditingLicense(null); }}
          onSave={async data => {
            if (editingLicense) await slicanAudioService.updateLicense(editingLicense.id, data);
            else await slicanAudioService.createLicense(data);
            setCreatingLicense(false);
            setEditingLicense(null);
            await loadSpecifications();
          }}
        />
      ) : null}
    </section>
  );
};

interface WarehouseStockPickerProps {
  selectedId: number | '';
  selectedLabel: string;
  onSelect: (item: WarehouseStock) => void;
}

const WarehouseStockPicker: React.FC<WarehouseStockPickerProps> = ({ selectedId, selectedLabel, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WarehouseStock[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const response = await warehouseStockService.getAll({ search: query.trim() }, 1, 50);
      setResults(response.data || []);
    } catch (searchError) {
      setError(apiErrorMessage(searchError));
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="slican-audio__picker">
      <label htmlFor="warehouse-search">Pozycja warehouse_stock *</label>
      <div className="slican-audio__search">
        <input id="warehouse-search" aria-label="Wyszukaj po nazwie lub numerze katalogowym" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void search(); } }} placeholder="Wyszukaj po nazwie lub numerze katalogowym" />
        <button type="button" className="btn btn-secondary" disabled={!query.trim() || searching} onClick={() => void search()}>{searching ? 'Szukam…' : 'Szukaj'}</button>
      </div>
      {selectedId !== '' ? <p>Wybrano: {selectedLabel || `ID: ${selectedId}`}</p> : <p>Wybierz istniejącą pozycję z magazynu przed zapisaniem.</p>}
      {error ? <p className="slican-audio__error" role="alert">{error}</p> : null}
      {results.length ? (
        <ul className="slican-audio__results">
          {results.map(item => <li key={item.id}><button type="button" onClick={() => { onSelect(item); setResults([]); }}>{formatStockLabel(item)}</button></li>)}
        </ul>
      ) : null}
    </div>
  );
};

interface CentralFormProps {
  central?: SlicanCentralSpecification;
  stockLabel?: string;
  centrals: SlicanCentralSpecification[];
  onClose: () => void;
  onSave: (data: SlicanCentralSpecificationDTO) => Promise<void>;
}

const CentralForm: React.FC<CentralFormProps> = ({ central, stockLabel, centrals, onClose, onSave }) => {
  const [warehouseStockId, setWarehouseStockId] = useState<number | ''>(central?.warehouseStockId ?? '');
  const [selectedLabel, setSelectedLabel] = useState(stockLabel || '');
  const [modelName, setModelName] = useState(central?.modelName || '');
  const [limits, setLimits] = useState<Record<(typeof centralLimitFields)[number][0], string>>({
    maxSipVoipSubscribers: String(central?.maxSipVoipSubscribers ?? 0),
    maxDphIpDevices: String(central?.maxDphIpDevices ?? 0),
    maxAudioIpDevices: String(central?.maxAudioIpDevices ?? 0),
    maxIvrChannels: String(central?.maxIvrChannels ?? 0),
    maxConferenceChannels: String(central?.maxConferenceChannels ?? 0)
  });
  const [priority, setPriority] = useState(String(central?.priority ?? 10));
  const [isActive, setIsActive] = useState(central?.isActive ?? true);
  const [notes, setNotes] = useState(central?.notes || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!warehouseStockId) return setError('Wybierz pozycję magazynową.');
    if (!modelName.trim() || modelName.trim().length > 50) return setError('Model jest wymagany (maksymalnie 50 znaków).');
    if (Object.values(limits).some(value => !/^\d+$/.test(value))) return setError('Wszystkie limity muszą być nieujemnymi liczbami całkowitymi.');
    if (!/^[1-9]\d*$/.test(priority)) return setError('Priorytet musi być liczbą całkowitą co najmniej 1.');
    if (centrals.some(item => item.warehouseStockId === warehouseStockId && item.id !== central?.id)) return setError('Ta pozycja magazynowa jest już przypisana do centrali.');
    setSaving(true);
    try {
      await onSave({
        warehouseStockId,
        modelName: modelName.trim(),
        maxSipVoipSubscribers: Number(limits.maxSipVoipSubscribers),
        maxDphIpDevices: Number(limits.maxDphIpDevices),
        maxAudioIpDevices: Number(limits.maxAudioIpDevices),
        maxIvrChannels: Number(limits.maxIvrChannels),
        maxConferenceChannels: Number(limits.maxConferenceChannels),
        priority: Number(priority),
        isActive,
        notes: notes.trim() || null
      });
    } catch (saveError) {
      setError(apiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="slican-audio__backdrop" role="presentation">
      <form className="slican-audio__modal" role="dialog" aria-modal="true" aria-labelledby="central-form-title" onSubmit={event => void submit(event)}>
        <h3 id="central-form-title">{central ? 'Edytuj centralę' : 'Dodaj centralę'}</h3>
        <WarehouseStockPicker selectedId={warehouseStockId} selectedLabel={selectedLabel} onSelect={item => { setWarehouseStockId(item.id); setSelectedLabel(formatStockLabel(item)); }} />
        <label>Model <input value={modelName} maxLength={50} required onChange={event => setModelName(event.target.value)} /></label>
        {centralLimitFields.map(([field, label]) => <label key={field}>{label} <input type="number" min="0" step="1" required value={limits[field]} onChange={event => setLimits(current => ({ ...current, [field]: event.target.value }))} /></label>)}
        <label>Priorytet <input type="number" min="1" step="1" required value={priority} onChange={event => setPriority(event.target.value)} /></label>
        <label className="slican-audio__checkbox"><input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} /> Aktywna</label>
        <label>Notatki <textarea value={notes} onChange={event => setNotes(event.target.value)} /></label>
        {error ? <p className="slican-audio__error" role="alert">{error}</p> : null}
        <div className="slican-audio__form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Anuluj</button>
          <button type="submit" className="btn btn-primary" disabled={!warehouseStockId || saving}>{saving ? 'Zapisywanie…' : 'Zapisz'}</button>
        </div>
      </form>
    </div>
  );
};

interface LicenseFormProps {
  license?: SlicanLicenseSpecification;
  stockLabel?: string;
  licenses: SlicanLicenseSpecification[];
  onClose: () => void;
  onSave: (data: SlicanLicenseSpecificationDTO) => Promise<void>;
}

const LicenseForm: React.FC<LicenseFormProps> = ({ license, stockLabel, licenses, onClose, onSave }) => {
  const [warehouseStockId, setWarehouseStockId] = useState<number | ''>(license?.warehouseStockId ?? '');
  const [selectedLabel, setSelectedLabel] = useState(stockLabel || '');
  const [licenseType, setLicenseType] = useState<SlicanLicenseType>(license?.licenseType || 'VOIP_SUBSCRIBER');
  const [packageSize, setPackageSize] = useState<SlicanLicensePackageSize>(license?.packageSize || 1);
  const [demandField, setDemandField] = useState<SlicanLicenseDemandField>(license?.demandField || 'sipVoipSubscribers');
  const [isActive, setIsActive] = useState(license?.isActive ?? true);
  const [priority, setPriority] = useState(String(license?.priority ?? 10));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!warehouseStockId) return setError('Wybierz pozycję magazynową.');
    if (!/^[1-9]\d*$/.test(priority)) return setError('Priorytet musi być liczbą całkowitą co najmniej 1.');
    if (demandField !== demandFieldByType[licenseType]) return setError('Pole zapotrzebowania musi odpowiadać typowi licencji.');
    if (licenses.some(item => item.warehouseStockId === warehouseStockId && item.id !== license?.id)) return setError('Ta pozycja magazynowa jest już przypisana do licencji.');
    if (isActive && licenses.some(item => item.isActive && item.licenseType === licenseType && item.packageSize === packageSize && item.id !== license?.id)) {
      return setError('Aktywna licencja tego typu i rozmiaru pakietu już istnieje.');
    }
    setSaving(true);
    try {
      await onSave({ warehouseStockId, licenseType, packageSize, demandField, isActive, priority: Number(priority) });
    } catch (saveError) {
      setError(apiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="slican-audio__backdrop" role="presentation">
      <form className="slican-audio__modal" role="dialog" aria-modal="true" aria-labelledby="license-form-title" onSubmit={event => void submit(event)}>
        <h3 id="license-form-title">{license ? 'Edytuj licencję' : 'Dodaj licencję'}</h3>
        <WarehouseStockPicker selectedId={warehouseStockId} selectedLabel={selectedLabel} onSelect={item => { setWarehouseStockId(item.id); setSelectedLabel(formatStockLabel(item)); }} />
        <label>Typ licencji
          <select required value={licenseType} onChange={event => setLicenseType(event.target.value as SlicanLicenseType)}>
            {licenseTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label>Rozmiar pakietu
          <select required value={packageSize} onChange={event => setPackageSize(Number(event.target.value) as SlicanLicensePackageSize)}>
            {[1, 10, 100].map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <label>Pole zapotrzebowania
          <select required value={demandField} onChange={event => setDemandField(event.target.value as SlicanLicenseDemandField)}>
            {demandFields.map(field => <option key={field.value} value={field.value}>{field.label}</option>)}
          </select>
        </label>
        <label className="slican-audio__checkbox"><input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} /> Aktywna</label>
        <label>Priorytet <input type="number" min="1" step="1" required value={priority} onChange={event => setPriority(event.target.value)} /></label>
        {error ? <p className="slican-audio__error" role="alert">{error}</p> : null}
        <div className="slican-audio__form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Anuluj</button>
          <button type="submit" className="btn btn-primary" disabled={!warehouseStockId || saving}>{saving ? 'Zapisywanie…' : 'Zapisz'}</button>
        </div>
      </form>
    </div>
  );
};
