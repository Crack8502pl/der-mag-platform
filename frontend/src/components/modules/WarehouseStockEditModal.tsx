// src/components/modules/WarehouseStockEditModal.tsx
// Modal for creating and editing warehouse stock materials

import React, { useState } from 'react';
import { warehouseStockService } from '../../services/warehouseStock.service';
import type { WarehouseStock, MaterialType } from '../../types/warehouseStock.types';
import './WarehouseStockPage.css';

interface Props {
  item?: WarehouseStock;
  onClose: () => void;
  onSuccess: () => void;
}

export const WarehouseStockEditModal: React.FC<Props> = ({ item, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    // Identyfikacja
    catalogNumber: item?.catalogNumber || '',
    materialName: item?.materialName || '',
    description: item?.description || '',
    
    // Klasyfikacja
    category: item?.category || '',
    subcategory: item?.subcategory || '',
    materialType: item?.materialType || 'consumable' as MaterialType,
    deviceCategory: item?.deviceCategory || '',
    
    // Ilości
    unit: item?.unit || 'szt',
    quantityInStock: item?.quantityInStock || 0,
    minStockLevel: item?.minStockLevel || undefined,
    maxStockLevel: item?.maxStockLevel || undefined,
    reorderPoint: item?.reorderPoint || undefined,
    
    // Lokalizacja
    warehouseLocation: item?.warehouseLocation || '',
    storageZone: item?.storageZone || '',
    
    // Dostawca
    supplier: item?.supplier || '',
    supplierCatalogNumber: item?.supplierCatalogNumber || '',
    manufacturer: item?.manufacturer || '',
    partNumber: item?.partNumber || '',
    
    // Ceny
    unitPrice: item?.unitPrice || undefined,
    purchasePrice: item?.purchasePrice || undefined,
    currency: item?.currency || 'PLN',
    
    // Flagi
    isSerialized: item?.isSerialized || false,
    isBatchTracked: item?.isBatchTracked || false,
    requiresIpAddress: item?.requiresIpAddress || false,
    isHazardous: item?.isHazardous || false,
    requiresCertification: item?.requiresCertification || false,
    
    // Notatki
    notes: item?.notes || '',
    internalNotes: item?.internalNotes || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Walidacja
    if (!formData.catalogNumber.trim()) {
      setError('Numer katalogowy jest wymagany');
      return;
    }
    
    if (!formData.materialName.trim()) {
      setError('Nazwa materiału jest wymagana');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      // Przygotuj dane - usuń puste wartości opcjonalne
      const dataToSend: Partial<WarehouseStock> = { ...formData };
      if (!dataToSend.minStockLevel) delete dataToSend.minStockLevel;
      if (!dataToSend.maxStockLevel) delete dataToSend.maxStockLevel;
      if (!dataToSend.reorderPoint) delete dataToSend.reorderPoint;
      if (!dataToSend.unitPrice) delete dataToSend.unitPrice;
      if (!dataToSend.purchasePrice) delete dataToSend.purchasePrice;
      
      if (item) {
        await warehouseStockService.update(item.id, dataToSend);
      } else {
        await warehouseStockService.create(dataToSend);
      }
      
      onSuccess();
    } catch (err) {
      setError((err as Error & { response?: { data?: { message?: string } } })?.response?.data?.message || 'Błąd podczas zapisywania materiału');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | number | boolean | undefined) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div 
      className="modal-overlay" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div 
        className="modal-content card"
        style={{
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '30px',
          margin: '20px auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            {item ? '✏️ Edytuj materiał' : '➕ Dodaj materiał'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
            {item ? 'Zaktualizuj informacje o materiale' : 'Wprowadź informacje o nowym materiale'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Sekcja: Identyfikacja */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              📝 Identyfikacja
            </h3>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Numer katalogowy *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.catalogNumber}
                  onChange={(e) => handleChange('catalogNumber', e.target.value)}
                  required
                  placeholder="np. MAT-001-2024"
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Nazwa materiału *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.materialName}
                  onChange={(e) => handleChange('materialName', e.target.value)}
                  required
                  placeholder="np. Kabel UTP kat. 5e"
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Opis
                </label>
                <textarea
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Szczegółowy opis materiału..."
                />
              </div>
            </div>
          </div>

          {/* Sekcja: Klasyfikacja */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              🏷️ Klasyfikacja
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Kategoria
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="np. Kable"
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Podkategoria
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.subcategory}
                  onChange={(e) => handleChange('subcategory', e.target.value)}
                  placeholder="np. Kable sieciowe"
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Typ materiału
                </label>
                <select
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.materialType}
                  onChange={(e) => handleChange('materialType', e.target.value as MaterialType)}
                >
                  <option value="consumable">Materiał zużywalny</option>
                  <option value="device">Urządzenie</option>
                  <option value="tool">Narzędzie</option>
                  <option value="component">Komponent</option>
                </select>
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Kategoria urządzenia
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.deviceCategory}
                  onChange={(e) => handleChange('deviceCategory', e.target.value)}
                  placeholder="np. Switch, Router"
                />
              </div>
            </div>
          </div>

          {/* Sekcja: Ilości i stany */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              📊 Ilości i stany magazynowe
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Jednostka *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  required
                  placeholder="szt, m, kg"
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Stan magazynowy *
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.quantityInStock}
                  onChange={(e) => handleChange('quantityInStock', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Min. poziom stanu
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.minStockLevel || ''}
                  onChange={(e) => handleChange('minStockLevel', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Max. poziom stanu
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.maxStockLevel || ''}
                  onChange={(e) => handleChange('maxStockLevel', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Punkt zamówienia
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.reorderPoint || ''}
                  onChange={(e) => handleChange('reorderPoint', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
            </div>
          </div>

          {/* Sekcja: Lokalizacja */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              📍 Lokalizacja magazynowa
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Lokalizacja magazynowa
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.warehouseLocation}
                  onChange={(e) => handleChange('warehouseLocation', e.target.value)}
                  placeholder="np. A-12-03"
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Strefa składowania
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.storageZone}
                  onChange={(e) => handleChange('storageZone', e.target.value)}
                  placeholder="np. Strefa A"
                />
              </div>
            </div>
          </div>

          {/* Sekcja: Dostawca */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              🏢 Dostawca i producent
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Dostawca
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.supplier}
                  onChange={(e) => handleChange('supplier', e.target.value)}
                  placeholder="np. ABC Dystrybutor"
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Numer kat. dostawcy
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.supplierCatalogNumber}
                  onChange={(e) => handleChange('supplierCatalogNumber', e.target.value)}
                  placeholder="np. SUPP-12345"
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Producent
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.manufacturer}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                  placeholder="np. XYZ Electronics"
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Numer części (P/N)
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.partNumber}
                  onChange={(e) => handleChange('partNumber', e.target.value)}
                  placeholder="np. PN-98765"
                />
              </div>
            </div>
          </div>

          {/* Sekcja: Ceny */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              💰 Ceny
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Cena jednostkowa
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.unitPrice || ''}
                  onChange={(e) => handleChange('unitPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Cena zakupu
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.purchasePrice || ''}
                  onChange={(e) => handleChange('purchasePrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Waluta
                </label>
                <select
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                >
                  <option value="PLN">PLN</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sekcja: Flagi i ustawienia */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              ⚙️ Flagi i ustawienia
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isSerialized}
                  onChange={(e) => handleChange('isSerialized', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Numeracja seryjna</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isBatchTracked}
                  onChange={(e) => handleChange('isBatchTracked', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Śledzenie partii</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.requiresIpAddress}
                  onChange={(e) => handleChange('requiresIpAddress', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Wymaga adresu IP</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isHazardous}
                  onChange={(e) => handleChange('isHazardous', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Materiał niebezpieczny</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.requiresCertification}
                  onChange={(e) => handleChange('requiresCertification', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Wymaga certyfikacji</span>
              </label>
            </div>
          </div>

          {/* Sekcja: Notatki */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              📝 Notatki
            </h3>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Notatki
                </label>
                <textarea
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Notatki widoczne dla wszystkich użytkowników..."
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Notatki wewnętrzne
                </label>
                <textarea
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  value={formData.internalNotes}
                  onChange={(e) => handleChange('internalNotes', e.target.value)}
                  placeholder="Notatki wewnętrzne (tylko dla uprawnionych)..."
                />
              </div>
            </div>
          </div>

          {/* Przyciski akcji */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '10px 24px',
                fontSize: '14px'
              }}
            >
              Anuluj
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? '⏳ Zapisywanie...' : (item ? '💾 Zapisz zmiany' : '➕ Dodaj materiał')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
