// src/components/admin/BOMBuilderPage.tsx
// BOM Builder page - manage materials and BOM templates

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import bomTemplateService from '../../services/bom-template.service';
import { warehouseStockService } from '../../services/warehouseStock.service';
import bomSubsystemTemplateService from '../../services/bomSubsystemTemplate.service';
import bomGroupService from '../../services/bomGroup.service';
import bomTemplateDependencyRuleService from '../../services/bomTemplateDependencyRule.service';
import type { 
  BomDependencyRule,
  CreateRuleDto 
} from '../../services/bom-template.service';
import type { WarehouseStock } from '../../types/warehouseStock.types';
import type {
  BomSubsystemTemplate,
  BomSubsystemTemplateItem
} from '../../services/bomSubsystemTemplate.service';
import type { BomGroup } from '../../services/bomGroup.service';
import type { BomTemplateDependencyRule } from '../../services/bomTemplateDependencyRule.service';
import { BomGroupsManageModal } from './BomGroupsManageModal';
import { TemplateDependencyRuleModal } from './TemplateDependencyRuleModal';
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
        <MaterialsTab />
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

// Shared table styles for consistent formatting
const tableHeaderBaseStyle: React.CSSProperties = {
  verticalAlign: 'middle',
  padding: '10px 12px',
  backgroundColor: 'var(--bg-secondary)',
  fontWeight: 600,
  borderBottom: '2px solid var(--border-color)',
};

const tableCellBaseStyle: React.CSSProperties = {
  verticalAlign: 'middle',
  padding: '10px 12px',
  borderBottom: '1px solid var(--border-color)',
};

