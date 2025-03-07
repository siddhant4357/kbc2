// frontend/src/Pages/GameRules.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import kbcLogo from '../assets/kbc-logo.jpg';

const GameRules = () => {
  const { bankId } = useParams();
  const navigate = useNavigate();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Add rotation animation state
  const [rotation, setRotation] = useState(0);

  // Create rotation effect
  useEffect(() => {
    const rotationInterval = setInterval(() => {
      setRotation(prev => (prev + 1) % 360);
    }, 50);

    return () => clearInterval(rotationInterval);
  }, []);

  const rules = [
    {
      title: "Lifelines",
      items: [
        "50:50 - Removes two incorrect options",
        "Phone a Friend - Ask your friend for help",
        "Ask the Audience - See what the audience thinks"
      ]
    },
    {
      title: "Game Rules",
      items: [
        "Answer each question within the time limit",
        "Use lifelines wisely - each can be used only once",
        "Lock your answer to proceed to the next question",
        "Prize money increases with each correct answer",
        "Game ends with a wrong answer or quitting"
      ]
    }
  ];

  const handleStartGame = () => {
    navigate(`/join-questions/${bankId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-kbc-dark-blue to-kbc-purple p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Enhanced Logo Animation */}
        <div className="text-center mb-8 relative">
          <div className="relative w-48 h-48 mx-auto">
            {/* Glowing background effect */}
            <div 
              className="absolute inset-0 rounded-full bg-kbc-gold opacity-20 blur-xl"
              style={{
                animation: 'pulse 2s infinite'
              }}
            />
            
            {/* Rotating rings */}
            <div 
              className="absolute inset-0 border-4 border-kbc-gold rounded-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                animation: 'glow 2s infinite'
              }}
            />
            <div 
              className="absolute inset-0 border-4 border-kbc-light-blue rounded-full"
              style={{
                transform: `rotate(-${rotation}deg)`,
                animation: 'glow 2s infinite alternate'
              }}
            />
            
            {/* Logo image */}
            <img 
              src={kbcLogo}
              alt="KBC Logo"
              className={`w-48 h-48 mx-auto transition-all duration-1000 rounded-full
                ${isAnimationComplete ? 'scale-100 opacity-100' : 'scale-150 opacity-0'}
                mix-blend-luminosity
              `}
              style={{
                filter: 'brightness(1.2) contrast(1.2) drop-shadow(0 0 10px rgba(255,184,0,0.5))',
                animation: isAnimationComplete ? 'float 3s ease-in-out infinite' : 'none'
              }}
              onLoad={() => {
                setTimeout(() => setIsAnimationComplete(true), 100);
              }}
              onError={(e) => {
                console.error("Image failed to load");
                setImageError(true);
                setIsAnimationComplete(true);
              }}
            />
          </div>
        </div>

        {/* Show content regardless of image load state */}
        <div className={`space-y-8 transition-all duration-1000 ${
          isAnimationComplete ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'
        }`}>
          <div className="kbc-card p-6 sm:p-8">
            <h1 className="text-4xl kbc-title text-center mb-8">Welcome to KBC</h1>
            
            {rules.map((section, index) => (
              <div key={index} className="mb-6">
                <h2 className="text-2xl text-kbc-gold mb-4">{section.title}</h2>
                <ul className="space-y-3">
                  {section.items.map((rule, ruleIndex) => (
                    <li key={ruleIndex} className="flex items-start text-white">
                      <span className="text-kbc-gold mr-2">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="mt-8 text-center">
              <button 
                onClick={handleStartGame}
                className="kbc-button1 animate-pulse hover:animate-none"
              >
                Start Game
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRules;