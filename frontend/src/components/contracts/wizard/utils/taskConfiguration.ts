import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../config/subsystemWizardConfig';
import type { SubsystemWizardData, TaskConfiguration, WizardData } from '../types/wizard.types';
import { buildTaskNameFromDetails, generateAllTasks, resolveTaskVariant } from './taskGenerator';

export interface WizardTaskEntry {
  key: string;
  taskId?: number;
  taskNumber: string;
  taskName: string;
  taskType: string;
  subsystemType: string;
  subsystemLabel: string;
  taskVariant?: string | null;
  configParams: Record<string, any>;
}

const toConfigParams = (params: SubsystemWizardData['params']): Record<string, any> =>
  params && typeof params === 'object' && !Array.isArray(params)
    ? (params as Record<string, any>)
    : {};

export const buildWizardTaskEntries = (wizardData: WizardData): WizardTaskEntry[] =>
  wizardData.subsystems.flatMap((subsystem, subsystemIndex) => {
    const generatedTasks = generateAllTasks([subsystem], wizardData.liniaKolejowa);
    const taskDetails = subsystem.taskDetails ?? [];
    const taskCount = Math.max(generatedTasks.length, taskDetails.length);
    const subsystemLabel = SUBSYSTEM_WIZARD_CONFIG[subsystem.type]?.label || subsystem.type;
    const configParams = toConfigParams(subsystem.params);

    return Array.from({ length: taskCount }, (_, taskIndex) => {
      const detail = taskDetails[taskIndex];
      const generatedTask = generatedTasks[taskIndex];
      const resolvedTaskType = detail
        ? resolveTaskVariant(detail.taskType, detail)
        : generatedTask?.type || subsystem.type;
      const taskName =
        generatedTask?.name ||
        detail?.nazwa ||
        (detail ? buildTaskNameFromDetails(detail.taskType, detail, wizardData.liniaKolejowa) : '') ||
        `${subsystemLabel} #${taskIndex + 1}`;
      const taskNumber =
        detail?.taskNumber ||
        generatedTask?.number ||
        `${subsystem.type}-${taskIndex + 1}`;

      return {
        key: detail?.taskWizardId || detail?.taskNumber || `${subsystem.type}-${subsystemIndex}-${taskIndex}`,
        taskId: detail?.id,
        taskNumber,
        taskName,
        taskType: resolvedTaskType,
        subsystemType: subsystem.type,
        subsystemLabel,
        taskVariant: resolvedTaskType !== subsystem.type ? resolvedTaskType : null,
        configParams,
      };
    });
  });

export const hasAllTaskConfigurations = (wizardData: WizardData): boolean => {
  const taskEntries = buildWizardTaskEntries(wizardData);
  if (taskEntries.length === 0) {
    return true;
  }

  return taskEntries.every((task) => wizardData.taskConfigurations?.[task.key]?.isConfigured);
};

export const buildTaskConfigurationMetadata = (taskConfiguration?: TaskConfiguration) => {
  if (!taskConfiguration?.isConfigured) {
    return {};
  }

  return {
    bom: {
      templateId: taskConfiguration.bomTemplateId,
      templateVersion: taskConfiguration.bomTemplateVersion,
      materials: taskConfiguration.materials,
    },
    bomConfigParams: taskConfiguration.configParams || {},
  };
};
