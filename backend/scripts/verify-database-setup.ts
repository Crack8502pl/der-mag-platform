import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';
import { User } from '../src/entities/User';
import bcrypt from 'bcrypt';

async function verifyDatabaseSetup(): Promise<void> {
  try {
    await AppDataSource.initialize();
    const [counts] = await AppDataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM task_types) AS task_type_count,
        (SELECT COUNT(*) FROM roles) AS role_count
    `);

    if (Number(counts.task_type_count) !== 13) {
      throw new Error(`Oczekiwano 13 typów zadań, znaleziono ${counts.task_type_count}.`);
    }
    if (Number(counts.role_count) !== 10) {
      throw new Error(`Oczekiwano 10 ról, znaleziono ${counts.role_count}.`);
    }
    const admin = await AppDataSource.getRepository(User).findOne({
      where: { username: 'admin' },
      select: ['id', 'password', 'forcePasswordChange'],
    });
    if (!admin) {
      throw new Error('Brak konta użytkownika admin.');
    }
    if (!admin.forcePasswordChange) {
      throw new Error('Konto admin nie wymusza zmiany hasła.');
    }
    if (!(await bcrypt.compare('Admin123!', admin.password))) {
      throw new Error('Domyślne hasło admina jest nieprawidłowe.');
    }

    console.log('Weryfikacja konfiguracji bazy zakończona pomyślnie.');
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

verifyDatabaseSetup().catch(error => {
  console.error('Weryfikacja konfiguracji bazy nie powiodła się:', error);
  process.exitCode = 1;
});
