# CSV Import Feature - Warehouse Stock Module

## Overview

The CSV Import feature provides an intelligent way to import warehouse stock data with duplicate detection and selective field updates. It features a user-friendly 4-phase workflow that guides users through uploading, previewing, analyzing, and importing data.

## Features

### 🎯 Key Capabilities

1. **Drag & Drop Upload** - Easy file selection with visual feedback
2. **CSV Preview** - Review the first 10 rows before processing
3. **Duplicate Detection** - Intelligent detection by catalog number or material name
4. **Selective Updates** - Choose which fields to update in existing records
5. **Validation** - Real-time validation with error reporting
6. **Progress Tracking** - Visual feedback during import
7. **Detailed Summary** - Comprehensive import statistics

### 📋 CSV Format

**File Requirements:**
- **Format:** CSV (Comma-Separated Values)
- **Encoding:** UTF-8
- **Max Size:** 10 MB
- **Separator:** Comma (,)
- **Quotes:** Supports fields with commas in quotes

**Required Columns:**
- `catalog_number` - Material catalog number (unique identifier)
- `material_name` - Material name

**Optional Columns:**
- `description` - Material description
- `category` - Category
- `subcategory` - Subcategory
- `material_type` - Type (consumable, device, tool, component)
- `unit` - Unit of measurement (default: szt)
- `quantity_in_stock` - Current stock quantity
- `min_stock_level` - Minimum stock level
- `supplier` - Supplier name
- `unit_price` - Unit price
- `warehouse_location` - Storage location

### 📏 Limity znaków

| Kolumna | Limit znaków |
|---------|--------------|
| catalog_number | 200 |
| material_name | 500 |
| category | 200 |
| subcategory | 200 |
| supplier | 500 |
| warehouse_location | 500 |
| manufacturer | 500 |
| unit | 50 |

Wartości przekraczające limity zostaną odrzucone z komunikatem błędu.

### 📝 Sample CSV

```csv
catalog_number,material_name,description,category,subcategory,material_type,unit,quantity_in_stock,min_stock_level,supplier,unit_price,warehouse_location
"Zasilacz awaryjny SINUS PRO 800 W","Zasilacz awaryjny SINUS PRO 800 E 12/230V (500/800W)","Zasilacz awaryjny SINUS PRO 800 E 12/230V (500/800W)",,,,szt,0,,,,
10132,"Przewód połączeniowy HDMI-HDMI 5m","Przewód połączeniowy HDMI-HDMI 5m",,,,szt,19,,,,
MAT-001,"Kabel zasilający 2m","Kabel zasilający 230V, 2 metry",Elektronika,Kable,consumable,szt,50,10,"Elektro-Hurt",12.50,A-01-05
```

## User Workflow

### Phase 1: Upload
1. Click "📥 Import CSV" button on Warehouse Stock page
2. Drag & drop CSV file or click to select
3. File is validated (extension, size, format)

### Phase 2: Preview
1. First 10 rows are displayed in a table
2. Review data structure and content
3. Click "Analizuj duplikaty" to proceed

### Phase 3: Analysis
1. System analyzes all rows for duplicates
2. Results categorized as:
   - 🟢 **New records** - Will be created
   - 🟡 **Duplicates** - Existing records that can be updated
   - 🔴 **Errors** - Validation failures

**Update Options for Duplicates:**
- ☑️ Update quantities on stock
- ☑️ Update unit prices
- ☑️ Update descriptions
- ☑️ Update locations
- ☑️ Update suppliers
- ☐ Skip all duplicates (import only new)

### Phase 4: Import & Summary
1. Progress indicator during import
2. Final summary showing:
   - ✅ New records imported
   - 🔄 Records updated
   - ⏭️ Records skipped
   - ❌ Errors (with details)

## API Endpoints

### POST /api/warehouse-stock/import/analyze

Analyzes CSV content before import to detect duplicates.

**Request:**
```json
{
  "csvContent": "catalog_number,material_name,...\nMAT-001,..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRows": 100,
    "newRecords": [...],
    "duplicates": [...],
    "errors": [...]
  }
}
```

### POST /api/warehouse-stock/import

Imports CSV with selective update options.

**Request:**
```json
{
  "csvContent": "...",
  "updateOptions": {
    "updateQuantity": true,
    "updatePrice": true,
    "updateDescription": false,
    "updateLocation": true,
    "updateSupplier": false,
    "skipDuplicates": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 50,
    "updated": 30,
    "skipped": 10,
    "failed": 2,
    "errors": [
      {
        "row": 45,
        "error": "Invalid catalog number"
      }
    ]
  },
  "message": "Import zakończony..."
}
```

## Implementation Details

### Backend Components

**Service Layer (`WarehouseStockService.ts`):**
- `parseCSVLine()` - Handles quoted fields properly
- `parseCSV()` - Converts CSV to ImportRow objects
- `getChangedFields()` - Detects differences between existing and new data
- `analyzeCSVForDuplicates()` - Pre-import duplicate detection
- `mapRowToStock()` - Maps CSV row to entity
- `importWithOptions()` - Main import logic with selective updates

**Controller Layer (`WarehouseStockController.ts`):**
- `analyzeImport` - Endpoint for analysis phase
- `import` - Enhanced endpoint supporting both file upload and direct content

**Routes (`warehouseStock.routes.ts`):**
- `POST /import/analyze` - Analysis endpoint
- `POST /import` - Import endpoint (enhanced)

### Frontend Components

**Component (`WarehouseStockImportModal.tsx`):**
- Phase-based UI state management
- Client-side CSV parsing with quote handling
- Drag & drop file upload
- Real-time preview
- Interactive update options

**Styling (`WarehouseStockImportModal.css`):**
- Responsive design
- Animated transitions
- Color-coded status indicators
- Professional modal layout

**Service (`warehouseStock.service.ts`):**
- `analyzeImport()` - Calls analysis endpoint
- `importWithOptions()` - Calls import with options

**Types (`warehouseStock.types.ts`):**
- `ImportRow` - CSV row structure
- `AnalyzedRow` - Row with analysis results
- `UpdateOptions` - Import configuration
- `ImportResultDetailed` - Import statistics

## History Logging

All import operations are logged to `warehouse_stock_history`:
- **Operation Type:** `IMPORT`
- **Details:** Contains action (update/create), updated fields, source
- **User Tracking:** Records who performed the import

Example history entry:
```json
{
  "operationType": "IMPORT",
  "details": {
    "action": "update",
    "updatedFields": ["quantityInStock", "unitPrice"],
    "source": "csv_import"
  }
}
```

## Error Handling

### Validation Errors
- Missing required fields (catalog_number, material_name)
- Invalid file format or encoding
- File size exceeds 10MB
- Malformed CSV structure

### Import Errors
- Duplicate catalog numbers within CSV
- Database constraint violations
- Invalid data types
- Connection errors

All errors include:
- Row number
- Field name (if applicable)
- Descriptive error message

## Best Practices

1. **Always use UTF-8 encoding** for CSV files
2. **Test with small batches** first (10-20 rows)
3. **Review analysis results** before importing
4. **Use catalog numbers** as unique identifiers
5. **Backup data** before large imports
6. **Check error details** if import fails

## Troubleshooting

### Common Issues

**Problem:** CSV file not accepted
- **Solution:** Ensure file has .csv extension and is UTF-8 encoded

**Problem:** All rows marked as errors
- **Solution:** Check CSV format, ensure headers match expected columns

**Problem:** Duplicates not detected correctly
- **Solution:** Verify catalog_number values are consistent

**Problem:** Import hangs on large files
- **Solution:** Split large files into smaller batches (< 1000 rows)

## Security Considerations

- Import requires `warehouse_stock:import` permission
- All operations are logged with user attribution
- File size limited to prevent DoS attacks
- CSV parsing protects against injection attacks
- Transaction-based imports ensure data consistency

## Performance

- Recommended batch size: 500-1000 rows
- Analysis time: ~1-2 seconds per 100 rows
- Import time: ~2-5 seconds per 100 rows
- Large files (>5000 rows) should be split

## Future Enhancements

Potential improvements:
- [ ] Excel (.xlsx) file support
- [ ] Column mapping interface
- [ ] Import templates/presets
- [ ] Scheduled imports
- [ ] Import history viewer
- [ ] Rollback functionality
- [ ] Advanced field mapping rules
- [ ] Bulk validation endpoint

## Files Modified/Created

### New Files
- `frontend/src/components/modules/WarehouseStockImportModal.tsx`
- `frontend/src/components/modules/WarehouseStockImportModal.css`

### Modified Files
- `backend/src/services/WarehouseStockService.ts` - Added import logic
- `backend/src/controllers/WarehouseStockController.ts` - Added endpoints
- `backend/src/routes/warehouseStock.routes.ts` - Added routes
- `frontend/src/services/warehouseStock.service.ts` - Added API calls
- `frontend/src/types/warehouseStock.types.ts` - Added types
- `frontend/src/components/modules/WarehouseStockPage.tsx` - Integrated modal

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in import summary
3. Verify CSV format against sample
4. Contact system administrator
