import React, { useState } from 'react';
import type { PhotoAlbum } from '../../services/photoService';

interface PhotoUploadModalProps {
  isOpen: boolean;
  albums: PhotoAlbum[];
  onClose: () => void;
  onSubmit: (file: File, data: { albumId?: number; description?: string }) => Promise<void>;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({ isOpen, albums, onClose, onSubmit }) => {
  const [file, setFile] = useState<File | null>(null);
  const [albumId, setAlbumId] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    await onSubmit(file, {
      albumId: albumId ? Number(albumId) : undefined,
      description: description || undefined,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="card" style={{ width: 'min(520px, 95vw)', padding: '1rem' }}>
        <h3>Upload zdjęcia</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ border: '1px dashed var(--border-primary)', padding: '1rem', marginBottom: '0.75rem' }}>
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <label>
            Album
            <select value={albumId} onChange={e => setAlbumId(e.target.value)}>
              <option value="">Brak</option>
              {albums.map(album => (
                <option key={album.id} value={album.id}>{album.name}</option>
              ))}
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
