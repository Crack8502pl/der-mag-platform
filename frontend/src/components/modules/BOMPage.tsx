import React, { useState, useEffect } from 'react';
import { BackButton } from '../common/BackButton';
import bomSubsystemTemplateService from '../../services/bomSubsystemTemplate.service';
import type { BomSubsystemTemplate } from '../../services/bomSubsystemTemplate.service';
import '../../styles/grover-theme.css';

export const BOMPage: React.FC = () => {
  const [subsystemTemplates, setSubsystemTemplates] = useState<BomSubsystemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<number>>(new Set());
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');

  useEffect(() => {
    loadSubsystemTemplates();
  }, []);

  const loadSubsystemTemplates = async () => {
    try {
      setLoading(true);
      const templates = await bomSubsystemTemplateService.getAll();
      setSubsystemTemplates(templates);
    } catch (err) {
      console.error('Error loading subsystem templates:', err);
    } finally {
      setLoading(false);
    }
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
          Przeglądaj materiały z szablonów Bill of Materials
        </p>
      </div>

      <div>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, marginBottom: '5px' }}>
            📄 Materiały z szablonów BOM
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Łącznie {subsystemTemplates.reduce((sum, t) => sum + t.items.length, 0)} materiałów w {subsystemTemplates.length} szablonach
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

        {loading ? (
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
                                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, borderBottom: '2px solid var(--border-color)', width: '50px' }}>Nr</th>
                                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, borderBottom: '2px solid var(--border-color)', width: '150px' }}>Numer kat.</th>
                                <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, borderBottom: '2px solid var(--border-color)' }}>Nazwa materiału</th>
                                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, borderBottom: '2px solid var(--border-color)', width: '80px' }}>Ilość</th>
                                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, borderBottom: '2px solid var(--border-color)', width: '80px' }}>Jednostka</th>
                                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, borderBottom: '2px solid var(--border-color)', width: '120px' }}>Źródło ilości</th>
                                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, borderBottom: '2px solid var(--border-color)', width: '120px' }}>Grupa</th>
                                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, borderBottom: '2px solid var(--border-color)', width: '60px' }}>IP</th>
                                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, borderBottom: '2px solid var(--border-color)', width: '100px' }}>Wymagane</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedItems.map((item, idx) => (
                                <tr key={item.id || idx}>
                                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>{idx + 1}</td>
                                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '12px' }}>
                                    {item.catalogNumber || '-'}
                                  </td>
                                  <td style={{ textAlign: 'left', verticalAlign: 'middle', padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontWeight: 500 }}>{item.materialName}</td>
                                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>{item.defaultQuantity}</td>
                                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>{item.unit}</td>
                                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>{getQuantitySourceBadge(item.quantitySource)}</td>
                                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                    {item.groupName || '-'}
                                  </td>
                                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
                                    {item.requiresIp ? (
                                      <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>✓</span>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
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
    </div>
  );
};
