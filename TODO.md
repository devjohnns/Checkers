# TODO: Multiplayer Checkers Game Implementation

## Phase 1: Backend Changes (app.py) ✅
- [x] 1.1 Add rooms dictionary to store game states by room code
- [x] 1.2 Add room code generation function
- [x] 1.3 Add route for creating new room (/create)
- [x] 1.4 Add route for joining existing room (/join/<code>)
- [x] 1.5 Modify /game route to accept room code parameter
- [x] 1.6 Update move logic to use room-based storage
- [x] 1.7 Add route to get game state via AJAX (/gameState/<room_code>)

## Phase 2: Frontend Changes (templates)
- [x] 2.1 Update index.html with create/join room options
- [x] 2.2 Update game.html to show room code
- [x] 2.3 Add player color assignment (Host=green, Joiner=white)

## Phase 3: JavaScript Updates (static/js/game.js)
- [x] 3.1 Added room code handling (via Jinja templates)
- [x] 3.2 Add polling for game state updates
- [x] 3.3 Add player color display
- [x] 3.4 Handle waiting for opponent state

## Phase 4: CSS Updates (style.css)
- [x] 4.1 Add room info styling
- [x] 4.2 Add player badge styling
- [x] 4.3 Add share info styling

## COMPLETED - How to Play:
1. Run the Flask app: `python app.py`
2. Open browser to http://localhost:5000
3. Click "Create Room" to start a new game
4. Share the 6-character room code with your friend
5. Friend opens http://localhost:5000 and clicks "Join Game"
6. Friend enters the room code and clicks "Join"
7. Both players can now play checkers together!

