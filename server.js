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

// ✅ Example: fetch SMEPlug balance
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

// ✅ OPay payment initialization (fund wallet)
app.post("/api/payments/opay/initiate", async (req, res) => {
  try {
    const { amount, userId } = req.body;

    const response = await fetch("https://api.opaycheckout.com/api/v1/international/cashier/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPAY_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: amount,
        currency: "NGN",
        reference: `TXN-${Date.now()}`,
        callbackUrl: `${process.env.OPAY_CALLBACK}`,
        userId: userId,
      }),
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ OPay webhook (called after payment)
app.post("/api/payments/opay/webhook", async (req, res) => {
  try {
    console.log("🔔 OPay Webhook received:", req.body);

    const { reference, status, userId, amount } = req.body;

    if (status === "SUCCESS") {
      // Increase user wallet balance in Firestore
      const userRef = db.collection("users").doc(userId);
      await db.runTransaction(async (t) => {
        const doc = await t.get(userRef);
        if (!doc.exists) throw new Error("User not found");

        const newBalance = (doc.data().balance || 0) + Number(amount);
        t.update(userRef, { balance: newBalance });
      });
      console.log(`✅ Wallet funded for user: ${userId}, +₦${amount}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Error:", error);
    res.sendStatus(500);
  }
});

// ---------------- SERVER ---------------- //
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
