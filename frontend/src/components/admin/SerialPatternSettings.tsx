// src/components/admin/SerialPatternSettings.tsx
// Admin panel for managing serial number validation patterns and strip prefixes

import React, { useState, useEffect } from 'react';
import { BackButton } from '../common/BackButton';
import completionService from '../../services/completion.service';
import type { SerialPattern, StripPrefix } from '../../types/completion.types';
import './SerialPatternSettings.css';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const SerialPatternSettings: React.FC = () => {
  const [patterns, setPatterns] = useState<SerialPattern[]>([]);
  const [stripPrefixes, setStripPrefixes] = useState<StripPrefix[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await completionService.getSerialPatterns();
      setPatterns(response.data.patterns || []);
      setStripPrefixes(response.data.stripPrefixes || []);
    } catch {
      setMessage({ type: 'error', text: 'Błąd ładowania konfiguracji' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await completionService.setSerialPatterns({ patterns, stripPrefixes });
      setMessage({ type: 'success', text: '✅ Konfiguracja zapisana pomyślnie' });
    } catch {
      setMessage({ type: 'error', text: '❌ Błąd zapisywania konfiguracji' });
    } finally {
      setSaving(false);
    }
  };

  // ---- Patterns CRUD ----
  const addPattern = () => {
    setPatterns(prev => [...prev, { id: generateId(), name: '', pattern: '', description: '' }]);
  };

  const updatePattern = (id: string, field: keyof SerialPattern, value: string) => {
    setPatterns(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePattern = (id: string) => {
    setPatterns(prev => prev.filter(p => p.id !== id));
  };

  // ---- StripPrefixes CRUD ----
  const addStripPrefix = () => {
    setStripPrefixes(prev => [...prev, { id: generateId(), prefix: '', description: '' }]);
  };

  const updateStripPrefix = (id: string, field: keyof StripPrefix, value: string) => {
    setStripPrefixes(prev => prev.map(sp => sp.id === id ? { ...sp, [field]: value } : sp));
  };

  const removeStripPrefix = (id: string) => {
    setStripPrefixes(prev => prev.filter(sp => sp.id !== id));
  };

  // ---- Test input ----
  const runTest = () => {
    if (!testInput.trim()) {
      setTestResult(null);
      return;
    }
    let processed = testInput.trim();

    // Apply strip prefixes
    for (const sp of stripPrefixes) {
      if (sp.prefix && processed.startsWith(sp.prefix)) {
        processed = processed.slice(sp.prefix.length);
        break;
      }
    }

    const errors: string[] = [];
    if (patterns.length > 0) {
      const matched = patterns.some(p => {
        try {
          return new RegExp(p.pattern).test(processed);
        } catch {
          return false;
        }
      });
      if (!matched) errors.push('Nie pasuje do żadnego wzorca');
    }

    if (errors.length === 0) {
      setTestResult(`✅ OK → "${processed}"`);
    } else {
      setTestResult(`❌ Błąd: ${errors.join('; ')} (po przetworzeniu: "${processed}")`);
    }
  };

  const validatePattern = (pattern: string): string | null => {
    if (!pattern) return null;
    try {
      new RegExp(pattern);
      return null;
    } catch (e) {
      return `Nieprawidłowy regex: ${(e as Error).message}`;
    }
  };

  return (
    <div className="serial-settings-page">
      <div className="serial-settings-header">
        <BackButton />
        <div className="serial-settings-title">
          <span>🔢</span>
          <h1>Wzorce numerów seryjnych</h1>
        </div>
      </div>

      {loading && <div className="serial-settings-loading">Ładowanie konfiguracji...</div>}

      {!loading && (
        <div className="serial-settings-body">
          {/* Patterns section */}
          <section className="card serial-section">
            <div className="serial-section-header">
              <h2>📋 Wzorce walidacji SN</h2>
              <p className="serial-section-desc">
                Definiuj wyrażenia regularne (regex) opisujące poprawne numery seryjne.
                Jeśli lista jest pusta, akceptowane są wszystkie wartości.
              </p>
            </div>

            {patterns.length === 0 && (
              <p className="serial-section-empty">Brak wzorców – wszystkie wartości są akceptowane</p>
            )}

            <div className="serial-patterns-list">
              {patterns.map(p => {
                const regexError = validatePattern(p.pattern);
                return (
                  <div key={p.id} className="serial-pattern-row">
                    <div className="serial-pattern-fields">
                      <div className="serial-field">
                        <label>Nazwa wzorca</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="np. Format producenta A"
                          value={p.name}
                          onChange={e => updatePattern(p.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="serial-field serial-field-pattern">
                        <label>Wyrażenie regularne (regex)</label>
                        <input
                          type="text"
                          className={`input${regexError ? ' input-error' : ''}`}
                          placeholder="np. ^[A-Z]{2}\d{6}$"
                          value={p.pattern}
                          onChange={e => updatePattern(p.id, 'pattern', e.target.value)}
                        />
                        {regexError && <span className="field-error">{regexError}</span>}
                      </div>
                      <div className="serial-field">
                        <label>Opis (opcjonalnie)</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="np. 2 litery + 6 cyfr"
                          value={p.description || ''}
                          onChange={e => updatePattern(p.id, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      className="btn serial-remove-row-btn"
                      onClick={() => removePattern(p.id)}
                      title="Usuń wzorzec"
                    >
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>

            <button className="btn btn-secondary" onClick={addPattern}>
              + Dodaj wzorzec
            </button>
          </section>

          {/* Strip prefixes section */}
          <section className="card serial-section">
            <div className="serial-section-header">
              <h2>✂️ Eliminacja prefiksów</h2>
              <p className="serial-section-desc">
                Definiuj prefiksy do automatycznego usunięcia ze zeskanowanego kodu przed walidacją.
                Przykład: kod <code>%ABC123456</code> z prefiksem <code>%</code> da wynik <code>ABC123456</code>.
              </p>
            </div>

            {stripPrefixes.length === 0 && (
              <p className="serial-section-empty">Brak prefiksów do usuwania</p>
            )}

            <div className="serial-patterns-list">
              {stripPrefixes.map(sp => (
                <div key={sp.id} className="serial-pattern-row">
                  <div className="serial-pattern-fields">
                    <div className="serial-field">
                      <label>Prefiks do usunięcia</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="np. % lub GS1:"
                        value={sp.prefix}
                        onChange={e => updateStripPrefix(sp.id, 'prefix', e.target.value)}
                      />
                    </div>
                    <div className="serial-field">
                      <label>Opis (opcjonalnie)</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="np. Prefiks producenta X"
                        value={sp.description || ''}
                        onChange={e => updateStripPrefix(sp.id, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    className="btn serial-remove-row-btn"
                    onClick={() => removeStripPrefix(sp.id)}
                    title="Usuń prefiks"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>

            <button className="btn btn-secondary" onClick={addStripPrefix}>
              + Dodaj prefiks
            </button>
          </section>

          {/* Test section */}
          <section className="card serial-section">
            <div className="serial-section-header">
              <h2>🧪 Test konfiguracji</h2>
              <p className="serial-section-desc">Przetestuj czy podany numer seryjny przejdzie walidację z aktualną konfiguracją (bez zapisywania).</p>
            </div>
            <div className="serial-test-row">
              <input
                type="text"
                className="input serial-test-input"
                placeholder="Wpisz lub zeskanuj numer seryjny..."
                value={testInput}
                onChange={e => { setTestInput(e.target.value); setTestResult(null); }}
                onKeyDown={e => { if (e.key === 'Enter') runTest(); }}
              />
              <button className="btn btn-primary" onClick={runTest}>Testuj</button>
            </div>
            {testResult && (
              <div className={`serial-test-result${testResult.startsWith('✅') ? ' ok' : ' fail'}`}>
                {testResult}
              </div>
            )}
          </section>

          {/* Save message */}
          {message && (
            <div className={`serial-settings-msg${message.type === 'error' ? ' error' : ' success'}`}>
              {message.text}
            </div>
          )}

          {/* Save button */}
          <div className="serial-settings-actions">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '⏳ Zapisuje...' : '💾 Zapisz konfigurację'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
