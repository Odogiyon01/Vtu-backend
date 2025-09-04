import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import fetch from "node-fetch";

// ---------------- FIREBASE SETUP ---------------- //
let serviceAccount;
if (process.env.FIREBASE_KEY) {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ---------------- EXPRESS APP ---------------- //
const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------------- ROUTES ---------------- //
app.get("/", (req, res) => {
  res.send("✅ Airtime/Data Backend is running on Node.js v24!");
});

// Example: fetch SMEPlug balance
app.get("/api/smeplug/balance", async (req, res) => {
  try {
    const response = await fetch("https://smeplug.ng/api/v1/balance", {
      headers: {
        Authorization: `Bearer ${process.env.SMEPLUG_API_KEY}`,
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- SERVER ---------------- //
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
