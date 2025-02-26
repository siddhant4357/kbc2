import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';


// Add prize levels (from lowest to highest)
const PRIZE_LEVELS = [
  "₹1,000",
  "₹2,000",
  "₹3,000",
  "₹5,000",
  "₹10,000",
  "₹20,000",
  "₹40,000",
  "₹80,000",
  "₹1,60,000",
  "₹3,20,000",
  "₹6,40,000",
  "₹12,50,000",
  "₹25,00,000",
  "₹50,00,000",
  "₹1,00,00,000"
];

const JoinQuestions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questionBank, setQuestionBank] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerDuration, setTimerDuration] = useState(15);
  const [timerStarted, setTimerStarted] = useState(false);
  const [lockedAnswer, setLockedAnswer] = useState(null);
  const [showGameEndPopup, setShowGameEndPopup] = useState(false);
  const [gameEndMessage, setGameEndMessage] = useState('');
  const [redirectTimer, setRedirectTimer] = useState(5);
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
  const [lifelines, setLifelines] = useState({
    fiftyFifty: true,
    phoneAFriend: true,
    askAudience: true
  });
  const [customTimerInput, setCustomTimerInput] = useState(15);
  const [timeExpired, setTimeExpired] = useState(false);
  const [continuePlaying, setContinuePlaying] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [isTimerStopped, setIsTimerStopped] = useState(false);

  useEffect(() => {
    const fetchQuestionBank = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/questionbanks/${id}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch question bank');
        }
        
        const data = await response.json();
        setQuestionBank(data);
      } catch (error) {
        setError('Failed to load questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionBank();
  }, [id]);

  useEffect(() => {
    let timer;
    if (timerStarted && timeLeft > 0 && !isTimerStopped) { // Add check for isTimerStopped
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !lockedAnswer && !isTimerStopped) { // Also check here
      setTimeExpired(true);
      setTimerStarted(false);
      setShowAnswer(true);
    }

    return () => clearInterval(timer);
  }, [timerStarted, timeLeft, lockedAnswer, isTimerStopped]);

  useEffect(() => {
    let timer;
    if (showGameEndPopup && redirectTimer > 0) {
      timer = setInterval(() => {
        setRedirectTimer(prev => prev - 1);
      }, 1000);
    } else if (redirectTimer === 0) {
      navigate('/dashboard');
    }
    return () => clearInterval(timer);
  }, [showGameEndPopup, redirectTimer, navigate]);

  const handleShowOptions = () => {
    setTimeLeft(customTimerInput);
    setTimerDuration(customTimerInput);
    setShowOptions(true);
    setTimerStarted(true);
  };

  const handleOptionSelect = (option) => {
    // Remove the negative condition that was causing the issue
    if (!showAnswer && !lockedAnswer && timeLeft > 0) {
      setSelectedOption(option);
    }
  };

  // Modify the handleLockAnswer function
  const handleLockAnswer = () => {
    if (selectedOption && !lockedAnswer && !showAnswer && timeLeft > 0) {
      setLockedAnswer(selectedOption);
      setTimerStarted(false);
      setShowAnswer(true);
      
      if (selectedOption !== currentQuestion.correctAnswer) {
        setTimeExpired(false); // Don't set timeExpired for wrong answers
      }
    }
  };

  const confirmLockAnswer = () => {
    setLockedAnswer(selectedOption);
    setTimerStarted(false);
    setShowAnswer(true);
    
    if (selectedOption !== currentQuestion.correctAnswer) {
      setGameEndMessage('Better luck next time!');
      setShowGameEndPopup(true);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questionBank.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowOptions(false);
      setSelectedOption(null);
      setShowAnswer(false);
      setTimerStarted(false);
      setTimeLeft(timerDuration);
      setLockedAnswer(null);
      setTimeExpired(false);
      setContinuePlaying(false);
      setHiddenOptions([]);
      setIsTimerStopped(false); // Reset timer stopped state
    } else if (lockedAnswer === currentQuestion.correctAnswer) {
      setGameEndMessage('Congratulations! You have successfully completed the game! 🎉');
      setShowGameEndPopup(true);
    }
  };

  const handleLifeline = (lifeline) => {
    setLifelines(prev => ({
      ...prev,
      [lifeline]: false
    }));
    
    // Handle 50:50 lifeline specifically
    if (lifeline === 'fiftyFifty' && currentQuestion) {
      // Get all incorrect options
      const incorrectOptions = currentQuestion.options.filter(
        option => option !== currentQuestion.correctAnswer
      );
      
      // Randomly select two incorrect options to hide
      const shuffled = [...incorrectOptions].sort(() => 0.5 - Math.random());
      const optionsToHide = shuffled.slice(0, 2);
      
      // Set these options as hidden
      setHiddenOptions(optionsToHide);
    }
  };

  const handleContinuePlaying = () => {
    setContinuePlaying(true);
  };

  const handleEndGame = () => {
    // Show different message if completed all questions successfully
    const isGameCompleted = currentQuestionIndex === questionBank.questions.length - 1 
      && lockedAnswer === currentQuestion.correctAnswer;

    setGameEndMessage(
      isGameCompleted 
        ? 'Congratulations! You have successfully completed the game! 🎉' 
        : 'Thank you for playing this game!'
    );
    setShowGameEndPopup(true);
  };

  const formatTime = (seconds) => {
    return seconds.toString().padStart(2, '0');
  };

  const handleBackClick = (e) => {
    e.preventDefault();
    setShowQuitConfirm(true);
  };

  const handleQuitGame = () => {
    navigate('/dashboard');
  };

  if (loading) return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="text-kbc-gold">Loading...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-500 bg-opacity-20 text-red-100 p-4 rounded mb-4">
          {error}
        </div>
        <BackButton to="/join-game" />
      </div>
    </div>
  );

  const currentQuestion = questionBank?.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-b from-kbc-dark-blue to-kbc-purple">
      {/* Header with better responsiveness for mobile */}
      <header className="fixed top-0 left-0 right-0 bg-kbc-dark-blue/90 backdrop-blur-sm z-10 p-2 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          {/* Left section: Quit button and player info */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackClick}
              className="kbc-button bg-red-600 hover:bg-red-700 text-xs h-8 w-14 sm:px-4"
            >
              QUIT
            </button>
            <div className="hidden sm:block">
              <p className="text-kbc-gold text-xs">Player</p>
              <p className="text-white font-bold text-sm">
                {JSON.parse(localStorage.getItem('user'))?.username}
              </p>
            </div>
          </div>
          
          {/* Center section: Timer controls or timer display - with fixed positioning for mobile */}
          <div className="flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
            {!showOptions ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={customTimerInput}
                  onChange={(e) => setCustomTimerInput(Number(e.target.value))}
                  className="kbc-input w-16 text-xs h-8 py-0.5 px-1"
                  placeholder="Sec"
                />
                <button
                  onClick={handleShowOptions}
                  className="kbc-button1 text-xs h-8 py-0.5 px-2 min-w-0 w-auto"
                >
                  Start
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center absolute left-1/2 transform -translate-x-1/2 gap-4">
                <div className="relative w-12 h-12 sm:w-16 right-15 sm:h-16">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      className="text-kbc-gold"
                      strokeDasharray={`${(timeLeft / timerDuration) * 176} 176`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-base sm:text-xl text-kbc-gold">
                    {isTimerStopped ? '∞' : formatTime(timeLeft)}
                  </span>
                </div>
                <button
                  onClick={() => setIsTimerStopped(true)}
                  disabled={isTimerStopped}
                  className={`kbc-button1 text-xs h-8 py-0.5 px-2 min-w-0 w-auto ${
                    isTimerStopped ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Stop Timer
                </button>
              </div>
            )}
          </div>
          
          {/* Right section: Username for mobile */}
          <div className="block sm:hidden text-right">
            <p className="text-white font-bold text-sm">
              {JSON.parse(localStorage.getItem('user'))?.username}
            </p>
          </div>
        </div>
      </header>

      {/* Main game area - adjusted padding for mobile */}
      <div className="container mx-auto pt-16 sm:pt-24 px-2 sm:px-4 flex flex-col lg:flex-row min-h-screen pb-6">
        {/* Question Box */}
        <div className="flex-1 flex flex-col justify-between min-h-[calc(100vh-8rem)] lg:pr-80 order-2 lg:order-1">
          {/* Mobile Prize and Lifelines Bar - Only visible on mobile/tablet devices, hidden on laptops/desktops */}
          <div className="block lg:hidden flex flex-col space-y-3 mb-4">
            <div className="kbc-question-box lg:hidden p-3 shadow-glow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-kbc-gold">Current Prize</p>
                  <p className="text-lg font-bold text-white">{PRIZE_LEVELS[currentQuestionIndex]}</p>
                </div>
                
                {/* Mobile Lifelines */}
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      onClick={() => handleLifeline('fiftyFifty')}
                      disabled={!lifelines.fiftyFifty}
                      className={`kbc-button w-10 h-10 flex items-center justify-center text-xs ${
                        !lifelines.fiftyFifty ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      50:50
                    </button>
                    {!lifelines.fiftyFifty && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-red-500 text-xl font-bold transform rotate-90">×</span>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => handleLifeline('phoneAFriend')}
                      disabled={!lifelines.phoneAFriend}
                      className={`kbc-button w-10 h-10 flex items-center justify-center text-xs ${
                        !lifelines.phoneAFriend ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      📞
                    </button>
                    {!lifelines.phoneAFriend && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-red-500 text-xl font-bold transform rotate-90">×</span>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => handleLifeline('askAudience')}
                      disabled={!lifelines.askAudience}
                      className={`kbc-button w-10 h-10 flex items-center justify-center text-xs ${
                        !lifelines.askAudience ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      👥
                    </button>
                    {!lifelines.askAudience && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-red-500 text-xl font-bold transform rotate-90">×</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-grow" />
          
          {/* Question container - now separate from options */}
          <div className="kbc-question-box p-4 sm:p-8 shadow-glow mb-6 max-w-3xl mx-auto w-full">
            <h2 className="text-2xl text-kbc-gold mb-6">
              Question {currentQuestionIndex + 1} 
            </h2>
            <p className="text-white text-xl">{currentQuestion.question}</p>
          </div>

          {/* Options container - now with connector lines */}
          {showOptions && (
            <div className="max-w-3xl mx-auto w-full mb-8 relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(option)}
                    className={`kbc-option shadow-glow position-relative ${
                      selectedOption === option ? 'selected' : ''
                    } ${
                      showAnswer && option === currentQuestion.correctAnswer ? 'correct' : ''
                    } ${
                      showAnswer && lockedAnswer === option && 
                      option !== currentQuestion.correctAnswer ? 'incorrect' : ''
                    } ${
                      hiddenOptions.includes(option) ? 'opacity-0 pointer-events-none' : ''
                    }`}
                    disabled={lockedAnswer || showAnswer || timeLeft === 0 || hiddenOptions.includes(option)}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="option-text">{option}</span>
                    
                    {/* Option connector lines - displayed based on position */}
                    <div className={`absolute ${index % 2 === 0 ? 'left-0' : 'right-0'} top-1/2 
                      ${index % 2 === 0 ? 'w-[50vw] right-full bg-gradient-to-l' : 'w-[50vw] left-full bg-gradient-to-r'} 
                      h-0.5 from-kbc-gold to-transparent transform 
                      ${index % 2 === 0 ? '-translate-x-4' : 'translate-x-4'}`}>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lock Answer Button */}
          {selectedOption && !lockedAnswer && !showAnswer && timeLeft > 0 && (
            <div className="text-center max-w-3xl mx-auto w-full mb-8">
              <button
                onClick={handleLockAnswer}
                className="kbc-button1 pulse-animation shadow-glow"
              >
                Lock Final Answer ({formatTime(timeLeft)}s)
              </button>
            </div>
          )}

          {/* Show Result and Next Question Button */}
          {showAnswer && (
            <div className="text-center max-w-3xl mx-auto w-full mb-8 space-y-4">
              {lockedAnswer === currentQuestion.correctAnswer ? (
                <>
                  <p className="text-green-400 text-xl">Correct Answer! 🎉</p>
                  {currentQuestionIndex < questionBank.questions.length - 1 ? (
                    <button
                      onClick={handleNextQuestion}
                      className="kbc-button1 shadow-glow"
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      onClick={handleEndGame}
                      className="kbc-button1 shadow-glow"
                    >
                      End Game
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-red-400 text-xl">
                    {timeExpired ? "Answer not locked before time!" : "Answer is not correct!"} Better luck next time.
                  </p>
                  
                  {currentQuestionIndex === questionBank.questions.length - 1 ? (
                    <button
                      onClick={handleEndGame}
                      className="kbc-button1 bg-red-600 hover:bg-red-700 shadow-glow"
                    >
                      End Game
                    </button>
                  ) : !continuePlaying ? (
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={handleContinuePlaying}
                        className="kbc-button1 shadow-glow"
                      >
                        Continue Playing
                      </button>
                      <button
                        onClick={handleEndGame}
                        className="kbc-button1 bg-red-600 hover:bg-red-700 shadow-glow"
                      >
                        End Game
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-white mb-4">
                        The correct answer was: {currentQuestion.correctAnswer}
                      </p>
                      <button
                        onClick={handleNextQuestion}
                        className="kbc-button1 shadow-glow"
                      >
                        Next Question
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Desktop Prize Ladder - Hide on mobile */}
        <div className="hidden lg:block w-80 ml-6 fixed right-8 top-24 order-1 lg:order-2">
          <div className="kbc-question-box p-3 shadow-glow relative">
            {/* Add connector line from question to prize ladder */}
            <div className="absolute left-0 top-1/2 w-8 h-0.5 bg-gradient-to-l from-kbc-gold to-transparent transform -translate-x-8"></div>
            
            {/* Lifelines - moved above the prize ladder heading */}
            <div className="flex justify-around items-center mb-3">
              <div className="relative">
                <button
                  onClick={() => handleLifeline('fiftyFifty')}
                  disabled={!lifelines.fiftyFifty}
                  className={`kbc-button w-12 h-12 flex items-center justify-center text-xs ${
                    !lifelines.fiftyFifty ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  50:50
                </button>
                {!lifelines.fiftyFifty && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-500 text-3xl font-bold transform rotate-90">×</span>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => handleLifeline('phoneAFriend')}
                  disabled={!lifelines.phoneAFriend}
                  className={`kbc-button w-12 h-12 flex items-center justify-center text-xs ${
                    !lifelines.phoneAFriend ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  📞
                </button>
                {!lifelines.phoneAFriend && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-500 text-3xl font-bold transform rotate-90">×</span>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => handleLifeline('askAudience')}
                  disabled={!lifelines.askAudience}
                  className={`kbc-button w-12 h-12 flex items-center justify-center text-xs ${
                    !lifelines.askAudience ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  👥
                </button>
                {!lifelines.askAudience && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-500 text-3xl font-bold transform rotate-90">×</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Divider */}
            <hr className="my-2 border-kbc-gold/30" />
            
            {/* Prize Ladder - with updated styling */}
            <h3 className="text-kbc-gold text-base font-bold text-center mb-2">Prize Ladder</h3>
            <div className="space-y-0.5 text-sm">
              {PRIZE_LEVELS.map((prize, index) => (
                <div
                  key={prize}
                  className={`py-0.5 px-1 rounded-sm transition-all text-center ${
                    index === currentQuestionIndex
                      ? 'bg-kbc-gold text-kbc-dark-blue font-bold shadow-glow'
                      : index < currentQuestionIndex 
                        ? 'text-white bg-kbc-blue/20'
                        : 'text-kbc-gold'
                  }`}
                >
                  {prize}
                </div>
              )).reverse()}
            </div>
          </div>
        </div>
      </div>

      {/* Game End Popup */}
      {showGameEndPopup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="kbc-card p-4 sm:p-8 max-w-md w-full mx-auto text-center shadow-glow">
            <h2 className="text-2xl font-bold text-kbc-gold mb-4">
              Game Over
            </h2>
            <p className="text-xl text-white mb-6">
              {gameEndMessage}
            </p>
            <p className="text-gray-400">
              Redirecting to dashboard in {redirectTimer} seconds...
            </p>
          </div>
        </div>
      )}

      {/* Quit Confirmation Popup */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="kbc-card p-4 sm:p-8 max-w-md w-full mx-auto text-center shadow-glow">
            <h2 className="text-2xl font-bold text-kbc-gold mb-4">
              Confirm Quit
            </h2>
            <p className="text-xl text-white mb-6">
              Are you sure you want to quit the game?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="kbc-button1"
              >
                Cancel
              </button>
              <button
                onClick={handleQuitGame}
                className="kbc-button1 bg-red-600 hover:bg-red-700"
              >
                Quit Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinQuestions;