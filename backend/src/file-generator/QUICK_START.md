# Quick Start Guide - File Generator Module

## Installation

Dependencies are already added to `package.json`. Run:
```bash
npm install
```

## Quick Usage

### 1. Generate Excel Report (3 lines)
```typescript
import { ExcelService, getTemplatePath } from './file-generator';
const buffer = await ExcelService.generateFromTemplate(getTemplatePath('excel'), { reportTitle: "My Report", tasks: [...] });
await ExcelService.saveToFile(buffer, 'output.xlsx');
```

### 2. Generate Word Document (3 lines)
```typescript
import { WordService, getTemplatePath } from './file-generator';
const buffer = await WordService.generateFromTemplate(getTemplatePath('word'), { taskNumber: "123", clientName: "Client", ... });
await WordService.saveToFile(buffer, 'output.docx');
```

### 3. Fill PDF Form (3 lines)
```typescript
import { PdfService, getTemplatePath } from './file-generator';
const buffer = await PdfService.fillFormFields(getTemplatePath('pdf'), { invoiceNumber: "001", clientName: "Client", ... });
await PdfService.saveToFile(buffer, 'output.pdf');
```

### 4. Start WebDAV Server (2 lines)
```typescript
import { startWebDAVServer, FileGeneratorConfig } from './file-generator';
await startWebDAVServer(1900, FileGeneratorConfig.generatedDir);
```

## Command Line Demo

```bash
# Create templates
npx ts-node src/file-generator/demo.ts templates

# Generate all files
npx ts-node src/file-generator/demo.ts generate

# Start WebDAV
npx ts-node src/file-generator/demo.ts webdav

# Do everything
npx ts-node src/file-generator/demo.ts all
```

## Express Integration

Add to your routes:
```typescript
import fileGeneratorRoutes from './file-generator/integration-example';
app.use('/api/file-generator', fileGeneratorRoutes);
```

Endpoints:
- `POST /api/file-generator/generate-excel` - Generate Excel
- `POST /api/file-generator/generate-protocol` - Generate Word
- `POST /api/file-generator/generate-invoice` - Fill PDF
- `POST /api/file-generator/save-and-share` - Save to WebDAV

## Data Format

### Excel
```json
{
  "reportTitle": "Raport zadań - Grudzień 2024",
  "tasks": [
    { "id": 1, "name": "Task", "status": "completed", "date": "2024-12-01", "technician": "John" }
  ]
}
```

### Word
```json
{
  "taskNumber": "123",
  "clientName": "Client",
  "date": "2024-12-08",
  "location": "Office",
  "technicianName": "John",
  "description": "Description"
}
```

### PDF
```json
{
  "invoiceNumber": "001",
  "clientName": "Client",
  "amount": "1000.00",
  "date": "2024-12-08"
}
```

## Configuration (Optional)

Set environment variables:
```bash
export WEBDAV_PORT=1900
export WEBDAV_REQUIRE_AUTH=false
export FILE_GEN_MAX_SIZE=52428800  # 50MB
```

## Testing

```bash
# Build
npm run build

# Type check
npm run typecheck
```

## Common Issues

**Error: Cannot find template**
- Run `npx ts-node src/file-generator/demo.ts templates` first

**Error: Port already in use**
- Change WEBDAV_PORT or stop other service

**Error: Missing required fields**
- Check data format matches examples above

## Need Help?

See full documentation:
- `src/file-generator/README.md` - Complete guide
- `src/file-generator/IMPLEMENTATION_SUMMARY.md` - Technical details
- `src/file-generator/integration-example.ts` - API examples
- `src/file-generator/demo.ts` - Usage examples
