from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, ChatHistory
from utils.fetch_medicine_info import get_medicine_info
from utils.ocr import extract_text
import os

app = Flask(__name__)
CORS(app)

# SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# 🛠 Create tables at startup
with app.app_context():
    db.create_all()

@app.route("/chat", methods=["POST"])
def chat():
    if 'image' in request.files:
        image = request.files['image']
        image.save("temp.jpg")
        med_name = extract_text("temp.jpg")
    else:
        med_name = request.json.get("input")

    data = get_medicine_info(med_name)

    # Save chat to database
    chat = ChatHistory(user_input=med_name, bot_response=data['summary'])
    db.session.add(chat)
    db.session.commit()

    return jsonify(data)

@app.route("/history", methods=["GET"])
def history():
    all_chats = ChatHistory.query.all()
    return jsonify([{"user": c.user_input, "bot": c.bot_response} for c in all_chats])

if __name__ == "__main__":
    app.run(debug=True)
