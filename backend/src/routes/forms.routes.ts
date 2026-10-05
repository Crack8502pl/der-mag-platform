import { Router, RequestHandler } from 'express';
import { FormsController } from '../controllers/FormsController';
import {
  ApprovalDto, AssignmentRulesDto, CreateInstanceDto, CreateTemplateDto, EmptyFormActionDto,
  InstanceAssignmentDto, RejectionDto, ResponsesDto, UpdateDraftDto,
} from '../dto/FormsDto';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { validateFormBody as validate } from '../middleware/formsValidation';

const router = Router();
const controller = new FormsController();

const integer = (value: unknown, max: number): boolean =>
  typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number(value) <= max;

const inputs = (paginated = false): RequestHandler => (req, res, next) => {
  if ((req.params.id !== undefined && !integer(req.params.id, 2147483647))
    || Object.keys(req.query).some(key => !paginated || !['page', 'limit'].includes(key))
    || (paginated && ((req.query.page !== undefined && !integer(req.query.page, 1000000))
      || (req.query.limit !== undefined && !integer(req.query.limit, 100))))) {
    res.status(400).json({ success: false, message: 'Invalid ID or query parameters' });
    return;
  }
  if (paginated) {
    req.query.page ??= '1';
    req.query.limit ??= '20';
  }
  if (req.body === null || (req.body !== undefined && (typeof req.body !== 'object' || Array.isArray(req.body)))) {
    res.status(400).json({ success: false, message: 'Request body must be an object' });
    return;
  }
  next();
};

router.use(authenticate);
router.get('/templates', checkPermission('forms', 'read'), inputs(true), controller.listTemplates);
router.post('/templates', checkPermission('forms', 'create'), inputs(), validate(CreateTemplateDto), controller.createTemplate);
router.get('/templates/:id', checkPermission('forms', 'read'), inputs(), controller.getTemplate);
router.get('/templates/:id/versions', checkPermission('forms', 'read'), inputs(true), controller.listVersions);
router.post('/templates/:id/draft', checkPermission('forms', 'create'), inputs(), validate(EmptyFormActionDto), controller.createDraft);
router.get('/versions/:id', checkPermission('forms', 'read'), inputs(), controller.getVersion);
router.put('/versions/:id/draft', checkPermission('forms', 'update'), inputs(), validate(UpdateDraftDto), controller.updateDraft);
router.post('/versions/:id/publish', checkPermission('forms', 'publish'), inputs(), validate(EmptyFormActionDto), controller.publish);
router.post('/versions/:id/next', checkPermission('forms', 'create'), inputs(), validate(EmptyFormActionDto), controller.nextVersion);
router.get('/versions/:id/assignment-rules', checkPermission('forms', 'read'), inputs(), controller.listAssignmentRules);
router.put('/versions/:id/assignment-rules', checkPermission('forms', 'assign'), inputs(), validate(AssignmentRulesDto), controller.replaceAssignmentRules);
router.get('/instances', checkPermission('forms', 'read'), inputs(true), controller.listInstances);
router.post('/instances', checkPermission('forms', 'create'), inputs(), validate(CreateInstanceDto), controller.createInstance);
router.get('/instances/:id', checkPermission('forms', 'read'), inputs(), controller.getInstance);
router.put('/instances/:id/assignment', checkPermission('forms', 'assign'), inputs(), validate(InstanceAssignmentDto), controller.assignInstance);
router.get('/instances/:id/values', checkPermission('forms', 'read'), inputs(), controller.getValues);
router.put('/instances/:id/values', checkPermission('forms', 'update'), inputs(), validate(ResponsesDto), controller.updateValues);
router.post('/instances/:id/complete', checkPermission('forms', 'complete'), inputs(), validate(EmptyFormActionDto), controller.complete);
router.post('/instances/:id/approve', checkPermission('forms', 'approve'), inputs(), validate(ApprovalDto), controller.approve);
router.post('/instances/:id/reject', checkPermission('forms', 'approve'), inputs(), validate(RejectionDto), controller.reject);

export default router;
