// src/components/admin/MaterialImportPage.tsx
// Material import page - CSV/Excel upload with preview

import React from 'react';
import { useNavigate } from 'react-router-dom';

export const MaterialImportPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="material-import-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/admin')}>
          ← Powrót
        </button>
        <h1>Import materiałów</h1>
        <p className="subtitle">Importuj materiały z plików CSV/Excel</p>
      </div>

      <div className="coming-soon">
        <div className="icon">📥</div>
        <h2>Funkcja w budowie</h2>
        <p>Import materiałów będzie dostępny wkrótce.</p>
        <p className="features">Funkcje:</p>
        <ul>
          <li>Upload plików CSV/Excel (drag & drop)</li>
          <li>Podgląd różnic przed importem</li>
          <li>Walidacja danych</li>
          <li>Historia importów z paginacją</li>
          <li>Pobieranie szablonu CSV</li>
        </ul>
      </div>

      <style>{`
        .material-import-page {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .subtitle {
          color: #7f8c8d;
        }

        .back-button {
          background: none;
          border: none;
          color: #3498db;
          cursor: pointer;
          font-size: 14px;
          margin-bottom: 10px;
          padding: 5px 10px;
        }

        .back-button:hover {
          background: #f0f0f0;
          border-radius: 4px;
        }

        .coming-soon {
          background: white;
          border-radius: 8px;
          padding: 60px 40px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .coming-soon .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .coming-soon h2 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .coming-soon p {
          color: #7f8c8d;
          font-size: 16px;
        }

        .features {
          margin-top: 30px;
          font-weight: 600;
          color: #2c3e50;
        }

        .coming-soon ul {
          list-style: none;
          padding: 0;
          margin-top: 15px;
        }

        .coming-soon li {
          padding: 8px 0;
          color: #7f8c8d;
        }

        .coming-soon li:before {
          content: '✓ ';
          color: #27ae60;
          font-weight: bold;
          margin-right: 8px;
        }
      `}</style>
    </div>
  );
};
