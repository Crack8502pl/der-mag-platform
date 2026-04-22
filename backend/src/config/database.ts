// src/config/database.ts
import * as dotenv from 'dotenv';
dotenv.config();
// Konfiguracja połączenia z bazą danych PostgreSQL

import { DataSource } from 'typeorm';
import { TypeOrmLogger } from '../utils/typeormLogger';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { Task } from '../entities/Task';
import { TaskType } from '../entities/TaskType';
import { BOMTemplate } from '../entities/BOMTemplate';
import { TaskMaterial } from '../entities/TaskMaterial';
import { Device } from '../entities/Device';
import { IPPool } from '../entities/IPPool';
import { ActivityTemplate } from '../entities/ActivityTemplate';
import { TaskActivity } from '../entities/TaskActivity';
import { QualityPhoto } from '../entities/QualityPhoto';
import { TaskAssignment } from '../entities/TaskAssignment';
import { TaskMetric } from '../entities/TaskMetric';
import { RefreshToken } from '../entities/RefreshToken';
import { MaterialStock } from '../entities/MaterialStock';
import { MaterialImportLog } from '../entities/MaterialImportLog';
// New workflow entities
import { Contract } from '../entities/Contract';
import { Subsystem } from '../entities/Subsystem';
import { NetworkPool } from '../entities/NetworkPool';
import { NetworkAllocation } from '../entities/NetworkAllocation';
import { DeviceIPAssignment } from '../entities/DeviceIPAssignment';
import { WorkflowBomTemplate } from '../entities/WorkflowBomTemplate';
import { WorkflowBomTemplateItem } from '../entities/WorkflowBomTemplateItem';
import { WorkflowGeneratedBom } from '../entities/WorkflowGeneratedBom';
import { WorkflowGeneratedBomItem } from '../entities/WorkflowGeneratedBomItem';
import { CompletionOrder } from '../entities/CompletionOrder';
import { CompletionItem } from '../entities/CompletionItem';
import { Pallet } from '../entities/Pallet';
import { PrefabricationTask } from '../entities/PrefabricationTask';
import { PrefabricationDevice } from '../entities/PrefabricationDevice';
import { BomTrigger } from '../entities/BomTrigger';
import { BomTriggerLog } from '../entities/BomTriggerLog';
import { SubsystemDocument } from '../entities/SubsystemDocument';
import { SubsystemTask } from '../entities/SubsystemTask';
// Warehouse Stock entities
import { WarehouseStock } from '../entities/WarehouseStock';
import { WarehouseStockHistory } from '../entities/WarehouseStockHistory';
import { WarehouseStockBomMapping } from '../entities/WarehouseStockBomMapping';
import { WarehouseStockWorkflowBomMapping } from '../entities/WarehouseStockWorkflowBomMapping';
import { SubsystemWarehouseStock } from '../entities/SubsystemWarehouseStock';
import { TaskWarehouseStock } from '../entities/TaskWarehouseStock';
import { WarehouseLocation } from '../entities/WarehouseLocation';
import { BomSubsystemTemplate } from '../entities/BomSubsystemTemplate';
import { BomSubsystemTemplateItem } from '../entities/BomSubsystemTemplateItem';
import { BomGroup } from '../entities/BomGroup';
// Missing entities
import { BomDependencyRule } from '../entities/BomDependencyRule';
// Template Dependency Rules
import { BomTemplateDependencyRule } from '../entities/BomTemplateDependencyRule';
import { BomTemplateDependencyRuleInput } from '../entities/BomTemplateDependencyRuleInput';
import { BomTemplateDependencyRuleCondition } from '../entities/BomTemplateDependencyRuleCondition';
import { Document } from '../entities/Document';
import { DocumentTemplate } from '../entities/DocumentTemplate';
import { MaterialImport } from '../entities/MaterialImport';
import { SystemConfig } from '../entities/SystemConfig';
import { NotificationSchedule } from '../entities/NotificationSchedule';
import { ServiceTask } from '../entities/ServiceTask';
import { ServiceTaskActivity } from '../entities/ServiceTaskActivity';
import { Brigade } from '../entities/Brigade';
import { BrigadeMember } from '../entities/BrigadeMember';
// Task BOM infrastructure (Phase 1)
import { TaskGeneratedBom } from '../entities/TaskGeneratedBom';
import { TaskGeneratedBomItem } from '../entities/TaskGeneratedBomItem';
import { UserPreferences } from '../entities/UserPreferences';
import { PushSubscription } from '../entities/PushSubscription';
import { HoneypotLog } from '../entities/HoneypotLog';
// Cars
import { Car } from '../entities/Car';
// Recorder and Disk Specifications
import { RecorderSpecification } from '../entities/RecorderSpecification';
import { DiskSpecification } from '../entities/DiskSpecification';
// Wizard Drafts
import { WizardDraft } from '../entities/WizardDraft';
// Asset Management
import { Asset } from '../entities/Asset';
import { AssetTask } from '../entities/AssetTask';
import { AssetStatusHistory } from '../entities/AssetStatusHistory';
// Task Relationships
import { TaskRelationship } from '../entities/TaskRelationship';
// Migrations
import { BackfillWizardTaskMetadata1714080000000 } from '../migrations/1714080000000-BackfillWizardTaskMetadata';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'dermag_user',
  password: process.env.DB_PASSWORD || 'change-me-in-production',
  database: process.env.DB_NAME || 'dermag_platform',
  synchronize: process.env.NODE_ENV === 'development', // Tylko w dev!
  logging: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development' ? new TypeOrmLogger() : undefined,
  // Konfiguracja puli połączeń - rozwiązuje problem concurrent queries
  poolSize: 10, // Maksymalna liczba połączeń w puli
  extra: {
    // Konfiguracja pg pool
    max: 10,                        // Maksymalna liczba klientów w puli
    min: 2,                         // Minimalna liczba klientów
    idleTimeoutMillis: 30000,       // Czas bezczynności przed zamknięciem (30s)
    connectionTimeoutMillis: 5000,  // Timeout połączenia (5s)
    allowExitOnIdle: true,          // Pozwól na zakończenie procesu gdy pula jest bezczynna
  },
  entities: [
    User,
    Role,
    Task,
    TaskType,
    BOMTemplate,
    TaskMaterial,
    Device,
    IPPool,
    ActivityTemplate,
    TaskActivity,
    QualityPhoto,
    TaskAssignment,
    TaskMetric,
    RefreshToken,
    MaterialStock,
    MaterialImportLog,
    // New workflow entities
    Contract,
    Subsystem,
    NetworkPool,
    NetworkAllocation,
    DeviceIPAssignment,
    WorkflowBomTemplate,
    WorkflowBomTemplateItem,
    WorkflowGeneratedBom,
    WorkflowGeneratedBomItem,
    CompletionOrder,
    CompletionItem,
    Pallet,
    PrefabricationTask,
    PrefabricationDevice,
    BomTrigger,
    BomTriggerLog,
    SubsystemDocument,
    SubsystemTask,
    // Warehouse Stock entities
    WarehouseStock,
    WarehouseStockHistory,
    WarehouseStockBomMapping,
    WarehouseStockWorkflowBomMapping,
    SubsystemWarehouseStock,
    TaskWarehouseStock,
    WarehouseLocation,
    // BOM Subsystem Templates
    BomSubsystemTemplate,
    BomSubsystemTemplateItem,
    // BOM Groups
    BomGroup,
    // BOM Dependency Rules
    BomDependencyRule,
    // BOM Template Dependency Rules
    BomTemplateDependencyRule,
    BomTemplateDependencyRuleInput,
    BomTemplateDependencyRuleCondition,
    // Document Management
    Document,
    DocumentTemplate,
    // Material Import
    MaterialImport,
    // System Config
    SystemConfig,
    // Notification Schedules
    NotificationSchedule,
    // Service Tasks
    ServiceTask,
    ServiceTaskActivity,
    // Brigades
    Brigade,
    BrigadeMember,
    // Task BOM infrastructure (Phase 1)
    TaskGeneratedBom,
    TaskGeneratedBomItem,
    // User Preferences & Push Subscriptions
    UserPreferences,
    PushSubscription,
    // Honeypot logs
    HoneypotLog,
    // Cars
    Car,
    // Recorder and Disk Specifications
    RecorderSpecification,
    DiskSpecification,
    // Wizard Drafts
    WizardDraft,
    // Asset Management
    Asset,
    AssetTask,
    AssetStatusHistory,
    // Task Relationships
    TaskRelationship,
  ],
  subscribers: [],
  migrations: [
    BackfillWizardTaskMetadata1714080000000,
  ],
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Połączono z bazą danych PostgreSQL');
    console.log(`📊 Pool size: ${AppDataSource.options.poolSize || 'default'}`);
  } catch (error) {
    console.error('❌ Błąd połączenia z bazą danych:', error);
    throw error;
  }
};
