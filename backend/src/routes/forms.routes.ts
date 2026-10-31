import { Router, RequestHandler } from 'express';
import multer from 'multer';
import { FormsController } from '../controllers/FormsController';
import {
  ApprovalDto, AssignmentRulesDto, CreateInstanceDto, CreateTemplateDto, EmptyFormActionDto,
  InstanceAssignmentDto, RecordFieldInstallationDto, RecordInstallationReadinessDto,
  RecordPostInstallationVerificationDto, PreviewVersionDto, RejectionDto, ResponsesDto, UpdateDraftDto,
} from '../dto/FormsDto';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { validateFormBody as validate } from '../middleware/formsValidation';

const router = Router();
const controller = new FormsController();
const brandingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, parts: 11 },
});
const parseBrandingUpload: RequestHandler = (req, res, next) => {
  brandingUpload.single('file')(req, res, error => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Plik może mieć maksymalnie 5 MB.'
        : 'Nieprawidłowe dane przesyłanego pliku.';
      res.status(400).json({ success: false, message });
      return;
    }
    if (error) {
      next(error);
      return;
    }
    next();
  });
};

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
router.get('/branding', checkPermission('forms', 'read'), inputs(), controller.listBranding);
router.get('/branding/logos/:fileName', checkPermission('forms', 'read'), controller.getBrandingLogo);
router.get('/branding/files/:fileName', checkPermission('forms', 'read'), controller.getBrandingSnapshotFile);
router.post('/branding/logos', checkPermission('forms', 'update'), parseBrandingUpload, controller.uploadBrandingLogo);
router.get('/branding/:id/file', checkPermission('forms', 'read'), inputs(), controller.getBrandingFile);
router.post('/branding', checkPermission('forms', 'create'), parseBrandingUpload, controller.createBranding);
router.put('/branding/:id', checkPermission('forms', 'update'), inputs(), parseBrandingUpload, controller.updateBranding);
router.delete('/branding/:id', checkPermission('forms', 'update'), inputs(), controller.deleteBranding);
router.get('/templates', checkPermission('forms', 'read'), inputs(true), controller.listTemplates);
router.post('/templates', checkPermission('forms', 'create'), inputs(), validate(CreateTemplateDto), controller.createTemplate);
router.get('/templates/:id', checkPermission('forms', 'read'), inputs(), controller.getTemplate);
router.get('/templates/:id/versions', checkPermission('forms', 'read'), inputs(true), controller.listVersions);
router.post('/templates/:id/draft', checkPermission('forms', 'create'), inputs(), validate(EmptyFormActionDto), controller.createDraft);
router.get('/versions/:id', checkPermission('forms', 'read'), inputs(), controller.getVersion);
router.post('/versions/:id/preview', checkPermission('forms', 'read'), inputs(), validate(PreviewVersionDto), controller.previewVersion);
router.put('/versions/:id/draft', checkPermission('forms', 'update'), inputs(), validate(UpdateDraftDto), controller.updateDraft);
router.post('/versions/:id/publish', checkPermission('forms', 'publish'), inputs(), validate(EmptyFormActionDto), controller.publish);
router.post('/versions/:id/next', checkPermission('forms', 'create'), inputs(), validate(EmptyFormActionDto), controller.nextVersion);
router.get('/versions/:id/assignment-rules', checkPermission('forms', 'read'), inputs(), controller.listAssignmentRules);
router.put('/versions/:id/assignment-rules', checkPermission('forms', 'assign'), inputs(), validate(AssignmentRulesDto), controller.replaceAssignmentRules);
router.get('/instances', checkPermission('forms', 'read'), inputs(true), controller.listInstances);
router.post('/instances', checkPermission('forms', 'create'), inputs(), validate(CreateInstanceDto), controller.createInstance);
router.get('/instances/:id', checkPermission('forms', 'read'), inputs(), controller.getInstance);
router.get('/instances/:id/pdf', checkPermission('forms', 'read'), inputs(), controller.getInstancePdf);
router.put('/instances/:id/assignment', checkPermission('forms', 'assign'), inputs(), validate(InstanceAssignmentDto), controller.assignInstance);
router.get('/instances/:id/values', checkPermission('forms', 'read'), inputs(), controller.getValues);
router.put('/instances/:id/values', checkPermission('forms', 'update'), inputs(), validate(ResponsesDto), controller.updateValues);
router.post('/instances/:id/refresh-data', checkPermission('forms', 'update'), inputs(), validate(EmptyFormActionDto), controller.refreshData);
router.post('/instances/:id/complete', checkPermission('forms', 'complete'), inputs(), validate(EmptyFormActionDto), controller.complete);
router.post('/instances/:id/approve', checkPermission('forms', 'approve'), inputs(), validate(ApprovalDto), controller.approve);
router.post('/instances/:id/reject', checkPermission('forms', 'approve'), inputs(), validate(RejectionDto), controller.reject);
router.get('/installation-workflows/:id', checkPermission('forms', 'read'), inputs(), controller.getInstallationWorkflow);
router.post('/installation-workflows/readiness', checkPermission('forms', 'complete'), inputs(), validate(RecordInstallationReadinessDto), controller.recordInstallationReadiness);
router.post('/installation-workflows/:id/field-installation', checkPermission('forms', 'complete'), inputs(), validate(RecordFieldInstallationDto), controller.recordFieldInstallation);
router.post('/installation-workflows/:id/verification', checkPermission('forms', 'complete'), inputs(), validate(RecordPostInstallationVerificationDto), controller.recordPostInstallationVerification);
router.post('/installation-workflows/:id/commission', checkPermission('forms', 'complete'), inputs(), validate(EmptyFormActionDto), controller.commissionDevice);

export default router;
