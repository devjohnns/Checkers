let board = [];
let currentPlayer = 'green';
let selected = null;
let winner = null;
let scores = { green: 0, white: 0 };
let gameMode = new URLSearchParams(window.location.search).get('mode');
let roomCode = new URLSearchParams(window.location.search).get('room');
let playerColor = null;
let db = null;

if (gameMode === 'online' && roomCode) {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
    script.onload = () => {
        const dbScript = document.createElement('script');
        dbScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js';
        dbScript.onload = initFirebase;
        document.head.appendChild(dbScript);
    };
    document.head.appendChild(script);
}

function initFirebase() {
    firebase.initializeApp({
        databaseURL: "https://checkers-game-default-rtdb.firebaseio.com/"
    });
    db = firebase.database();
    joinGame();
}

function joinGame() {
    const gameRef = db.ref('games/' + roomCode);
    gameRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            const game = snapshot.val();
            if (!game.player2) {
                playerColor = 'white';
                gameRef.update({ player2: true });
            } else {
                playerColor = 'green';
            }
        } else {
            playerColor = 'green';
            gameRef.set({
                board: createBoard(),
                currentPlayer: 'green',
                scores: { green: 0, white: 0 },
                player1: true,
                player2: false,
                winner: null
            });
        }
        document.getElementById('message').textContent = playerColor === 'green' ? 'You are Green' : 'You are White';
        listenToGame();
    });
}

function listenToGame() {
    db.ref('games/' + roomCode).on('value', (snapshot) => {
        const game = snapshot.val();
        if (game) {
            board = game.board;
            currentPlayer = game.currentPlayer;
            scores = game.scores;
            winner = game.winner;
            document.getElementById('green-score').textContent = scores.green;
            document.getElementById('white-score').textContent = scores.white;
            document.getElementById('current-player').textContent = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
            document.getElementById('current-player').className = `player-${currentPlayer}`;
            if (winner) {
                document.getElementById('status').innerHTML = `<span class="winner">${winner.toUpperCase()} Wins!</span>`;
                document.getElementById('message').innerHTML = 'Game Over - <button onclick="resetGame()" class="btn">Start New Game</button>';
            } else {
                document.getElementById('message').textContent = currentPlayer === playerColor ? 'Your turn' : 'Opponent\'s turn';
            }
            renderBoard();
        }
    });
}

function createBoard() {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) {
                newBoard[row][col] = { color: 'green', king: false };
            }
        }
    }
    for (let row = 5; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) {
                newBoard[row][col] = { color: 'white', king: false };
            }
        }
    }
    return newBoard;
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'board-row';
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            if (selected && selected[0] === row && selected[1] === col) {
                square.classList.add('selected');
            }
            if (!winner) {
                square.onclick = () => handleClick(row, col);
            }
            if (board[row][col]) {
                const piece = document.createElement('div');
                piece.className = `piece ${board[row][col].color} ${board[row][col].king ? 'king' : ''}`;
                piece.textContent = board[row][col].king ? '♔' : '●';
                square.appendChild(piece);
            }
            rowDiv.appendChild(square);
        }
        boardEl.appendChild(rowDiv);
    }
}

function handleClick(row, col) {
    if (gameMode === 'online' && currentPlayer !== playerColor) return;
    if (gameMode === 'ai' && currentPlayer === 'white') return;
    
    if (!selected) {
        if (board[row][col] && board[row][col].color === currentPlayer) {
            selected = [row, col];
            document.getElementById('message').textContent = `Selected piece at: Row ${row + 1}, Col ${col + 1}`;
            renderBoard();
        }
    } else {
        const [fromRow, fromCol] = selected;
        const moveResult = makeMove(fromRow, fromCol, row, col);
        if (moveResult.valid) {
            executeMove(fromRow, fromCol, row, col, moveResult.captured);
        }
        selected = null;
        renderBoard();
    }
}

