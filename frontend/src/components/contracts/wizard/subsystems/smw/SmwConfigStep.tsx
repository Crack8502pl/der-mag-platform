import React, { useState } from 'react';
import type { SubsystemConfigStepProps } from '../../types/wizard.types';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../../config/subsystemWizardConfig';
import type { SmwWizardData, SmwCabinet } from '../../../../../config/subsystemWizardConfig';
import { SmwStationForm } from './SmwStationForm';

export const SmwConfigStep: React.FC<SubsystemConfigStepProps> = ({
  subsystem,
  subsystemIndex,
  onUpdate,
  onNext,
  onPrev
}) => {
  const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];

  // Initialize smwData with proper defaults
  const defaultSmwData: SmwWizardData = {
    iloscStacji: 0,
    iloscKontenerow: 0,
    sokEnabled: false,
    extraViewingEnabled: false,
    stations: [],
    sokConfig: { nameAddress: '', cabinets: [] },
    extraViewingConfig: { nameAddress: '', cabinets: [] },
    lcsConfig: { cabinets: [] }
  };

  // Try smwData first, then fall back to params for backward compatibility
  const rawSmwData = (subsystem.smwData || subsystem.params || {}) as SmwWizardData;
  const smwData: SmwWizardData = {
    ...defaultSmwData,
    ...rawSmwData,
    stations: rawSmwData?.stations || [],
    sokConfig: {
      nameAddress: rawSmwData?.sokConfig?.nameAddress ?? defaultSmwData.sokConfig!.nameAddress,
      cabinets: rawSmwData?.sokConfig?.cabinets ?? defaultSmwData.sokConfig!.cabinets
    },
    extraViewingConfig: {
      nameAddress: rawSmwData?.extraViewingConfig?.nameAddress ?? defaultSmwData.extraViewingConfig!.nameAddress,
      cabinets: rawSmwData?.extraViewingConfig?.cabinets ?? defaultSmwData.extraViewingConfig!.cabinets
    },
    lcsConfig: {
      cabinets: rawSmwData?.lcsConfig?.cabinets ?? defaultSmwData.lcsConfig.cabinets
    }
  };

  // Internal step state for SMW multi-step wizard
  const [smwStep, setSmwStep] = useState(subsystem.smwStep || 1);

  // Calculate total SMW steps
  const getTotalSmwSteps = (): number => {
    let steps = 1; // Basic config
    steps += smwData.iloscStacji; // Station forms
    if (smwData.iloscStacji > 0) steps++; // Platform cabinets
    if (smwData.sokEnabled) steps++; // SOK config
    if (smwData.extraViewingEnabled) steps++; // Extra viewing config
    steps++; // LCS config
    return steps;
  };

  const updateSmwData = (updates: Partial<SmwWizardData>) => {
    const currentData = smwData;
    const newData = { ...currentData, ...updates };
    // Store in both smwData (for task generation) and params (for backward compatibility)
    onUpdate(subsystemIndex, { smwData: newData, params: newData, smwStep });
  };

  const handleSmwNext = () => {
    const totalSteps = getTotalSmwSteps();
    if (smwStep < totalSteps) {
      const nextStep = smwStep + 1;
      setSmwStep(nextStep);
      onUpdate(subsystemIndex, { smwStep: nextStep });
    } else {
      // Move to next main wizard step
      onNext?.();
    }
  };

  const handleSmwPrev = () => {
    if (smwStep > 1) {
      const prevStep = smwStep - 1;
      setSmwStep(prevStep);
      onUpdate(subsystemIndex, { smwStep: prevStep });
    } else {
      // Move to previous main wizard step
      onPrev?.();
    }
  };

  // Determine which sub-step to render
  const getCurrentSubStep = (): string => {
    let stepCount = 1;
    
    // Step 1: Basic config
    if (smwStep === stepCount) return 'basic';
    stepCount++;
    
    // Steps 2+: Station forms
    for (let i = 0; i < smwData.iloscStacji; i++) {
      if (smwStep === stepCount) return `station-${i}`;
      stepCount++;
    }
    
    // Platform cabinets (only if stations exist)
    if (smwData.iloscStacji > 0) {
      if (smwStep === stepCount) return 'platform-cabinets';
      stepCount++;
    }
    
    // SOK config
    if (smwData.sokEnabled) {
      if (smwStep === stepCount) return 'sok';
      stepCount++;
    }
    
    // Extra viewing config
    if (smwData.extraViewingEnabled) {
      if (smwStep === stepCount) return 'extra-viewing';
      stepCount++;
    }
    
    // LCS config
    if (smwStep === stepCount) return 'lcs';
    
    return 'basic';
  };

  const currentSubStep = getCurrentSubStep();

  return (
    <div className="wizard-step-content">
      <h3>Konfiguracja: {config.label}</h3>
      <p className="step-info">Krok {smwStep} z {getTotalSmwSteps()}</p>

      {/* Step 1: Basic Configuration */}
      {currentSubStep === 'basic' && (
        <>
          <div className="form-group">
            <label>Pula adresowa IP (opcjonalnie)</label>
            <input
              type="text"
              value={subsystem.ipPool || ''}
              onChange={(e) => {
                onUpdate(subsystemIndex, { ipPool: e.target.value.trim() });
              }}
              placeholder="np. 192.168.1.0/24"
            />
            <small className="form-help">
              Format CIDR (np. 192.168.1.0/24). Każdy podsystem musi mieć unikalną pulę.
            </small>
          </div>

          <div className="form-group">
            <label>Ilość Stacji *</label>
            <input
              type="number"
              min={0}
              value={smwData.iloscStacji || 0}
              onChange={(e) => {
                const count = parseInt(e.target.value) || 0;
                const stations = Array.from({ length: count }, (_, i) => ({
                  name: `Stacja ${i + 1}`,
                  platforms: 0,
                  elevators: 0,
                  tunnels: 0,
                  platformCabinets: []
                }));
                updateSmwData({ iloscStacji: count, stations });
              }}
            />
          </div>

          <div className="form-group">
            <label>Ilość kontenerów *</label>
            <input
              type="number"
              min={0}
              value={smwData.iloscKontenerow || 0}
              onChange={(e) => updateSmwData({ iloscKontenerow: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={smwData.sokEnabled || false}
                onChange={(e) => updateSmwData({ sokEnabled: e.target.checked })}
              />
              {' '}SOK
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={smwData.extraViewingEnabled || false}
                onChange={(e) => updateSmwData({ extraViewingEnabled: e.target.checked })}
              />
              {' '}Dodatkowe stanowisko Oglądowe
            </label>
          </div>
        </>
      )}

      {/* Steps 2+: Station Forms */}
      {currentSubStep.startsWith('station-') && (() => {
        const stationIdx = parseInt(currentSubStep.split('-')[1]);
        return (
          <SmwStationForm
            station={smwData.stations[stationIdx]}
            stationIndex={stationIdx}
            onUpdate={(updates) => {
              const newStations = [...smwData.stations];
              newStations[stationIdx] = { ...newStations[stationIdx], ...updates };
              updateSmwData({ stations: newStations });
            }}
          />
        );
      })()}

      {/* Platform Cabinets Configuration */}
      {currentSubStep === 'platform-cabinets' && (
        <div className="smw-section">
          <h4>Konfiguracja Szaf Peronowych</h4>
          {smwData.stations.map((station, stationIdx) => (
            <div key={stationIdx} style={{ marginTop: '20px', padding: '15px', border: '2px solid #4CAF50', borderRadius: '4px' }}>
              <h5>{station.name}</h5>
              {(station.platformCabinets || []).map((platformCabinet, platformIdx) => (
                <div key={platformIdx} style={{ marginLeft: '20px', marginTop: '15px', padding: '10px', background: '#333333', borderRadius: '4px' }}>
                  <h6>Peron {platformIdx + 1}</h6>
                  
                  <div className="form-group">
                    <label>Ilość szaf *</label>
                    <input
                      type="number"
                      min={0}
                      value={platformCabinet.cabinets?.length || 0}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 0;
                        const cabinets: SmwCabinet[] = Array.from({ length: count }, (_, i) => ({
                          type: 'S1' as const,
                          name: `Peron ${platformIdx + 1} Szafa ${i + 1}`
                        }));
                        const newStations = [...smwData.stations];
                        newStations[stationIdx].platformCabinets[platformIdx].cabinets = cabinets;
                        updateSmwData({ stations: newStations });
                      }}
                    />
                  </div>

                  {(platformCabinet.cabinets || []).map((cabinet, cabinetIdx) => (
                    <div key={cabinetIdx} style={{ marginLeft: '20px', marginBottom: '10px', padding: '8px', background: '#2a2a2a', borderRadius: '4px' }}>
                      <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Typ Szafy</label>
                          <select
                            value={cabinet.type || 'S1'}
                            onChange={(e) => {
                              const newStations = [...smwData.stations];
                              newStations[stationIdx].platformCabinets[platformIdx].cabinets[cabinetIdx].type = e.target.value as 'S1' | 'S2' | 'S3' | 'S4';
                              updateSmwData({ stations: newStations });
                            }}
                          >
                            <option value="S1">S1</option>
                            <option value="S2">S2</option>
                            <option value="S3">S3</option>
                            <option value="S4">S4</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Nazwa Szafy</label>
                          <input
                            type="text"
                            value={cabinet.name || ''}
                            onChange={(e) => {
                              const newStations = [...smwData.stations];
                              newStations[stationIdx].platformCabinets[platformIdx].cabinets[cabinetIdx].name = e.target.value;
                              updateSmwData({ stations: newStations });
                            }}
                            placeholder={`Peron ${platformIdx + 1} Szafa ${cabinetIdx + 1}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* SOK Configuration */}
      {currentSubStep === 'sok' && (
        <div className="smw-section">
          <h4>Konfiguracja SOK</h4>
          <div className="form-group">
            <label>Nazwa/Adres SOK *</label>
            <input
              type="text"
              value={smwData.sokConfig?.nameAddress || ''}
              onChange={(e) => updateSmwData({ 
                sokConfig: { nameAddress: e.target.value, cabinets: smwData.sokConfig?.cabinets || [] } 
              })}
              placeholder="Wprowadź nazwę lub adres"
            />
          </div>

          <div className="form-group">
            <label>Ilość szaf *</label>
            <input
              type="number"
              min={0}
              value={smwData.sokConfig?.cabinets?.length || 0}
              onChange={(e) => {
                const count = parseInt(e.target.value) || 0;
                const cabinets: SmwCabinet[] = Array.from({ length: count }, (_, i) => ({
                  type: 'S1' as const,
                  name: `Szafa SOK ${i + 1}`
                }));
                updateSmwData({ sokConfig: { nameAddress: smwData.sokConfig?.nameAddress || '', cabinets } });
              }}
            />
          </div>

          {(smwData.sokConfig?.cabinets || []).map((cabinet: SmwCabinet, idx: number) => (
            <div key={idx} className="cabinet-config" style={{ marginLeft: '20px', marginBottom: '15px', padding: '10px', background: '#333333', borderRadius: '4px' }}>
              <h5>Szafa {idx + 1}</h5>
              <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Typ Szafy</label>
                  <select
                    value={cabinet.type || 'S1'}
                    onChange={(e) => {
                      const newCabinets = [...(smwData.sokConfig?.cabinets || [])];
                      newCabinets[idx].type = e.target.value as 'S1' | 'S2' | 'S3' | 'S4';
                      updateSmwData({ sokConfig: { nameAddress: smwData.sokConfig?.nameAddress || '', cabinets: newCabinets } });
                    }}
                  >
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="S3">S3</option>
                    <option value="S4">S4</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Nazwa Szafy</label>
                  <input
                    type="text"
                    value={cabinet.name || ''}
                    onChange={(e) => {
                      const newCabinets = [...(smwData.sokConfig?.cabinets || [])];
                      newCabinets[idx].name = e.target.value;
                      updateSmwData({ sokConfig: { nameAddress: smwData.sokConfig?.nameAddress || '', cabinets: newCabinets } });
                    }}
                    placeholder={`Szafa SOK ${idx + 1}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extra Viewing Station Configuration */}
      {currentSubStep === 'extra-viewing' && (
        <div className="smw-section">
          <h4>Konfiguracja Dodatkowego Stanowiska Oglądowego</h4>
          <div className="form-group">
            <label>Nazwa/Adres *</label>
            <input
              type="text"
              value={smwData.extraViewingConfig?.nameAddress || ''}
              onChange={(e) => updateSmwData({ 
                extraViewingConfig: { nameAddress: e.target.value, cabinets: smwData.extraViewingConfig?.cabinets || [] } 
              })}
              placeholder="Wprowadź nazwę lub adres"
            />
          </div>

          <div className="form-group">
            <label>Ilość szaf *</label>
            <input
              type="number"
              min={0}
              value={smwData.extraViewingConfig?.cabinets?.length || 0}
              onChange={(e) => {
                const count = parseInt(e.target.value) || 0;
                const cabinets: SmwCabinet[] = Array.from({ length: count }, (_, i) => ({
                  type: 'S1' as const,
                  name: `Szafa Extra ${i + 1}`
                }));
                updateSmwData({ extraViewingConfig: { nameAddress: smwData.extraViewingConfig?.nameAddress || '', cabinets } });
              }}
            />
          </div>

          {(smwData.extraViewingConfig?.cabinets || []).map((cabinet: SmwCabinet, idx: number) => (
            <div key={idx} className="cabinet-config" style={{ marginLeft: '20px', marginBottom: '15px', padding: '10px', background: '#333333', borderRadius: '4px' }}>
              <h5>Szafa {idx + 1}</h5>
              <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Typ Szafy</label>
                  <select
                    value={cabinet.type || 'S1'}
                    onChange={(e) => {
                      const newCabinets = [...(smwData.extraViewingConfig?.cabinets || [])];
                      newCabinets[idx].type = e.target.value as 'S1' | 'S2' | 'S3' | 'S4';
                      updateSmwData({ extraViewingConfig: { nameAddress: smwData.extraViewingConfig?.nameAddress || '', cabinets: newCabinets } });
                    }}
                  >
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="S3">S3</option>
                    <option value="S4">S4</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Nazwa Szafy</label>
                  <input
                    type="text"
                    value={cabinet.name || ''}
                    onChange={(e) => {
                      const newCabinets = [...(smwData.extraViewingConfig?.cabinets || [])];
                      newCabinets[idx].name = e.target.value;
                      updateSmwData({ extraViewingConfig: { nameAddress: smwData.extraViewingConfig?.nameAddress || '', cabinets: newCabinets } });
                    }}
                    placeholder={`Szafa Extra ${idx + 1}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LCS Configuration */}
      {currentSubStep === 'lcs' && (
        <div className="smw-section">
          <h4>Konfiguracja LCS</h4>
          
          <div className="form-group">
            <label>Ilość szaf LCS *</label>
            <input
              type="number"
              min={0}
              value={smwData.lcsConfig?.cabinets?.length || 0}
              onChange={(e) => {
                const count = parseInt(e.target.value) || 0;
                const cabinets: SmwCabinet[] = Array.from({ length: count }, (_, i) => ({
                  type: 'S1' as const,
                  name: `Szafa LCS ${i + 1}`
                }));
                updateSmwData({ lcsConfig: { cabinets } });
              }}
            />
          </div>

          {(smwData.lcsConfig?.cabinets || []).map((cabinet: SmwCabinet, idx: number) => (
            <div key={idx} className="cabinet-config" style={{ marginLeft: '20px', marginBottom: '15px', padding: '10px', background: '#333333', borderRadius: '4px' }}>
              <h5>Szafa LCS {idx + 1}</h5>
              <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Typ Szafy</label>
                  <select
                    value={cabinet.type || 'S1'}
                    onChange={(e) => {
                      const newCabinets = [...(smwData.lcsConfig?.cabinets || [])];
                      newCabinets[idx].type = e.target.value as 'S1' | 'S2' | 'S3' | 'S4';
                      updateSmwData({ lcsConfig: { cabinets: newCabinets } });
                    }}
                  >
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="S3">S3</option>
                    <option value="S4">S4</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Nazwa Szafy</label>
                  <input
                    type="text"
                    value={cabinet.name || ''}
                    onChange={(e) => {
                      const newCabinets = [...(smwData.lcsConfig?.cabinets || [])];
                      newCabinets[idx].name = e.target.value;
                      updateSmwData({ lcsConfig: { cabinets: newCabinets } });
                    }}
                    placeholder={`Szafa LCS ${idx + 1}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Buttons - SMW has internal multi-step navigation */}
      <div className="wizard-buttons">
        <button type="button" onClick={handleSmwPrev} className="btn-secondary">
          Wstecz
        </button>
        <button type="button" onClick={handleSmwNext} className="btn-primary">
          {smwStep < getTotalSmwSteps() ? 'Dalej' : 'Zakończ konfigurację'}
        </button>
      </div>
    </div>
  );
};
