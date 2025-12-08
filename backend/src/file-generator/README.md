# File Generator Module

Moduł do generowania i edycji plików Excel, Word, PDF oraz udostępniania ich przez WebDAV.

## Funkcjonalności

- **Generowanie plików Excel** - tworzenie raportów na bazie szablonów
- **Generowanie dokumentów Word** - wypełnianie dokumentów z placeholderami
- **Edycja plików PDF** - wypełnianie formularzy PDF
- **Serwer WebDAV** - udostępnianie wygenerowanych plików

## Instalacja zależności

Wszystkie wymagane zależności są już dodane do `package.json`:

```bash
npm install
```

Biblioteki:
- `exceljs` - generowanie i edycja plików Excel
- `docxtemplater` - generowanie dokumentów Word
- `pizzip` - wymagane przez docxtemplater
- `pdf-lib` - edycja plików PDF
- `webdav-server` - serwer WebDAV

## Struktura katalogów

```
backend/src/
├── templates/              # Szablony plików
│   ├── report-template.xlsx
│   ├── document-template.docx
│   └── form-template.pdf
├── generated/              # Wygenerowane pliki (w .gitignore)
└── file-generator/
    ├── excel.service.ts    # Serwis Excel
    ├── word.service.ts     # Serwis Word
    ├── pdf.service.ts      # Serwis PDF
    ├── webdav.server.ts    # Serwer WebDAV
    ├── index.ts            # Eksporty
    ├── demo.ts             # Demonstracja
    └── README.md           # Ta dokumentacja
```

## Użycie

### Konfiguracja

Moduł używa konfiguracji z pliku `config.ts`:

```typescript
import { FileGeneratorConfig, getTemplatePath, generateUniqueFilename } from './file-generator';

// Dostęp do konfiguracji
console.log(FileGeneratorConfig.templatesDir);
console.log(FileGeneratorConfig.webdav.port);

// Pomocnicze funkcje
const excelTemplate = getTemplatePath('excel');
const uniqueName = generateUniqueFilename('raport', 'xlsx');
```

Konfiguracja może być dostosowana przez zmienne środowiskowe:
- `WEBDAV_PORT` - port serwera WebDAV (domyślnie: 1900)
- `WEBDAV_REQUIRE_AUTH` - wymagaj uwierzytelniania (domyślnie: false)
- `WEBDAV_HOSTNAME` - nazwa hosta (domyślnie: localhost)
- `FILE_GEN_MAX_SIZE` - maksymalny rozmiar pliku w bajtach (domyślnie: 50MB)
- `FILE_GEN_COMPRESSION` - włącz kompresję (domyślnie: false)
- `FILE_GEN_AUTO_CLEANUP` - automatyczne czyszczenie (domyślnie: false)
- `FILE_GEN_MAX_AGE_HOURS` - maksymalny wiek plików w godzinach (domyślnie: 24)

### 1. Serwis Excel

```typescript
import { ExcelService } from './file-generator';

// Generowanie z szablonu
const data = {
  reportTitle: "Raport zadań - Grudzień 2024",
  tasks: [
    { id: 1, name: "Montaż SMW", status: "completed", date: "2024-12-01", technician: "Jan Kowalski" },
    { id: 2, name: "Konfiguracja LAN", status: "in_progress", date: "2024-12-05", technician: "Anna Nowak" }
  ]
};

const buffer = await ExcelService.generateFromTemplate('templates/report-template.xlsx', data);
await ExcelService.saveToFile(buffer, 'generated/raport.xlsx');

// Edycja istniejącego pliku
const modifications = {
  'A1': 'Nowa wartość',
  'B2': 'Inna wartość'
};
const editedBuffer = await ExcelService.editExistingFile('file.xlsx', modifications);

// Tworzenie szablonu
await ExcelService.createSimpleTemplate('templates/my-template.xlsx');
```

### 2. Serwis Word

```typescript
import { WordService } from './file-generator';

// Generowanie dokumentu z placeholderami
const data = {
  taskNumber: "123456789",
  clientName: "PKP PLK S.A.",
  date: "2024-12-08",
  location: "Warszawa Centralna",
  technicianName: "Jan Kowalski",
  description: "Montaż i konfiguracja systemu monitoringu"
};

const buffer = await WordService.generateFromTemplate('templates/document-template.docx', data);
await WordService.saveToFile(buffer, 'generated/dokument.docx');
```

**Szablon Word** powinien zawierać placeholdery w formacie `{nazwa}`:
```
Protokół odbioru nr {taskNumber}
Klient: {clientName}
Data: {date}
Lokalizacja: {location}
Technik: {technicianName}
Opis: {description}
```

### 3. Serwis PDF

