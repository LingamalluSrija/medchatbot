const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",             // ✅ Change this only if your username differs
  password: "Ajirs-28",     // ✅ Your MySQL root password
  database: "medical_chatbot"
});

// ✅ Default root route (so "Cannot GET /" is fixed)
app.get("/", (req, res) => {
  res.send("✅ Medical chatbot backend is running.");
});

// ✅ Save last detected medicine name
app.post("/save-name", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const sql = "INSERT INTO medicine_log (name) VALUES (?)";

  db.query(sql, [name], (err) => {
    if (err) {
      console.error("❌ DB Insert Error:", err);
      return res.status(500).json({ error: "DB error", details: err });
    }
    console.log(`✅ Saved medicine name: ${name}`);
    res.json({ success: true });
  });
});

// ✅ Get latest detected medicine name
app.get("/get-latest-name", (req, res) => {
  const sql = "SELECT name FROM medicine_log ORDER BY created_at DESC LIMIT 1";

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ DB Fetch Error:", err);
      return res.status(500).json({ error: "DB error", details: err });
    }

    const latest = result.length > 0 ? result[0].name : "";
    console.log(`📦 Fetched latest medicine name: ${latest}`);
    res.json({ name: latest });
  });
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
