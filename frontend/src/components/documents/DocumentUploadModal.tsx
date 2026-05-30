import React, { useState } from 'react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File, metadata: { name: string; type: string; description?: string }) => Promise<void>;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('other');
  const [description, setDescription] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    await onSubmit(file, { name: name || file.name, type, description });
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="card" style={{ width: 'min(520px, 95vw)', padding: '1rem' }}>
        <h3>Upload dokumentu</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ border: '1px dashed var(--border-primary)', padding: '1rem', marginBottom: '0.75rem' }}>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <label>
            Nazwa
            <input value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label>
            Typ
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="pdf">PDF</option>
              <option value="word">Word</option>
              <option value="excel">Excel</option>
              <option value="other">Inny</option>
            </select>
          </label>
          <label>
            Opis
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Anuluj</button>
            <button type="submit" className="btn btn-primary" disabled={!file}>Wyślij</button>
          </div>
        </form>
      </div>
    </div>
  );
};
