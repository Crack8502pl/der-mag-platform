/**
 * Funkcje (grupy funkcyjne) – public API
 *
 * Osoba ma jedną rolę (users.role_id) i dowolną liczbę funkcji. Uprawnienia
 * efektywne = rola + aktywne funkcje; funkcje wyłącznie DODAJĄ uprawnienia.
 *
 * ```ts
 * import { EffectivePermissionsService, activeMembers } from '@/modules/function-groups';
 *
 * const effective = await EffectivePermissionsService.forRequest(req);
 * const auditors = await activeMembers('PROCESS_AUDITORS');
 * ```
 */
export { FunctionGroup } from './entities/FunctionGroup';
export { UserFunctionGroup } from './entities/UserFunctionGroup';
export {
  EffectivePermissionsService,
  type ActiveFunctionGroup,
  type EffectivePermissions,
} from './services/EffectivePermissionsService';
export {
  FunctionGroupService,
  FunctionGroupError,
  FUNCTION_GROUP_KEY_PATTERN,
  validateFunctionGroupPermissions,
  activeMembers,
} from './services/FunctionGroupService';
export { default as functionGroupRoutes } from './routes/functionGroup.routes';
