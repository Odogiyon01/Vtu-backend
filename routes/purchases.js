const express = require("express");
const fetch = require("node-fetch");
const { db } = require("../firebase");
const verifyToken = require("../utils/verifyToken");

const router = express.Router();

const SME_BASE = "https://smeplug.ng/api/v1";

// BUY AIRTIME
router.post("/airtime", verifyToken, async (req, res) => {
  try {
    const { network, phone, amount } = req.body;
    const userRef = db.collection("users").doc(req.user.uid);
    const doc = await userRef.get();
    const balance = doc.data()?.balance || 0;
    if (balance < amount) return res.status(400).json({ error: "Insufficient balance" });

    // Call SMEPlug API
    const response = await fetch(`${SME_BASE}/airtime/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SMEPLUG_API_KEY}`,
      },
      body: JSON.stringify({ network, phone, amount }),
    });
    const data = await response.json();

    // Deduct balance
    await userRef.update({ balance: balance - amount });
    await db.collection("transactions").add({
      userId: req.user.uid,
      type: "airtime",
      details: { network, phone, amount },
      status: data.success ? "success" : "failed",
      createdAt: new Date(),
    });

    res.json(data);
  } catch (err) {
    console.error("Airtime error:", err);
    res.status(500).json({ error: "Airtime purchase failed" });
  }
});

// BUY DATA
router.post("/data", verifyToken, async (req, res) => {
  try {
    const { network, phone, plan } = req.body;
    const userRef = db.collection("users").doc(req.user.uid);
    const doc = await userRef.get();
    const balance = doc.data()?.balance || 0;

    // (Example: assume all plans cost ₦500 — replace with SMEPlug actual pricing)
    const amount = 500;
    if (balance < amount) return res.status(400).json({ error: "Insufficient balance" });

    const response = await fetch(`${SME_BASE}/data/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SMEPLUG_API_KEY}`,
      },
      body: JSON.stringify({ network, phone, plan }),
    });
    const data = await response.json();

    await userRef.update({ balance: balance - amount });
    await db.collection("transactions").add({
      userId: req.user.uid,
      type: "data",
      details: { network, phone, plan },
      status: data.success ? "success" : "failed",
      createdAt: new Date(),
    });

    res.json(data);
  } catch (err) {
    console.error("Data error:", err);
    res.status(500).json({ error: "Data purchase failed" });
  }
});

module.exports = router;
