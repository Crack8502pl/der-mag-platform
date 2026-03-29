// src/services/ProductSuccessorService.ts
// Service for managing product successor/predecessor relationships and BOM template migration

import { AppDataSource } from '../config/database';
import { WarehouseStock } from '../entities/WarehouseStock';
import { WarehouseStockBomMapping } from '../entities/WarehouseStockBomMapping';
import { WarehouseStockWorkflowBomMapping } from '../entities/WarehouseStockWorkflowBomMapping';

export class ProductSuccessorService {
  /**
   * Set a successor product for an existing product.
   * Also sets the reverse predecessor link on the successor.
   */
  static async setSuccessor(productId: number, successorId: number): Promise<void> {
    if (productId === successorId) {
      throw new Error('A product cannot be its own successor');
    }

    const repo = AppDataSource.getRepository(WarehouseStock);

    const product = await repo.findOne({ where: { id: productId } });
    if (!product) {
      throw new Error(`Product with id ${productId} not found`);
    }

    const successor = await repo.findOne({ where: { id: successorId } });
    if (!successor) {
      throw new Error(`Successor product with id ${successorId} not found`);
    }

    // Set successor on old product and predecessor on new product in a transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      product.successorId = successorId;
      await queryRunner.manager.save(product);

      successor.predecessorId = productId;
      await queryRunner.manager.save(successor);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Migrate all BOM template mappings from oldProductId to newProductId.
   * Returns the total number of updated mappings.
   */
  static async migrateTemplates(oldProductId: number, newProductId: number): Promise<number> {
    const bomMappingRepo = AppDataSource.getRepository(WarehouseStockBomMapping);
    const workflowMappingRepo = AppDataSource.getRepository(WarehouseStockWorkflowBomMapping);

    let updatedCount = 0;

    // Migrate standard BOM mappings
    const bomResult = await bomMappingRepo
      .createQueryBuilder()
      .update()
      .set({ warehouseStockId: newProductId })
      .where('warehouse_stock_id = :oldId', { oldId: oldProductId })
      .execute();

    updatedCount += bomResult.affected || 0;

    // Migrate workflow BOM mappings
    const workflowResult = await workflowMappingRepo
      .createQueryBuilder()
      .update()
      .set({ warehouseStockId: newProductId })
      .where('warehouse_stock_id = :oldId', { oldId: oldProductId })
      .execute();

    updatedCount += workflowResult.affected || 0;

    return updatedCount;
  }

  /**
   * Get the full product lineage (chain of predecessors and successors).
   * Returns the products in chronological order (oldest first).
   */
  static async getProductLineage(productId: number): Promise<WarehouseStock[]> {
    const repo = AppDataSource.getRepository(WarehouseStock);

    // Walk backwards to find the oldest ancestor
    const visited = new Set<number>();
    let currentId: number | null = productId;

    // Collect all ancestors
    const ancestors: WarehouseStock[] = [];
    while (currentId !== null && !visited.has(currentId)) {
      visited.add(currentId);
      const product = await repo.findOne({ where: { id: currentId } });
      if (!product) break;
      ancestors.unshift(product); // prepend
      currentId = product.predecessorId;
    }

    // Walk forwards to find all successors (the current product is already in ancestors)
    const lineage = [...ancestors];
    const startProduct = lineage[lineage.length - 1];
    if (!startProduct) return lineage;

    currentId = startProduct.successorId;
    while (currentId !== null && !visited.has(currentId)) {
      visited.add(currentId);
      const product = await repo.findOne({ where: { id: currentId } });
      if (!product) break;
      lineage.push(product);
      currentId = product.successorId;
    }

    return lineage;
  }

  /**
   * Remove successor relationship (and clears predecessor link on the successor).
   */
  static async removeSuccessor(productId: number): Promise<void> {
    const repo = AppDataSource.getRepository(WarehouseStock);

    const product = await repo.findOne({ where: { id: productId } });
    if (!product) {
      throw new Error(`Product with id ${productId} not found`);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (product.successorId !== null) {
        const successor = await repo.findOne({ where: { id: product.successorId } });
        if (successor && successor.predecessorId === productId) {
          successor.predecessorId = null;
          await queryRunner.manager.save(successor);
        }
      }

      product.successorId = null;
      await queryRunner.manager.save(product);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
