# KBC (Kaun Banega Crorepati) Quiz Game

A real-time multiplayer quiz game application inspired by the popular TV show "Kaun Banega Crorepati", built with modern web technologies.

## Features
- Real-time multiplayer gameplay
- Admin and Player roles
- Question bank management
- Live game sessions with timer
- Lifelines (50:50, Phone a Friend, Ask Audience)
- Dynamic prize ladder
- Leaderboard system
- User authentication
- Mobile responsive design

## Tech Stack

### Frontend
- React (v19.0.0)
- Socket.IO Client (v4.8.1)
- TailwindCSS (v4.0.6)
- Vite (v6.1.0)

### Backend
- Node.js (v14+)
- Express (v4.21.2)
- Socket.IO (v4.8.1)
- MongoDB (v4.4+)
- Mongoose (v8.10.1)

## Prerequisites
Before installing, make sure you have:
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- NPM or Yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd KBC2
```

2. Install Backend dependencies:
```bash
cd Backend
npm install
```

3. Create .env file in Backend folder:
```env
PORT=4000
DB_CONNECT=mongodb://0.0.0.0/kbc
```

4. Install Frontend dependencies:
```bash
cd ../frontend
npm install
```

## Running the Application

1. Start MongoDB server:
```bash
mongod
```

2. Start Backend server:
```bash
cd Backend
npm start
```

3. Start Frontend development server:
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure
```
KBC2/
├── Backend/
│   ├── controllers/    # Route controllers
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── utils/         # Helper functions
│   ├── app.js        # Express app setup
│   └── server.js      # Server entry point
└── frontend/
    ├── src/
    │   ├── components/  # Reusable components
    │   ├── Pages/      # Page components
    │   ├── styles/     # CSS styles
    │   └── App.jsx     # Root component
    ├── public/         # Static files
    └── index.html      # Entry HTML file
```

## Game Flow

### Admin Side:
1. Create Question Bank:
   - Set bank name
   - Set 4-digit passcode
   - Add questions with options
   - Mark correct answers

2. Game Control:
   - Start/Stop game
   - Show/hide questions
   - Control timer
   - Reveal options
   - Show correct answers
   - Navigate questions

### Player Side:
1. Join Game:
   - Select question bank
   - Enter bank passcode
   - Enter admin passcode (default: 1234)

2. Gameplay:
   - View questions in real-time
   - Answer within time limit
   - Use lifelines
   - Track prize progress
   - View final score

## API Endpoints

### Authentication
```
POST /api/auth/login     # Login/Register user
GET /api/users          # Get all users (Admin only)
DELETE /api/users       # Delete users (Admin only)
```

### Question Banks
```
GET /api/questionbanks      # Get all banks
POST /api/questionbanks     # Create bank
GET /api/questionbanks/:id  # Get specific bank
PUT /api/questionbanks/:id  # Update bank
```

### Game Management
```
POST /api/game/join        # Join game
POST /api/game/:id/stop    # Stop game
GET /api/game/:id/status   # Get game status
```

## WebSocket Events

### Server Events
```
gameState      # Current game state
questionUpdate # New question data
showOptions    # Show options with timer
showAnswer     # Reveal correct answer
gameStop       # Game end notification
```

### Client Events
```
joinGame       # Join game session
startGame      # Start new game
questionUpdate # Update current question
showOptions    # Show question options
showAnswer     # Show correct answer
answerLocked   # Submit answer
```

## Default Credentials
```
Admin Passcode: 1234 (configurable in JoinGame.jsx)
```

## Contributing
Feel free to submit issues and enhancement requests.

## License
This project is licensed under the MIT License.
