// src/components/admin/AddRoleModal.tsx
// Modal for adding new roles with permissions checkboxes

import React, { useState } from 'react';
import './AddRoleModal.css';

interface PermissionModule {
  name: string;
  displayName: string;
  actions: string[];
}

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: { name: string; description: string; permissions: any }) => void;
  permissionsSchema: PermissionModule[];
}

export const AddRoleModal: React.FC<AddRoleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  permissionsSchema,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<any>({});
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePermissionToggle = (moduleName: string, action: string) => {
    setPermissions((prev: any) => {
      const modulePerms = prev[moduleName] || {};
      const newModulePerms = {
        ...modulePerms,
        [action]: !modulePerms[action],
      };
      return {
        ...prev,
        [moduleName]: newModulePerms,
      };
    });
  };

  const isPermissionChecked = (moduleName: string, action: string): boolean => {
    return permissions[moduleName]?.[action] === true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Nazwa roli jest wymagana');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      permissions,
    });

    // Reset form
    setName('');
    setDescription('');
    setPermissions({});
    setError('');
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setPermissions({});
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Dodaj nową rolę</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label className="label">Nazwa roli *</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. viewer, editor"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Opis</label>
              <input
                type="text"
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="np. Podgląd - read-only"
              />
            </div>

            <div className="form-group">
              <label className="label">Uprawnienia</label>
              <div className="permissions-list">
                {permissionsSchema.map((module) => (
                  <div key={module.name} className="permission-module">
                    <h4 className="module-title">{module.displayName}</h4>
                    <div className="permission-actions">
                      {module.actions.map((action) => (
                        <label key={action} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={isPermissionChecked(module.name, action)}
                            onChange={() =>
                              handlePermissionToggle(module.name, action)
                            }
                          />
                          <span>{action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary">
              💾 Zapisz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
