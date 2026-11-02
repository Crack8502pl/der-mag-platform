// Klocek: zapis PDF formularza jako dokumentu zadania.

import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../../../config/database';
import { FormInstance } from '../../../entities/FormInstance';
import { DocumentService } from '../../../services/DocumentService';
import { FormInstancePdfService } from '../../../services/FormInstancePdfService';
import type { AutomationAction } from '../contracts';

export const generateFormPdfAction: AutomationAction = {
  key: 'generate_form_pdf',
  label: 'Zapisz PDF formularza w dokumentach zadania',
  description: 'Generuje PDF formularza i zapisuje go jako dokument zadania, do którego formularz należy.',
  category: 'Dokumenty',
  params: [
    { key: 'name', label: 'Nazwa dokumentu', type: 'text', required: false, description: 'Domyślnie: „Formularz” z numerem zadania.' },
  ],
  requiredPermission: { module: 'documents', action: 'create' },
  supportsDryRun: true,
  async run(ctx, params, { dryRun }) {
    if (ctx.instanceId == null) {
      return { status: 'SKIPPED', message: 'Zdarzenie nie dotyczy formularza – nie ma czego zapisać.', output: {} };
    }
    const instance = await AppDataSource.getRepository(FormInstance).findOne({ where: { id: ctx.instanceId } });
    if (!instance) return { status: 'FAILED', message: 'Nie znaleziono formularza.', output: {} };
    if (instance.taskId == null) {
      return { status: 'SKIPPED', message: 'Formularz nie jest powiązany z zadaniem – PDF nie został zapisany.', output: {} };
    }
    const name = (typeof params.name === 'string' && params.name.trim()) || `Formularz nr ${instance.id}`;
    if (dryRun) {
      return { status: 'OK', message: 'Tryb testowy: PDF zostałby zapisany w dokumentach zadania.', output: { name, taskId: instance.taskId } };
    }
    const pdf = await new FormInstancePdfService().generate(instance.id);
    const directory = path.join(process.env.UPLOAD_DIR || './uploads', 'documents');
    await fs.promises.mkdir(directory, { recursive: true });
    const fileName = `formularz-${instance.id}-${Date.now()}.pdf`;
    const filePath = path.join(directory, fileName);
    await fs.promises.writeFile(filePath, pdf);
    const document = await DocumentService.createDocument({
      name,
      taskId: instance.taskId,
      category: 'protocol',
      filePath,
      fileSize: pdf.length,
      mimeType: 'application/pdf',
      originalFilename: fileName,
      createdById: ctx.chainAuthorId ?? ctx.actorId ?? undefined,
    });
    return { status: 'OK', message: 'PDF formularza zapisano w dokumentach zadania.', output: { documentId: document.id, name } };
  },
};
