import { Request, Response, NextFunction, RequestHandler } from 'express';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { AppDataSource } from '../config/database';
import { FormTemplate } from '../entities/FormTemplate';
import { FormTemplateVersion } from '../entities/FormTemplateVersion';
import { FormSection } from '../entities/FormSection';
import { FormFieldDefinition } from '../entities/FormFieldDefinition';
import { FormTrigger } from '../entities/FormTrigger';
import { FormAssignmentRule } from '../entities/FormAssignmentRule';
import { FormInstance } from '../entities/FormInstance';
import { FormFieldValue } from '../entities/FormFieldValue';
import { RolePermissions } from '../entities/Role';
import { FormDomainError, FormDomainErrorCode } from '../errors/FormDomainError';
import { FormTemplateService } from '../services/FormTemplateService';
import { FormInstanceService } from '../services/FormInstanceService';
import { FormApprovalService } from '../services/FormApprovalService';
import { ForbiddenError } from '../utils/AppError';

const statusByCode: Record<FormDomainErrorCode, number> = {
  TEMPLATE_NOT_FOUND: 404, VERSION_NOT_FOUND: 404, INSTANCE_NOT_FOUND: 404,
  VERSION_NOT_DRAFT: 409, VERSION_NOT_PUBLISHED: 409, DRAFT_ALREADY_EXISTS: 409,
  INVALID_INSTANCE_STATUS: 409, INVALID_DEFINITION: 400, INVALID_RESPONSES: 400,
  INVALID_ASSIGNMENT: 400,
  INVALID_INSTANCE_CONTEXT: 400,
  REJECTION_COMMENT_REQUIRED: 400,
};

const permissions = (req: Request): RolePermissions => req.user!.permissions;

// Identical SQL predicate for paginated lists and individual-record reads/mutations.
export function scopeFormInstances(query: SelectQueryBuilder<FormInstance>, req: Request): SelectQueryBuilder<FormInstance> {
  const grants = permissions(req);
  if (grants.all === true || grants.forms?.readAll === true) return query;
  return query.andWhere(`(
    instance.createdById = :actorId OR instance.assignedUserId = :actorId OR
    EXISTS (SELECT 1 FROM brigade_members member
      WHERE member.brigade_id = instance.assigned_team_id AND member.user_id = :actorId
        AND member.active = TRUE AND member.valid_from <= CURRENT_DATE
        AND (member.valid_to IS NULL OR member.valid_to >= CURRENT_DATE))
  )`, { actorId: req.userId });
}

export class FormsController {
  private readonly templates = new FormTemplateService();
  private readonly instances = new FormInstanceService();
  private readonly approvals = new FormApprovalService();

