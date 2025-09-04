const express = require("express");
const fetch = require("node-fetch");
const { db } = require("../firebase");
const verifyToken = require("../utils/verifyToken");

const router = express.Router();

// INITIATE OPay payment
router.post("/opay/init", verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const response = await fetch("https://sandboxapi.opaycheckout.com/api/v1/international/cashier/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPAY_SECRET_KEY}`,
      },
      body: JSON.stringify({
        country: "NG",
        currency: "NGN",
        amount,
        reference: `txn_${Date.now()}`,
        returnUrl: process.env.OPAY_CALLBACK,
        userInfo: { userId: req.user.uid },
      }),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Opay init error:", err);
    res.status(500).json({ error: "Opay init failed" });
  }
});

// OPay webhook callback
router.post("/opay/webhook", async (req, res) => {
  try {
    const { data } = req.body;
    if (data.status === "SUCCESS") {
      const { userId } = data.userInfo;
      const userRef = db.collection("users").doc(userId);
      await db.runTransaction(async (t) => {
        const doc = await t.get(userRef);
        const newBalance = (doc.data()?.balance || 0) + Number(data.amount);
        t.update(userRef, { balance: newBalance });
      });
      await db.collection("transactions").add({
        userId,
        type: "wallet_funding",
        amount: data.amount,
        status: "success",
        createdAt: new Date(),
      });
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
