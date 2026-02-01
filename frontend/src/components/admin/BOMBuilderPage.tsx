// src/components/admin/BOMBuilderPage.tsx
// BOM Builder page - manage materials and BOM templates

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import bomTemplateService from '../../services/bom-template.service';
import { warehouseStockService } from '../../services/warehouseStock.service';
import type { 
  BomTemplate, 
  BomDependencyRule,
  CreateTemplateDto,
  CreateRuleDto 
} from '../../services/bom-template.service';
import type { WarehouseStock } from '../../types/warehouseStock.types';
import '../../styles/grover-theme.css';

type Tab = 'materials' | 'templates' | 'dependencies';

export const BOMBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [activeTab, setActiveTab] = useState<Tab>('materials');
  
  // Permissions
  const canCreate = hasPermission('bom', 'create');
  const canUpdate = hasPermission('bom', 'update');
  const canDelete = hasPermission('bom', 'delete');

  if (!hasPermission('bom', 'read')) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
        <h2 style={{ color: 'var(--text-primary)' }}>Brak dostępu</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Nie masz uprawnień do przeglądania tej strony
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/admin')} style={{ marginTop: '20px' }}>
          Powrót do panelu admina
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate('/admin')}
          style={{ marginBottom: '15px' }}
        >
          ← Powrót
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
          <div style={{ fontSize: '48px' }}>📦</div>
          <div>
            <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>BOM Builder</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Zarządzanie materiałami i zależnościami BOM
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button
            className={`btn ${activeTab === 'materials' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('materials')}
            style={{ 
              borderRadius: '0',
              borderBottom: activeTab === 'materials' ? '2px solid var(--primary-color)' : 'none',
              flex: 1
            }}
          >
            📋 Materiały
          </button>
          <button
            className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('templates')}
            style={{ 
              borderRadius: '0',
              borderBottom: activeTab === 'templates' ? '2px solid var(--primary-color)' : 'none',
              flex: 1
            }}
          >
            📄 Szablony BOM
          </button>
          <button
            className={`btn ${activeTab === 'dependencies' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('dependencies')}
            style={{ 
              borderRadius: '0',
              borderBottom: activeTab === 'dependencies' ? '2px solid var(--primary-color)' : 'none',
              flex: 1
            }}
          >
            🔗 Reguły zależności
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'materials' && (
        <MaterialsTab canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
      )}
      {activeTab === 'templates' && (
        <TemplatesTab canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
      )}
      {activeTab === 'dependencies' && (
        <DependenciesTab canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
      )}
    </div>
  );
};

