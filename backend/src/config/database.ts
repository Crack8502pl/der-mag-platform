// src/config/database.ts
// Konfiguracja połączenia z bazą danych PostgreSQL

import { DataSource } from 'typeorm';
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

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'dermag_user',
  password: process.env.DB_PASSWORD || 'change-me-in-production',
  database: process.env.DB_NAME || 'dermag_platform',
  synchronize: process.env.NODE_ENV === 'development', // Tylko w dev!
  logging: process.env.NODE_ENV === 'development',
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
    SubsystemDocument
  ],
  subscribers: [],
  migrations: [],
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Połączono z bazą danych PostgreSQL');
  } catch (error) {
    console.error('❌ Błąd połączenia z bazą danych:', error);
    throw error;
  }
};
