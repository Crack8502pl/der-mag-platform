import React, { useEffect, useState } from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { documentService, type DocumentItem, type DocumentTemplateItem } from '../../services/documentService';
import { DocumentUploadModal } from '../documents/DocumentUploadModal';
import { GenerateDocumentModal } from '../documents/GenerateDocumentModal';
import './ModulePage.css';

type DocumentsTab = 'documents' | 'templates';

export const DocumentsPage: React.FC = () => {
  const [tab, setTab] = useState<DocumentsTab>('documents');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [templateToGenerate, setTemplateToGenerate] = useState<DocumentTemplateItem | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentService.getDocuments({ search, type, page, limit: 10 });
      setDocuments(response.data);
      setTotalPages(response.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      setTemplates(await documentService.getTemplates());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'documents') {
      loadDocuments();
    } else {
      loadTemplates();
    }
  }, [tab, search, type, page]);

  const handleDownload = async (doc: DocumentItem) => {
    const blob = await documentService.downloadDocument(doc.id);
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = doc.originalFilename || `${doc.name}.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="documents" emoji={MODULE_ICONS.documents} size={36} />
        </div>
        <div>
          <h1>Dokumenty</h1>
          <p className="page-subtitle">Szablony, generowanie i archiwizacja dokumentów</p>
        </div>
      </div>

      <div className="card module-content">
        <div className="module-tabs">
          <button className={`tab-btn ${tab === 'documents' ? 'active' : ''}`} onClick={() => setTab('documents')}>Dokumenty</button>
          <button className={`tab-btn ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>Szablony</button>
        </div>

        {tab === 'documents' && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input value={search} onChange={e => { setPage(1); setSearch(e.target.value); }} placeholder="Szukaj" />
              <select value={type} onChange={e => { setPage(1); setType(e.target.value); }}>
                <option value="">Wszystkie typy</option>
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
              </select>
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowUploadModal(true)}>
                Upload dokumentu
              </button>
            </div>

            {loading ? <p>Ładowanie...</p> : (
              <table className="module-table">
                <thead><tr><th>Nazwa</th><th>Typ</th><th>Data uploadu</th><th>Rozmiar</th><th>Akcje</th></tr></thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id}>
                      <td>{doc.name}</td>
                      <td><span className="status-badge">{doc.type}</span></td>
                      <td>{new Date(doc.createdAt).toLocaleDateString('pl-PL')}</td>
                      <td>{Math.round((doc.fileSize || 0) / 1024)} KB</td>
                      <td style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-ghost" onClick={() => handleDownload(doc)}>Pobierz</button>
                        <button className="btn btn-ghost" onClick={async () => { await documentService.deleteDocument(doc.id); await loadDocuments(); }}>Usuń</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Poprzednia</button>
              <span>Strona {page} / {totalPages}</span>
              <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Następna</button>
            </div>
          </>
        )}

        {tab === 'templates' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>Dodaj szablon</button>
            </div>
            {loading ? <p>Ładowanie...</p> : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {templates.map(template => (
                  <div className="card" key={template.id} style={{ padding: '0.75rem' }}>
                    <strong>{template.name}</strong>
                    <p>Typ: {template.type}</p>
                    <p>Opis: {template.description || '-'}</p>
                    <p>Placeholdery: {template.placeholders ? Object.keys(template.placeholders).join(', ') || '-' : '-'}</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-ghost" onClick={() => setTemplateToGenerate(template)}>Generuj</button>
                      <button className="btn btn-ghost" onClick={async () => { await documentService.deleteTemplate(template.id); await loadTemplates(); }}>Usuń</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={async (file, metadata) => {
          if (tab === 'documents') {
            await documentService.uploadDocument(file, metadata);
            await loadDocuments();
          } else {
            await documentService.uploadTemplate(file, metadata);
            await loadTemplates();
          }
        }}
      />
      <GenerateDocumentModal
        isOpen={!!templateToGenerate}
        template={templateToGenerate}
        onClose={() => setTemplateToGenerate(null)}
        onGenerate={async (templateId, data) => {
          await documentService.generateDocument(templateId, data);
        }}
      />
    </div>
  );
};
