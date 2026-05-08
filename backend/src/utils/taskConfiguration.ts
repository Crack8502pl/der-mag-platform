import { BomSubsystemTemplateService } from '../services/BomSubsystemTemplateService';
import { serverLogger } from './logger';

/**
 * Applies a BOM template stored in task metadata to a newly created task.
 * The operation is best-effort: failures are logged as warnings and must not
 * block contract or subsystem creation.
 */
export async function autoApplyTaskConfiguration(
  taskMetadata: Record<string, any> | undefined,
  taskId: number,
  taskNumber: string
): Promise<void> {
  const templateId = Number(taskMetadata?.bom?.templateId);
  if (!templateId || Number.isNaN(templateId)) {
    serverLogger.debug(`ℹ️ Brak template BOM do auto-apply dla zadania ${taskNumber}`);
    return;
  }

  try {
    await BomSubsystemTemplateService.applyTemplateToTask(
      taskId,
      templateId,
      taskMetadata?.bomConfigParams || {}
    );
    serverLogger.info(`✅ Zastosowano konfigurację BOM do zadania ${taskNumber}`, { templateId });
  } catch (bomError) {
    serverLogger.warn(`⚠️ Nie udało się zastosować konfiguracji BOM do zadania ${taskNumber}`, {
      templateId,
      error: bomError instanceof Error ? bomError.message : String(bomError),
    });
  }
}
