from flask_socketio import SocketIO, emit
from flask import Flask, request
from flask_cors import CORS
import json
import google.generativeai as genai
from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

clients = {}

genai.configure(api_key="AIzaSyCKUGdOjIUHvjcfQ3u5R7PAIts3Rak0tdM")

# Create the model
generation_config = {
  "temperature": 1,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
  model_name="gemini-1.5-flash",
  generation_config=generation_config,
  system_instruction="you will be given a json input containing info about the state of the football match and you will give commentry based on that and prev match state and keep it engaging and there will be 2 commentators so you will give output in json format where there will be an array of object and each object contains 2 key value pair which is commentator no and commentry and if input json file is empty then you should continue the commentry and talk about some random things ",
)

chat_session = model.start_chat(
  history=[
  ]
)  

dummy_response = [
    {
        "commentator": 1,
        "commentary": "This is a dummy response"
    },
    {
        "commentator": 2,
        "commentary": "Hi this is another dummy response"
    },
    {
        "commentator": 1,
        "commentary": "Hi"
    }
]

@socketio.on('connect')
def handle_connect():
    client_id = request.sid
    clients[client_id] = {"connected": True}
    print(f"Client connected: {client_id}")

@socketio.on('disconnect')
def handle_disconnect():
    client_id = request.sid
    if client_id in clients:
        del clients[client_id]
    print(f"Client disconnected: {client_id}")

@socketio.on('llm_request')
def handle_llm_request(data):
    client_id = request.sid
    try:
        if isinstance(data, str):
            data = json.loads(data)
        prompt = data.get('prompt', '')
        # message_id = str(uuid.uuid4())
        full_response = ""
        print(f"Client {client_id} requested LLM with prompt: {prompt}")

        # resp = chat_session.send_message(prompt)

        # print(resp.text)

        # json_resp = json.loads(resp.text[7:resp.text.__len__()-3])


        # prevCommentator = json_resp[0]['commentator']

        for chunk in dummy_response:
            emit('llm_response', { 
                'commentator': chunk['commentator'],
                'chunk': chunk['commentary'],
                'done': False
            }, room=client_id)

        emit('llm_response', {
            # 'messageId': message_id,
            'commentator': '',
            'chunk': '',
            'done': True
        }, room=client_id)
    except Exception as e:
        emit('error', {'error': str(e)}, room=client_id)

if __name__ == '__main__':
    server = pywsgi.WSGIServer(('0.0.0.0', 5000), app, handler_class=WebSocketHandler)
    server.serve_forever()

    # socketio.run(app, port=5000)
