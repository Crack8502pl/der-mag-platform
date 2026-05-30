import React, { useMemo, useState } from 'react';
import type { DocumentTemplateItem } from '../../services/documentService';

interface GenerateDocumentModalProps {
  isOpen: boolean;
  template: DocumentTemplateItem | null;
  onClose: () => void;
  onGenerate: (templateId: number, data: Record<string, string>) => Promise<void>;
}

export const GenerateDocumentModal: React.FC<GenerateDocumentModalProps> = ({ isOpen, template, onClose, onGenerate }) => {
  const placeholders = useMemo(() => {
    if (!template?.placeholders) return [];
    if (Array.isArray(template.placeholders)) {
      return template.placeholders.map(value => String(value));
    }
    return Object.keys(template.placeholders);
  }, [template]);

  const [values, setValues] = useState<Record<string, string>>({});

  if (!isOpen || !template) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onGenerate(template.id, values);
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="card" style={{ width: 'min(520px, 95vw)', padding: '1rem' }}>
        <h3>Generuj dokument: {template.name}</h3>
        <form onSubmit={handleSubmit}>
          {placeholders.length === 0 ? <p>Ten szablon nie definiuje placeholderów.</p> : placeholders.map(placeholder => (
            <label key={placeholder}>
              {placeholder}
              <input
                value={values[placeholder] || ''}
                onChange={e => setValues(prev => ({ ...prev, [placeholder]: e.target.value }))}
              />
            </label>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Anuluj</button>
            <button type="submit" className="btn btn-primary">Generuj</button>
          </div>
        </form>
      </div>
    </div>
  );
};