  private handler(operation: (req: Request) => Promise<unknown>, status = 200): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const data = await operation(req);
        res.status(status).json({ success: true, message: 'OK', data });
      } catch (error) {
        if (error instanceof FormDomainError) {
          res.status(statusByCode[error.code]).json({
            success: false, message: error.message, code: error.code, details: error.details,
          });
          return;
        }
        next(error);
      }
    };
  }

  private async template(id: number): Promise<FormTemplate> {
    const template = await AppDataSource.getRepository(FormTemplate).findOne({ where: { id } });
    if (!template) throw new FormDomainError('TEMPLATE_NOT_FOUND', 'Form template was not found');
    return template;
  }

  private async version(id: number): Promise<FormTemplateVersion> {
    const version = await AppDataSource.getRepository(FormTemplateVersion).findOne({ where: { id } });
    if (!version) throw new FormDomainError('VERSION_NOT_FOUND', 'Form version was not found');
    return version;
  }

  private async scopedInstance(req: Request, manager?: EntityManager, id = Number(req.params.id)): Promise<FormInstance> {
    const repository = manager ? manager.getRepository(FormInstance) : AppDataSource.getRepository(FormInstance);
    const query = repository.createQueryBuilder('instance');
    const instance = await scopeFormInstances(query, req).andWhere('instance.id = :id', { id }).getOne();
    if (!instance) throw new FormDomainError('INSTANCE_NOT_FOUND', 'Form instance was not found');
    return instance;
  }

  listTemplates = this.handler(async req => {
    const [items, total] = await AppDataSource.getRepository(FormTemplate).findAndCount({
      order: { id: 'DESC' }, skip: (Number(req.query.page) - 1) * Number(req.query.limit), take: Number(req.query.limit),
    });
    return { items, total, page: Number(req.query.page), limit: Number(req.query.limit) };
  });

  createTemplate = this.handler(req => this.templates.createTemplate(req.body, req.userId!), 201);
  getTemplate = this.handler(req => this.template(Number(req.params.id)));

  listVersions = this.handler(async req => {
    const templateId = Number(req.params.id);
    await this.template(templateId);
    const [items, total] = await AppDataSource.getRepository(FormTemplateVersion).findAndCount({
      where: { templateId }, order: { version: 'DESC' },
      skip: (Number(req.query.page) - 1) * Number(req.query.limit), take: Number(req.query.limit),
    });
    return { items, total, page: Number(req.query.page), limit: Number(req.query.limit) };
  });

  createDraft = this.handler(req => this.templates.createDraft(Number(req.params.id), req.userId!), 201);

  getVersion = this.handler(async req => {
    const version = await this.version(Number(req.params.id));
    const where = { templateVersionId: version.id };
    const [sections, fields, triggers, assignmentRules] = await Promise.all([
      AppDataSource.getRepository(FormSection).find({ where, order: { sortOrder: 'ASC', id: 'ASC' } }),
      AppDataSource.getRepository(FormFieldDefinition).find({ where, order: { sortOrder: 'ASC', id: 'ASC' } }),
      AppDataSource.getRepository(FormTrigger).find({ where, order: { id: 'ASC' } }),
      AppDataSource.getRepository(FormAssignmentRule).find({ where, order: { priority: 'ASC', id: 'ASC' } }),
    ]);
    return { ...version, sections, fields, triggers, assignmentRules };
  });

  updateDraft = this.handler(req => this.templates.updateDraft(Number(req.params.id), req.body, req.userId!));
  publish = this.handler(req => this.templates.publishVersion(Number(req.params.id), req.userId!));
  nextVersion = this.handler(req => this.templates.createNextVersion(Number(req.params.id), req.userId!), 201);

  listAssignmentRules = this.handler(async req => {
    const version = await this.version(Number(req.params.id));
    return AppDataSource.getRepository(FormAssignmentRule).find({
      where: { templateVersionId: version.id }, order: { priority: 'ASC', id: 'ASC' },
    });
  });

  // forms.assign is deliberately a cross-record privilege, independent of instance ownership.
  replaceAssignmentRules = this.handler(req => this.templates.replaceAssignmentRules(
    Number(req.params.id), req.body.rules, req.userId!,
  ));

  listInstances = this.handler(async req => {
    const query = AppDataSource.getRepository(FormInstance).createQueryBuilder('instance');
    const [items, total] = await scopeFormInstances(query, req).orderBy('instance.id', 'DESC')
      .skip((Number(req.query.page) - 1) * Number(req.query.limit)).take(Number(req.query.limit)).getManyAndCount();
    return { items, total, page: Number(req.query.page), limit: Number(req.query.limit) };
  });

  createInstance = this.handler(async req => {
    const grants = permissions(req);
    const input = req.body;
    const contexts = ['contractId', 'taskId', 'subsystemTaskId', 'objectId', 'deviceId', 'bomItemId', 'workflowBomItemId'];
    const needsAssign = contexts.some(key => input[key] !== undefined)
      || input.assignedTeamId !== undefined
      || (input.assignedUserId !== undefined && input.assignedUserId !== req.userId);
    // Without a reusable context ACL, only assign/all may link domain records or other assignees.
    if (needsAssign && grants.all !== true && grants.forms?.assign !== true) {
      throw new ForbiddenError('Linking contexts or other assignees requires forms.assign');
    }
    return this.instances.createInstance({ ...input, assignedUserId: input.assignedUserId ?? req.userId! }, req.userId!);
  }, 201);

  getInstance = this.handler(req => this.scopedInstance(req));

  // Like rule management, instance reassignment is a cross-record forms.assign privilege.
  assignInstance = this.handler(req => this.instances.assignInstance(Number(req.params.id), req.body, req.userId!));

  getValues = this.handler(async req => {
    const instance = await this.scopedInstance(req);
    return AppDataSource.getRepository(FormFieldValue).find({ where: { instanceId: instance.id }, order: { id: 'ASC' } });
  });

  // Authorize through the transaction manager while the row lock serializes reassignment.
  updateValues = this.handler(req => this.instances.saveResponses(
    Number(req.params.id), req.body.responses, req.userId!,
    async (manager, instance) => { await this.scopedInstance(req, manager, instance.id); },
  ));

  complete = this.handler(req => this.instances.complete(
    Number(req.params.id), req.userId!,
    async (manager, instance) => { await this.scopedInstance(req, manager, instance.id); },
  ));

  // forms.approve permits decisions across records; the service enforces submitted state.
  approve = this.handler(req => this.approvals.approve(Number(req.params.id), req.userId!, req.body.comment));
  reject = this.handler(req => this.approvals.reject(Number(req.params.id), req.userId!, req.body.comment));
}
