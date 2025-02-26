import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ to, className = '' }) => {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(to)}
      className={`bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors ${className}`}
    >
      Back
    </button>
  );
};

export default BackButton;