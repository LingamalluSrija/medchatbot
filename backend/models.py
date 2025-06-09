from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy()

class ChatHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_input = db.Column(db.String(300))
    bot_response = db.Column(db.String(500))
