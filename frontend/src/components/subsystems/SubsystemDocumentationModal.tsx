// src/components/subsystems/SubsystemDocumentationModal.tsx
// Modal for managing subsystem documentation

import React, { useState, useEffect, useRef } from 'react';
import { subsystemService, Subsystem, SubsystemDocument } from '../../services/subsystem.service';
import './SubsystemDocumentationModal.css';

interface Props {
  subsystem: Subsystem;
  onClose: () => void;
}

export const SubsystemDocumentationModal: React.FC<Props> = ({ subsystem, onClose }) => {
  const [documents, setDocuments] = useState<SubsystemDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [subsystem.id]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await subsystemService.getDocumentation(subsystem.id);
      setDocuments(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas ładowania dokumentów');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('Plik jest za duży. Maksymalny rozmiar to 50MB.');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'application/zip'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Nieobsługiwany typ pliku. Dozwolone: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, ZIP');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await subsystemService.uploadDocument(subsystem.id, file);
      await loadDocuments();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas przesyłania pliku');
      console.error('Error uploading document:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: SubsystemDocument) => {
    try {
      const blob = await subsystemService.downloadDocument(subsystem.id, doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas pobierania pliku');
      console.error('Error downloading document:', err);
    }
  };

  const handleDelete = async (doc: SubsystemDocument) => {
    if (!confirm(`Czy na pewno chcesz usunąć dokument "${doc.originalName}"?`)) {
      return;
    }

    try {
      setError(null);
      await subsystemService.deleteDocument(subsystem.id, doc.id);
      await loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas usuwania pliku');
      console.error('Error deleting document:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content documentation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📄 Dokumentacja podsystemu</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="subsystem-info">
          <div className="info-item">
            <strong>Numer:</strong> {subsystem.subsystemNumber}
          </div>
          <div className="info-item">
            <strong>Typ:</strong> {subsystem.systemType}
          </div>
          <div className="info-item">
            <strong>Kontrakt:</strong> {subsystem.contract?.contractNumber || 'N/A'}
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Upload Section */}
        <div className="upload-section">
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <span className="upload-icon">📤</span>
              <p>Przeciągnij plik tutaj lub kliknij, aby wybrać</p>
              <p className="upload-info">
                Maksymalny rozmiar: 50MB<br />
                Dozwolone: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, ZIP
              </p>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => handleFileSelect(e.target.files)}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
              />
              <button
                className="btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Przesyłanie...' : 'Wybierz plik'}
              </button>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="documents-list">
          <h3>Dokumenty ({documents.length})</h3>
          
          {loading && <div className="loading">Ładowanie dokumentów...</div>}
          
          {!loading && documents.length === 0 && (
            <div className="no-documents">
              Brak dokumentów. Dodaj pierwszy dokument powyżej.
            </div>
          )}

          {!loading && documents.length > 0 && (
            <div className="documents-table-wrapper">
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>Nazwa</th>
                    <th>Rozmiar</th>
                    <th>Dodał</th>
                    <th>Data</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="doc-name">
                        <span className="doc-icon">📄</span>
                        {doc.originalName}
                      </td>
                      <td className="doc-size">{formatFileSize(doc.fileSize)}</td>
                      <td className="doc-uploader">
                        {doc.uploadedBy?.firstName} {doc.uploadedBy?.lastName}
                      </td>
                      <td className="doc-date">{formatDate(doc.uploadedAt)}</td>
                      <td className="doc-actions">
                        <button
                          className="btn-icon btn-download"
                          onClick={() => handleDownload(doc)}
                          title="Pobierz"
                        >
                          ⬇️
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(doc)}
                          title="Usuń"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
