// src/components/contracts/ShipmentWizardSmokA.tsx
// 3-krokowy kreator wysyłki dla podsystemów SMOKIP_A

import React, { useState } from 'react';
import type { Subsystem, SubsystemTask } from '../../services/contract.service';
import api from '../../services/api';
import { PoleSearchModal } from './PoleSearchModal';
import { useWizardDraft } from '../../hooks/useWizardDraft';
import { RestoreDraftModal } from '../common/RestoreDraftModal';
import './ShipmentWizardSmokA.css';
import './WizardStepIndicator.css';


// ─── Typy zadań ──────────────────────────────────────────────────────────────

const PRZEJAZD_TYPES = ['SMOKIP_A', 'PRZEJAZD_KAT_A', 'SKP'];
const LCS_ND_TYPES = ['LCS', 'ND', 'NASTAWNIA'];

type CabinetOption = 'SZAFA_TERENOWA' | 'SZAFA_WEWNETRZNA' | 'KONTENER' | '42U' | '24U';
type PoleType = 'STALOWY' | 'KOMPOZYT' | 'INNY';

interface CabinetConfig {
  [taskNumber: string]: CabinetOption;
}

interface PoleConfig {
  [taskNumber: string]: {
    quantity: number;
    type: PoleType;
    productInfo: string;
  };
}

interface WizardDraftData {
  selectedTasks: string[];
  deliveryAddress: string;
  contactPhone: string;
  cabinetConfig: CabinetConfig;
  poleConfig: PoleConfig;
}

