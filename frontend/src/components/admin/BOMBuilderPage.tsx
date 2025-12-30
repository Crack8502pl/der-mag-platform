// src/components/admin/BOMBuilderPage.tsx
// BOM Builder page - manage materials and BOM templates

import React from 'react';
import { useNavigate } from 'react-router-dom';

export const BOMBuilderPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bom-builder-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/admin')}>
          ← Powrót
        </button>
        <h1>BOM Builder</h1>
        <p className="subtitle">Zarządzaj materiałami i szablonami BOM</p>
      </div>

      <div className="coming-soon">
        <div className="icon">📦</div>
        <h2>Funkcja w budowie</h2>
        <p>BOM Builder będzie dostępny wkrótce.</p>
        <p className="features">Funkcje:</p>
        <ul>
          <li>Lista wszystkich materiałów z filtrowaniem/wyszukiwaniem</li>
          <li>Dodawanie nowych materiałów (formularz)</li>
          <li>Edycja istniejących materiałów (modal)</li>
          <li>Usuwanie materiałów (soft delete z potwierdzeniem)</li>
          <li>Przypisywanie materiałów do typów zadań</li>
          <li>Kopiowanie szablonów BOM między typami zadań</li>
        </ul>
      </div>

      <style>{`
        .bom-builder-page {
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