```typescript
import { PdfService } from './file-generator';

// Wypełnianie formularza PDF
const fieldValues = {
  invoiceNumber: "FV/2024/001",
  clientName: "PKP PLK S.A.",
  amount: "15000.00",
  date: "2024-12-08"
};

const buffer = await PdfService.fillFormFields('templates/form-template.pdf', fieldValues);
await PdfService.saveToFile(buffer, 'generated/faktura.pdf');

// Dodawanie tekstu na stronie
const textBuffer = await PdfService.addTextToPage(
  'document.pdf',
  'Tekst do dodania',
  { x: 50, y: 100, page: 0, size: 14 }
);

// Tworzenie formularza PDF
await PdfService.createSimpleFormTemplate('templates/my-form.pdf');
```

### 4. Serwer WebDAV

```typescript
import { WebDAVServer } from './file-generator';
import path from 'path';

// Uruchomienie serwera
const generatedDir = path.join(__dirname, '../generated');
await WebDAVServer.startServer(1900, generatedDir);
// Serwer dostępny pod: http://localhost:1900/generated/

// Sprawdzenie statusu
if (WebDAVServer.isRunning()) {
  console.log('Serwer działa');
}

// Zatrzymanie serwera
await WebDAVServer.stopServer();
```

## Demonstracja

Plik `demo.ts` zawiera przykłady użycia wszystkich serwisów:

```bash
# Utworzenie szablonów
npx ts-node src/file-generator/demo.ts templates

# Generowanie wszystkich typów plików
npx ts-node src/file-generator/demo.ts generate

# Uruchomienie serwera WebDAV
npx ts-node src/file-generator/demo.ts webdav

# Wszystko razem
npx ts-node src/file-generator/demo.ts all

# Pomoc
npx ts-node src/file-generator/demo.ts help
```

## Przykładowe dane

### Dane dla Excel
```typescript
const dataExcel = {
  reportTitle: "Raport zadań - Grudzień 2024",
  tasks: [
    { id: 1, name: "Montaż SMW Warszawa", status: "completed", date: "2024-12-01", technician: "Jan Kowalski" },
    { id: 2, name: "Konfiguracja LAN PKP", status: "in_progress", date: "2024-12-05", technician: "Anna Nowak" }
  ]
};
```

### Dane dla Word
```typescript
const dataWord = {
  taskNumber: "123456789",
  clientName: "PKP PLK S.A.",
  date: "2024-12-08",
  location: "Warszawa Centralna",
  technicianName: "Jan Kowalski",
  description: "Montaż i konfiguracja systemu monitoringu wizyjnego"
};
```

### Dane dla PDF
```typescript
const dataPdf = {
  invoiceNumber: "FV/2024/001",
  clientName: "PKP PLK S.A.",
  amount: "15000.00",
  date: "2024-12-08"
};
```

## Obsługa błędów

Wszystkie funkcje mogą rzucać wyjątki. Zalecane użycie try-catch:

```typescript
try {
  const buffer = await ExcelService.generateFromTemplate(templatePath, data);
  await ExcelService.saveToFile(buffer, outputPath);
  console.log('Plik wygenerowany pomyślnie');
} catch (error) {
  console.error('Błąd generowania pliku:', error);
}
```

## Integracja z aplikacją

### Przykład endpointu API

```typescript
// src/routes/reports.ts
import express from 'express';
import { ExcelService } from '../file-generator';

const router = express.Router();

router.post('/generate-report', async (req, res) => {
  try {
    const data = req.body;
    const buffer = await ExcelService.generateFromTemplate(
      'templates/report-template.xlsx',
      data
    );
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=raport.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Błąd generowania raportu' });
  }
});

export default router;
```

## Testy

Podstawowe testy znajdują się w katalogu `tests/file-generator/`:

```bash
npm test
```

## Bezpieczeństwo

### WebDAV
- W wersji demonstracyjnej uwierzytelnianie jest wyłączone
- W produkcji należy włączyć `requireAuthentication: true` i skonfigurować użytkowników

### Validacja danych
- Zawsze waliduj dane wejściowe przed generowaniem plików
- Ograniczaj rozmiar przesyłanych szablonów
- Sprawdzaj typy plików

### Ścieżki plików
- Używaj `path.join()` do budowania ścieżek
- Waliduj ścieżki aby zapobiec path traversal

## Wydajność

- Generowanie plików jest operacją asynchroniczną
- Dla dużych plików rozważ użycie kolejki zadań (np. Bull)
- WebDAV serwer powinien być używany tylko do developerskich celów, w produkcji użyj dedykowanego rozwiązania

## Rozwiązywanie problemów

### Błąd: "Cannot find module 'exceljs'"
```bash
npm install
```

### Błąd: "No worksheet found in template"
- Upewnij się, że plik Excel zawiera co najmniej jeden arkusz

### Błąd: "Error during template rendering"
- Sprawdź czy placeholdery w szablonie Word są poprawnie sformatowane: `{nazwa}`
- Upewnij się, że wszystkie placeholdery mają odpowiadające wartości w danych

### WebDAV nie uruchamia się
- Sprawdź czy port nie jest zajęty
- Upewnij się, że katalog `generated/` istnieje

## Licencja

MIT
