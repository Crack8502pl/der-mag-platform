import React, { useEffect, useMemo, useState } from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { photoService, type PhotoAlbum, type PhotoItem } from '../../services/photoService';
import { PhotoUploadModal } from '../photos/PhotoUploadModal';
import { usePermissions } from '../../hooks/usePermissions';
import './ModulePage.css';

type PhotosTab = 'gallery' | 'albums' | 'pending';

export const PhotosPage: React.FC = () => {
  const { isAdmin } = usePermissions();
  const [tab, setTab] = useState<PhotosTab>('gallery');
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAlbums = async () => {
    setAlbums(await photoService.getAlbums());
  };

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const approvalStatus = tab === 'pending' ? 'pending' : undefined;
      const albumId = selectedAlbum ? Number(selectedAlbum) : undefined;
      setPhotos(await photoService.getPhotos({ albumId, approvalStatus }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [tab, selectedAlbum]);

  const photosByAlbum = useMemo(() => {
    const map = new Map<number, number>();
    photos.forEach(photo => {
      if (photo.albumId) {
        map.set(photo.albumId, (map.get(photo.albumId) || 0) + 1);
      }
    });
    return map;
  }, [photos]);

  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="photos" emoji={MODULE_ICONS.photos} size={36} />
        </div>
        <div>
          <h1>Zdjęcia</h1>
          <p className="page-subtitle">Upload, galerie i zatwierdzanie zdjęć</p>
        </div>
      </div>

      <div className="card module-content">
        <div className="module-tabs">
          <button className={`tab-btn ${tab === 'gallery' ? 'active' : ''}`} onClick={() => setTab('gallery')}>Galeria</button>
          <button className={`tab-btn ${tab === 'albums' ? 'active' : ''}`} onClick={() => setTab('albums')}>Albumy</button>
          {isAdmin() && <button className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Do zatwierdzenia</button>}
        </div>

        {(tab === 'gallery' || tab === 'pending') && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <select value={selectedAlbum} onChange={e => setSelectedAlbum(e.target.value)}>
                <option value="">Wszystkie albumy</option>
                {albums.map(album => <option key={album.id} value={album.id}>{album.name}</option>)}
              </select>
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowUpload(true)}>Upload</button>
            </div>

            {loading ? <p>Ładowanie...</p> : (
              <div className="photo-grid">
                {photos.map(photo => (
                  <button key={photo.id} className="photo-thumb" onClick={() => setSelectedPhoto(photo)}>
                    <img src={photo.thumbnailPath || photo.filePath} alt={photo.originalName} loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {tab === 'pending' && (
              <div style={{ marginTop: '1rem' }}>
                {photos.map(photo => (
                  <div key={photo.id} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                    <strong>{photo.originalName}</strong>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <button className="btn btn-ghost" onClick={async () => { await photoService.approvePhoto(photo.id); await loadPhotos(); }}>Zatwierdź</button>
                      <button className="btn btn-ghost" onClick={async () => { await photoService.rejectPhoto(photo.id); await loadPhotos(); }}>Odrzuć</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'albums' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary" onClick={async () => {
                const name = window.prompt('Nazwa albumu');
                if (!name) return;
                await photoService.createAlbum({ name });
                await loadAlbums();
              }}>Nowy album</button>
            </div>
            {albums.map(album => (
              <div key={album.id} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                <strong>{album.name}</strong>
                <p>Liczba zdjęć: {album.photoCount ?? photosByAlbum.get(album.id) ?? 0}</p>
                <p>Data: {new Date(album.createdAt).toLocaleDateString('pl-PL')}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {selectedPhoto && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedPhoto(null)}>
          <div className="card" style={{ width: 'min(80vw, 960px)', padding: '0.75rem' }}>
            <img src={selectedPhoto.filePath} alt={selectedPhoto.originalName} style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      <PhotoUploadModal
        isOpen={showUpload}
        albums={albums}
        onClose={() => setShowUpload(false)}
        onSubmit={async (file, data) => {
          await photoService.uploadPhoto(file, data);
          await loadPhotos();
        }}
      />
    </div>
  );
};
