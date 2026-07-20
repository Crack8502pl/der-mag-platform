import { Request, Response } from 'express';

type VariableEngineVariable = {
  expression: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  provider: string;
  usableInBom: boolean;
};

const VARIABLE_ENGINE_VARIABLES: VariableEngineVariable[] = [
  { expression: 'camera.total', type: 'number', description: 'Łączna liczba kamer (z hierarchii)', provider: 'camera', usableInBom: true },
  { expression: 'camera.total.ip', type: 'number', description: 'Kamery IP (z hierarchii)', provider: 'camera', usableInBom: true },
  { expression: 'camera.total.ip.ogolna', type: 'number', description: 'Kamery IP ogólne (z hierarchii)', provider: 'camera', usableInBom: true },
  { expression: 'camera.total.ip.lpr', type: 'number', description: 'Kamery IP LPR (z hierarchii)', provider: 'camera', usableInBom: true },
  { expression: 'camera.total.ip.skp', type: 'number', description: 'Kamery IP SKP (z hierarchii)', provider: 'camera', usableInBom: true },
  { expression: 'camera.total.analog', type: 'number', description: 'Kamery analogowe (z hierarchii)', provider: 'camera', usableInBom: false },
  { expression: 'camera.storage.tb', type: 'number', description: 'Pojemność TB', provider: 'camera', usableInBom: true },
  { expression: 'camera.recording.days', type: 'number', description: 'Dni retencji', provider: 'camera', usableInBom: true },
  { expression: 'camera.bitrate.mbps', type: 'number', description: 'Bitrate Mbps/kamera', provider: 'camera', usableInBom: true },
  { expression: 'task.number', type: 'string', description: 'Numer taska', provider: 'task', usableInBom: false },
  { expression: 'task.status', type: 'string', description: 'Status taska', provider: 'task', usableInBom: false },
  { expression: 'task.title', type: 'string', description: 'Tytuł taska', provider: 'task', usableInBom: false },
  { expression: 'task.priority', type: 'string', description: 'Priorytet taska', provider: 'task', usableInBom: false },
  { expression: 'task.assignee.name', type: 'string', description: 'Przypisana osoba', provider: 'task', usableInBom: false },
  { expression: 'task.due.date', type: 'string', description: 'Termin taska (ISO 8601)', provider: 'task', usableInBom: false },
  { expression: 'task.progress', type: 'number', description: 'Postęp taska w procentach', provider: 'task', usableInBom: false },
  { expression: 'contract.number', type: 'string', description: 'Numer kontraktu', provider: 'contract', usableInBom: false },
  { expression: 'contract.status', type: 'string', description: 'Status kontraktu', provider: 'contract', usableInBom: false },
  { expression: 'contract.customer.name', type: 'string', description: 'Nazwa klienta', provider: 'contract', usableInBom: false },
  { expression: 'contract.customer.nip', type: 'string', description: 'NIP klienta', provider: 'contract', usableInBom: false },
  { expression: 'contract.value.net', type: 'number', description: 'Wartość netto kontraktu', provider: 'contract', usableInBom: false },
  { expression: 'contract.value.gross', type: 'number', description: 'Wartość brutto kontraktu', provider: 'contract', usableInBom: false },
  { expression: 'contract.date.start', type: 'string', description: 'Data startu kontraktu', provider: 'contract', usableInBom: false },
  { expression: 'contract.date.end', type: 'string', description: 'Data końca kontraktu', provider: 'contract', usableInBom: false },
  { expression: 'fiber.length.total', type: 'number', description: 'Łączna długość kabla światłowodowego w kilometrach', provider: 'fiber', usableInBom: false },
  { expression: 'fiber.strands.total', type: 'number', description: 'Łączna liczba włókien światłowodowych', provider: 'fiber', usableInBom: false },
  { expression: 'fiber.connections.total', type: 'number', description: 'Łączna liczba połączeń światłowodowych', provider: 'fiber', usableInBom: false },
  { expression: 'fiber.connections.duplex', type: 'number', description: 'Liczba połączeń DUPLEX', provider: 'fiber', usableInBom: false },
  { expression: 'fiber.connections.wdm', type: 'number', description: 'Liczba połączeń WDM', provider: 'fiber', usableInBom: false },
  { expression: 'switch.total', type: 'number', description: 'Łączna liczba switchy', provider: 'switch', usableInBom: false },
  { expression: 'switch.total.poe', type: 'number', description: 'Liczba switchy PoE', provider: 'switch', usableInBom: false },
  { expression: 'switch.total.managed', type: 'number', description: 'Liczba switchy zarządzalnych', provider: 'switch', usableInBom: false },
  { expression: 'switch.ports.total', type: 'number', description: 'Łączna liczba portów switchy', provider: 'switch', usableInBom: false },
  { expression: 'switch.ports.poe', type: 'number', description: 'Łączna liczba portów PoE', provider: 'switch', usableInBom: false },
  { expression: 'ip.range', type: 'string', description: 'Przydzielony zakres CIDR', provider: 'ip', usableInBom: false },
  { expression: 'ip.gateway', type: 'string', description: 'Adres bramy sieciowej', provider: 'ip', usableInBom: false },
  { expression: 'ip.subnet.mask', type: 'string', description: 'Maska podsieci', provider: 'ip', usableInBom: false },
  { expression: 'ip.hosts.total', type: 'number', description: 'Łączna liczba hostów', provider: 'ip', usableInBom: false },
  { expression: 'ip.hosts.used', type: 'number', description: 'Liczba zajętych hostów', provider: 'ip', usableInBom: false },
  { expression: 'ip.hosts.free', type: 'number', description: 'Liczba wolnych hostów', provider: 'ip', usableInBom: false },
  { expression: 'ip.first', type: 'string', description: 'Pierwszy użyteczny adres IP', provider: 'ip', usableInBom: false },
  { expression: 'ip.last', type: 'string', description: 'Ostatni użyteczny adres IP', provider: 'ip', usableInBom: false },
  { expression: 'warehouse.items.total', type: 'number', description: 'Łączna liczba pozycji magazynowych', provider: 'warehouse', usableInBom: false },
  { expression: 'warehouse.items.reserved', type: 'number', description: 'Liczba zarezerwowanych pozycji magazynowych', provider: 'warehouse', usableInBom: false },
  { expression: 'warehouse.items.available', type: 'number', description: 'Liczba dostępnych pozycji magazynowych', provider: 'warehouse', usableInBom: false },
  { expression: 'warehouse.value.total', type: 'number', description: 'Łączna wartość magazynu', provider: 'warehouse', usableInBom: false },
  { expression: 'warehouse.location', type: 'string', description: 'Lokalizacja magazynu', provider: 'warehouse', usableInBom: false },
  { expression: 'user.name', type: 'string', description: 'Nazwa użytkownika', provider: 'user', usableInBom: false },
  { expression: 'user.email', type: 'string', description: 'Adres email użytkownika', provider: 'user', usableInBom: false },
  { expression: 'user.role', type: 'string', description: 'Rola użytkownika', provider: 'user', usableInBom: false },
  { expression: 'ai.summary', type: 'string', description: 'Podsumowanie wygenerowane przez AI', provider: 'ai', usableInBom: false },
  { expression: 'ai.recommendation', type: 'string', description: 'Rekomendacja wygenerowana przez AI', provider: 'ai', usableInBom: false },
  { expression: 'ai.risk.level', type: 'string', description: 'Poziom ryzyka AI', provider: 'ai', usableInBom: false },
  { expression: 'ai.risk.score', type: 'number', description: 'Wynik ryzyka AI', provider: 'ai', usableInBom: false },
  { expression: 'hierarchy.parent', type: 'number', description: 'ID bezpośredniego rodzica', provider: 'hierarchy', usableInBom: true },
  { expression: 'hierarchy.children', type: 'number', description: 'Liczba bezpośrednich dzieci', provider: 'hierarchy', usableInBom: true },
  { expression: 'hierarchy.depth', type: 'number', description: 'Głębokość w hierarchii', provider: 'hierarchy', usableInBom: true },
  { expression: 'hierarchy.path', type: 'string', description: 'Ścieżka przodków rozdzielona slashami', provider: 'hierarchy', usableInBom: true }
];

export class VariableEngineController {
  static async listVariables(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: VARIABLE_ENGINE_VARIABLES
    });
  }
}
