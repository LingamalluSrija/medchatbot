import React, { useState, useRef } from "react";
import axios from "axios";
import Tesseract from "tesseract.js";
import "bootstrap/dist/css/bootstrap.min.css";

const TOGETHER_API_KEY = "tgp_v1_DIaPvt2D6sBMgXBmw7gPYx_PH5mzk--IW0cYIB5XtfA";
const BACKEND_URL = "http://localhost:5000";

function App() {
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("english"); // new
  const synthRef = useRef(window.speechSynthesis); // for TTS

  const addMessage = (sender, text) => {
    setChat((prev) => [...prev, { sender, text }]);
  };

  const speakText = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hindi" ? "hi-IN" : language === "telugu" ? "te-IN" : "en-US";
    synthRef.current.cancel(); // stop if speaking
    synthRef.current.speak(utterance);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    addMessage("user", input);
    const message = input.trim();
    setInput("");

    let userPrompt = message;

    if (/that|this (medicine|disease)/i.test(message)) {
      const res = await axios.get(`${BACKEND_URL}/get-latest-name`);
      const name = res.data?.name || "";
      if (name) userPrompt = `What is ${name} used for?`;
    }

    const prompt = `
You are a helpful multilingual medical assistant.

Reply only in this format:

💊 Name:  
• What it is used for:  
• Dosage:  
• Side effects:  
• Cost:

Respond in ${
      language === "hindi"
        ? "Hindi"
        : language === "telugu"
        ? "Telugu"
        : "English"
    }.

User: ${userPrompt}
    `.trim();

    try {
      const res = await axios.post(
        "https://api.together.xyz/v1/chat/completions",
        {
          model: "meta-llama/Llama-3-70b-chat-hf",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.5,
          max_tokens: 700,
        },
        {
          headers: {
            Authorization: `Bearer ${TOGETHER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const reply = res.data.choices?.[0]?.message?.content || "❌ No response.";
      addMessage("bot", reply);
    } catch (err) {
      console.error("❌ Chat error:", err);
      addMessage("bot", "❗ Failed to get a response. Please try again.");
    }
  };

  const startMic = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();
    recognition.onresult = (e) => {
      const voiceText = e.results[0][0].transcript;
      setInput(voiceText);
    };
    recognition.onerror = () => alert("🎤 Mic error. Try again.");
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    addMessage("user", `🖼️ Uploaded image: ${file.name}`);
    setLoading(true);

    try {
      const { data: { text } } = await Tesseract.recognize(file, "eng");
      const cleanText = text.replace(/\s+/g, " ").slice(0, 500);
      addMessage("bot", `📄 Extracted text:\n${cleanText}`);

      const aiPrompt = `
You are a medical assistant.

From this OCR text, extract the most likely valid medicine or disease name.

Only return the name. Do not include explanations or punctuation.

OCR:
${cleanText}
      `.trim();

      const aiRes = await axios.post(
        "https://api.together.xyz/v1/chat/completions",
        {
          model: "meta-llama/Llama-3-70b-chat-hf",
          messages: [{ role: "system", content: aiPrompt }],
          temperature: 0.3,
          max_tokens: 50,
        },
        {
          headers: {
            Authorization: `Bearer ${TOGETHER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      let detected = aiRes.data.choices?.[0]?.message?.content?.trim();
      detected = detected.replace(/[.,]+$/, "").trim();

      if (!detected || /let|quiz|math|question/i.test(detected)) {
        addMessage("bot", "❗ Could not detect a valid medicine or disease name.");
      } else {
        addMessage("bot", `💊 Detected: <strong>${detected}</strong><br>Ask your question about it.`);
        await axios.post(`${BACKEND_URL}/save-name`, { name: detected });
      }
    } catch (error) {
      console.error("❌ OCR/AI Error:", error);
      addMessage("bot", "❗ Failed to process image. Please try another.");
    }

    setLoading(false);
  };

  return (
    <div className="container mt-4">
      <h2 className="text-center">🩺 Medical Chatbot</h2>

      <div className="mb-3 text-end">
        🌐 Language:{" "}
        <select
          className="form-select d-inline w-auto"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="english">English</option>
          <option value="hindi">Hindi</option>
          <option value="telugu">Telugu</option>
        </select>
      </div>

      <div className="border p-3 mb-3" style={{ height: "320px", overflowY: "scroll" }}>
        {chat.map((msg, idx) => (
          <div key={idx} className={msg.sender === "user" ? "text-end mb-2" : "text-start mb-2"}>
            <span
              className={`badge ${msg.sender === "user" ? "bg-primary" : "bg-secondary"}`}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {msg.text}
            </span>
            {msg.sender === "bot" && (
              <button
                onClick={() => speakText(msg.text)}
                className="btn btn-sm btn-outline-light ms-2"
                title="Speak"
              >
                🔊
              </button>
            )}
          </div>
        ))}
        {loading && <p className="text-muted text-center">⏳ Processing image...</p>}
      </div>

      <input
        type="text"
        className="form-control mb-2"
        placeholder="Ask about a medicine or disease..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />

      <div className="d-flex gap-2">
        <button className="btn btn-success w-100" onClick={sendMessage}>
          Send
        </button>
        <button className="btn btn-warning w-100" onClick={startMic}>
          🎤 Mic
        </button>
        <input type="file" className="form-control w-100" accept="image/*" onChange={handleImageUpload} />
      </div>
    </div>
  );
}

export default App;
