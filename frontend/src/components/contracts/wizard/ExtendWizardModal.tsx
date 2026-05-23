/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/contracts/wizard/ExtendWizardModal.tsx
// Extend Wizard Modal — allows extending CREATED / IN_PROGRESS contracts
// with new subsystems and/or new tasks in existing subsystems.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ExtendWizardModalProps, ExtendStepInfo, ExtendWizardData } from './types/extend-wizard.types';
import { useExtendWizardState } from './hooks/useExtendWizardState';
import { useWizardDraft } from '../../../hooks/useWizardDraft';
import contractService from '../../../services/contract.service';
import taskRelationshipService from '../../../services/taskRelationship.service';
import networkTopologyService from '../../../services/networkTopology.service';
import { generateAllTasks, buildTaskNameFromDetails, resolveTaskVariant } from './utils/taskGenerator';

// Extend-specific step components
import { ContractReviewStep } from './extend/steps/ContractReviewStep';
import { SubsystemsOverviewStep } from './extend/steps/SubsystemsOverviewStep';
import { AddTasksToExistingStep } from './extend/steps/AddTasksToExistingStep';

// Reused step components
import { TaskRelationshipsStep } from './steps/TaskRelationshipsStep';
import { InfrastructureStep } from './steps/InfrastructureStep';
import { LogisticsStep } from './steps/LogisticsStep';
import { TaskConfigurationStep } from './steps/TaskConfigurationStep';
import { CustomOrdersStep } from './steps/CustomOrdersStep';
import { PreviewStep } from './steps/PreviewStep';
import { NetworkTopologyStep } from '../../network-topology/NetworkTopologyStep';

// Subsystem config/details components (for new subsystems)
import { SmokipAConfigStep } from './subsystems/smokip-a/SmokipAConfigStep';
import { SmokipADetailsStep } from './subsystems/smokip-a/SmokipADetailsStep';
import { SmokipBConfigStep } from './subsystems/smokip-b/SmokipBConfigStep';
import { SmokipBDetailsStep } from './subsystems/smokip-b/SmokipBDetailsStep';
import { SkdConfigStep } from './subsystems/skd/SkdConfigStep';
import { SmwConfigStep } from './subsystems/smw/SmwConfigStep';
import { SswinConfigStep } from './subsystems/sswin/SswinConfigStep';
import { CctvConfigStep } from './subsystems/cctv/CctvConfigStep';
import { SdipConfigStep } from './subsystems/sdip/SdipConfigStep';
import { SugConfigStep } from './subsystems/sug/SugConfigStep';
import { SspConfigStep } from './subsystems/ssp/SspConfigStep';
import { LanConfigStep } from './subsystems/lan/LanConfigStep';
import { OtkConfigStep } from './subsystems/otk/OtkConfigStep';
import { ZasilanieConfigStep } from './subsystems/zasilanie/ZasilanieConfigStep';

import type { WizardData, SubsystemWizardData, TaskDetail } from './types/wizard.types';
import type { TopologyNode, TopologyConnection } from '../../../types/network-topology.types';

import './ContractWizardModal.css';

// ─── Helpers: map wizard-state topology objects to backend DTO format ──────────

interface BackendTopologyNodeDto {
  id: string;
  nodeType: string;
  sourceType: string;
  label: string;
  position: { x: number; y: number };
  kilometre?: number;
  isActive?: boolean;
  taskId?: number;
}

interface BackendTopologyConnectionDto {
  id: string;
  source: string;
  target: string;
  technology: 'FIBER' | 'LAN';
  distance?: number;
  notes?: string;
}

function mapWizardNodeToDto(node: TopologyNode): BackendTopologyNodeDto {
  return {
    id: node.id,
    nodeType: node.type,
    sourceType: 'task',
    label: node.label,
    position: node.position,
    kilometre: node.data?.km,
    taskId: node.data?.taskId,
  };
}

function mapWizardConnectionToDto(conn: TopologyConnection): BackendTopologyConnectionDto {
  return {
    id: conn.id,
    source: conn.source,
    target: conn.target,
    technology: (conn.technology?.toUpperCase() ?? 'FIBER') as 'FIBER' | 'LAN',
  };
}

// ──────────────────────────────────────────────────────────────────────────────

const ALLOWED_STATUSES = ['CREATED', 'IN_PROGRESS'] as const;

