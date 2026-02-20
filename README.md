# Checkers Game - Multiplayer

A Flask-based multiplayer checkers game where you can play with friends online using room codes.

## Features
- Play vs Computer (AI)
- Two Player Local
- Online Multiplayer with Room Codes

## Deploy to Render (Free)

1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `devjohnns/Checkers`
4. Configure:
   - **Name**: checkers-game (or any name)
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Plan**: Free
5. Click "Create Web Service"
6. Wait 5-10 minutes for deployment
7. Your game will be live at: `https://checkers-game.onrender.com` (or your chosen name)

## How to Play Online

1. Go to your deployed site
2. Click "Create Room"
3. Share the 6-character room code with your friend
4. Friend goes to the same site and enters the code
5. Play together in real-time!

## Local Development

```bash
pip install -r requirements.txt
python app.py
```

Visit `http://localhost:5000`