// ========== MATERIALS TAB ==========
const MaterialsTab: React.FC = () => {
  // State for subsystem templates
  const [subsystemTemplates, setSubsystemTemplates] = useState<BomSubsystemTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<number>>(new Set());
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');

  const totalMaterials = React.useMemo(() => 
    subsystemTemplates.reduce((sum, t) => sum + t.items.length, 0),
    [subsystemTemplates]
  );

  const loadSubsystemTemplates = React.useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const templates = await bomSubsystemTemplateService.getAll();
      setSubsystemTemplates(templates);
    } catch (err) {
      console.error('Error loading subsystem templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubsystemTemplates();
  }, [loadSubsystemTemplates]);

  return (
    <>
      {/* Subsystem Templates Section */}
      <div>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, marginBottom: '5px' }}>
            📄 Materiały z szablonów BOM
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Łącznie {totalMaterials} materiałów w {subsystemTemplates.length} szablonach
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Szukaj materiałów po nazwie lub numerze katalogowym..."
            value={templateSearchTerm}
            onChange={(e) => {
              setTemplateSearchTerm(e.target.value);
              // Auto-expand matching templates
              if (e.target.value) {
                const matchingIds = new Set<number>();
                subsystemTemplates.forEach(template => {
                  const hasMatch = template.items.some(item => 
                    item.materialName.toLowerCase().includes(e.target.value.toLowerCase()) ||
                    (item.catalogNumber && item.catalogNumber.toLowerCase().includes(e.target.value.toLowerCase()))
                  );
                  if (hasMatch) {
                    matchingIds.add(template.id);
                  }
                });
                setExpandedTemplates(matchingIds);
              }
            }}
            style={{ maxWidth: '500px' }}
          />
        </div>

        {templatesLoading ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏳</div>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Ładowanie szablonów BOM...</p>
          </div>
        ) : subsystemTemplates.length === 0 ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📄</div>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Brak szablonów BOM</p>
          </div>
        ) : (() => {
          // Filter templates and items based on search
          const filteredTemplates = subsystemTemplates
            .map(template => {
              if (!templateSearchTerm) return template;
              
              const filteredItems = template.items.filter(item =>
                item.materialName.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                (item.catalogNumber && item.catalogNumber.toLowerCase().includes(templateSearchTerm.toLowerCase()))
              );
              
              return filteredItems.length > 0 ? { ...template, items: filteredItems } : null;
            })
            .filter((t): t is BomSubsystemTemplate => t !== null)
            .sort((a, b) => {
              // Sort by subsystemType then taskVariant
              if (a.subsystemType !== b.subsystemType) {
                return a.subsystemType.localeCompare(b.subsystemType);
              }
              const aVar = a.taskVariant || '';
              const bVar = b.taskVariant || '';
              return aVar.localeCompare(bVar);
            });

          const subsystemIcons: Record<string, string> = {
            SMOKIP_A: '🔵',
            SMOKIP_B: '🟢',
            SKD: '🔐',
            SSWIN: '🏠',
            CCTV: '📹',
            SMW: '📺',
            SDIP: '📡',
            SUG: '🧯',
            SSP: '🔥',
            LAN: '🌐',
            OTK: '🔧',
            ZASILANIE: '⚡'
          };

          const getQuantitySourceBadge = (source: string) => {
            const badges = {
              FIXED: { text: 'Stała', color: 'var(--primary-color)' },
              FROM_CONFIG: { text: 'Config', color: '#9333ea' },
              PER_UNIT: { text: 'Per Unit', color: 'var(--success)' },
              DEPENDENT: { text: 'Zależna', color: '#f59e0b' }
            };
            const badge = badges[source as keyof typeof badges] || { text: source, color: 'var(--text-muted)' };
            return (
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: badge.color,
                color: 'white'
              }}>
                {badge.text}
              </span>
            );
          };

          return filteredTemplates.length === 0 ? (
            <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Brak materiałów pasujących do wyszukiwania</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {filteredTemplates.map(template => {
                const icon = subsystemIcons[template.subsystemType] || '📦';
                const isExpanded = expandedTemplates.has(template.id);
                const sortedItems = [...template.items].sort((a, b) => a.sortOrder - b.sortOrder);

                return (
                  <div key={template.id} className="card" style={{ overflow: 'hidden' }}>
                    {/* Card Header */}
                    <div
                      onClick={() => {
                        const newExpanded = new Set(expandedTemplates);
                        if (isExpanded) {
                          newExpanded.delete(template.id);
                        } else {
                          newExpanded.add(template.id);
                        }
                        setExpandedTemplates(newExpanded);
                      }}
                      style={{
                        padding: '15px 20px',
                        backgroundColor: 'var(--bg-secondary)',
                        cursor: 'pointer',
                        borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    >
                      <span style={{ fontSize: '18px' }}>{isExpanded ? '▼' : '▶'}</span>
                      <span style={{ fontSize: '20px' }}>{icon}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {template.subsystemType}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {template.taskVariant || 'Ogólny'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>|</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        "{template.templateName}"
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>|</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {template.items.length} materiałów
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>|</span>
                      <span style={{ 
                        color: template.isActive ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 600
                      }}>
                        {template.isActive ? '✅ Aktywny' : '❌ Nieaktywny'}
                      </span>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div style={{ padding: '20px' }}>
                        <div className="table-container">
                          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ ...tableHeaderBaseStyle, textAlign: 'center', width: '50px' }}>Nr</th>
                                <th style={{ ...tableHeaderBaseStyle, textAlign: 'center', width: '150px' }}>Numer kat.</th>
                                <th style={{ ...tableHeaderBaseStyle, textAlign: 'left' }}>Nazwa materiału</th>
                                <th style={{ ...tableHeaderBaseStyle, textAlign: 'center', width: '80px' }}>Ilość</th>
                                <th style={{ ...tableHeaderBaseStyle, textAlign: 'center', width: '80px' }}>Jednostka</th>
                                <th style={{ ...tableHeaderBaseStyle, textAlign: 'center', width: '120px' }}>Źródło ilości</th>
                                <th style={{ ...tableHeaderBaseStyle, textAlign: 'center', width: '120px' }}>Grupa</th>
                                <th style={{ ...tableHeaderBaseStyle, textAlign: 'center', width: '60px' }}>IP</th>
                                <th style={{ ...tableHeaderBaseStyle, textAlign: 'center', width: '100px' }}>Wymagane</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedItems.map((item, idx) => (
                                <tr key={item.id || idx}>
                                  <td style={{ ...tableCellBaseStyle, textAlign: 'center' }}>{idx + 1}</td>
                                  <td style={{ ...tableCellBaseStyle, textAlign: 'center', fontFamily: 'monospace', fontSize: '12px' }}>
                                    {item.catalogNumber || '-'}
                                  </td>
                                  <td style={{ ...tableCellBaseStyle, textAlign: 'left', fontWeight: 500 }}>{item.materialName}</td>
                                  <td style={{ ...tableCellBaseStyle, textAlign: 'center' }}>{item.defaultQuantity}</td>
                                  <td style={{ ...tableCellBaseStyle, textAlign: 'center' }}>{item.unit}</td>
                                  <td style={{ ...tableCellBaseStyle, textAlign: 'center' }}>{getQuantitySourceBadge(item.quantitySource)}</td>
                                  <td style={{ ...tableCellBaseStyle, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    {item.groupName || '-'}
                                  </td>
                                  <td style={{ ...tableCellBaseStyle, textAlign: 'center' }}>
                                    {item.requiresIp ? (
                                      <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>✓</span>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                                    )}
                                  </td>
                                  <td style={{ ...tableCellBaseStyle, textAlign: 'center' }}>
                                    {item.isRequired ? (
                                      <span style={{ 
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        backgroundColor: 'var(--danger)',
                                        color: 'white',
                                        fontSize: '11px',
                                        fontWeight: 600
                                      }}>
                                        TAK
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>NIE</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </>
  );
};

// ========== TEMPLATES TAB ==========
const TemplatesTab: React.FC<{ canCreate: boolean; canUpdate: boolean; canDelete: boolean }> = ({ canCreate, canUpdate, canDelete }) => {
  const [selectedSubsystem, setSelectedSubsystem] = useState<{ type: string; variant: string | null } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BomSubsystemTemplate | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BomSubsystemTemplateItem | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [bomGroups, setBomGroups] = useState<BomGroup[]>([]);
  
  // Dependency rules state
  const [dependencyRules, setDependencyRules] = useState<BomTemplateDependencyRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<BomTemplateDependencyRule | null>(null);

  // Load BOM groups for sorting
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const groups = await bomGroupService.getAll();
        setBomGroups(groups);
      } catch (err) {
        console.error('Error loading BOM groups:', err);
      }
    };
    loadGroups();
  }, []);

  // Define subsystem structure
  const subsystemStructure = [
    { type: 'SMOKIP_A', icon: '🔵', variants: ['PRZEJAZD_KAT_A', 'PRZEJAZD_KAT_E', 'PRZEJAZD_KAT_F', 'SKP', 'NASTAWNIA', 'LCS', 'CUID'] },
    { type: 'SMOKIP_B', icon: '🟢', variants: ['PRZEJAZD_KAT_B', 'PRZEJAZD_KAT_C', 'PRZEJAZD_KAT_E', 'PRZEJAZD_KAT_F', 'NASTAWNIA', 'LCS', 'CUID'] },
    { type: 'SKD', icon: '🔐', variants: ['_GENERAL'] },
    { type: 'SSWIN', icon: '🏠', variants: ['_GENERAL'] },
    { type: 'CCTV', icon: '📹', variants: ['_GENERAL'] },
    { type: 'SMW', icon: '📺', variants: ['_GENERAL'] },
    { type: 'SDIP', icon: '📡', variants: ['_GENERAL'] },
    { type: 'SUG', icon: '🧯', variants: ['_GENERAL'] },
    { type: 'SSP', icon: '🔥', variants: ['_GENERAL'] },
    { type: 'LAN', icon: '🌐', variants: ['_GENERAL'] },
    { type: 'OTK', icon: '🔧', variants: ['_GENERAL'] },
    { type: 'ZASILANIE', icon: '⚡', variants: ['_GENERAL'] },
  ];



  const handleSelectSubsystem = async (type: string, variant: string) => {
    const variantValue = variant === '_GENERAL' ? null : variant;
    setSelectedSubsystem({ type, variant: variantValue });
    
    try {
      const template = await bomSubsystemTemplateService.getTemplateFor(type, variantValue);
      setSelectedTemplate(template);
      
      // Load dependency rules for this template
      if (template) {
        loadDependencyRules(template.id);
      }
    } catch (err) {
      console.error('Error loading template:', err);
      setSelectedTemplate(null);
      setDependencyRules([]);
    }
  };

  const loadDependencyRules = async (templateId: number) => {
    setLoadingRules(true);
    try {
      const rules = await bomTemplateDependencyRuleService.getRulesForTemplate(templateId);
      setDependencyRules(rules);
    } catch (err) {
      console.error('Error loading dependency rules:', err);
      setDependencyRules([]);
    } finally {
      setLoadingRules(false);
    }
  };

  const handleDeleteRule = async (ruleId: number, ruleName: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć regułę "${ruleName}"?`)) return;
    
    try {
      await bomTemplateDependencyRuleService.deleteRule(ruleId);
      
      // Reload rules
      if (selectedTemplate) {
        await loadDependencyRules(selectedTemplate.id);
      }
      
      // Show success notification
      const successMsg = document.createElement('div');
      successMsg.textContent = '✅ Reguła usunięta pomyślnie';
      successMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--success);color:white;padding:12px 20px;border-radius:8px;z-index:9999;';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } catch (err: any) {
      alert('Błąd podczas usuwania reguły: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateTemplate = async () => {
    if (!selectedSubsystem) return;
    
    setCreatingTemplate(true);
    try {
      const variantText = selectedSubsystem.variant || 'Ogólny';
      const templateName = `BOM ${selectedSubsystem.type} - ${variantText}`;
      
      const newTemplate = await bomSubsystemTemplateService.create({
        templateName,
        subsystemType: selectedSubsystem.type,
        taskVariant: selectedSubsystem.variant,
        items: []
      });
      
      setSelectedTemplate(newTemplate);
      
      // Show brief success indication
      const successMsg = document.createElement('div');
      successMsg.textContent = '✅ Szablon utworzony pomyślnie';
      successMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--success);color:white;padding:12px 20px;border-radius:8px;z-index:9999;';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } catch (err: any) {
      alert('Błąd podczas tworzenia szablonu: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate || !selectedSubsystem) return;
    
    if (!confirm('Czy na pewno chcesz zapisać zmiany w szablonie?')) return;
    
    try {
      // Update the template with item IDs preserved
      await bomSubsystemTemplateService.update(selectedTemplate.id, {
        items: selectedTemplate.items
      });
      
      // Refresh the template from server to get updated data
      const refreshedTemplate = await bomSubsystemTemplateService.getById(selectedTemplate.id);
      setSelectedTemplate(refreshedTemplate);
      
      // Show success notification
      const successMsg = document.createElement('div');
      successMsg.textContent = '✅ Szablon zapisany pomyślnie';
      successMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--success);color:white;padding:12px 20px;border-radius:8px;z-index:9999;';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } catch (err: any) {
      alert('Błąd podczas zapisywania: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!selectedTemplate) return;
    if (!confirm('Czy na pewno chcesz usunąć ten element?')) return;
    
    const updatedItems = selectedTemplate.items.filter(item => item.id !== itemId);
    setSelectedTemplate({ ...selectedTemplate, items: updatedItems });
  };

  const handleAddItem = (item: BomSubsystemTemplateItem) => {
    if (!selectedTemplate) return;
    
    const newItem = { ...item, sortOrder: selectedTemplate.items.length };
    setSelectedTemplate({
      ...selectedTemplate,
      items: [...selectedTemplate.items, newItem]
    });
  };

  const handleUpdateItem = (updatedItem: BomSubsystemTemplateItem) => {
    if (!selectedTemplate) return;
    
    const updatedItems = selectedTemplate.items.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    setSelectedTemplate({ ...selectedTemplate, items: updatedItems });
  };

  // Group items by groupName
  const groupedItems = selectedTemplate?.items.reduce((acc, item) => {
    const group = item.groupName || 'Inne';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, BomSubsystemTemplateItem[]>) || {};

  // Calculate summary
  const summary = selectedTemplate ? {
    total: selectedTemplate.items.length,
    fixed: selectedTemplate.items.filter(i => i.quantitySource === 'FIXED').length,
    fromConfig: selectedTemplate.items.filter(i => i.quantitySource === 'FROM_CONFIG').length,
    perUnit: selectedTemplate.items.filter(i => i.quantitySource === 'PER_UNIT').length,
    dependent: selectedTemplate.items.filter(i => i.quantitySource === 'DEPENDENT').length,
  } : null;

  const [showManageGroupsModal, setShowManageGroupsModal] = useState(false);

  return (
    <>
      {/* Manage Groups Button */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-secondary"
          onClick={() => setShowManageGroupsModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ⚙️ Zarządzaj grupami
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 250px)' }}>
        {/* Left Panel - Subsystem Tree */}
        <div className="card" style={{ width: '280px', padding: '15px', overflowY: 'auto' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '15px', fontSize: '16px' }}>
            Podsystemy
          </h3>
          
          {subsystemStructure.map(subsystem => (
            <div key={subsystem.type} style={{ marginBottom: '15px' }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{subsystem.icon}</span>
                <span>{subsystem.type}</span>
              </div>
              
              <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {subsystem.variants.map(variant => {
                  const isActive = selectedSubsystem?.type === subsystem.type && 
                    (variant === '_GENERAL' ? selectedSubsystem.variant === null : selectedSubsystem.variant === variant);
                  
                  return (
                    <button
                      key={variant}
                      onClick={() => handleSelectSubsystem(subsystem.type, variant)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '13px',
                        textAlign: 'left',
                        background: isActive ? 'var(--primary-color)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {variant === '_GENERAL' ? 'Ogólny' : variant}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel - Template Editor */}
        <div className="card" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {!selectedSubsystem ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
                Wybierz podsystem
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Wybierz podsystem z listy po lewej, aby edytować szablon BOM
              </p>
            </div>
          ) : !selectedTemplate ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📝</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
                Brak szablonu
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Nie znaleziono aktywnego szablonu dla {selectedSubsystem.type}
                {selectedSubsystem.variant && ` - ${selectedSubsystem.variant}`}
              </p>
              {canCreate && (
                <button 
                  className="btn btn-primary" 
                  onClick={handleCreateTemplate}
                  disabled={creatingTemplate}
                >
                  {creatingTemplate ? '⏳ Tworzenie...' : '➕ Utwórz szablon'}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px' }}>
                      {selectedTemplate.templateName}
                    </h2>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)'
                      }}>
                        v{Number(selectedTemplate.version).toFixed(2)}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        background: selectedTemplate.isActive ? '#10b981' : '#6b7280',
                        color: '#fff',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        {selectedTemplate.isActive ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {canCreate && (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => setShowAddItemModal(true)}
                        style={{ fontSize: '14px' }}
                      >
                        ➕ Dodaj materiał
                      </button>
                    )}
                    {canUpdate && (
                      <button 
                        className="btn btn-success" 
                        onClick={handleSaveTemplate}
                        style={{ fontSize: '14px' }}
                      >
                        💾 Zapisz szablon
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Items grouped by groupName */}
              {Object.entries(groupedItems)
                .sort(([groupNameA], [groupNameB]) => {
                  // Find the sortOrder for each group
                  const groupA = bomGroups.find(g => g.name === groupNameA);
                  const groupB = bomGroups.find(g => g.name === groupNameB);
                  const sortOrderA = groupA?.sortOrder ?? 999;
                  const sortOrderB = groupB?.sortOrder ?? 999;
                  return sortOrderA - sortOrderB;
                })
                .map(([groupName, items]) => (
                <div key={groupName} style={{ marginBottom: '25px' }}>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}>
                    {groupName}
                  </h3>
                  
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px', textAlign: 'center', verticalAlign: 'middle' }}>Nr</th>
                          <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>Materiał</th>
                          <th style={{ width: '100px', textAlign: 'center', verticalAlign: 'middle' }}>Ilość</th>
                          <th style={{ width: '80px', textAlign: 'center', verticalAlign: 'middle' }}>Jednostka</th>
                          <th style={{ width: '140px', textAlign: 'center', verticalAlign: 'middle' }}>Źródło</th>
                          <th style={{ width: '50px', textAlign: 'center', verticalAlign: 'middle' }}>IP</th>
                          <th style={{ width: '150px', textAlign: 'center', verticalAlign: 'middle' }}>Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{idx + 1}</td>
                            <td style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                              <div>
                                <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                  {item.materialName}
                                </div>
                                {item.catalogNumber && (
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    📦 {item.catalogNumber}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{item.defaultQuantity}</td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{item.unit}</td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <span style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                borderRadius: 'var(--radius-sm)',
                                background: 
                                  item.quantitySource === 'FIXED' ? '#3b82f6' :
                                  item.quantitySource === 'FROM_CONFIG' ? '#8b5cf6' :
                                  item.quantitySource === 'PER_UNIT' ? '#10b981' :
                                  '#f59e0b',
                                color: '#fff'
                              }}>
                                {item.quantitySource === 'FIXED' ? 'Stała' :
                                 item.quantitySource === 'FROM_CONFIG' ? 'Config' :
                                 item.quantitySource === 'PER_UNIT' ? 'Per Unit' :
                                 'Zależna'}
                              </span>
                              {item.configParamName && (
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {item.configParamName}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              {item.requiresIp && (
                                <span style={{ fontSize: '16px' }}>🌐</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                {canUpdate && (
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() => setEditingItem(item)}
                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                  >
                                    ✏️
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => item.id && handleDeleteItem(item.id)}
                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Summary Bar */}
              {summary && (
                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-around',
                  flexWrap: 'wrap',
                  gap: '15px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {summary.total}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Razem</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#3b82f6' }}>
                      {summary.fixed}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Stała</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#8b5cf6' }}>
                      {summary.fromConfig}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Config</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#10b981' }}>
                      {summary.perUnit}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Per Unit</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#f59e0b' }}>
                      {summary.dependent}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Zależna</div>
                  </div>
                </div>
              )}

              {/* Dependency Rules Section */}
              <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>
                      🔗 Reguły zależności
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '5px 0 0 0' }}>
                      Zaawansowane reguły obliczania ilości materiałów
                    </p>
                  </div>
                  {canCreate && (
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setEditingRule(null);
                        setShowRuleModal(true);
                      }}
                      style={{ fontSize: '14px' }}
                    >
                      ➕ Dodaj regułę zależności
                    </button>
                  )}
                </div>

                {loadingRules ? (
                  <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>⏳</div>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Ładowanie reguł...</p>
                  </div>
                ) : dependencyRules.length === 0 ? (
                  <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      Brak reguł zależności. Kliknij "Dodaj regułę" aby utworzyć pierwszą regułę.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {dependencyRules
                      .sort((a, b) => a.evaluationOrder - b.evaluationOrder)
                      .map((rule) => {
                        const targetItem = selectedTemplate?.items.find(item => item.id === rule.targetItemId);
                        
                        return (
                          <div
                            key={rule.id}
                            className="card"
                            style={{
                              padding: '20px',
                              border: rule.isActive ? '1px solid var(--border-color)' : '1px solid #d1d5db',
                              opacity: rule.isActive ? 1 : 0.6
                            }}
                          >
                            {/* Rule Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                  <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '16px' }}>
                                    {rule.ruleName}
                                  </h4>
                                  {rule.ruleCode && (
                                    <span style={{
                                      padding: '2px 8px',
                                      fontSize: '11px',
                                      background: 'var(--bg-secondary)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: 'var(--radius-sm)',
                                      color: 'var(--text-secondary)',
                                      fontFamily: 'monospace'
                                    }}>
                                      {rule.ruleCode}
                                    </span>
                                  )}
                                  <span style={{
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    background: rule.isActive ? '#10b981' : '#6b7280',
                                    color: '#fff',
                                    borderRadius: 'var(--radius-sm)'
                                  }}>
                                    {rule.isActive ? 'Aktywna' : 'Nieaktywna'}
                                  </span>
                                  <span style={{
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    background: 'var(--primary-color)',
                                    color: '#fff',
                                    borderRadius: 'var(--radius-sm)'
                                  }}>
                                    Kolejność: {rule.evaluationOrder}
                                  </span>
                                </div>
                                {rule.description && (
                                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '5px 0 0 0' }}>
                                    {rule.description}
                                  </p>
                                )}
                              </div>
                              
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {canUpdate && (
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                      setEditingRule(rule);
                                      setShowRuleModal(true);
                                    }}
                                    style={{ padding: '6px 12px', fontSize: '13px' }}
                                  >
                                    ✏️ Edytuj
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => handleDeleteRule(rule.id, rule.ruleName)}
                                    style={{ padding: '6px 12px', fontSize: '13px' }}
                                  >
                                    🗑️ Usuń
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Rule Content Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              {/* Left Column */}
                              <div>
                                {/* Inputs */}
                                <div style={{ marginBottom: '15px' }}>
                                  <h5 style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
                                    📥 Wejścia ({rule.inputs?.length || 0})
                                  </h5>
                                  {rule.inputs && rule.inputs.length > 0 ? (
                                    <div className="table-container">
                                      <table className="table" style={{ fontSize: '12px' }}>
                                        <thead>
                                          <tr>
                                            <th style={{ width: '80px' }}>Typ</th>
                                            <th>Źródło</th>
                                            <th style={{ width: '70px' }}>Mnożnik</th>
                                            <th style={{ width: '80px' }}>Tylko wybr.</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {rule.inputs.map((input, idx) => {
                                            const sourceItem = input.inputType === 'ITEM' 
                                              ? selectedTemplate?.items.find(item => item.id === input.sourceItemId)
                                              : null;
                                            const sourceRule = input.inputType === 'RULE_RESULT'
                                              ? dependencyRules.find(r => r.id === input.sourceRuleId)
                                              : null;
                                            
                                            return (
                                              <tr key={idx}>
                                                <td>
                                                  <span style={{
                                                    padding: '2px 6px',
                                                    fontSize: '10px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: input.inputType === 'ITEM' ? '#3b82f6' : '#8b5cf6',
                                                    color: '#fff'
                                                  }}>
                                                    {input.inputType === 'ITEM' ? 'Pozycja' : 'Reguła'}
                                                  </span>
                                                </td>
                                                <td style={{ fontSize: '11px' }}>
                                                  {sourceItem ? (
                                                    <span title={sourceItem.materialName}>
                                                      [{sourceItem.sortOrder}] {sourceItem.materialName.length > 30 
                                                        ? sourceItem.materialName.substring(0, 30) + '...' 
                                                        : sourceItem.materialName}
                                                    </span>
                                                  ) : sourceRule ? (
                                                    <span>{sourceRule.ruleName}</span>
                                                  ) : (
                                                    <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                                                  )}
                                                </td>
                                                <td>{input.inputMultiplier}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                  {input.onlyIfSelected ? '✓' : '—'}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Brak wejść</p>
                                  )}
                                </div>

                                {/* Aggregation & Math */}
                                <div>
                                  <h5 style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
                                    🧮 Agregacja i obliczenia
                                  </h5>
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <div style={{ marginBottom: '5px' }}>
                                      <strong>Agregacja:</strong>{' '}
                                      <span style={{
                                        padding: '2px 6px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-sm)'
                                      }}>
                                        {rule.aggregationType}
                                      </span>
                                    </div>
                                    <div>
                                      <strong>Operacja:</strong>{' '}
                                      <span style={{
                                        padding: '2px 6px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-sm)'
                                      }}>
                                        {rule.mathOperation}
                                      </span>
                                      {rule.mathOperand != null && rule.mathOperation !== 'NONE' && (
                                        <span style={{ marginLeft: '5px' }}>
                                          (operand: <strong>{rule.mathOperand}</strong>)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Right Column */}
                              <div>
                                {/* Conditions */}
                                <div style={{ marginBottom: '15px' }}>
                                  <h5 style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
                                    ⚖️ Warunki ({rule.conditions?.length || 0})
                                  </h5>
                                  {rule.conditions && rule.conditions.length > 0 ? (
                                    <div className="table-container">
                                      <table className="table" style={{ fontSize: '12px' }}>
                                        <thead>
                                          <tr>
                                            <th style={{ width: '70px' }}>Operator</th>
                                            <th style={{ width: '70px' }}>Wartość</th>
                                            <th style={{ width: '70px' }}>Wynik</th>
                                            <th>Opis</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {rule.conditions.map((condition, idx) => (
                                            <tr key={idx}>
                                              <td>
                                                <span style={{
                                                  padding: '2px 6px',
                                                  fontSize: '10px',
                                                  background: 'var(--bg-secondary)',
                                                  borderRadius: 'var(--radius-sm)',
                                                  fontFamily: 'monospace'
                                                }}>
                                                  {condition.comparisonOperator}
                                                </span>
                                              </td>
                                              <td>
                                                {condition.compareValue}
                                                {condition.comparisonOperator === 'BETWEEN' && condition.compareValueMax != null && (
                                                  <span> - {condition.compareValueMax}</span>
                                                )}
                                              </td>
                                              <td><strong>{condition.resultValue}</strong></td>
                                              <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                {condition.description || '—'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>
                                      Brak warunków (wynik agregacji używany bezpośrednio)
                                    </p>
                                  )}
                                </div>

                                {/* Target Item */}
                                <div>
                                  <h5 style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
                                    🎯 Pozycja docelowa
                                  </h5>
                                  {targetItem ? (
                                    <div
                                      style={{
                                        padding: '10px',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '12px'
                                      }}
                                    >
                                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px' }}>
                                        [{targetItem.sortOrder}] {targetItem.materialName}
                                      </div>
                                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                        {targetItem.groupName} • {targetItem.unit}
                                      </div>
                                    </div>
                                  ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>
                                      Pozycja niedostępna
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItemModal && selectedTemplate && (
        <AddTemplateItemModal
          onClose={() => setShowAddItemModal(false)}
          onSuccess={(item) => {
            handleAddItem(item);
            setShowAddItemModal(false);
          }}
        />
      )}
      
      {/* Edit Item Modal */}
      {editingItem && (
        <AddTemplateItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={(item) => {
            handleUpdateItem(item);
            setEditingItem(null);
          }}
        />
      )}

      {/* Manage Groups Modal */}
      {showManageGroupsModal && (
        <BomGroupsManageModal
          onClose={() => setShowManageGroupsModal(false)}
          onGroupsChanged={() => {
            // Trigger a re-render to refresh groups in AddTemplateItemModal
            // The groups will be reloaded when AddTemplateItemModal is opened again
            setShowManageGroupsModal(false);
          }}
        />
      )}

      {/* Dependency Rule Modal */}
      {showRuleModal && selectedTemplate && (
        <TemplateDependencyRuleModal
          templateId={selectedTemplate.id}
          templateItems={selectedTemplate.items}
          existingRules={dependencyRules}
          rule={editingRule || undefined}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(null);
          }}
          onSuccess={() => {
            setShowRuleModal(false);
            setEditingRule(null);
            if (selectedTemplate) {
              loadDependencyRules(selectedTemplate.id);
            }
          }}
        />
      )}
    </>
  );
};

// ========== ADD TEMPLATE ITEM MODAL ==========
const AddTemplateItemModal: React.FC<{
  item?: BomSubsystemTemplateItem;
  onClose: () => void;
  onSuccess: (item: BomSubsystemTemplateItem) => void;
}> = ({ item, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<BomSubsystemTemplateItem>({
    id: item?.id,
    templateId: item?.templateId,
    warehouseStockId: item?.warehouseStockId,
    dependsOnItemId: item?.dependsOnItemId,
    dependencyFormula: item?.dependencyFormula || '',
    materialName: item?.materialName || '',
    catalogNumber: item?.catalogNumber || '',
    unit: item?.unit || 'szt',
    defaultQuantity: item?.defaultQuantity || 1,
    quantitySource: item?.quantitySource || 'FIXED',
    configParamName: item?.configParamName || '',
    requiresIp: item?.requiresIp || false,
    isRequired: item?.isRequired || true,
    groupName: item?.groupName || 'Inne',
    sortOrder: item?.sortOrder || 0,
    notes: item?.notes || '',
  });
  
  const [warehouseResults, setWarehouseResults] = useState<WarehouseStock[]>([]);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [bomGroups, setBomGroups] = useState<BomGroup[]>([]);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const groups = await bomGroupService.getAll();
        setBomGroups(groups);
      } catch (err) {
        console.error('Błąd ładowania grup:', err);
        // Fallback to default groups if API fails
        setBomGroups([
          { id: 1, name: 'Szafa sterownicza', icon: '🗄️', color: '#3b82f6', sortOrder: 10, isActive: true, createdAt: '', updatedAt: '' },
          { id: 2, name: 'Okablowanie', icon: '🔌', color: '#10b981', sortOrder: 20, isActive: true, createdAt: '', updatedAt: '' },
          { id: 3, name: 'Urządzenia aktywne', icon: '📡', color: '#8b5cf6', sortOrder: 30, isActive: true, createdAt: '', updatedAt: '' },
          { id: 4, name: 'Zasilanie', icon: '⚡', color: '#f59e0b', sortOrder: 40, isActive: true, createdAt: '', updatedAt: '' },
          { id: 5, name: 'Czujniki/detektory', icon: '🔍', color: '#ef4444', sortOrder: 50, isActive: true, createdAt: '', updatedAt: '' },
          { id: 6, name: 'Osprzęt montażowy', icon: '🔧', color: '#6b7280', sortOrder: 60, isActive: true, createdAt: '', updatedAt: '' },
          { id: 7, name: 'Inne', icon: '📦', color: '#9ca3af', sortOrder: 70, isActive: true, createdAt: '', updatedAt: '' },
        ]);
      }
    };
    loadGroups();
  }, []);

  const configParams = [
    'przejazdyKatA',
    'przejazdyKatB',
    'iloscSKP',
    'iloscNastawni',
    'lcsMonitory',
    'lcsStanowiska',
    'iloscBudynkow',
    'iloscDrzwi',
    'iloscPomieszczen',
    'iloscKontenerow',
    'iloscKamer',
    'iloscPrzejsc'
  ];

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

  const handleMaterialNameChange = (value: string) => {
    setFormData({ ...formData, materialName: value });
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      searchWarehouse(value);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  const handleWarehouseItemSelect = (warehouseItem: WarehouseStock) => {
    setFormData({
      ...formData,
      materialName: warehouseItem.materialName,
      catalogNumber: warehouseItem.catalogNumber,
      unit: warehouseItem.unit,
      warehouseStockId: warehouseItem.id,
    });
    setShowWarehouseDropdown(false);
    setWarehouseResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate quantity for 'szt' unit
    if (formData.unit === 'szt' && !Number.isInteger(formData.defaultQuantity)) {
      setValidationError('Dla jednostki "szt" (sztuki) ilość musi być liczbą całkowitą.');
      return;
    }
    
    setValidationError('');
    onSuccess(formData);
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
          {item ? 'Edytuj element' : 'Dodaj element'}
        </h2>
        
        {validationError && (
          <div style={{
            padding: '12px',
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            color: '#dc2626',
            marginBottom: '15px'
          }}>
            ⚠️ {validationError}
          </div>
        )}

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
                {warehouseResults.map((warehouseItem) => (
                  <div
                    key={warehouseItem.id}
                    onClick={() => handleWarehouseItemSelect(warehouseItem)}
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
                      {warehouseItem.materialName}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}>
                      <span>📦 {warehouseItem.catalogNumber}</span>
                      <span>📊 Stan: {warehouseItem.quantityInStock} {warehouseItem.unit}</span>
                      {warehouseItem.category && <span>🏷️ {warehouseItem.category}</span>}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label className="label">Ilość domyślna *</label>
              <input
                type="number"
                step={formData.unit === 'szt' ? '1' : '0.01'}
                value={formData.defaultQuantity}
                onChange={(e) => {
                  let value = parseFloat(e.target.value);
                  // Round to integer if unit is 'szt' (pieces)
                  if (formData.unit === 'szt') {
                    value = Math.round(value);
                  }
                  setFormData({ ...formData, defaultQuantity: value });
                }}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Jednostka *</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => {
                  const newUnit = e.target.value;
                  let quantity = formData.defaultQuantity;
                  // Round to integer if changing to 'szt'
                  if (newUnit === 'szt') {
                    quantity = Math.round(quantity);
                  }
                  setFormData({ ...formData, unit: newUnit, defaultQuantity: quantity });
                }}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Źródło ilości *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
              {(['FIXED', 'FROM_CONFIG', 'PER_UNIT', 'DEPENDENT'] as const).map(source => (
                <label key={source} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: formData.quantitySource === source ? 'var(--primary-color)' : 'transparent',
                  color: formData.quantitySource === source ? '#fff' : 'var(--text-secondary)'
                }}>
                  <input
                    type="radio"
                    name="quantitySource"
                    value={source}
                    checked={formData.quantitySource === source}
                    onChange={(e) => setFormData({ ...formData, quantitySource: e.target.value as any })}
                  />
                  <span style={{ fontSize: '13px' }}>
                    {source === 'FIXED' ? 'Stała' :
                     source === 'FROM_CONFIG' ? 'Z konfiguracji' :
                     source === 'PER_UNIT' ? 'Na jednostkę' :
                     'Zależna'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {formData.quantitySource === 'FROM_CONFIG' && (
            <div>
              <label className="label">Parametr konfiguracji *</label>
              <select
                value={formData.configParamName}
                onChange={(e) => setFormData({ ...formData, configParamName: e.target.value })}
                className="input"
                required
              >
                <option value="">-- Wybierz parametr --</option>
                {configParams.map(param => (
                  <option key={param} value={param}>{param}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Grupa *</label>
            <select
              value={formData.groupName}
              onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
              className="input"
              required
            >
              {bomGroups.map(group => (
                <option key={group.id} value={group.name}>
                  {group.icon ? `${group.icon} ` : ''}{group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notatki</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={2}
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.isRequired}
                onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Materiał wymagany</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.requiresIp}
                onChange={(e) => setFormData({ ...formData, requiresIp: e.target.checked })}
              />
              <span style={{ color: 'var(--text-secondary)' }}>🌐 Wymaga IP</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary">
              {item ? 'Zapisz zmiany' : 'Dodaj element'}
            </button>
          </div>
        </form>
      </div>
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
