from flask_socketio import SocketIO, emit
from flask import Flask, request
from flask_cors import CORS
import json
from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler
from commentary_agents import create_commentary_panel, process_game_event

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Create a global commentary panel
commentary_panel = create_commentary_panel()

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

@socketio.on('llm_request')
def handle_llm_request(data):
    client_id = request.sid
    try:
        # Ensure data is a dictionary or string
        if isinstance(data, dict):
            prompt = json.dumps(data)
        elif isinstance(data, str):
            prompt = data
        else:
            raise ValueError("Invalid input format")

        # Process event through commentary panel
        commentary_responses = process_game_event(commentary_panel, prompt)

        # Emit responses
        for response in commentary_responses:
            emit('llm_response', {
                'commentator': response['commentator'],
                'chunk': response['commentary'],
                'done': False
            }, room=client_id)

        # Signal completion
        emit('llm_response', {
            'commentator': '',
            'chunk': '',
            'done': True
        }, room=client_id)

    except Exception as e:
        emit('error', {'error': str(e)}, room=client_id)

if __name__ == '__main__':
    server = pywsgi.WSGIServer(('0.0.0.0', 5000), app, handler_class=WebSocketHandler)
    server.serve_forever()