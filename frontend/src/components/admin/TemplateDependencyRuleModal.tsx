// src/components/admin/TemplateDependencyRuleModal.tsx
// Modal for creating/editing BOM template dependency rules

import React, { useState } from 'react';
import bomTemplateDependencyRuleService from '../../services/bomTemplateDependencyRule.service';
import type {
  BomTemplateDependencyRule,
  BomTemplateDependencyRuleInput,
  BomTemplateDependencyRuleCondition,
  CreateRuleDto
} from '../../services/bomTemplateDependencyRule.service';
import type { BomSubsystemTemplateItem } from '../../services/bomSubsystemTemplate.service';
import '../../styles/grover-theme.css';

interface TemplateDependencyRuleModalProps {
  templateId: number;
  templateItems: BomSubsystemTemplateItem[];
  existingRules: BomTemplateDependencyRule[];
  rule?: BomTemplateDependencyRule;
  onClose: () => void;
  onSuccess: () => void;
}

export const TemplateDependencyRuleModal: React.FC<TemplateDependencyRuleModalProps> = ({
  templateId,
  templateItems,
  existingRules,
  rule,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Form state
  const [ruleName, setRuleName] = useState(rule?.ruleName || '');
  const [ruleCode, setRuleCode] = useState(rule?.ruleCode || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [evaluationOrder, setEvaluationOrder] = useState(rule?.evaluationOrder || 1);
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [aggregationType, setAggregationType] = useState<string>(rule?.aggregationType || 'SUM');
  const [mathOperation, setMathOperation] = useState<string>(rule?.mathOperation || 'NONE');
  const [mathOperand, setMathOperand] = useState<number | ''>(rule?.mathOperand || '');
  const [targetItemId, setTargetItemId] = useState<number | ''>(rule?.targetItemId || '');
  const [storageDaysParam, setStorageDaysParam] = useState<string>(rule?.storageDaysParam || 'recordingDays');
  const [storageBitrateMbps, setStorageBitrateMbps] = useState<number>(rule?.storageBitrateMbps ?? 4.0);
  
  const [inputs, setInputs] = useState<BomTemplateDependencyRuleInput[]>(
    rule?.inputs || []
  );
  
  const [conditions, setConditions] = useState<BomTemplateDependencyRuleCondition[]>(
    rule?.conditions || []
  );

  const handleAddInput = () => {
    setInputs([
      ...inputs,
      {
        inputType: 'ITEM',
        sourceItemId: null,
        sourceRuleId: null,
        onlyIfSelected: false,
        inputMultiplier: 1,
        sortOrder: inputs.length
      }
    ]);
  };

  const handleUpdateInput = (index: number, field: keyof BomTemplateDependencyRuleInput, value: any) => {
    const updated = [...inputs];
    updated[index] = { ...updated[index], [field]: value };
    
    // Reset source IDs when changing input type
    if (field === 'inputType') {
      if (value === 'ITEM') {
        updated[index].sourceRuleId = null;
      } else {
        updated[index].sourceItemId = null;
      }
    }
    
    setInputs(updated);
  };

  const handleRemoveInput = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        conditionOrder: conditions.length,
        comparisonOperator: '>',
        compareValue: 0,
        compareValueMax: null,
        resultValue: 0,
        description: ''
      }
    ]);
  };

  const handleUpdateCondition = (index: number, field: keyof BomTemplateDependencyRuleCondition, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const validateForm = (): string | null => {
    if (!ruleName.trim()) return 'Nazwa reguły jest wymagana';
    if (!targetItemId) return 'Należy wybrać pozycję docelową';
    if (inputs.length === 0) return 'Należy dodać co najmniej jedno wejście';
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      if (input.inputType === 'ITEM' && !input.sourceItemId) {
        return `Wejście ${i + 1}: Należy wybrać pozycję źródłową`;
      }
      if (input.inputType === 'RULE_RESULT' && !input.sourceRuleId) {
        return `Wejście ${i + 1}: Należy wybrać regułę źródłową`;
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data: CreateRuleDto = {
        templateId,
        ruleName,
        ruleCode: ruleCode || undefined,
        description: description || undefined,
        evaluationOrder,
        aggregationType,
        mathOperation,
        mathOperand: mathOperand || undefined,
        targetItemId: Number(targetItemId),
        isActive,
        storageDaysParam: mathOperation === 'CALCULATE_STORAGE' ? storageDaysParam : undefined,
        storageBitrateMbps: mathOperation === 'CALCULATE_STORAGE' ? storageBitrateMbps : undefined,
        inputs: inputs.map(input => ({
          inputType: input.inputType,
          sourceItemId: input.sourceItemId || undefined,
          sourceRuleId: input.sourceRuleId || undefined,
          onlyIfSelected: input.onlyIfSelected,
          inputMultiplier: input.inputMultiplier,
          sortOrder: input.sortOrder
        })),
        conditions: conditions.map(condition => ({
          conditionOrder: condition.conditionOrder,
          comparisonOperator: condition.comparisonOperator,
          compareValue: condition.compareValue,
          compareValueMax: condition.compareValueMax || undefined,
          resultValue: condition.resultValue,
          description: condition.description || undefined
        }))
      };

      if (rule) {
        await bomTemplateDependencyRuleService.updateRule(rule.id, data);
      } else {
        await bomTemplateDependencyRuleService.createRule(data);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Błąd podczas zapisywania reguły:', err);
      setError(err.response?.data?.message || 'Błąd podczas zapisywania reguły');
    } finally {
      setLoading(false);
    }
  };

  const formatItemLabel = (item: BomSubsystemTemplateItem) => {
    return `[${item.sortOrder}]. ${item.materialName} (${item.groupName})`;
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
        padding: '20px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '30px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
              {rule ? '✏️ Edytuj regułę zależności' : '➕ Dodaj regułę zależności'}
            </h2>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '6px 12px' }}
            >
              ✕
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: '12px',
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: 'var(--radius-md)',
                color: '#c00',
                marginBottom: '20px'
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div
            style={{
              padding: '20px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px'
            }}
          >
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '15px', fontSize: '16px' }}>
              1️⃣ Podstawowe informacje
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label className="label">Nazwa reguły *</label>
                <input
                  type="text"
                  className="input"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Kod reguły</label>
                <input
                  type="text"
                  className="input"
                  value={ruleCode}
                  onChange={(e) => setRuleCode(e.target.value)}
                  placeholder="np. RULE_001"
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label className="label">Opis</label>
              <textarea
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Opcjonalny opis reguły..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label className="label">Kolejność wykonania</label>
                <input
                  type="number"
                  className="input"
                  value={evaluationOrder}
                  onChange={(e) => setEvaluationOrder(Number(e.target.value))}
                  min={1}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '28px' }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <label htmlFor="isActive" style={{ color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Reguła aktywna
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Inputs */}
          <div
            style={{
              padding: '20px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '16px' }}>
                2️⃣ Wejścia
              </h3>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddInput}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                ➕ Dodaj wejście
              </button>
            </div>

            {inputs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                Brak wejść. Kliknij "Dodaj wejście" aby dodać pierwsze wejście.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {inputs.map((input, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'grid',
                      gridTemplateColumns: '120px 2fr 100px 100px auto',
                      gap: '10px',
                      alignItems: 'end'
                    }}
                  >
                    <div>
                      <label className="label" style={{ fontSize: '11px' }}>Typ</label>
                      <select
                        className="input"
                        value={input.inputType}
                        onChange={(e) => handleUpdateInput(idx, 'inputType', e.target.value)}
                        style={{ fontSize: '13px', padding: '6px' }}
                      >
                        <option value="ITEM">Pozycja</option>
                        <option value="RULE_RESULT">Wynik reguły</option>
                      </select>
                    </div>

                    <div>
                      <label className="label" style={{ fontSize: '11px' }}>
                        {input.inputType === 'ITEM' ? 'Pozycja źródłowa *' : 'Reguła źródłowa *'}
                      </label>
                      {input.inputType === 'ITEM' ? (
                        <select
                          className="input"
                          value={input.sourceItemId || ''}
                          onChange={(e) => handleUpdateInput(idx, 'sourceItemId', Number(e.target.value))}
                          style={{ fontSize: '13px', padding: '6px' }}
                        >
                          <option value="">-- Wybierz pozycję --</option>
                          {templateItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {formatItemLabel(item)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="input"
                          value={input.sourceRuleId || ''}
                          onChange={(e) => handleUpdateInput(idx, 'sourceRuleId', Number(e.target.value))}
                          style={{ fontSize: '13px', padding: '6px' }}
                        >
                          <option value="">-- Wybierz regułę --</option>
                          {existingRules
                            .filter(r => !rule || r.id !== rule.id)
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.ruleName}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="label" style={{ fontSize: '11px' }}>Mnożnik</label>
                      <input
                        type="number"
                        className="input"
                        value={input.inputMultiplier}
                        onChange={(e) => handleUpdateInput(idx, 'inputMultiplier', Number(e.target.value))}
                        step={0.1}
                        style={{ fontSize: '13px', padding: '6px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '8px' }}>
                      <input
                        type="checkbox"
                        id={`onlyIfSelected-${idx}`}
                        checked={input.onlyIfSelected}
                        onChange={(e) => handleUpdateInput(idx, 'onlyIfSelected', e.target.checked)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <label
                        htmlFor={`onlyIfSelected-${idx}`}
                        style={{ fontSize: '11px', marginLeft: '5px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        Tylko jeśli wybrany
                      </label>
                    </div>

                    <div style={{ paddingBottom: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleRemoveInput(idx)}
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Aggregation & Math */}
          <div
            style={{
              padding: '20px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px'
            }}
          >
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '15px', fontSize: '16px' }}>
              3️⃣ Agregacja i obliczenia
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label className="label">Typ agregacji</label>
                <select
                  className="input"
                  value={aggregationType}
                  onChange={(e) => setAggregationType(e.target.value)}
                >
                  <option value="SUM">Suma</option>
                  <option value="COUNT">Liczba</option>
                  <option value="MIN">Minimum</option>
                  <option value="MAX">Maksimum</option>
                  <option value="PRODUCT">Iloczyn</option>
                  <option value="FIRST">Pierwsza wartość</option>
                  <option value="SELECT_RECORDER">Wybierz rejestrator</option>
                  <option value="SELECT_DISKS">Dobierz dyski</option>
                </select>
              </div>

              <div>
                <label className="label">Operacja matematyczna</label>
                <select
                  className="input"
                  value={mathOperation}
                  onChange={(e) => setMathOperation(e.target.value)}
                >
                  <option value="NONE">Brak</option>
                  <option value="FLOOR_DIV">Dzielenie z zaokr. w dół</option>
                  <option value="MODULO">Modulo</option>
                  <option value="ADD">Dodawanie</option>
                  <option value="SUBTRACT">Odejmowanie</option>
                  <option value="MULTIPLY">Mnożenie</option>
                  <option value="CEIL_DIV">Dzielenie z zaokr. w górę</option>
                  <option value="ROUND_DIV">Dzielenie z zaokr.</option>
                  <option value="CALCULATE_STORAGE">Oblicz pojemność dysków</option>
                </select>
              </div>

              <div>
                <label className="label">Argument operacji</label>
                <input
                  type="number"
                  className="input"
                  value={mathOperand}
                  onChange={(e) => setMathOperand(e.target.value ? Number(e.target.value) : '')}
                  step={0.1}
                  disabled={mathOperation === 'NONE' || mathOperation === 'CALCULATE_STORAGE'}
                  placeholder={mathOperation === 'NONE' || mathOperation === 'CALCULATE_STORAGE' ? 'N/A' : '0'}
                />
              </div>
            </div>

            {mathOperation === 'CALCULATE_STORAGE' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <div>
                  <label className="label">Parametr dni nagrywania</label>
                  <input
                    type="text"
                    className="input"
                    value={storageDaysParam}
                    onChange={(e) => setStorageDaysParam(e.target.value)}
                    placeholder="recordingDays"
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    Nazwa parametru konfiguracji (domyślnie: recordingDays)
                  </small>
                </div>
                <div>
                  <label className="label">Bitrate (Mbps)</label>
                  <input
                    type="number"
                    className="input"
                    value={storageBitrateMbps}
                    onChange={(e) => setStorageBitrateMbps(Number(e.target.value))}
                    step={0.5}
                    min={0.1}
                    placeholder="4.0"
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    Przepustowość na kamerę w Mbps (domyślnie: 4.0)
                  </small>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Conditions */}
          <div
            style={{
              padding: '20px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '16px' }}>
                4️⃣ Warunki (opcjonalnie)
              </h3>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddCondition}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                ➕ Dodaj warunek
              </button>
            </div>

            {conditions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                Brak warunków. Wynik agregacji będzie użyty bezpośrednio.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {conditions.map((condition, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'grid',
                      gridTemplateColumns: '100px 100px 100px 100px 2fr auto',
                      gap: '10px',
                      alignItems: 'end'
                    }}
                  >
                    <div>
                      <label className="label" style={{ fontSize: '11px' }}>Operator</label>
                      <select
                        className="input"
                        value={condition.comparisonOperator}
                        onChange={(e) => handleUpdateCondition(idx, 'comparisonOperator', e.target.value)}
                        style={{ fontSize: '13px', padding: '6px' }}
                      >
                        <option value=">">{'>'}</option>
                        <option value="<">{'<'}</option>
                        <option value=">=">{'>='}</option>
                        <option value="<=">{'<='}</option>
                        <option value="==">{'=='}</option>
                        <option value="!=">{'!='}</option>
                        <option value="BETWEEN">BETWEEN</option>
                      </select>
                    </div>

                    <div>
                      <label className="label" style={{ fontSize: '11px' }}>Wartość</label>
                      <input
                        type="number"
                        className="input"
                        value={condition.compareValue}
                        onChange={(e) => handleUpdateCondition(idx, 'compareValue', Number(e.target.value))}
                        step={0.1}
                        style={{ fontSize: '13px', padding: '6px' }}
                      />
                    </div>

                    {condition.comparisonOperator === 'BETWEEN' && (
                      <div>
                        <label className="label" style={{ fontSize: '11px' }}>Max</label>
                        <input
                          type="number"
                          className="input"
                          value={condition.compareValueMax || ''}
                          onChange={(e) => handleUpdateCondition(idx, 'compareValueMax', e.target.value ? Number(e.target.value) : null)}
                          step={0.1}
                          style={{ fontSize: '13px', padding: '6px' }}
                        />
                      </div>
                    )}

                    <div>
                      <label className="label" style={{ fontSize: '11px' }}>Wynik</label>
                      <input
                        type="number"
                        className="input"
                        value={condition.resultValue}
                        onChange={(e) => handleUpdateCondition(idx, 'resultValue', Number(e.target.value))}
                        step={0.1}
                        style={{ fontSize: '13px', padding: '6px' }}
                      />
                    </div>

                    <div>
                      <label className="label" style={{ fontSize: '11px' }}>Opis</label>
                      <input
                        type="text"
                        className="input"
                        value={condition.description || ''}
                        onChange={(e) => handleUpdateCondition(idx, 'description', e.target.value)}
                        placeholder="np. dla 1-2 kamer"
                        style={{ fontSize: '13px', padding: '6px' }}
                      />
                    </div>

                    <div style={{ paddingBottom: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleRemoveCondition(idx)}
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Target Item */}
          <div
            style={{
              padding: '20px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px'
            }}
          >
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '15px', fontSize: '16px' }}>
              5️⃣ Pozycja docelowa
            </h3>

            <div>
              <label className="label">Wybierz pozycję, której ilość będzie obliczana *</label>
              <select
                className="input"
                value={targetItemId}
                onChange={(e) => setTargetItemId(Number(e.target.value))}
                required
              >
                <option value="">-- Wybierz pozycję docelową --</option>
                {templateItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatItemLabel(item)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '⏳ Zapisywanie...' : rule ? '💾 Zapisz zmiany' : '➕ Utwórz regułę'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
