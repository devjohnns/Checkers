from flask import Flask, render_template, request, redirect, url_for, session
import json

app = Flask(__name__)
app.secret_key = 'checkers_game_secret'

def create_board():
    board = [[None for _ in range(8)] for _ in range(8)]
    # Place green pieces (top 3 rows)
    for row in range(3):
        for col in range(8):
            if (row + col) % 2 == 1:  # Dark squares only
                board[row][col] = {'color': 'green', 'king': False}
    
    # Place white pieces (bottom 3 rows)
    for row in range(5, 8):
        for col in range(8):
            if (row + col) % 2 == 1:  # Dark squares only
                board[row][col] = {'color': 'white', 'king': False}
    
    return board

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/game')
def game():
    if 'board' not in session:
        session['board'] = create_board()
        session['current_player'] = 'green'
        session['selected'] = None
        session['winner'] = None
        session['green_score'] = 0
        session['white_score'] = 0
    
    return render_template('game.html', 
                         board=session['board'], 
                         current_player=session['current_player'],
                         selected=session['selected'])

@app.route('/move/<int:row>/<int:col>')
def move(row, col):
    board = session['board']
    current_player = session['current_player']
    selected = session['selected']
    
    if selected is None:
        # Select a piece
        if board[row][col] and board[row][col]['color'] == current_player:
            session['selected'] = [row, col]
    else:
        # Try to move
        from_row, from_col = selected
        move_result = make_move(board, from_row, from_col, row, col, current_player)
        
        if move_result['valid']:
            # Make the move
            board[row][col] = board[from_row][from_col]
            board[from_row][from_col] = None
            
            # Handle captures
            if move_result['captured']:
                cap_row, cap_col = move_result['captured']
                board[cap_row][cap_col] = None
                # Update score (with safe defaults)
                if 'green_score' not in session:
                    session['green_score'] = 0
                if 'white_score' not in session:
                    session['white_score'] = 0
                    
                if current_player == 'green':
                    session['green_score'] += 1
                else:
                    session['white_score'] += 1
            
            # Check for king promotion
            if (current_player == 'green' and row == 7) or (current_player == 'white' and row == 0):
                board[row][col]['king'] = True
            
            # Check win condition
            winner = check_winner(board)
            if winner:
                session['winner'] = winner
            else:
                # Switch players
                session['current_player'] = 'white' if current_player == 'green' else 'green'
        
        session['selected'] = None
        session['board'] = board
    
    return redirect(url_for('game'))

def make_move(board, from_row, from_col, to_row, to_col, player):
    # Basic validation
    if to_row < 0 or to_row >= 8 or to_col < 0 or to_col >= 8:
        return {'valid': False}
    if board[to_row][to_col] is not None:
        return {'valid': False}
    
    piece = board[from_row][from_col]
    if not piece or piece['color'] != player:
        return {'valid': False}
    
    row_diff = to_row - from_row
    col_diff = to_col - from_col
    
    # Regular move (one diagonal square)
    if abs(row_diff) == 1 and abs(col_diff) == 1:
        if piece['king']:
            return {'valid': True, 'captured': None}
        if (player == 'green' and row_diff == 1) or (player == 'white' and row_diff == -1):
            return {'valid': True, 'captured': None}
    
    # Capture move (jump over opponent)
    if abs(row_diff) == 2 and abs(col_diff) == 2:
        mid_row = from_row + row_diff // 2
        mid_col = from_col + col_diff // 2
        mid_piece = board[mid_row][mid_col]
        
        if mid_piece and mid_piece['color'] != player:
            if piece['king']:
                return {'valid': True, 'captured': (mid_row, mid_col)}
            if (player == 'green' and row_diff == 2) or (player == 'white' and row_diff == -2):
                return {'valid': True, 'captured': (mid_row, mid_col)}
    
    return {'valid': False}

def check_winner(board):
    green_pieces = 0
    white_pieces = 0
    
    for row in board:
        for piece in row:
            if piece:
                if piece['color'] == 'green':
                    green_pieces += 1
                else:
                    white_pieces += 1
    
    if green_pieces == 0:
        return 'white'
    elif white_pieces == 0:
        return 'green'
    return None

@app.route('/reset')
def reset():
    session.clear()
    return redirect(url_for('game'))

@app.route('/new')
def new_game():
    session.clear()
    return redirect(url_for('game'))

if __name__ == '__main__':
    app.run(debug=True)