// scripts/migrate-materials.ts
// Skrypt migracji materiałów z pliku CSV

import 'dotenv/config';
import { AppDataSource } from '../src/config/database';
import { MaterialStock, StockSource } from '../src/entities/MaterialStock';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

async function migrate() {
  console.log('🚀 Rozpoczynam migrację materiałów...\n');

  await AppDataSource.initialize();
  const stockRepo = AppDataSource.getRepository(MaterialStock);

  // Sprawdź czy istnieje plik migracji
  const migrationFile = path.join(__dirname, 'data/materials_migration.csv');
  
  if (!fs.existsSync(migrationFile)) {
    console.log('📁 Nie znaleziono pliku migracji: data/materials_migration.csv');
    console.log('   Utwórz plik z danymi do migracji i uruchom ponownie.');
    console.log('\n   Przykładowy format pliku:');
    console.log('   Indeks;Nazwa;Stan;JM;Cena;Magazyn;Dostawca;KodKreskowy;EAN');
    console.log('   MAT-001;Kabel UTP;100;szt;25.50;MAG-01;Dostawca;123456;5901234567890\n');
    await AppDataSource.destroy();
    process.exit(0);
  }

  const content = fs.readFileSync(migrationFile, 'utf-8');
  const records = parse(content, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
    bom: true
  });

  console.log(`📊 Znaleziono ${records.length} wierszy do przetworzenia\n`);

  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (const row of records) {
    try {
      const partNumber = row['Indeks'] || row['PartNumber'] || row['Symbol'];
      if (!partNumber) {
        console.log(`⏭️  Pomijam wiersz bez numeru katalogowego`);
        continue;
      }

      const existing = await stockRepo.findOne({ where: { partNumber } });

      const stockData: Partial<MaterialStock> = {
        partNumber,
        name: row['Nazwa'] || row['Name'] || 'Brak nazwy',
        quantityAvailable: parseFloat((row['Stan'] || row['Qty'] || '0').replace(',', '.')),
        unit: row['JM'] || row['Unit'] || 'szt',
        unitPrice: row['Cena'] ? parseFloat(row['Cena'].replace(',', '.')) : undefined,
        warehouseLocation: row['Magazyn'] || row['Location'] || undefined,
        supplier: row['Dostawca'] || row['Vendor'] || undefined,
        barcode: row['KodKreskowy'] || row['Barcode'] || undefined,
        eanCode: row['EAN'] || undefined,
        description: row['Opis'] || row['Description'] || undefined,
        source: StockSource.CSV_IMPORT,
        lastImportAt: new Date(),
        lastImportFile: 'materials_migration.csv',
        isActive: true
      };

      if (existing) {
        Object.assign(existing, stockData);
        await stockRepo.save(existing);
        console.log(`🔄 Zaktualizowano: ${partNumber} - ${stockData.name}`);
        updated++;
      } else {
        await stockRepo.save(stockData as MaterialStock);
        console.log(`✅ Dodano: ${partNumber} - ${stockData.name}`);
        imported++;
      }
    } catch (error: any) {
      console.error(`❌ Błąd w wierszu: ${JSON.stringify(row)}`);
      console.error(`   ${error.message}`);
      errors++;
    }
  }

  console.log('\n✅ Migracja zakończona!');
  console.log(`   📥 Zaimportowano: ${imported}`);
  console.log(`   🔄 Zaktualizowano: ${updated}`);
  console.log(`   ❌ Błędów: ${errors}`);

  await AppDataSource.destroy();
}

migrate().catch((error) => {
  console.error('❌ Błąd krytyczny:', error);
  process.exit(1);
});
