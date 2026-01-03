import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BackButton.css';

interface BackButtonProps {
  to?: string;
  label?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ to, label = 'Powrót' }) => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };
  
  return (
    <button className="back-button" onClick={handleBack}>
      ← {label}
    </button>
  );
};
