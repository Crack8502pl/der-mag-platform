// src/integrations/symfonia/SymfoniaMapper.ts
// Mapowanie danych między Symfonia a MaterialStock

import { MaterialStock, StockSource } from '../../entities/MaterialStock';
import { SymfoniaProduct, SymfoniaStockLevel } from './SymfoniaTypes';

export class SymfoniaMapper {
  /**
   * Mapuje produkt z Symfonia na MaterialStock
   */
  static mapProductToMaterialStock(
    product: SymfoniaProduct,
    stockLevel?: SymfoniaStockLevel
  ): Partial<MaterialStock> {
    return {
      partNumber: product.indeks || product.symbol,
      name: product.nazwa,
      description: product.nazwaPelna || product.uwagi,
      quantityAvailable: stockLevel?.dostepne ?? stockLevel?.stan ?? 0,
      quantityReserved: stockLevel?.zarezerwowane ?? 0,
      unit: product.jm || 'szt',
      unitPrice: product.cenaZakupu || product.cenaSprzedazy,
      currency: 'PLN',
      warehouseLocation: stockLevel?.magazyn,
      supplier: product.dostawca,
      minStockLevel: product.stanMinimalny,
      symfoniaId: product.id,
      symfoniaIndex: product.indeks,
      barcode: product.kodKreskowy,
      eanCode: product.ean,
      source: StockSource.SYMFONIA_API,
      lastImportAt: new Date(),
      isActive: true
    };
  }

  /**
   * Mapuje tablicę produktów z Symfonia
   */
  static mapProductsToMaterialStocks(
    products: SymfoniaProduct[],
    stockLevels?: Map<string, SymfoniaStockLevel>
  ): Partial<MaterialStock>[] {
    return products.map(product => {
      const stockLevel = stockLevels?.get(product.indeks);
      return this.mapProductToMaterialStock(product, stockLevel);
    });
  }
}
