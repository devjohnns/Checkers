from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
import random
import string

app = Flask(__name__)
app.secret_key = 'checkers_game_secret'

# Room storage (in-memory for simplicity)
rooms = {}

def generate_room_code():
    """Generate a unique 6-character room code"""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if code not in rooms:
            return code

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

def create_room():
    """Create a new game room"""
    code = generate_room_code()
    rooms[code] = {
        'board': create_board(),
        'current_player': 'green',
        'selected': None,
        'winner': None,
        'green_score': 0,
        'white_score': 0,
        'players': {'green': None, 'white': None},
        'created': True
    }
    return code

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create')
def create():
    """Create a new game room and redirect to it"""
    code = create_room()
    return redirect(url_for('game', room=code))

@app.route('/join', methods=['POST'])
def join():
    """Join an existing game room"""
    code = request.form.get('room_code', '').upper().strip()
    
    if not code:
        return render_template('index.html', error="Please enter a room code")
    
    if code not in rooms:
        return render_template('index.html', error="Room not found. Check the code and try again.")
    
    return redirect(url_for('game', room=code))

@app.route('/game')
@app.route('/game/<room>')
def game(room=None):
    # If no room code, create a new one
    if not room:
        room = create_room()
        return redirect(url_for('game', room=room))
    
    # If room doesn't exist, create it
    if room not in rooms:
        rooms[room] = {
            'board': create_board(),
            'current_player': 'green',
            'selected': None,
            'winner': None,
            'green_score': 0,
            'white_score': 0,
            'players': {'green': None, 'white': None},
            'created': True
        }
    
    room_data = rooms[room]
    
    # Determine player color based on who's viewing
    player_color = session.get(f'player_{room}')
    if not player_color:
        # First visit - assign green to first player, white to second
        if room_data['players']['green'] is None:
            session[f'player_{room}'] = 'green'
            room_data['players']['green'] = True
            player_color = 'green'
        elif room_data['players']['white'] is None:
            session[f'player_{room}'] = 'white'
            room_data['players']['white'] = True
            player_color = 'white'
        else:
            # Room full - assign as spectator
            session[f'player_{room}'] = 'spectator'
            player_color = 'spectator'
    
    return render_template('game.html', 
                         board=room_data['board'], 
                         current_player=room_data['current_player'],
                         selected=room_data['selected'],
                         room_code=room,
                         player_color=player_color,
                         winner=room_data['winner'],
                         green_score=room_data['green_score'],
                         white_score=room_data['white_score'])

@app.route('/move/<room>/<int:row>/<int:col>')
def move(room, row, col):
    if room not in rooms:
        return redirect(url_for('index'))
    
    room_data = rooms[room]
    board = room_data['board']
    current_player = room_data['current_player']
    selected = room_data['selected']
    
    # Get player's assigned color from session
    player_color = session.get(f'player_{room}')
    
    # Only allow the current player to move
    if player_color != current_player:
        return redirect(url_for('game', room=room))
    
    if selected is None:
        # Select a piece
        if board[row][col] and board[row][col]['color'] == current_player:
            room_data['selected'] = [row, col]
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
                
                if current_player == 'green':
                    room_data['green_score'] += 1
                else:
                    room_data['white_score'] += 1
            
            # Check for king promotion
            if (current_player == 'green' and row == 7) or (current_player == 'white' and row == 0):
                board[row][col]['king'] = True
            
            # Check win condition
            winner = check_winner(board)
            if winner:
                room_data['winner'] = winner
            else:
                # Switch players
                room_data['current_player'] = 'white' if current_player == 'green' else 'green'
        
        room_data['selected'] = None
    
    return redirect(url_for('game', room=room))

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

@app.route('/gameState/<room>')
def game_state(room):
    """Return current game state as JSON for polling"""
    if room not in rooms:
        return jsonify({'error': 'Room not found'}), 404
    
    room_data = rooms[room]
    player_color = session.get(f'player_{room}')
    
    return jsonify({
        'board': room_data['board'],
        'current_player': room_data['current_player'],
        'winner': room_data['winner'],
        'green_score': room_data['green_score'],
        'white_score': room_data['white_score'],
        'selected': room_data['selected'],
        'player_color': player_color
    })

@app.route('/reset/<room>')
def reset_room(room):
    """Reset a room's game"""
    if room in rooms:
        rooms[room] = {
            'board': create_board(),
            'current_player': 'green',
            'selected': None,
            'winner': None,
            'green_score': 0,
            'white_score': 0,
            'players': rooms[room]['players'],  # Keep player assignments
            'created': True
        }
    return redirect(url_for('game', room=room))

@app.route('/new')
def new_game():
    session.clear()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)

