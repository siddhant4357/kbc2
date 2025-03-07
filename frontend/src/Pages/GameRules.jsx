// frontend/src/Pages/GameRules.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import kbcLogo from '../assets/kbc-logo.jpg';
import themeAudio from '../assets/kbc_theme.wav';
import questionTune from '../assets/kbc_option_lock_tune.wav';

const RestartSoundButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-4 right-4 kbc-button w-12 h-12 flex items-center justify-center text-xl rounded-full shadow-glow z-50"
    title="Restart Sound"
  >
    🔄
  </button>
);

const GameRules = () => {
  const { bankId } = useParams();
  const navigate = useNavigate();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Add rotation animation state
  const [rotation, setRotation] = useState(0);

  // Create a single audio context to manage all sounds
  const [audioContext] = useState(() => {
    try {
      return new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API not supported");
      return null;
    }
  });

  // Simplify audio states
  const [themeSound] = useState(() => {
    const audio = new Audio(themeAudio);
    audio.volume = 0.5; // Set default volume
    return audio;
  });

  const [questionSound] = useState(() => {
    const audio = new Audio(questionTune);
    audio.volume = 0.5; // Set default volume
    return audio;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Add state for user interaction
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const [isSoundPaused, setIsSoundPaused] = useState(false);

  // Create rotation effect
  useEffect(() => {
    const rotationInterval = setInterval(() => {
      setRotation(prev => (prev + 1) % 360);
    }, 50);

    return () => clearInterval(rotationInterval);
  }, []);

  // Add preload check effect
  useEffect(() => {
    const preloadAudio = async () => {
      try {
        await Promise.all([
          new Promise(resolve => {
            themeSound.addEventListener('canplaythrough', resolve, { once: true });
            themeSound.load();
          }),
          new Promise(resolve => {
            questionSound.addEventListener('canplaythrough', resolve, { once: true });
            questionSound.load();
          })
        ]);
        setIsLoading(false);
      } catch (error) {
        console.error("Error preloading audio:", error);
        setIsLoading(false);
      }
    };

    preloadAudio();
  }, [themeSound, questionSound]);

  // Modified theme music effect
  useEffect(() => {
    if (hasUserInteracted) {
      const initAudio = async () => {
        try {
          if (themeSound.paused) {
            themeSound.loop = true;
            await themeSound.play();
          }
        } catch (error) {
          console.error("Error playing theme sound:", error);
          setIsSoundPaused(true);
        }
      };

      initAudio();

      return () => {
        themeSound.pause();
        themeSound.currentTime = 0;
      };
    }
  }, [hasUserInteracted, themeSound]);

  // Add visibility change effect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (themeSound) {
          themeSound.pause();
          themeSound.currentTime = 0;
        }
        if (questionSound) {
          questionSound.pause();
          questionSound.currentTime = 0;
        }
        setIsSoundPaused(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [themeSound, questionSound]);

  // Add a click event listener to the document
  useEffect(() => {
    const handleClick = async () => {
      if (audioContext?.state === 'suspended') {
        await audioContext.resume();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [audioContext]);

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

  // Modified handleStartGame function
  const handleStartGame = async () => {
    try {
      // Stop theme music
      themeSound.pause();
      themeSound.currentTime = 0;
      
      // Play question tune before navigation
      await questionSound.play();
      questionSound.onended = () => {
        navigate(`/join-questions/${bankId}`);
      };
    } catch (error) {
      console.error("Error playing question sound:", error);
      navigate(`/join-questions/${bankId}`);
    }
  };

  // Add restart sound handler
  const handleRestartSound = async () => {
    if (themeSound) {
      themeSound.pause();
      themeSound.currentTime = 0;
      themeSound.volume = 0.5;
      try {
        await themeSound.play();
        themeSound.loop = true;
        setIsSoundPaused(false);
      } catch (error) {
        console.error("Error restarting sound:", error);
      }
    }
  };

  // Add loading state to UI
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-kbc-dark-blue to-kbc-purple flex items-center justify-center">
        <div className="text-kbc-gold text-xl">Loading game resources...</div>
      </div>
    );
  }

  // Add this inside your JSX, after the rules section and before the Start Game button
 

  // Add an interaction handler component
  const handleStartExperience = async () => {
    try {
      // Create a temporary silent audio context to unlock audio
      const unlockAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      await unlockAudioContext.resume();
      
      // Try to play theme sound
      await themeSound.play();
      themeSound.loop = true;
      setHasUserInteracted(true);
    } catch (error) {
      console.error("Error starting audio:", error);
      // Even if audio fails, allow user to proceed
      setHasUserInteracted(true);
    }
  };

  // Update the InteractionPrompt component
  const InteractionPrompt = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="kbc-card p-8 text-center max-w-md mx-4">
        <h2 className="text-2xl text-kbc-gold mb-4">Welcome to KBC</h2>
        <p className="text-white mb-6">Click the button below to start your experience</p>
        <button 
          onClick={handleStartExperience}
          className="kbc-button1 animate-pulse"
        >
          Start Experience
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-kbc-dark-blue to-kbc-purple p-4 sm:p-8">
      {!hasUserInteracted && <InteractionPrompt />}
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

      {/* Add restart sound button */}
      {isSoundPaused && (
        <RestartSoundButton onClick={handleRestartSound} />
      )}
    </div>
  );
};

export default GameRules;