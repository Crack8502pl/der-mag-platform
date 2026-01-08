// src/components/modules/WarehouseStockImportModal.tsx
// Modal for importing warehouse stock from CSV with duplicate detection and field selection

import React, { useState, useRef } from 'react';
import { warehouseStockService } from '../../services/warehouseStock.service';
import type { AnalyzedRow, UpdateOptions, ImportResultDetailed } from '../../types/warehouseStock.types';
import './WarehouseStockImportModal.css';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

type Phase = 'upload' | 'preview' | 'analyze' | 'import' | 'complete';

export const WarehouseStockImportModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [phase, setPhase] = useState<Phase>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [preview, setPreview] = useState<string[][]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  // Analysis results
  const [newRecords, setNewRecords] = useState<AnalyzedRow[]>([]);
  const [duplicates, setDuplicates] = useState<AnalyzedRow[]>([]);
  const [errors, setErrors] = useState<AnalyzedRow[]>([]);
  
  // Update options
  const [updateOptions, setUpdateOptions] = useState<UpdateOptions>({
    updateQuantity: true,
    updatePrice: true,
    updateDescription: false,
    updateLocation: true,
    updateSupplier: false,
    skipDuplicates: false
  });
  
  // Import results
  const [importResult, setImportResult] = useState<ImportResultDetailed | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const parseCSVPreview = (content: string): string[][] => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.slice(0, 11).map(line => parseCSVLine(line)); // Headers + 10 rows
  };

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Nieprawidłowy format pliku. Wybierz plik CSV.');
      return;
    }
    
    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Plik jest za duży. Maksymalny rozmiar to 10MB.');
      return;
    }
    
    setFile(selectedFile);
    setError('');
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      
      // Parse preview
      try {
        const previewData = parseCSVPreview(content);
        setPreview(previewData);
        setPhase('preview');
      } catch (err: any) {
        setError('Błąd parsowania pliku CSV: ' + err.message);
      }
    };
    reader.onerror = () => {
      setError('Błąd odczytu pliku');
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleAnalyze = async () => {
    if (!csvContent) return;
    
    setAnalyzing(true);
    setError('');
    
    try {
      const response = await warehouseStockService.analyzeImport(csvContent);
      
      if (response.success && response.data) {
        setNewRecords(response.data.newRecords || []);
        setDuplicates(response.data.duplicates || []);
        setErrors(response.data.errors || []);
        setPhase('analyze');
      } else {
        setError('Błąd analizy pliku CSV');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas analizy CSV');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (!csvContent) return;
    
    setImporting(true);
    setError('');
    setPhase('import');
    
    try {
      const response = await warehouseStockService.importWithOptions(csvContent, updateOptions);
      
      if (response.success && response.data) {
        setImportResult(response.data);
        setPhase('complete');
      } else {
        setError('Błąd importu danych');
        setPhase('analyze');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas importu');
      setPhase('analyze');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (phase === 'complete' && importResult && (importResult.imported > 0 || importResult.updated > 0)) {
      onSuccess();
    }
    onClose();
  };

  const renderUploadPhase = () => (
    <div className="import-phase upload-phase">
      <div 
        className={`dropzone ${dragActive ? 'drag-active' : ''}`}
        onDrop={handleDrop}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="dropzone-icon">📁</div>
        <div className="dropzone-text">
          <p className="dropzone-primary">Przeciągnij plik CSV tutaj</p>
          <p className="dropzone-secondary">lub kliknij, aby wybrać plik</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          style={{ display: 'none' }}
        />
      </div>
      
      <div className="import-info">
        <h4>📋 Format pliku CSV</h4>
        <ul>
          <li><strong>Kodowanie:</strong> UTF-8</li>
          <li><strong>Separator:</strong> przecinek (,)</li>
          <li><strong>Maksymalny rozmiar:</strong> 10 MB</li>
        </ul>
        
        <h4>📝 Wymagane kolumny</h4>
        <ul>
          <li><code>catalog_number</code> - Numer katalogowy (wymagany)</li>
          <li><code>material_name</code> - Nazwa materiału (wymagany)</li>
          <li><code>description</code> - Opis (opcjonalny)</li>
          <li><code>category</code> - Kategoria (opcjonalny)</li>
          <li><code>unit</code> - Jednostka (opcjonalny, domyślnie: szt)</li>
          <li><code>quantity_in_stock</code> - Ilość na stanie (opcjonalny)</li>
          <li><code>unit_price</code> - Cena jednostkowa (opcjonalny)</li>
          <li><code>supplier</code> - Dostawca (opcjonalny)</li>
          <li><code>warehouse_location</code> - Lokalizacja (opcjonalny)</li>
        </ul>
      </div>
    </div>
  );

  const renderPreviewPhase = () => (
    <div className="import-phase preview-phase">
      <h3>📊 Podgląd pliku CSV</h3>
      <p className="phase-description">
        Poniżej znajduje się podgląd pierwszych 10 wierszy z pliku <strong>{file?.name}</strong>
      </p>
      
      <div className="preview-table-container">
        <table className="preview-table">
          <thead>
            <tr>
              {preview[0]?.map((header, idx) => (
                <th key={idx}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.slice(1).map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx}>{cell || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="phase-actions">
        <button className="btn btn-secondary" onClick={() => {
          setFile(null);
          setCsvContent('');
          setPreview([]);
          setPhase('upload');
        }}>
          ← Wybierz inny plik
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing ? 'Analizowanie...' : 'Analizuj duplikaty →'}
        </button>
      </div>
    </div>
  );

  const renderAnalyzePhase = () => (
    <div className="import-phase analyze-phase">
      <h3>🔍 Wyniki analizy</h3>
      
      <div className="analysis-summary">
        <div className="summary-card summary-new">
          <div className="summary-icon">🟢</div>
          <div className="summary-content">
            <div className="summary-count">{newRecords.length}</div>
            <div className="summary-label">Nowe rekordy</div>
          </div>
        </div>
        
        <div className="summary-card summary-duplicates">
          <div className="summary-icon">🟡</div>
          <div className="summary-content">
            <div className="summary-count">{duplicates.length}</div>
            <div className="summary-label">Duplikaty</div>
          </div>
        </div>
        
        <div className="summary-card summary-errors">
          <div className="summary-icon">🔴</div>
          <div className="summary-content">
            <div className="summary-count">{errors.length}</div>
            <div className="summary-label">Błędy</div>
          </div>
        </div>
      </div>
      
      {duplicates.length > 0 && (
        <div className="update-options">
          <h4>⚙️ Opcje aktualizacji dla duplikatów</h4>
          <p className="options-description">
            Wybierz, które pola mają zostać zaktualizowane w istniejących rekordach:
          </p>
          
          <div className="options-grid">
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={updateOptions.updateQuantity}
                onChange={(e) => setUpdateOptions({ ...updateOptions, updateQuantity: e.target.checked })}
              />
              <span>Aktualizuj ilości na stanie</span>
            </label>
            
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={updateOptions.updatePrice}
                onChange={(e) => setUpdateOptions({ ...updateOptions, updatePrice: e.target.checked })}
              />
              <span>Aktualizuj ceny jednostkowe</span>
            </label>
            
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={updateOptions.updateDescription}
                onChange={(e) => setUpdateOptions({ ...updateOptions, updateDescription: e.target.checked })}
              />
              <span>Aktualizuj opisy</span>
            </label>
            
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={updateOptions.updateLocation}
                onChange={(e) => setUpdateOptions({ ...updateOptions, updateLocation: e.target.checked })}
              />
              <span>Aktualizuj lokalizacje</span>
            </label>
            
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={updateOptions.updateSupplier}
                onChange={(e) => setUpdateOptions({ ...updateOptions, updateSupplier: e.target.checked })}
              />
              <span>Aktualizuj dostawców</span>
            </label>
            
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={updateOptions.skipDuplicates}
                onChange={(e) => setUpdateOptions({ ...updateOptions, skipDuplicates: e.target.checked })}
              />
              <span>Pomiń wszystkie duplikaty (importuj tylko nowe)</span>
            </label>
          </div>
        </div>
      )}
      
      {/* Show sample duplicates */}
      {duplicates.length > 0 && !updateOptions.skipDuplicates && (
        <div className="duplicates-preview">
          <h4>📋 Przykładowe duplikaty (pierwsze 5)</h4>
          {duplicates.slice(0, 5).map((dup, idx) => (
            <div key={idx} className="duplicate-item">
              <div className="duplicate-header">
                <strong>{dup.catalog_number}</strong> - {dup.material_name}
                <span className={`duplicate-badge badge-${dup.status}`}>
                  {dup.status === 'duplicate_catalog' ? 'Duplikat wg numeru' : 'Duplikat wg nazwy'}
                </span>
              </div>
              {dup.changedFields && dup.changedFields.length > 0 && (
                <div className="duplicate-changes">
                  Zmienione pola: <strong>{dup.changedFields.join(', ')}</strong>
                </div>
              )}
            </div>
          ))}
          {duplicates.length > 5 && (
            <div className="more-items">+ {duplicates.length - 5} więcej duplikatów</div>
          )}
        </div>
      )}
      
      {/* Show errors */}
      {errors.length > 0 && (
        <div className="errors-preview">
          <h4>❌ Błędy walidacji (pierwsze 5)</h4>
          {errors.slice(0, 5).map((err, idx) => (
            <div key={idx} className="error-item">
              <div className="error-header">
                Wiersz {err.rowNumber}: {err.catalog_number || '(brak numeru)'} - {err.material_name || '(brak nazwy)'}
              </div>
              {err.validationErrors && (
                <div className="error-messages">
                  {err.validationErrors.map((msg, msgIdx) => (
                    <div key={msgIdx} className="error-message">• {msg}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {errors.length > 5 && (
            <div className="more-items">+ {errors.length - 5} więcej błędów</div>
          )}
        </div>
      )}
      
      <div className="phase-actions">
        <button className="btn btn-secondary" onClick={() => setPhase('preview')}>
          ← Powrót do podglądu
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleImport}
          disabled={importing || (newRecords.length === 0 && duplicates.length === 0)}
        >
          {importing ? 'Importowanie...' : `Importuj (${newRecords.length + (updateOptions.skipDuplicates ? 0 : duplicates.length)} rekordów)`}
        </button>
      </div>
    </div>
  );

  const renderImportPhase = () => (
    <div className="import-phase importing-phase">
      <div className="import-progress">
        <div className="progress-icon">⏳</div>
        <h3>Importowanie danych...</h3>
        <div className="progress-bar">
          <div className="progress-bar-fill"></div>
        </div>
        <p>Proszę czekać, trwa przetwarzanie pliku CSV...</p>
      </div>
    </div>
  );

  const renderCompletePhase = () => (
    <div className="import-phase complete-phase">
      <div className="complete-icon">✅</div>
      <h3>Import zakończony!</h3>
      
      {importResult && (
        <div className="import-summary">
          <div className="summary-row">
            <span className="summary-label">✅ Zaimportowano nowych:</span>
            <span className="summary-value success">{importResult.imported}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">🔄 Zaktualizowano:</span>
            <span className="summary-value info">{importResult.updated}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">⏭️ Pominięto:</span>
            <span className="summary-value warning">{importResult.skipped}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">❌ Błędy:</span>
            <span className="summary-value error">{importResult.failed}</span>
          </div>
        </div>
      )}
      
      {importResult && importResult.errors.length > 0 && (
        <div className="import-errors">
          <h4>Szczegóły błędów:</h4>
          <div className="error-list">
            {importResult.errors.slice(0, 10).map((err, idx) => (
              <div key={idx} className="error-detail">
                <strong>Wiersz {err.row}:</strong> {err.error}
              </div>
            ))}
            {importResult.errors.length > 10 && (
              <div className="more-errors">+ {importResult.errors.length - 10} więcej błędów</div>
            )}
          </div>
        </div>
      )}
      
      <div className="phase-actions">
        <button className="btn btn-primary" onClick={handleClose}>
          Zamknij
        </button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📥 Import materiałów z CSV</h2>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          
          {phase === 'upload' && renderUploadPhase()}
          {phase === 'preview' && renderPreviewPhase()}
          {phase === 'analyze' && renderAnalyzePhase()}
          {phase === 'import' && renderImportPhase()}
          {phase === 'complete' && renderCompletePhase()}
        </div>
      </div>
    </div>
  );
};