function executeMove(fromRow, fromCol, toRow, toCol, captured) {
    board[toRow][toCol] = board[fromRow][fromCol];
    board[fromRow][fromCol] = null;
    if (captured) {
        const [capRow, capCol] = captured;
        board[capRow][capCol] = null;
        scores[currentPlayer]++;
    }
    if ((currentPlayer === 'green' && toRow === 7) || (currentPlayer === 'white' && toRow === 0)) {
        board[toRow][toCol].king = true;
    }
    
    winner = checkWinner();
    if (!winner) {
        currentPlayer = currentPlayer === 'green' ? 'white' : 'green';
    }
    
    if (gameMode === 'online') {
        db.ref('games/' + roomCode).update({
            board: board,
            currentPlayer: currentPlayer,
            scores: scores,
            winner: winner
        });
    } else {
        document.getElementById('green-score').textContent = scores.green;
        document.getElementById('white-score').textContent = scores.white;
        document.getElementById('current-player').textContent = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
        document.getElementById('current-player').className = `player-${currentPlayer}`;
        
        if (winner) {
            document.getElementById('status').innerHTML = `<span class="winner">${winner.toUpperCase()} Wins!</span>`;
            document.getElementById('message').innerHTML = 'Game Over - <button onclick="resetGame()" class="btn">Start New Game</button>';
        } else {
            document.getElementById('message').textContent = gameMode === 'ai' && currentPlayer === 'white' ? 'Computer is thinking...' : `Click a ${currentPlayer} piece to select it`;
            if (gameMode === 'ai' && currentPlayer === 'white') {
                setTimeout(aiMove, 800);
            }
        }
        renderBoard();
    }
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    if (toRow < 0 || toRow >= 8 || toCol < 0 || toCol >= 8 || board[toRow][toCol]) {
        return { valid: false };
    }
    const piece = board[fromRow][fromCol];
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    if (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 1) {
        if (piece.king || (currentPlayer === 'green' && rowDiff === 1) || (currentPlayer === 'white' && rowDiff === -1)) {
            return { valid: true, captured: null };
        }
    }
    if (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 2) {
        const midRow = fromRow + rowDiff / 2;
        const midCol = fromCol + colDiff / 2;
        const midPiece = board[midRow][midCol];
        if (midPiece && midPiece.color !== currentPlayer) {
            if (piece.king || (currentPlayer === 'green' && rowDiff === 2) || (currentPlayer === 'white' && rowDiff === -2)) {
                return { valid: true, captured: [midRow, midCol] };
            }
        }
    }
    return { valid: false };
}

function checkWinner() {
    let greenCount = 0, whiteCount = 0;
    for (let row of board) {
        for (let piece of row) {
            if (piece) {
                piece.color === 'green' ? greenCount++ : whiteCount++;
            }
        }
    }
    return greenCount === 0 ? 'white' : whiteCount === 0 ? 'green' : null;
}

function resetGame() {
    currentPlayer = 'green';
    selected = null;
    winner = null;
    scores = { green: 0, white: 0 };
    board = createBoard();
    
    if (gameMode === 'online') {
        db.ref('games/' + roomCode).update({
            board: board,
            currentPlayer: currentPlayer,
            scores: scores,
            winner: null
        });
    } else {
        document.getElementById('green-score').textContent = '0';
        document.getElementById('white-score').textContent = '0';
        document.getElementById('current-player').textContent = 'Green';
        document.getElementById('current-player').className = 'player-green';
        document.getElementById('status').innerHTML = 'Current Player: <span id="current-player" class="player-green">Green</span>';
        document.getElementById('message').textContent = 'Click a green piece to select it';
        renderBoard();
    }
}

function aiMove() {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] && board[r][c].color === 'white') {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        const savedPlayer = currentPlayer;
                        currentPlayer = 'white';
                        const result = makeMove(r, c, tr, tc);
                        currentPlayer = savedPlayer;
                        if (result.valid) {
                            moves.push({ from: [r, c], to: [tr, tc], captured: result.captured });
                        }
                    }
                }
            }
        }
    }
    if (moves.length > 0) {
        const captureMoves = moves.filter(m => m.captured);
        const move = captureMoves.length > 0 ? captureMoves[Math.floor(Math.random() * captureMoves.length)] : moves[Math.floor(Math.random() * moves.length)];
        currentPlayer = 'white';
        executeMove(move.from[0], move.from[1], move.to[0], move.to[1], move.captured);
    }
}

if (gameMode !== 'online') {
    board = createBoard();
    renderBoard();
}
