import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import fetch from "node-fetch";

// ---------------- FIREBASE SETUP ---------------- //
let serviceAccount;
if (process.env.FIREBASE_KEY) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase initialized successfully!");
    }
  } catch (err) {
    console.error("❌ Failed to parse FIREBASE_KEY:", err.message);
  }
}

const db = admin.firestore();

// ---------------- EXPRESS APP ---------------- //
const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------------- ROUTES ---------------- //

// Root test
app.get("/", (req, res) => {
  res.send("✅ Airtime/Data Backend is running with Firebase on Render!");
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

// ---------------- OPAY WEBHOOK ---------------- //
app.post("/api/payments/opay/webhook", async (req, res) => {
  try {
    const event = req.body;
    console.log("📩 Opay Webhook Received:", event);

    // 1. Save webhook event for debugging/history
    await db.collection("opay_webhooks").add({
      ...event,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Process successful payments
    if (event.status && event.status.toLowerCase() === "success") {
      const userId = event.userId; // ensure you send userId when creating payment
      const amount = parseFloat(event.amount) || 0;

      if (userId && amount > 0) {
        const userRef = db.collection("users").doc(userId);

        await db.runTransaction(async (t) => {
          const doc = await t.get(userRef);
          if (!doc.exists) throw new Error("User not found");

          const oldBalance = doc.data().balance || 0;
          const newBalance = oldBalance + amount;

          t.update(userRef, { balance: newBalance });

          // Save transaction history
          db.collection("transactions").add({
            userId,
            type: "deposit",
            amount,
            status: "success",
            provider: "Opay",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        console.log(`✅ User ${userId} credited with ₦${amount}`);
      }
    }

    res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- SERVER ---------------- //
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