export const ExtendWizardModal: React.FC<ExtendWizardModalProps> = ({ contract, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wizardSubmitted, setWizardSubmitted] = useState(false);

  const statusError = useMemo(
    () =>
      !ALLOWED_STATUSES.includes(contract.status as typeof ALLOWED_STATUSES[number])
        ? `Nie można rozszerzyć kontraktu w statusie: ${contract.status}`
        : '',
    [contract.status]
  );

  useEffect(() => {
    if (statusError) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [statusError, onClose]);

  // ── Wizard state ────────────────────────────────────────────────────────────
  const {
    extendData,
    loadContractData,
    toggleAddingNewTasks,
    addTaskToExisting,
    removeTaskFromExisting,
    updateExistingTaskDetail,
    addNewSubsystem,
    removeNewSubsystem,
    initializeNewSubsystemTasks,
    updateNewTaskDetail,
    addNewTaskDetail,
    removeNewTaskDetail,
    handleKilometrazBlur,
    canProceedFromDetails,
    updateExtendData,
    updateInfrastructure,
    updateTaskInfrastructure,
    updateLogistics,
  } = useExtendWizardState({
    contractId: contract.id,
    contractNumber: contract.contractNumber,
    customName: contract.customName,
    orderDate: typeof contract.orderDate === 'string'
      ? contract.orderDate
      : (contract.orderDate as Date).toISOString().split('T')[0],
    projectManagerId: contract.projectManagerId?.toString() ?? '',
    managerCode: contract.managerCode || '',
    liniaKolejowa: contract.liniaKolejowa,
  });

  // ── Draft management ────────────────────────────────────────────────────────
  const {
    setData: setDraftData,
    setCurrentStep: setDraftCurrentStep,
    saveDraft: saveDraftNow,
    isSaving: draftIsSaving,
    lastSaveTime: draftLastSaveTime,
    showRestoreModal: showDraftRestoreModal,
    savedDraft,
    restoreDraft: handleRestoreDraft,
    discardDraft: handleDiscardDraft,
    clearDraft,
  } = useWizardDraft<ExtendWizardData>({
    wizardType: `contract-wizard-extend-${contract.id}`,
    initialData: extendData,
    autoSaveInterval: 30000,
    enabled: true,
    autoSaveEnabled: currentStep >= 2 && !wizardSubmitted,
    onRestore: (data) => {
      updateExtendData(data);
    },
  });

  // Keep draft data and step in sync with live wizard state (debounced 500ms).
  const draftSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setDraftCurrentStep(currentStep);
    if (draftSyncTimerRef.current) clearTimeout(draftSyncTimerRef.current);
    if (currentStep >= 2) {
      draftSyncTimerRef.current = setTimeout(() => {
        console.log('[ExtendWizard] Syncing draft:', {
          currentStep,
          contractId: contract.id,
          existingSubsystemsCount: extendData.existingSubsystems?.length || 0,
          newSubsystemsCount: extendData.newSubsystems?.length || 0,
          hasRelationships: !!extendData.taskRelationships,
        });
        setDraftData(extendData);
      }, 500);
    }
    return () => {
      if (draftSyncTimerRef.current) clearTimeout(draftSyncTimerRef.current);
    };
  }, [extendData, currentStep, setDraftData, setDraftCurrentStep, contract.id]);

  // Load contract data on mount. loadContractData is stable (hook function reference never changes),
  // so it is safe to exclude it from deps to avoid re-running on every render.
  useEffect(() => {
    if (!statusError) {
      loadContractData(setLoading, setError);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step navigation logic ───────────────────────────────────────────────────

  /** Returns true for subsystem types that require a topology step */
  const shouldShowTopologyStep = (subsystemType: string): boolean =>
    subsystemType === 'SMOKIP_A' || subsystemType === 'SMOKIP_B';

  /**
   * Builds an ordered list of all SMOKIP subsystems needing topology steps.
   * New SMOKIP subsystems first, then existing SMOKIP subsystems with addingNewTasks.
   * The index in this array is the unified topology slot used as networkTopologies key.
   */
  const buildTopologySubsystemsList = () => {
    const result: Array<{
      type: SubsystemWizardData['type'];
      taskDetails: TaskDetail[];
      params: SubsystemWizardData['params'];
      subsystemId?: number;
    }> = [];
    // New SMOKIP subsystems (no DB ID yet)
    extendData.newSubsystems.forEach((sub) => {
      if (shouldShowTopologyStep(sub.type)) {
        result.push({ type: sub.type, taskDetails: sub.taskDetails ?? [], params: sub.params });
      }
    });
    // Existing SMOKIP subsystems (have DB ID) — show topology for all, not only addingNewTasks
    extendData.existingSubsystems.forEach((sub) => {
      if (shouldShowTopologyStep(sub.type)) {
        result.push({
          type: sub.type,
          taskDetails: [...sub.existingTasks, ...sub.newTasks],
          params: {},
          subsystemId: sub.id,
        });
      }
    });
    return result;
  };

  /**
   * Compute the ordered list of steps based on current state.
   * This is called on every render so navigation is always consistent.
   */
  const buildStepSequence = (): ExtendStepInfo[] => {
    const steps: ExtendStepInfo[] = [
      { type: 'review' },
      { type: 'subsystems-overview' },
    ];

    // One add-tasks step per existing subsystem that has addingNewTasks=true
    extendData.existingSubsystems
      .filter((s) => s.addingNewTasks)
      .forEach((_, idx) => {
        steps.push({ type: 'add-tasks', subsystemIndex: idx, isNew: false });
      });

    // Config (+ optionally details) for each new subsystem
    extendData.newSubsystems.forEach((sub, idx) => {
      steps.push({ type: 'config', subsystemIndex: idx, isNew: true });
      if (sub.type === 'SMOKIP_A' || sub.type === 'SMOKIP_B') {
        steps.push({ type: 'details', subsystemIndex: idx, isNew: true });
      }
    });

    // Relationships (optional – only if SMOKIP subsystems have LCS/NASTAWNIA)
    const hasRelationships =
      extendData.existingSubsystems.some(
        (s) =>
          (s.type === 'SMOKIP_A' || s.type === 'SMOKIP_B') &&
          (s.existingTasks.some((t) => t.taskType === 'LCS' || t.taskType === 'NASTAWNIA') ||
            (s.addingNewTasks &&
              s.newTasks.some((t) => t.taskType === 'LCS' || t.taskType === 'NASTAWNIA')))
      ) ||
      extendData.newSubsystems.some(
        (s) =>
          (s.type === 'SMOKIP_A' || s.type === 'SMOKIP_B') &&
          s.taskDetails?.some((t) => t.taskType === 'LCS' || t.taskType === 'NASTAWNIA')
      );

    if (hasRelationships) steps.push({ type: 'relationships' });

    // Topology steps for SMOKIP subsystems (one per subsystem, after relationships)
    buildTopologySubsystemsList().forEach((_, topoIdx) => {
      steps.push({ type: 'topology', subsystemIndex: topoIdx });
    });

    steps.push({ type: 'infrastructure' });
    steps.push({ type: 'logistics' });
    steps.push({ type: 'task-config' });
    if (extendData.customOrdersEnabled) {
      steps.push({ type: 'custom-orders' });
    }
    steps.push({ type: 'preview' });
    steps.push({ type: 'success' });

    return steps;
  };

  const stepSequence = buildStepSequence();
  const totalSteps = stepSequence.length;
  const currentStepInfo: ExtendStepInfo = stepSequence[currentStep - 1] ?? { type: 'review' };

  const handleNext = () => {
    // When leaving config step for SMOKIP, initialize task details
    if (currentStepInfo.type === 'config' && currentStepInfo.isNew && currentStepInfo.subsystemIndex !== undefined) {
      const sub = extendData.newSubsystems[currentStepInfo.subsystemIndex];
      if (sub && (sub.type === 'SMOKIP_A' || sub.type === 'SMOKIP_B')) {
        initializeNewSubsystemTasks(currentStepInfo.subsystemIndex);
      }
    }
    setCurrentStep((s) => Math.min(s + 1, totalSteps));
    setError('');
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
    setError('');
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (wizardSubmitted) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        newSubsystems: extendData.newSubsystems.map((sub) => {
          const tasks = generateAllTasks([sub as SubsystemWizardData], extendData.liniaKolejowa);
          return {
            type: sub.type,
            params: sub.params,
            ipPool: sub.ipPool,
            tasks: tasks.map((t, idx) => {
              const detail = sub.taskDetails?.[idx];
              return {
                name: t.name,
                type: t.type,
                gpsLatitude: detail?.gpsLatitude || null,
                gpsLongitude: detail?.gpsLongitude || null,
                googleMapsUrl: detail?.googleMapsUrl || null,
              };
            }),
          };
        }),
        extendedSubsystems: extendData.existingSubsystems
          .filter((s) => s.addingNewTasks && s.newTasks.length > 0)
          .map((s) => ({
            subsystemId: s.id,
            newTasks: s.newTasks.map((t) => ({
              name: buildTaskNameFromDetails(t.taskType, t, extendData.liniaKolejowa),
              type: resolveTaskVariant(t.taskType, t),
              gpsLatitude: t.gpsLatitude || null,
              gpsLongitude: t.gpsLongitude || null,
              googleMapsUrl: t.googleMapsUrl || null,
              metadata: {
                kilometraz: t.kilometraz,
                kategoria: t.kategoria,
                miejscowosc: t.miejscowosc,
                nazwaLCS: t.nazwaLCS,
                nazwaNastawnii: t.nazwaNastawnii,
                liniaKolejowa: t.liniaKolejowa || extendData.liniaKolejowa,
              },
            })),
          })),
        infrastructure: extendData.infrastructure,
        logistics: extendData.logistics,
      };

      await contractService.extendContract(contract.id, payload);

      // Save relationships (frontend-only, non-fatal)
      await saveRelationships();

      // Save / update network topologies (non-fatal – topology errors must not break extend)
      if (extendData.networkTopologies) {
        // New SMOKIP subsystems in order (for computing their DB subsystemIndex)
        const newSMOKIPSubs = extendData.newSubsystems.filter(s => shouldShowTopologyStep(s.type));

        for (const [key, topology] of Object.entries(extendData.networkTopologies)) {
          try {
            if (key.startsWith('subsystem-')) {
              // Existing subsystem – key = 'subsystem-{id}'
              const subsystemId = parseInt(key.replace('subsystem-', ''), 10);
              const existingSubsystem = extendData.existingSubsystems.find(s => s.id === subsystemId);
              if (!existingSubsystem) continue;
              // DB subsystemIndex = position in existingSubsystems (ordered by creation)
              const dbSubsystemIndex = extendData.existingSubsystems.indexOf(existingSubsystem);

              const existingTopology = await networkTopologyService.getByContractAndSubsystem(
                contract.id,
                dbSubsystemIndex
              );
              if (existingTopology) {
                await networkTopologyService.update(existingTopology.id, {
                  name: existingTopology.name,
                  contractId: contract.id,
                  subsystemIndex: dbSubsystemIndex,
                  subsystemType: existingSubsystem.type,
                  nodes: topology.nodes.map(mapWizardNodeToDto) as any,
                  connections: topology.connections.map(mapWizardConnectionToDto) as any,
                  notes: 'Zaktualizowano podczas rozszerzania kontraktu',
                });
                console.log(`✅ Updated topology for existing subsystem ${subsystemId} (dbIndex=${dbSubsystemIndex})`);
              } else {
                await networkTopologyService.create({
                  name: `Topologia ${existingSubsystem.type} - ${contract.customName}`,
                  contractId: contract.id,
                  subsystemIndex: dbSubsystemIndex,
                  subsystemType: existingSubsystem.type,
                  nodes: topology.nodes.map(mapWizardNodeToDto) as any,
                  connections: topology.connections.map(mapWizardConnectionToDto) as any,
                  notes: 'Utworzono podczas rozszerzania kontraktu',
                });
                console.log(`✅ Created topology for existing subsystem ${subsystemId} (dbIndex=${dbSubsystemIndex})`);
              }
            } else {
              // New subsystem – numeric key = position in new SMOKIP subsystems list
              const topoIdx = parseInt(key, 10);
              const newSub = newSMOKIPSubs[topoIdx];
              if (!newSub) continue;
              // DB subsystemIndex for new subsystem comes after all existing subsystems
              const newSubOrigIdx = extendData.newSubsystems.indexOf(newSub);
              const dbSubsystemIndex = extendData.existingSubsystems.length + newSubOrigIdx;

              await networkTopologyService.create({
                name: `Topologia ${newSub.type} - ${contract.customName}`,
                contractId: contract.id,
                subsystemIndex: dbSubsystemIndex,
                subsystemType: newSub.type,
                nodes: topology.nodes.map(mapWizardNodeToDto) as any,
                connections: topology.connections.map(mapWizardConnectionToDto) as any,
                notes: 'Utworzono podczas rozszerzania kontraktu',
              });
              console.log(`✅ Created topology for new subsystem index ${topoIdx} (dbIndex=${dbSubsystemIndex})`);
            }
          } catch (topoErr: unknown) {
            console.error(`❌ Failed to save topology for key ${key}:`, topoErr);
          }
        }
      }

      setWizardSubmitted(true);
      await clearDraft();
      handleNext(); // move to success step
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosErr.response?.data?.message || axiosErr.message || 'Błąd podczas rozszerzania kontraktu');
    } finally {
      setLoading(false);
    }
  };

  const saveRelationships = async () => {
    const { taskRelationships } = extendData;
    if (!taskRelationships || Object.keys(taskRelationships).length === 0) return;

    for (const sub of extendData.existingSubsystems) {
      if (sub.type !== 'SMOKIP_A' && sub.type !== 'SMOKIP_B') continue;
      if (!sub.id) continue;

      const allTasks = [...sub.existingTasks, ...sub.newTasks];
      const relationships: Array<{ parentTaskNumber: string; childTaskNumbers: string[]; parentType: string }> = [];

      for (const [parentWizardId, rel] of Object.entries(taskRelationships)) {
        const parentTask = allTasks.find(
          (t) => t.taskWizardId === parentWizardId
        );
        if (!parentTask?.taskNumber) continue;

        const childTaskNumbers: string[] = rel.childTaskKeys
          .map((childKey) => {
            const childTask = allTasks.find((t) => t.taskWizardId === childKey);
            return childTask?.taskNumber;
          })
          .filter((n): n is string => !!n);

        if (childTaskNumbers.length > 0) {
          relationships.push({
            parentTaskNumber: parentTask.taskNumber,
            childTaskNumbers,
            parentType: rel.parentType,
          });
        }
      }

      if (relationships.length > 0) {
        try {
          await taskRelationshipService.bulkCreateFromWizard({ subsystemId: sub.id, relationships });
        } catch (relErr) {
          console.warn(`[ExtendWizardModal] Non-fatal: could not save relationships for subsystem ${sub.id}:`, relErr);
        }
      }
    }
  };

  // ── Step canProceed logic ───────────────────────────────────────────────────

  const canProceed = (): boolean => {
    if (currentStepInfo.type === 'review') return !loading;
    if (currentStepInfo.type === 'subsystems-overview') {
      return (
        extendData.existingSubsystems.some((s) => s.addingNewTasks) ||
        extendData.newSubsystems.length > 0
      );
    }
    if (currentStepInfo.type === 'add-tasks') return true;
    if (currentStepInfo.type === 'config') return true;
    if (currentStepInfo.type === 'details' && currentStepInfo.subsystemIndex !== undefined) {
      return canProceedFromDetails('new', currentStepInfo.subsystemIndex);
    }
    if (currentStepInfo.type === 'logistics') {
      const addresses = extendData.logistics?.deliveryAddresses;
      const hasAddresses =
        (addresses && addresses.length > 0 && addresses.some((d) => d.address.trim()));
      const hasPhone = !!(addresses?.some((d) => d.contactPhone.trim()));
      return !!hasAddresses && hasPhone;
    }
    return true;
  };

  // ── Virtual WizardData adapter for reusing InfrastructureStep/LogisticsStep ─

  const virtualWizardData: WizardData = {
    contractNumber: extendData.contractNumber,
    customName: extendData.customName,
    orderDate: extendData.orderDate,
    projectManagerId: extendData.projectManagerId,
    managerCode: extendData.managerCode,
    liniaKolejowa: extendData.liniaKolejowa,
    subsystems: extendData.newSubsystems as SubsystemWizardData[],
    infrastructure: extendData.infrastructure,
    logistics: extendData.logistics,
    taskRelationships: extendData.taskRelationships,
    networkTopologies: extendData.networkTopologies,
    customOrdersEnabled: extendData.customOrdersEnabled,
    taskConfigurations: extendData.taskConfigurations,
    customOrders: extendData.customOrders,
  };

  // ── Step rendering ──────────────────────────────────────────────────────────

  const renderStep = () => {
    if (statusError) {
      return (
        <div className="wizard-step-content">
          <div className="alert alert-error">{statusError}</div>
          <p className="text-muted">Okno zamknie się automatycznie…</p>
        </div>
      );
    }

    const step = currentStepInfo;

    if (step.type === 'review') {
      return (
        <ContractReviewStep
          contractData={extendData}
          loading={loading}
          onNext={handleNext}
        />
      );
    }

    if (step.type === 'subsystems-overview') {
      return (
        <SubsystemsOverviewStep
          existingSubsystems={extendData.existingSubsystems}
          newSubsystems={extendData.newSubsystems}
          onToggleAddTasks={toggleAddingNewTasks}
          onAddNewSubsystem={addNewSubsystem}
          onRemoveNewSubsystem={removeNewSubsystem}
          onNext={handleNext}
          onBack={handleBack}
        />
      );
    }

    if (step.type === 'add-tasks' && step.subsystemIndex !== undefined) {
      // Find the N-th subsystem that has addingNewTasks=true
      const targetSubs = extendData.existingSubsystems.filter((s) => s.addingNewTasks);
      const sub = targetSubs[step.subsystemIndex];
      if (!sub) return <div>Błąd: nie znaleziono podsystemu.</div>;
      return (
        <AddTasksToExistingStep
          subsystem={sub}
          liniaKolejowa={extendData.liniaKolejowa}
          onAddTask={addTaskToExisting}
          onRemoveTask={removeTaskFromExisting}
          onUpdateTask={updateExistingTaskDetail}
          onKilometrazBlur={(subsystemId, taskIndex, value) =>
            handleKilometrazBlur('existing', subsystemId, taskIndex, value)
          }
          onNext={handleNext}
          onBack={handleBack}
        />
      );
    }

    if (step.type === 'config' && step.isNew && step.subsystemIndex !== undefined) {
      const sub = extendData.newSubsystems[step.subsystemIndex];
      if (!sub) return <div>Błąd: nie znaleziono podsystemu.</div>;

      const subsystemAsSub: SubsystemWizardData = sub as SubsystemWizardData;
      const configComponents: Record<string, React.FC<{
        subsystem: SubsystemWizardData;
        subsystemIndex: number;
        onUpdate: (index: number, updates: Partial<SubsystemWizardData>) => void;
        onNext?: () => void;
        onPrev?: () => void;
      }>> = {
        SMOKIP_A: SmokipAConfigStep,
        SMOKIP_B: SmokipBConfigStep,
        SKD: SkdConfigStep,
        SMW: SmwConfigStep,
        SSWIN: SswinConfigStep,
        CCTV: CctvConfigStep,
        SDIP: SdipConfigStep,
        SUG: SugConfigStep,
        SSP: SspConfigStep,
        LAN: LanConfigStep,
        OTK: OtkConfigStep,
        ZASILANIE: ZasilanieConfigStep,
      };
      const Component = configComponents[sub.type];
      if (!Component) return <div>Nieznany typ podsystemu: {sub.type}</div>;

      return (
        <Component
          subsystem={subsystemAsSub}
          subsystemIndex={step.subsystemIndex}
          onUpdate={(index, updates) => {
            updateExtendData({
              newSubsystems: extendData.newSubsystems.map((sub, idx) =>
                idx === index ? { ...sub, ...updates } : sub
              ),
            });
          }}
          onNext={sub.type === 'SMW' ? handleNext : undefined}
          onPrev={sub.type === 'SMW' ? handleBack : undefined}
        />
      );
    }

    if (step.type === 'details' && step.isNew && step.subsystemIndex !== undefined) {
      const sub = extendData.newSubsystems[step.subsystemIndex];
      if (!sub) return <div>Błąd: nie znaleziono podsystemu.</div>;

      const subsystemAsSub: SubsystemWizardData = sub as SubsystemWizardData;
      const DetailsComponent =
        sub.type === 'SMOKIP_A' ? SmokipADetailsStep : SmokipBDetailsStep;
      return (
        <DetailsComponent
          subsystem={subsystemAsSub}
          subsystemIndex={step.subsystemIndex}
          detectedRailwayLine={extendData.liniaKolejowa}
          onUpdate={() => {}}
          onAddTask={(subIdx, taskType) => addNewTaskDetail(subIdx, taskType)}
          onRemoveTask={removeNewTaskDetail}
          onUpdateTask={updateNewTaskDetail}
          onNext={handleNext}
          onPrev={handleBack}
          handleKilometrazBlur={(subIdx, taskIdx, value) =>
            handleKilometrazBlur('new', subIdx, taskIdx, value)
          }
        />
      );
    }

    if (step.type === 'relationships') {
      return (
        <TaskRelationshipsStep
          wizardData={virtualWizardData}
          onUpdate={() => {}}
          extendMode={true}
          extendData={extendData}
          onUpdateExtendData={updateExtendData}
        />
      );
    }

    if (step.type === 'topology' && step.subsystemIndex !== undefined) {
      const topologySubs = buildTopologySubsystemsList();
      const sub = topologySubs[step.subsystemIndex];
      if (!sub) return <div>Błąd: nie znaleziono podsystemu dla topologii.</div>;
      // Build a virtual WizardData where subsystems maps to all topology subsystems in order
      const topoWizardData: WizardData = {
        ...virtualWizardData,
        contractId: contract.id,
        subsystems: topologySubs.map((s) => ({
          type: s.type,
          params: s.params,
          taskDetails: s.taskDetails,
          subsystemId: s.subsystemId,
        })) as SubsystemWizardData[],
        networkTopologies: extendData.networkTopologies,
      };
      return (
        <NetworkTopologyStep
          wizardData={topoWizardData}
          onUpdate={(updates) => {
            if (updates.networkTopologies) {
              updateExtendData({
                networkTopologies: updates.networkTopologies as Record<number | string, { nodes: TopologyNode[]; connections: TopologyConnection[] }>,
              });
            }
          }}
          subsystemIndex={step.subsystemIndex}
        />
      );
    }

    if (step.type === 'infrastructure') {
      return (
        <InfrastructureStep
          wizardData={virtualWizardData}
          onUpdate={(updates) => {
            if (updates.infrastructure) updateInfrastructure(updates.infrastructure);
          }}
          onUpdateTaskInfrastructure={updateTaskInfrastructure}
        />
      );
    }

    if (step.type === 'logistics') {
      return (
        <LogisticsStep
          wizardData={virtualWizardData}
          onUpdate={(updates) => {
            if (updates.logistics) updateLogistics(updates.logistics);
          }}
        />
      );
    }

    if (step.type === 'task-config') {
      const virtualData = {
        ...virtualWizardData,
        customOrdersEnabled: extendData.customOrdersEnabled,
        taskConfigurations: extendData.taskConfigurations,
      };
      return (
        <TaskConfigurationStep
          wizardData={virtualData}
          onUpdate={(updates) => {
            updateExtendData({
              customOrdersEnabled: updates.customOrdersEnabled ?? extendData.customOrdersEnabled,
              taskConfigurations: updates.taskConfigurations ?? extendData.taskConfigurations,
            });
          }}
        />
      );
    }

    if (step.type === 'custom-orders') {
      const virtualData = {
        ...virtualWizardData,
        customOrders: extendData.customOrders,
      };
      return (
        <CustomOrdersStep
          wizardData={virtualData}
          onUpdate={(updates) => {
            updateExtendData({ customOrders: updates.customOrders ?? extendData.customOrders });
          }}
        />
      );
    }

    if (step.type === 'preview') {
      return (
        <PreviewStep
          wizardData={virtualWizardData}
          generatedTasks={[]}
          extendMode={true}
          extendPreviewData={{ extendData }}
          onNext={handleSubmit}
          onPrev={handleBack}
        />
      );
    }

    if (step.type === 'success') {
      return (
        <div className="wizard-step-content wizard-success">
          <div className="success-icon">✅</div>
          <h3>Kontrakt rozszerzony!</h3>
          <p className="text-muted">
            Kontrakt <strong>{contract.contractNumber}</strong> został pomyślnie rozszerzony.
          </p>
          {extendData.newSubsystems.length > 0 && (
            <p>Dodano <strong>{extendData.newSubsystems.length}</strong> nowych podsystemów.</p>
          )}
          {extendData.existingSubsystems.filter((s) => s.addingNewTasks && s.newTasks.length > 0).length > 0 && (
            <p>
              Dodano nowe zadania do{' '}
              <strong>
                {extendData.existingSubsystems.filter((s) => s.addingNewTasks && s.newTasks.length > 0).length}
              </strong>{' '}
              istniejących podsystemów.
            </p>
          )}
          <div className="success-actions">
            <button
              className="btn btn-primary"
              onClick={() => { onSuccess(); onClose(); }}
            >
              ✅ Zamknij
            </button>
          </div>
        </div>
      );
    }

    return <div>Nieznany krok: {JSON.stringify(step)}</div>;
  };

  // ── UI ──────────────────────────────────────────────────────────────────────

  const isLastStep = currentStepInfo.type === 'success';
  const isPreviewStep = currentStepInfo.type === 'preview';
  const isInlineNavStep = ['review', 'subsystems-overview', 'add-tasks'].includes(currentStepInfo.type);

  // Steps that have their own nav buttons built-in
  const stepHandlesOwnNav = isInlineNavStep;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-wizard" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Rozszerzanie kontraktu: {contract.contractNumber}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Step indicator */}
        {!isLastStep && (
          <div className="wizard-steps">
            {stepSequence.map((step, idx) => {
              const stepNum = idx + 1;
              const labels: Record<string, string> = {
                review: 'Przegląd',
                'subsystems-overview': 'Podsystemy',
                'add-tasks': 'Zadania',
                config: 'Konfiguracja',
                details: 'Szczegóły',
                relationships: 'Powiązania',
                topology: 'Topologia',
                infrastructure: 'Infrastruktura',
                logistics: 'Logistyka',
                'task-config': 'Konf. Zadań',
                'custom-orders': 'Zamówienia',
                preview: 'Podgląd',
                success: 'Sukces',
              };
              return (
                <div
                  key={idx}
                  className={`wizard-step${currentStep === stepNum ? ' active' : ''}${currentStep > stepNum ? ' completed' : ''}`}
                >
                  <span className="step-number">{stepNum}</span>
                  <span className="step-label">{labels[step.type] ?? step.type}</span>
                </div>
              );
            })}
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {/* Draft restore modal */}
        {showDraftRestoreModal && savedDraft && (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📋 Przywróć draft</h2>
              </div>
              <div className="modal-body">
                <p>Znaleziono zapisany draft rozszerzenia kontraktu z dnia <strong>{new Date(savedDraft.updatedAt).toLocaleString('pl-PL')}</strong>.</p>
                <p>Czy chcesz przywrócić poprzednią sesję?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={handleDiscardDraft}>
                  🗑️ Odrzuć
                </button>
                <div className="footer-spacer" />
                <button className="btn btn-primary" onClick={handleRestoreDraft}>
                  ✅ Przywróć
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="modal-body">{renderStep()}</div>

        {/* Footer nav – only for steps without built-in buttons */}
        {!isLastStep && !stepHandlesOwnNav && (
          <div className="modal-footer">
            {currentStep > 1 && (
              <button className="btn btn-secondary" onClick={handleBack} disabled={loading}>
                ← Wstecz
              </button>
            )}
            {/* Draft save button – visible from step 2 */}
            {currentStep >= 2 && (
              <button
                className="btn btn-secondary"
                onClick={() => saveDraftNow()}
                disabled={draftIsSaving}
                title={draftLastSaveTime ? `Ostatni zapis: ${draftLastSaveTime.toLocaleTimeString('pl-PL')}` : 'Zapisz draft'}
              >
                {draftIsSaving ? '⏳ Zapisywanie...' : '💾 Zapisz draft'}
              </button>
            )}
            <div className="footer-spacer" />
            {currentStepInfo.type === 'topology' && (
              <button className="btn btn-secondary" onClick={handleNext} aria-label="Pomiń konfigurację topologii">
                Pomiń ▷
              </button>
            )}
            {!isPreviewStep && (
              <button
                className="btn btn-primary"
                onClick={handleNext}
                disabled={!canProceed() || loading}
              >
                Dalej →
              </button>
            )}
            {isPreviewStep && (
              <button
                className="btn btn-success"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Zapisywanie…' : '💾 Rozszerz kontrakt'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

