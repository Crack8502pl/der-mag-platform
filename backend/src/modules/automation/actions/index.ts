// Rejestracja klocków startowych – nowy klocek = nowy plik + jedna linia poniżej.

import { AutomationRegistry } from '../registry/AutomationRegistry';
import { sendEmailAction } from './sendEmail';
import { notifySlackAction } from './notifySlack';
import { generateFormPdfAction } from './generateFormPdf';
import { createTaskAction } from './createTask';
import { changeTaskStatusAction } from './changeTaskStatus';
import { reserveBomMaterialsAction } from './reserveBomMaterials';

export function createDefaultRegistry(): AutomationRegistry {
  return new AutomationRegistry()
    .register(sendEmailAction)
    .register(notifySlackAction)
    .register(generateFormPdfAction)
    .register(createTaskAction)
    .register(changeTaskStatusAction)
    .register(reserveBomMaterialsAction);
}

export const automationRegistry = createDefaultRegistry();