// ========== MATERIALS TAB ==========
const MaterialsTab: React.FC<{ canCreate: boolean; canUpdate: boolean; canDelete: boolean }> = ({ canCreate, canUpdate, canDelete }) => {
  const [materials, setMaterials] = useState<BomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<BomTemplate | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);

  const loadMaterials = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await bomTemplateService.getTemplates({
        category: selectedCategory || undefined,
        search: searchTerm || undefined,
        limit: 100,
      });
      setMaterials(result.items);
    } catch (err) {
      console.error('Error loading materials:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm]);

  const loadCategories = React.useCallback(async () => {
    try {
      const cats = await bomTemplateService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, []);

  useEffect(() => {
    loadMaterials();
    loadCategories();
  }, [loadMaterials, loadCategories]);

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten materiał?')) return;
    
    try {
      await bomTemplateService.deleteTemplate(id);
      loadMaterials();
    } catch (err: any) {
      alert('Błąd podczas usuwania: ' + err.message);
    }
  };

  const handleDownloadCsvTemplate = async () => {
    try {
      await bomTemplateService.getCsvTemplate();
    } catch (err: any) {
      alert('Błąd podczas pobierania szablonu: ' + err.message);
    }
  };

  return (
    <>
      {/* Actions Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {canCreate && (
            <>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                ➕ Dodaj materiał
              </button>
              <button className="btn btn-secondary" onClick={() => setShowCsvModal(true)}>
                📥 Import CSV
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadCsvTemplate}>
                📤 Pobierz wzór CSV
              </button>
            </>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Szukaj materiału..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ width: '250px' }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input"
              style={{ width: '200px' }}
            >
              <option value="">Wszystkie kategorie</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Materials List */}
      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)' }}>Ładowanie materiałów...</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
          <p style={{ color: 'var(--text-secondary)' }}>Brak materiałów do wyświetlenia</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Numer kat.</th>
                <th>Nazwa materiału</th>
                <th>Ilość</th>
                <th>Kategoria</th>
                <th>System</th>
                <th>Wymagane</th>
                {(canUpdate || canDelete) && <th>Akcje</th>}
              </tr>
            </thead>
            <tbody>
              {materials.map(material => (
                <tr key={material.id}>
                  <td>{material.catalogNumber || '-'}</td>
                  <td style={{ fontWeight: '500' }}>{material.materialName}</td>
                  <td>{material.defaultQuantity} {material.unit}</td>
                  <td>{material.category || '-'}</td>
                  <td>{material.systemType || '-'}</td>
                  <td>
                    {material.isRequired ? (
                      <span style={{ color: 'var(--success)' }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {canUpdate && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => setEditingMaterial(material)}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            ✏️ Edytuj
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="btn"
                            onClick={() => handleDelete(material.id)}
                            style={{ 
                              padding: '4px 10px', 
                              fontSize: '12px',
                              background: 'var(--danger)',
                              color: 'white'
                            }}
                          >
                            🗑️ Usuń
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <MaterialFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadMaterials(); }}
        />
      )}
      
      {editingMaterial && (
        <MaterialFormModal
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
          onSuccess={() => { setEditingMaterial(null); loadMaterials(); }}
        />
      )}
      
      {showCsvModal && (
        <CsvImportModal
          onClose={() => setShowCsvModal(false)}
          onSuccess={() => { setShowCsvModal(false); loadMaterials(); }}
        />
      )}
    </>
  );
};

// ========== TEMPLATES TAB ==========
const TemplatesTab: React.FC<{ canCreate: boolean; canUpdate: boolean; canDelete: boolean }> = () => {
  return (
    <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
      <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
        Szablony BOM według kategorii
      </h3>
      <p style={{ color: 'var(--text-secondary)' }}>
        Ta zakładka pozwoli zarządzać przypisaniami materiałów do kategorii i typów zadań.
        Funkcja dostępna wkrótce.
      </p>
    </div>
  );
};

// ========== DEPENDENCIES TAB ==========
const DependenciesTab: React.FC<{ canCreate: boolean; canUpdate: boolean; canDelete: boolean }> = ({ canCreate, canUpdate, canDelete }) => {
  const [rules, setRules] = useState<BomDependencyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<BomDependencyRule | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await bomTemplateService.getDependencies();
      setRules(data);
    } catch (err) {
      console.error('Error loading rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę regułę?')) return;
    
    try {
      await bomTemplateService.deleteDependency(id);
      loadRules();
    } catch (err: any) {
      alert('Błąd podczas usuwania: ' + err.message);
    }
  };

  return (
    <>
      {/* Actions Bar */}
      {canCreate && (
        <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            ➕ Dodaj regułę zależności
          </button>
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)' }}>Ładowanie reguł...</p>
        </div>
      ) : rules.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔗</div>
          <p style={{ color: 'var(--text-secondary)' }}>Brak reguł zależności</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {rules.map(rule => (
            <div key={rule.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ color: 'var(--text-primary)', margin: '0 0 5px 0' }}>
                    {rule.name}
                  </h3>
                  {rule.description && (
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
                      {rule.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={{ 
                    padding: '4px 10px', 
                    background: rule.active ? 'var(--success)' : 'var(--text-muted)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {rule.active ? 'Aktywna' : 'Nieaktywna'}
                  </span>
                  <span style={{ 
                    padding: '4px 10px', 
                    background: 'var(--bg-hover)',
                    color: 'var(--text-secondary)',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    Priorytet: {rule.priority}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px' }}>
                    Warunki ({rule.conditionOperator})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {rule.conditions.map((cond, idx) => (
                      <div key={idx} style={{ 
                        padding: '8px', 
                        background: 'var(--bg-hover)', 
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)'
                      }}>
                        {cond.materialCategory} {cond.field} {cond.operator} {cond.value}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px' }}>
                    Akcje
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {rule.actions.map((action, idx) => (
                      <div key={idx} style={{ 
                        padding: '8px', 
                        background: 'var(--bg-hover)', 
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)'
                      }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                          {action.targetMaterialCategory}: {action.field}
                        </div>
                        <div>Formula: {action.formula}</div>
                        {action.message && <div style={{ fontSize: '12px', fontStyle: 'italic' }}>{action.message}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {(canUpdate || canDelete) && (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
                  {canUpdate && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setEditingRule(rule)}
                    >
                      ✏️ Edytuj
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="btn"
                      onClick={() => handleDelete(rule.id)}
                      style={{ background: 'var(--danger)', color: 'white' }}
                    >
                      🗑️ Usuń
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <RuleFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadRules(); }}
        />
      )}
      
      {editingRule && (
        <RuleFormModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSuccess={() => { setEditingRule(null); loadRules(); }}
        />
      )}
    </>
  );
};

// ========== MATERIAL FORM MODAL ==========
const MaterialFormModal: React.FC<{
  material?: BomTemplate;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ material, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    taskTypeId: material?.taskTypeId || 1,
    materialName: material?.materialName || '',
    catalogNumber: material?.catalogNumber || '',
    description: material?.description || '',
    unit: material?.unit || 'szt',
    defaultQuantity: material?.defaultQuantity || 1,
    category: material?.category || '',
    systemType: material?.systemType || '',
    isRequired: material?.isRequired || false,
    sortOrder: material?.sortOrder || 0,
  });
  const [saving, setSaving] = useState(false);
  
  // Warehouse search state
  const [warehouseResults, setWarehouseResults] = useState<WarehouseStock[]>([]);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Search warehouse stock with debounce
  const searchWarehouse = async (term: string) => {
    if (term.length < 2) {
      setWarehouseResults([]);
      setShowWarehouseDropdown(false);
      return;
    }
    try {
      const response = await warehouseStockService.getAll({ search: term }, 1, 10);
      setWarehouseResults(response.data);
      setShowWarehouseDropdown(true);
    } catch (err) {
      console.error('Błąd wyszukiwania:', err);
    }
  };

  // Handle material name change with warehouse search
  const handleMaterialNameChange = (value: string) => {
    setFormData({ ...formData, materialName: value });
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search (300ms)
    const timeout = setTimeout(() => {
      searchWarehouse(value);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  // Handle warehouse item selection
  const handleWarehouseItemSelect = (item: WarehouseStock) => {
    setFormData({
      ...formData,
      materialName: item.materialName,
      catalogNumber: item.catalogNumber,
      unit: item.unit,
      category: item.category || formData.category,
    });
    setShowWarehouseDropdown(false);
    setWarehouseResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      if (material) {
        await bomTemplateService.updateTemplate(material.id, formData);
      } else {
        await bomTemplateService.createTemplate(formData as CreateTemplateDto);
      }
      onSuccess();
    } catch (err) {
      alert('Błąd: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
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
      onClick={onClose}
    >
      <div 
        className="card"
        style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto', padding: '30px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>
          {material ? 'Edytuj materiał' : 'Dodaj materiał'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
          <div style={{ position: 'relative' }}>
            <label className="label">Nazwa materiału *</label>
            <input
              type="text"
              value={formData.materialName}
              onChange={(e) => handleMaterialNameChange(e.target.value)}
              className="input"
              required
              placeholder="Wpisz nazwę lub wyszukaj w magazynie..."
              autoComplete="off"
            />
            
            {/* Warehouse search dropdown */}
            {showWarehouseDropdown && warehouseResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                marginTop: '4px',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 1001,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
              }}>
                <div style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)'
                }}>
                  🔍 Materiały z magazynu ({warehouseResults.length})
                </div>
                {warehouseResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleWarehouseItemSelect(item)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ 
                      color: 'var(--text-primary)', 
                      fontSize: '14px', 
                      fontWeight: '500',
                      marginBottom: '4px'
                    }}>
                      {item.materialName}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}>
                      <span>📦 {item.catalogNumber}</span>
                      <span>📊 Stan: {item.quantityInStock} {item.unit}</span>
                      {item.category && <span>🏷️ {item.category}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Numer katalogowy</label>
            <input
              type="text"
              value={formData.catalogNumber}
              onChange={(e) => setFormData({ ...formData, catalogNumber: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Opis</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label className="label">Ilość domyślna *</label>
              <input
                type="number"
                step="0.01"
                value={formData.defaultQuantity}
                onChange={(e) => setFormData({ ...formData, defaultQuantity: parseFloat(e.target.value) })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Jednostka *</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label className="label">Kategoria</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input"
                placeholder="np. PRZEJAZD_KAT_A"
              />
            </div>

            <div>
              <label className="label">Typ systemu</label>
              <select
                value={formData.systemType}
                onChange={(e) => setFormData({ ...formData, systemType: e.target.value })}
                className="input"
              >
                <option value="">Brak</option>
                <option value="SMOKIP_A">SMOKIP A</option>
                <option value="SMOKIP_B">SMOKIP B</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.isRequired}
                onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Materiał wymagany</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Zapisywanie...' : material ? 'Zapisz zmiany' : 'Dodaj materiał'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ========== CSV IMPORT MODAL ==========
const CsvImportModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!file) return;

    try {
      setImporting(true);
      const result = await bomTemplateService.importCsv(file);
      alert(result.message);
      onSuccess();
    } catch (err: any) {
      alert('Błąd importu: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
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
      onClick={onClose}
    >
      <div 
        className="card"
        style={{ maxWidth: '500px', width: '100%', padding: '30px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>
          Import CSV
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Wybierz plik CSV z materiałami do zaimportowania.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Format: UTF-8, separator: ; (średnik)
          </p>
        </div>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="input"
          style={{ marginBottom: '20px' }}
        />

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Anuluj
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleImport}
            disabled={!file || importing}
          >
            {importing ? 'Importowanie...' : 'Importuj'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== RULE FORM MODAL ==========
const RuleFormModal: React.FC<{
  rule?: BomDependencyRule;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ rule, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateRuleDto>({
    name: rule?.name || '',
    description: rule?.description || '',
    conditions: rule?.conditions || [],
    conditionOperator: rule?.conditionOperator || 'AND',
    actions: rule?.actions || [],
    category: rule?.category || '',
    systemType: rule?.systemType || '',
    priority: rule?.priority || 10,
    active: rule?.active !== undefined ? rule.active : true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      if (rule) {
        await bomTemplateService.updateDependency(rule.id, formData);
      } else {
        await bomTemplateService.createDependency(formData);
      }
      onSuccess();
    } catch (err: any) {
      alert('Błąd: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
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
      onClick={onClose}
    >
      <div 
        className="card"
        style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflow: 'auto', padding: '30px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>
          {rule ? 'Edytuj regułę' : 'Dodaj regułę zależności'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
          <div>
            <label className="label">Nazwa reguły *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Opis</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={2}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div>
              <label className="label">Kategoria</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input"
                placeholder="opcjonalne"
              />
            </div>

            <div>
              <label className="label">Typ systemu</label>
              <input
                type="text"
                value={formData.systemType}
                onChange={(e) => setFormData({ ...formData, systemType: e.target.value })}
                className="input"
                placeholder="opcjonalne"
              />
            </div>

            <div>
              <label className="label">Priorytet</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Reguła aktywna</span>
            </label>
          </div>

          <div style={{ 
            padding: '20px', 
            background: 'var(--bg-hover)', 
            borderRadius: '8px',
            marginTop: '10px'
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>
              ℹ️ Edycja warunków i akcji będzie dostępna w następnej wersji.
              Obecnie możesz modyfikować podstawowe informacje o regule.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Zapisywanie...' : rule ? 'Zapisz zmiany' : 'Dodaj regułę'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