interface ShipmentWizardSmokAProps {
  subsystem: Subsystem;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Pomocnicze funkcje ──────────────────────────────────────────────────────

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 9) {
    return `+48-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
  }
  return value;
};

const EXCLUDED_TASK_TYPES = ['KOMPLETACJA_WYSYLKI', 'KOMPLETACJA_SZAF'];

const getEligibleTasks = (tasks: SubsystemTask[]): SubsystemTask[] =>
  tasks.filter((t) => {
    // Wyklucz zadania kompletacji (nie wymagają wysyłki)
    if (t.taskType && EXCLUDED_TASK_TYPES.includes(t.taskType.toUpperCase())) return false;
    // Sprawdzenie substatusu - wyklucz już zlecone wysyłki
    const substatusFromMeta = t.metadata?.substatus;
    if (substatusFromMeta === 'wysyłka_zlecona') return false;
    return true;
  });

// Remove underscores from both values so that taskType variants with or without
// underscores (e.g. "SMOKIPA" vs "SMOKIP_A", "PRZEJAZDKATA" vs "PRZEJAZD_KAT_A")
// are matched consistently; the second condition still handles the exact canonical form.
const isPrzejazdTask = (taskType: string): boolean => {
  const normalizedTaskType = taskType.toUpperCase();
  const normalizedTaskTypeWithoutUnderscores = normalizedTaskType.replace(/_/g, '');

  return PRZEJAZD_TYPES.some(
    (pt) =>
      normalizedTaskTypeWithoutUnderscores.includes(pt.replace(/_/g, '')) ||
      normalizedTaskType === pt
  );
};

const isSkpTask = (taskType: string): boolean =>
  taskType.toUpperCase() === 'SKP' || taskType.toUpperCase().includes('SKP');

const isLcsNdTask = (taskType: string): boolean =>
  LCS_ND_TYPES.some((t) => taskType.toUpperCase() === t);

// ─── Komponent główny ────────────────────────────────────────────────────────

export const ShipmentWizardSmokA: React.FC<ShipmentWizardSmokAProps> = ({
  subsystem,
  onClose,
  onSuccess,
}) => {
  const eligibleTasks = getEligibleTasks(subsystem.tasks || []);

  const defaultDraftData: WizardDraftData = {
    selectedTasks: eligibleTasks.map((t) => t.taskNumber),
    deliveryAddress: '',
    contactPhone: '',
    cabinetConfig: {},
    poleConfig: {},
  };

  // ── Draft management via server-side hook ─────────────────────────────────
  const {
    data: draftData,
    setData: setDraftData,
    currentStep,
    setCurrentStep,
    lastSaveTime,
    isSaving,
    saveAndExit,
    clearDraft,
    showRestoreModal,
    savedDraft,
    restoreDraft,
    discardDraft,
  } = useWizardDraft<WizardDraftData>({
    wizardType: `shipment_wizard_smoka_${subsystem.id}`,
    initialData: defaultDraftData,
    autoSaveInterval: 30000,
  });

  // ── Derived state from draftData ──────────────────────────────────────────
  const selectedTasks = draftData.selectedTasks;
  const deliveryAddress = draftData.deliveryAddress;
  const contactPhone = draftData.contactPhone;
  const cabinetConfig = draftData.cabinetConfig;
  const poleConfig = draftData.poleConfig;

  // ── Setters that update draftData ─────────────────────────────────────────
  const setSelectedTasks = (tasks: string[]) =>
    setDraftData((prev) => ({ ...prev, selectedTasks: tasks }));

  const setDeliveryAddress = (addr: string) =>
    setDraftData((prev) => ({ ...prev, deliveryAddress: addr }));

  const setContactPhone = (phone: string) =>
    setDraftData((prev) => ({ ...prev, contactPhone: phone }));

  const setCabinetConfigState = (updater: (prev: CabinetConfig) => CabinetConfig) =>
    setDraftData((prev) => ({ ...prev, cabinetConfig: updater(prev.cabinetConfig) }));

  const setPoleConfigState = (updater: (prev: PoleConfig) => PoleConfig) =>
    setDraftData((prev) => ({ ...prev, poleConfig: updater(prev.poleConfig) }));

  // Intersect selectedTasks with eligible tasks when a draft is restored,
  // to drop tasks that received substatus='wysyłka_zlecona' since the draft was saved.
  const handleRestore = () => {
    restoreDraft();
    setDraftData((prev) => {
      const eligibleNumbers = new Set(eligibleTasks.map((t) => t.taskNumber));
      return {
        ...prev,
        selectedTasks: (prev.selectedTasks || []).filter((n) => eligibleNumbers.has(n)),
      };
    });
  };

  // ── UI state (not persisted) ──────────────────────────────────────────────
  const [poleSearchTaskNumber, setPoleSearchTaskNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Obsługa checkboxów ────────────────────────────────────────────────────
  const toggleTask = (taskNumber: string) => {
    setSelectedTasks(
      selectedTasks.includes(taskNumber)
        ? selectedTasks.filter((t) => t !== taskNumber)
        : [...selectedTasks, taskNumber]
    );
  };

  // ── Formatowanie telefonu po utracie fokusu ───────────────────────────────
  const handlePhoneBlur = () => {
    setContactPhone(formatPhone(contactPhone));
  };

  // ── Walidacja kroków ──────────────────────────────────────────────────────
  const validateStep1 = (): string | null => {
    if (selectedTasks.length === 0) return 'Wybierz przynajmniej jedno zadanie';
    if (!deliveryAddress.trim()) return 'Adres dostawy jest wymagany';
    if (!contactPhone.trim()) return 'Telefon kontaktowy jest wymagany';
    return null;
  };

  const validateStep2 = (): string | null => {
    const activeTasks = eligibleTasks.filter((t) =>
      selectedTasks.includes(t.taskNumber)
    );
    for (const task of activeTasks) {
      if (isPrzejazdTask(task.taskType) || isLcsNdTask(task.taskType)) {
        if (!cabinetConfig[task.taskNumber]) {
          return `Wybierz typ szafy/wysokość dla zadania ${task.taskNumber}`;
        }
      }
    }
    return null;
  };

  // ── Nawigacja ─────────────────────────────────────────────────────────────
  const handleNext = () => {
    setError('');
    if (currentStep === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  };

  // ── Finalizacja wysyłki ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');

    const tasksToShip = eligibleTasks.filter((t) =>
      selectedTasks.includes(t.taskNumber)
    );

    if (tasksToShip.length === 0) {
      setError('Brak zadań do wysyłki. Zaznacz przynajmniej jedno zadanie.');
      return;
    }

    setLoading(true);

    try {
      const results = await Promise.allSettled(
        tasksToShip.map((task) =>
          api.post(`/tasks/${task.taskNumber}/request-shipment`, {
            deliveryAddress: deliveryAddress.trim(),
            contactPhone: contactPhone.trim(),
            cabinetType: cabinetConfig[task.taskNumber] || null,
            poleQuantity: poleConfig[task.taskNumber]?.quantity ?? 0,
            poleType: poleConfig[task.taskNumber]?.type || null,
            poleProductInfo: poleConfig[task.taskNumber]?.productInfo || null,
          })
        )
      );

      const failures = results
        .map((result, i) => {
          if (result.status !== 'rejected') return null;
          const reason = result.reason as { response?: { data?: { message?: string } } };
          const msg = reason?.response?.data?.message || 'Błąd zlecania wysyłki';
          return `${tasksToShip[i].taskNumber}: ${msg}`;
        })
        .filter((msg): msg is string => msg !== null);

      if (failures.length > 0) {
        setError(`Niektóre wysyłki nie powiodły się:\n${failures.join('\n')}`);
        const successes = results.filter((r) => r.status === 'fulfilled').length;
        if (successes > 0) {
          await clearDraft();
          onSuccess();
        }
      } else {
        await clearDraft();
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd zlecania wysyłki');
    } finally {
      setLoading(false);
    }
  };

  // ── Obsługa konfiguracji szafy ────────────────────────────────────────────
  const setCabinet = (taskNumber: string, value: CabinetOption) => {
    setCabinetConfigState((prev) => ({ ...prev, [taskNumber]: value }));
  };

  // ── Obsługa konfiguracji słupa ────────────────────────────────────────────
  const setPoleField = <K extends keyof PoleConfig[string]>(
    taskNumber: string,
    field: K,
    value: PoleConfig[string][K]
  ) => {
    setPoleConfigState((prev) => {
      const existing = prev[taskNumber] || {
        quantity: 0,
        type: 'STALOWY' as PoleType,
        productInfo: '',
      };
      return {
        ...prev,
        [taskNumber]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  // ── Wybrane zadania kwalifikujące się ─────────────────────────────────────
  const activeTasks = eligibleTasks.filter((t) =>
    selectedTasks.includes(t.taskNumber)
  );
  const przejazdOrSkpTasks = activeTasks.filter(
    (t) => isPrzejazdTask(t.taskType) || isSkpTask(t.taskType)
  );

  // ── Render pomocniczy ─────────────────────────────────────────────────────
  const renderStepIndicator = () => (
    <div className="wizard-step-indicator" aria-label="Kroki kreatora">
      {([1, 2, 3] as const).map((step, i) => (
        <React.Fragment key={step}>
          {i > 0 && (
            <div
              className={`wizard-step-connector${currentStep > step - 1 ? ' completed' : ''}`}
              aria-hidden="true"
            />
          )}
          <div
            className={`wizard-step${
              currentStep === step ? ' active' : currentStep > step ? ' completed' : ''
            }`}
            aria-current={currentStep === step ? 'step' : undefined}
          >
            {currentStep > step ? '✓' : step}
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  // ── Krok 1: Wybór zadań i dane kontaktowe ────────────────────────────────
  const renderStep1 = () => (
    <>
      <p className="wizard-subtitle">
        Wysyłka zostanie zlecona dla{' '}
        <span className="selected-count-badge">{selectedTasks.length}</span>{' '}
        {selectedTasks.length === 1 ? 'zadania' : 'zadań'}
      </p>

      {eligibleTasks.length === 0 ? (
        <div className="alert alert-error">
          Brak zadań kwalifikujących się do wysyłki (wszystkie mają już status
          "wysyłka_zlecona").
        </div>
      ) : (
        <div
          className="task-selection-list"
          role="group"
          aria-label="Lista zadań do wysyłki"
        >
          {eligibleTasks.map((task) => (
            <label key={task.id} className="task-selection-item">
              <input
                type="checkbox"
                checked={selectedTasks.includes(task.taskNumber)}
                onChange={() => toggleTask(task.taskNumber)}
                aria-label={`Zadanie ${task.taskNumber}`}
              />
              <code>{task.taskNumber}</code>
              <span className="task-selection-name">{task.taskName}</span>
              <span className="task-selection-type">{task.taskType}</span>
            </label>
          ))}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="sma-deliveryAddress">Adres dostawy *</label>
        <textarea
          id="sma-deliveryAddress"
          className="form-control"
          rows={3}
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          placeholder="Ulica, numer, kod pocztowy, miejscowość"
        />
      </div>

      <div className="form-group">
        <label htmlFor="sma-contactPhone">Telefon kontaktowy *</label>
        <input
          id="sma-contactPhone"
          type="tel"
          className="form-control phone-input"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          onBlur={handlePhoneBlur}
          placeholder="9 cyfr, np. 123456789"
          maxLength={20}
        />
        <small className="form-hint">
          Wpisz 9 cyfr — po kliknięciu poza pole zostanie sformatowane do +48-YYY-YYY-YYY
        </small>
      </div>
    </>
  );

  // ── Krok 2: Konfiguracja szaf ─────────────────────────────────────────────
  const renderStep2 = () => (
    <>
      <p className="wizard-subtitle">
        Wybierz typ szafy / wysokość dla każdego zadania
      </p>
      {activeTasks.length === 0 && (
        <div className="alert alert-error">Brak zaznaczonych zadań</div>
      )}
      {activeTasks.map((task) => {
        const isPrzejazd = isPrzejazdTask(task.taskType);
        const isLcsNd = isLcsNdTask(task.taskType);

        if (!isPrzejazd && !isLcsNd) return null;

        return (
          <div key={task.taskNumber} className="cabinet-config-section">
            <h4>
              <code>{task.taskNumber}</code> — {task.taskName}
              <span className="task-type-label">
                ({task.taskType})
              </span>
            </h4>
            <div className="radio-group" role="radiogroup" aria-label={`Typ szafy dla ${task.taskNumber}`}>
              {isPrzejazd && (
                <>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name={`cabinet-${task.taskNumber}`}
                      value="SZAFA_TERENOWA"
                      checked={cabinetConfig[task.taskNumber] === 'SZAFA_TERENOWA'}
                      onChange={() => setCabinet(task.taskNumber, 'SZAFA_TERENOWA')}
                    />
                    Szafa terenowa
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name={`cabinet-${task.taskNumber}`}
                      value="SZAFA_WEWNETRZNA"
                      checked={cabinetConfig[task.taskNumber] === 'SZAFA_WEWNETRZNA'}
                      onChange={() => setCabinet(task.taskNumber, 'SZAFA_WEWNETRZNA')}
                    />
                    Szafa wewnętrzna
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name={`cabinet-${task.taskNumber}`}
                      value="KONTENER"
                      checked={cabinetConfig[task.taskNumber] === 'KONTENER'}
                      onChange={() => setCabinet(task.taskNumber, 'KONTENER')}
                    />
                    Zabudowa w kontenerze
                  </label>
                </>
              )}
              {isLcsNd && (
                <>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name={`cabinet-${task.taskNumber}`}
                      value="42U"
                      checked={cabinetConfig[task.taskNumber] === '42U'}
                      onChange={() => setCabinet(task.taskNumber, '42U')}
                    />
                    Wysokość 42U
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name={`cabinet-${task.taskNumber}`}
                      value="24U"
                      checked={cabinetConfig[task.taskNumber] === '24U'}
                      onChange={() => setCabinet(task.taskNumber, '24U')}
                    />
                    Wysokość 24U
                  </label>
                </>
              )}
            </div>
          </div>
        );
      })}
    </>
  );

  // ── Krok 3: Konfiguracja słupów ───────────────────────────────────────────
  const renderStep3 = () => (
    <>
      <p className="wizard-subtitle">
        Konfiguracja słupów dla zadań typu PRZEJAZD i SKP
      </p>

      {przejazdOrSkpTasks.length === 0 && (
        <div className="alert alert-info">
          Brak zadań typu PRZEJAZD/SKP wśród zaznaczonych — możesz zlecić wysyłkę.
        </div>
      )}

      {przejazdOrSkpTasks.map((task) => {
        const config = poleConfig[task.taskNumber] || {
          quantity: 0,
          type: 'STALOWY' as PoleType,
          productInfo: '',
        };

        return (
          <div key={task.taskNumber} className="pole-config-section">
            <h4>
              <code>{task.taskNumber}</code> — {task.taskName}
            </h4>

            <div className="form-group">
              <label htmlFor={`pole-qty-${task.taskNumber}`}>Ilość słupów</label>
              <input
                id={`pole-qty-${task.taskNumber}`}
                type="number"
                className="pole-quantity-input"
                min={0}
                step={1}
                value={config.quantity}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  const safeNumber = Number.isNaN(raw) ? 0 : raw;
                  const val = Math.max(0, Math.floor(safeNumber));
                  setPoleField(task.taskNumber, 'quantity', val);
                }}
              />
            </div>

            <div className="form-group">
              <label>Rodzaj słupa</label>
              <div className="radio-group" role="radiogroup" aria-label={`Rodzaj słupa dla ${task.taskNumber}`}>
                {(['STALOWY', 'KOMPOZYT', 'INNY'] as PoleType[]).map((pt) => (
                  <label key={pt} className="radio-option">
                    <input
                      type="radio"
                      name={`pole-type-${task.taskNumber}`}
                      value={pt}
                      checked={config.type === pt}
                      onChange={() => setPoleField(task.taskNumber, 'type', pt)}
                    />
                    {pt === 'STALOWY' ? 'Stalowy' : pt === 'KOMPOZYT' ? 'Kompozyt' : 'Inny'}
                  </label>
                ))}
              </div>
            </div>

            <div className="pole-search-row">
              <input
                type="text"
                className="pole-search-input"
                placeholder="Numer magazynowy | Nazwa produktu"
                value={config.productInfo}
                onChange={(e) =>
                  setPoleField(task.taskNumber, 'productInfo', e.target.value)
                }
                aria-label="Informacje o produkcie"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-search-warehouse"
                onClick={() => setPoleSearchTaskNumber(task.taskNumber)}
              >
                🔍 Wyszukaj w magazynie
              </button>
            </div>
          </div>
        );
      })}

      {/* Podsumowanie */}
      <div className="wizard-summary">
        <h4>📋 Podsumowanie zamówienia</h4>
        <div className="summary-item">
          <span>Adres dostawy:</span>
          <span>{deliveryAddress}</span>
        </div>
        <div className="summary-item">
          <span>Telefon:</span>
          <span>{contactPhone}</span>
        </div>
        <div className="summary-item">
          <span>Liczba zadań:</span>
          <span>{selectedTasks.length}</span>
        </div>
        {activeTasks.map((task) => (
          <div key={task.taskNumber} className="summary-item">
            <span>
              <code>{task.taskNumber}</code>
            </span>
            <span>
              {cabinetConfig[task.taskNumber] || '—'}
              {poleConfig[task.taskNumber]?.quantity
                ? `, ${poleConfig[task.taskNumber].quantity} szt. słupów`
                : ''}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  // ── Render główny ─────────────────────────────────────────────────────────
  return (
    <>
      {/* Modal przywracania draftu */}
      {showRestoreModal && savedDraft && (
        <RestoreDraftModal
          visible={showRestoreModal}
          wizardName={`Kreator wysyłki SMOKIP-A — ${subsystem.subsystemNumber}`}
          savedAt={savedDraft.updatedAt}
          expiresAt={savedDraft.expiresAt}
          onRestore={handleRestore}
          onDiscard={discardDraft}
        />
      )}

      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content shipment-wizard"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sma-wizard-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 id="sma-wizard-title">
              📦 Kreator wysyłki SMOKIP-A — {subsystem.subsystemNumber}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {lastSaveTime && (
                <span style={{ fontSize: '12px', color: isSaving ? 'var(--text-secondary)' : 'var(--success-color, #4caf50)' }}>
                  {isSaving ? '⏳ Zapisywanie...' : '✅ Zapisano'}
                </span>
              )}
              <button className="modal-close" onClick={onClose} aria-label="Zamknij">
                ✕
              </button>
            </div>
          </div>

          <div className="modal-body">
            {renderStepIndicator()}

            {error && (
              <div className="alert alert-error" style={{ whiteSpace: 'pre-line' }}>
                {error}
              </div>
            )}

            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            <div className="wizard-actions">
              <div className="wizard-actions-left">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => saveAndExit(onClose)}
                >
                  💾 Zapisz
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    clearDraft();
                    onClose();
                  }}
                >
                  Anuluj
                </button>
              </div>
              <div className="wizard-actions-right">
                {currentStep > 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    ← Wstecz
                  </button>
                )}
                {currentStep < 3 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNext}
                    disabled={eligibleTasks.length === 0}
                  >
                    Dalej →
                  </button>
                )}
                {currentStep === 3 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={loading || selectedTasks.length === 0}
                  >
                    {loading ? '⏳ Zlecanie...' : '📦 Zleć wysyłkę'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal wyszukiwania słupów */}
      {poleSearchTaskNumber && (
        <PoleSearchModal
          onClose={() => setPoleSearchTaskNumber(null)}
          onSelect={(item) => {
            setPoleField(
              poleSearchTaskNumber,
              'productInfo',
              `${item.catalogNumber} | ${item.materialName}`
            );
            setPoleSearchTaskNumber(null);
          }}
        />
      )}
    </>
  );
};
