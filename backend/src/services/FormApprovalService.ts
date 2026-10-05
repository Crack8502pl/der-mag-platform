import { DataSource } from 'typeorm';
import { AppDataSource } from '../config/database';
import { FormApproval } from '../entities/FormApproval';
import { FormInstance } from '../entities/FormInstance';
import { FormApprovalDecision, FormInstanceStatus } from '../entities/FormTypes';
import { FormDomainError } from '../errors/FormDomainError';
import { FormAuditService } from './FormAuditService';

export interface FormApprovalOptions {
  override?: boolean;
}

// Single default step; stepKey/stepOrder/round columns allow multi-step flows later.
const DEFAULT_STEP = { stepKey: 'approval', stepOrder: 1 };

export class FormApprovalService {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  async approve(instanceId: number, actorId: number, comment?: string, options: FormApprovalOptions = {}): Promise<FormApproval> {
    if (options.override && !comment?.trim()) {
      throw new FormDomainError('OVERRIDE_COMMENT_REQUIRED', 'An override comment is required');
    }
    return this.decide(instanceId, actorId, FormApprovalDecision.APPROVED, comment, options);
  }

  async reject(instanceId: number, actorId: number, comment: string): Promise<FormApproval> {
    if (!comment?.trim()) {
      throw new FormDomainError('REJECTION_COMMENT_REQUIRED', 'A rejection comment is required');
    }
    return this.decide(instanceId, actorId, FormApprovalDecision.REJECTED, comment.trim());
  }

  private async decide(
    instanceId: number,
    actorId: number,
    decision: FormApprovalDecision,
    comment?: string,
    options: FormApprovalOptions = {},
  ): Promise<FormApproval> {
    return this.dataSource.transaction(async manager => {
      const instanceRepository = manager.getRepository(FormInstance);
      const instance = await instanceRepository.findOne({
        where: { id: instanceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!instance) throw new FormDomainError('INSTANCE_NOT_FOUND', `Form instance ${instanceId} was not found`);
      if (instance.status !== FormInstanceStatus.SUBMITTED) {
        throw new FormDomainError('INVALID_INSTANCE_STATUS', 'Only submitted form instances can be approved or rejected');
      }

      const approvalRepository = manager.getRepository(FormApproval);
      const previousDecisions = await approvalRepository.find({
        where: { instanceId },
        order: { round: 'DESC', stepOrder: 'DESC' },
      });
      const lastDecision = previousDecisions[0];
      const round = lastDecision?.decision === FormApprovalDecision.REJECTED
        ? lastDecision.round + 1
        : lastDecision?.round ?? 1;
      const approval = await approvalRepository.save(approvalRepository.create({
        instanceId,
        ...DEFAULT_STEP,
        round,
        decision,
        decidedById: actorId,
        comment: comment?.trim() || null,
        metadata: options.override ? { override: true } : {},
      }));

      const oldStatus = instance.status;
      instance.status = decision === FormApprovalDecision.APPROVED
        ? FormInstanceStatus.APPROVED
        : FormInstanceStatus.REJECTED;
      await instanceRepository.save(instance);
      await FormAuditService.record(manager, `FORM_${decision}`, actorId, 'form_approval', approval.id, [
        { field: 'decision', previousValue: null, newValue: decision },
        { field: 'instanceStatus', previousValue: oldStatus, newValue: instance.status },
        { field: 'comment', previousValue: null, newValue: approval.comment },
      ], { instanceId, round, stepKey: DEFAULT_STEP.stepKey, stepOrder: DEFAULT_STEP.stepOrder });
      if (options.override) {
        await FormAuditService.record(manager, 'FORM_OVERRIDE', actorId, 'form_approval', approval.id, [
          { field: 'override', previousValue: false, newValue: true },
          { field: 'comment', previousValue: null, newValue: approval.comment },
        ], { instanceId, round });
      }
      return approval;
    });
  }
}

export default FormApprovalService;
