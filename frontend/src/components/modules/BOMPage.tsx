import React, { useState, useEffect } from 'react';
import { BackButton } from '../common/BackButton';
import bomTemplateService from '../../services/bom-template.service';
import type { BomTemplate } from '../../services/bom-template.service';
import { pluralizeTemplates } from '../../utils/pluralization';
import '../../styles/grover-theme.css';

export const BOMPage: React.FC = () => {
  const [templates, setTemplates] = useState<BomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSystemType, setSelectedSystemType] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Modal
  const [selectedTemplate, setSelectedTemplate] = useState<BomTemplate | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [page, selectedCategory, selectedSystemType, searchTerm]);

  const loadCategories = async () => {
    try {
      const cats = await bomTemplateService.getCategories();
      setCategories(cats);
    } catch (err: any) {
      console.error('Error loading categories:', err);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await bomTemplateService.getTemplates({
        page,
        limit: 30,
        category: selectedCategory || undefined,
        systemType: selectedSystemType || undefined,
        search: searchTerm || undefined,
      });
      
      setTemplates(result.items);
      setTotalPages(result.pages);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || 'Błąd podczas ładowania szablonów');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (template: BomTemplate) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTemplate(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <BackButton to="/dashboard" />
      
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
          <div style={{ fontSize: '48px' }}>🔩</div>
          <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>Materiały BOM</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginLeft: '63px' }}>
          Przeglądaj szablony Bill of Materials dla różnych typów projektów
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Szukaj materiału
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nazwa materiału..."
                className="input"
                style={{ width: '100%' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Kategoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="">Wszystkie</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                System
              </label>
              <select
                value={selectedSystemType}
                onChange={(e) => { setSelectedSystemType(e.target.value); setPage(1); }}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="">Wszystkie</option>
                <option value="SMOKIP_A">SMOKIP A</option>
                <option value="SMOKIP_B">SMOKIP B</option>
              </select>
            </div>
            
            <button type="submit" className="btn btn-primary">
              🔍 Szukaj
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)' }}>Ładowanie szablonów...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--error)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <p style={{ color: 'var(--error)', marginBottom: '10px' }}>Błąd:</p>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
          <p style={{ color: 'var(--text-secondary)' }}>Nie znaleziono szablonów BOM</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '15px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Znaleziono {total} {pluralizeTemplates(total)}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Numer katalogowy</th>
                  <th>Nazwa materiału</th>
                  <th>Ilość</th>
                  <th>Jednostka</th>
                  <th>Kategoria</th>
                  <th>System</th>
                  <th>Wymagane</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(template => (
                  <tr key={template.id}>
                    <td>{template.catalogNumber || '-'}</td>
                    <td style={{ fontWeight: '500' }}>{template.materialName}</td>
                    <td>{template.defaultQuantity}</td>
                    <td>{template.unit}</td>
                    <td>{template.category || '-'}</td>
                    <td>{template.systemType || '-'}</td>
                    <td>
                      {template.isRequired ? (
                        <span style={{ color: 'var(--success)' }}>✓ Tak</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>- Nie</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleViewDetails(template)}
                        style={{ padding: '5px 12px', fontSize: '13px' }}
                      >
                        👁️ Szczegóły
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Poprzednia
              </button>
              <span style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>
                Strona {page} z {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Następna →
              </button>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {showModal && selectedTemplate && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={handleCloseModal}
        >
          <div 
            className="card"
            style={{ 
              maxWidth: '600px', 
              width: '100%', 
              maxHeight: '80vh', 
              overflow: 'auto',
              padding: '30px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Szczegóły materiału</h2>
              <button
                onClick={handleCloseModal}
                className="btn btn-secondary"
                style={{ padding: '5px 12px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>
                  Nazwa materiału
                </label>
                <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                  {selectedTemplate.materialName}
                </div>
              </div>

              {selectedTemplate.catalogNumber && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>
                    Numer katalogowy
                  </label>
                  <div style={{ color: 'var(--text-primary)' }}>
                    {selectedTemplate.catalogNumber}
                  </div>
                </div>
              )}

              {selectedTemplate.description && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>
                    Opis
                  </label>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {selectedTemplate.description}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>
                    Ilość domyślna
                  </label>
                  <div style={{ color: 'var(--text-primary)' }}>
                    {selectedTemplate.defaultQuantity} {selectedTemplate.unit}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>
                    Wymagane
                  </label>
                  <div style={{ color: selectedTemplate.isRequired ? 'var(--success)' : 'var(--text-muted)' }}>
                    {selectedTemplate.isRequired ? '✓ Tak' : '- Nie'}
                  </div>
                </div>
              </div>

              {selectedTemplate.category && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>
                    Kategoria
                  </label>
                  <div style={{ color: 'var(--text-primary)' }}>
                    {selectedTemplate.category}
                  </div>
                </div>
              )}

              {selectedTemplate.systemType && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>
                    Typ systemu
                  </label>
                  <div style={{ color: 'var(--text-primary)' }}>
                    {selectedTemplate.systemType}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '30px', textAlign: 'right' }}>
              <button onClick={handleCloseModal} className="btn btn-primary">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
