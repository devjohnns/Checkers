let board = [];
let currentPlayer = 'green';
let selected = null;
let winner = null;
let scores = { green: 0, white: 0 };
let aiMode = new URLSearchParams(window.location.search).get('mode') === 'ai';

function createBoard() {
    board = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) {
                board[row][col] = { color: 'green', king: false };
            }
        }
    }
    for (let row = 5; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) {
                board[row][col] = { color: 'white', king: false };
            }
        }
    }
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
    if (!selected) {
        if (board[row][col] && board[row][col].color === currentPlayer) {
            selected = [row, col];
            document.getElementById('message').textContent = `Selected piece at: Row ${row + 1}, Col ${col + 1}. Click destination square or another piece to select`;
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
        document.getElementById(`${currentPlayer}-score`).textContent = scores[currentPlayer];
    }
    if ((currentPlayer === 'green' && toRow === 7) || (currentPlayer === 'white' && toRow === 0)) {
        board[toRow][toCol].king = true;
    }
    renderBoard();
    winner = checkWinner();
    if (winner) {
        document.getElementById('status').innerHTML = `<span class="winner">${winner.toUpperCase()} Wins!</span>`;
        document.getElementById('message').innerHTML = 'Game Over - <button onclick="resetGame()" class="btn">Start New Game</button>';
    } else {
        currentPlayer = currentPlayer === 'green' ? 'white' : 'green';
        document.getElementById('current-player').textContent = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
        document.getElementById('current-player').className = `player-${currentPlayer}`;
        document.getElementById('message').textContent = `Click a ${currentPlayer} piece to select it`;
        if (aiMode && currentPlayer === 'white') {
            setTimeout(aiMove, 500);
        }
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
    document.getElementById('green-score').textContent = '0';
    document.getElementById('white-score').textContent = '0';
    document.getElementById('current-player').textContent = 'Green';
    document.getElementById('current-player').className = 'player-green';
    document.getElementById('status').innerHTML = 'Current Player: <span id="current-player" class="player-green">Green</span>';
    document.getElementById('message').textContent = 'Click a green piece to select it';
    createBoard();
    renderBoard();
}

function aiMove() {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] && board[r][c].color === 'white') {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        const result = makeMove(r, c, tr, tc);
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
        executeMove(move.from[0], move.from[1], move.to[0], move.to[1], move.captured);
    }
}

createBoard();
renderBoard();
