// Klocek: rezerwacja materiałów z BOM zadania (istniejąca logika magazynu: WarehouseStockService.reserveStock).

import { In } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { Task } from '../../../entities/Task';
import { TaskGeneratedBomItem } from '../../../entities/TaskGeneratedBomItem';
import { WarehouseStock } from '../../../entities/WarehouseStock';
import { WarehouseStockService } from '../../../services/WarehouseStockService';
import type { AutomationAction } from '../contracts';

export const reserveBomMaterialsAction: AutomationAction = {
  key: 'reserve_bom_materials',
  label: 'Zarezerwuj materiały z BOM zadania',
  description: 'Rezerwuje w magazynie materiały z listy BOM zadania. Rezerwacja następuje tylko wtedy, gdy wystarczy wszystkich pozycji.',
  category: 'Magazyn',
  params: [],
  requiredPermission: { module: 'warehouse_stock', action: 'reserve_stock' },
  supportsDryRun: true,
  async run(ctx, _params, { dryRun }) {
    if (ctx.taskId == null) {
      return { status: 'SKIPPED', message: 'Zdarzenie nie dotyczy zadania – nie ma BOM do zarezerwowania.', output: {} };
    }
    const task = await AppDataSource.getRepository(Task).findOne({ where: { id: ctx.taskId } });
    if (!task?.taskBomId) {
      return { status: 'SKIPPED', message: 'Zadanie nie ma wygenerowanego BOM.', output: {} };
    }
    const items = await AppDataSource.getRepository(TaskGeneratedBomItem).find({ where: { taskBomId: task.taskBomId } });
    const catalogNumbers = [...new Set(items.map(item => item.catalogNumber).filter(Boolean))];
    const stocks = catalogNumbers.length
      ? await AppDataSource.getRepository(WarehouseStock).find({ where: { catalogNumber: In(catalogNumbers) } })
      : [];
    const stockByCatalog = new Map(stocks.map(stock => [stock.catalogNumber, stock]));

    const needed = new Map<number, { stock: WarehouseStock; quantity: number }>();
    const missing: string[] = [];
    for (const item of items) {
      const stock = item.catalogNumber ? stockByCatalog.get(item.catalogNumber) : undefined;
      if (!stock) {
        missing.push(item.itemName);
        continue;
      }
      const entry = needed.get(stock.id) ?? { stock, quantity: 0 };
      entry.quantity += Number(item.quantity);
      needed.set(stock.id, entry);
    }
    const shortages = [...needed.values()]
      .filter(({ stock, quantity }) => Number(stock.quantityAvailable) < quantity)
      .map(({ stock }) => stock.catalogNumber);
    const output = { reserved: needed.size, missingInStock: missing, shortages };

    if (!needed.size) {
      return { status: 'SKIPPED', message: 'Żadna pozycja BOM nie ma odpowiednika w magazynie.', output };
    }
    if (shortages.length) {
      return { status: 'FAILED', message: `Niewystarczająca ilość w magazynie: ${shortages.join(', ')}.`, output };
    }
    if (dryRun) {
      return { status: 'OK', message: `Tryb testowy: zarezerwowano by materiały (pozycji: ${needed.size}).`, output };
    }
    const userId = ctx.chainAuthorId ?? ctx.actorId;
    if (userId == null) return { status: 'FAILED', message: 'Brak autora rezerwacji.', output };
    const warehouse = new WarehouseStockService();
    for (const { stock, quantity } of needed.values()) {
      await warehouse.reserveStock(stock.id, quantity, userId, 'TASK', task.id);
    }
    return { status: 'OK', message: `Zarezerwowano materiały (pozycji: ${needed.size}).`, output };
  },
};
