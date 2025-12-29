// scripts/seed-material-stocks.ts
// Seed przykładowych danych materiałów

import 'dotenv/config';
import { AppDataSource } from '../src/config/database';
import { MaterialStock, StockSource } from '../src/entities/MaterialStock';

const sampleMaterials = [
  { partNumber: 'CAB-UTP-305', name: 'Kabel UTP Cat6 305m', quantity: 150, unit: 'szt', price: 250.00, location: 'MAG-01', supplier: 'Elektro-Kabel' },
  { partNumber: 'RJ45-CAT6', name: 'Gniazdo RJ45 Cat6', quantity: 500, unit: 'szt', price: 12.50, location: 'MAG-01', supplier: 'Molex' },
  { partNumber: 'PP-24P', name: 'Patch panel 24-port', quantity: 25, unit: 'szt', price: 180.00, location: 'MAG-02', supplier: 'Panduit' },
  { partNumber: 'SW-POE-24', name: 'Switch PoE 24-port', quantity: 10, unit: 'szt', price: 1200.00, location: 'MAG-02', supplier: 'Cisco' },
  { partNumber: 'CAM-IP-DOME', name: 'Kamera IP Dome 4MP', quantity: 50, unit: 'szt', price: 450.00, location: 'MAG-03', supplier: 'Hikvision' },
  { partNumber: 'CAM-IP-BULLET', name: 'Kamera IP Bullet 4MP', quantity: 35, unit: 'szt', price: 520.00, location: 'MAG-03', supplier: 'Dahua' },
  { partNumber: 'NVR-16CH', name: 'Rejestrator NVR 16-kanałowy', quantity: 8, unit: 'szt', price: 2500.00, location: 'MAG-02', supplier: 'Hikvision' },
  { partNumber: 'PSU-48V-POE', name: 'Zasilacz PoE 48V', quantity: 40, unit: 'szt', price: 85.00, location: 'MAG-01', supplier: 'Mean Well' },
  { partNumber: 'RACK-42U', name: 'Szafa rack 42U', quantity: 5, unit: 'szt', price: 1800.00, location: 'MAG-DUZY', supplier: 'Linkbasic' },
  { partNumber: 'PATCH-1M', name: 'Patchcord Cat6 1m', quantity: 200, unit: 'szt', price: 8.50, location: 'MAG-01', supplier: 'Lanberg' },
  { partNumber: 'PATCH-3M', name: 'Patchcord Cat6 3m', quantity: 150, unit: 'szt', price: 12.00, location: 'MAG-01', supplier: 'Lanberg' },
  { partNumber: 'CAB-FO-SM', name: 'Kabel światłowodowy SM 1km', quantity: 10, unit: 'szt', price: 850.00, location: 'MAG-04', supplier: 'Corning' },
  { partNumber: 'MOUNT-CAM', name: 'Uchwyt montażowy kamery', quantity: 100, unit: 'szt', price: 25.00, location: 'MAG-03', supplier: 'Generic' },
  { partNumber: 'ANTENNA-5G', name: 'Antena 5GHz zewnętrzna', quantity: 20, unit: 'szt', price: 180.00, location: 'MAG-02', supplier: 'Ubiquiti' },
  { partNumber: 'AP-INDOOR', name: 'Access Point wewnętrzny', quantity: 30, unit: 'szt', price: 350.00, location: 'MAG-02', supplier: 'Ubiquiti' }
];

async function seed() {
  console.log('🌱 Seedowanie przykładowych materiałów...\n');

  await AppDataSource.initialize();
  const stockRepo = AppDataSource.getRepository(MaterialStock);

  for (const mat of sampleMaterials) {
    const existing = await stockRepo.findOne({ where: { partNumber: mat.partNumber } });
    
    if (!existing) {
      await stockRepo.save({
        partNumber: mat.partNumber,
        name: mat.name,
        quantityAvailable: mat.quantity,
        unit: mat.unit,
        unitPrice: mat.price,
        warehouseLocation: mat.location,
        supplier: mat.supplier,
        source: StockSource.MANUAL,
        isActive: true
      });
      console.log(`✅ Dodano: ${mat.partNumber} - ${mat.name}`);
    } else {
      console.log(`⏭️  Pomijam (istnieje): ${mat.partNumber}`);
    }
  }

  console.log('\n✅ Seedowanie zakończone!');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Błąd krytyczny:', error);
  process.exit(1);
});
