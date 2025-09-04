const express = require("express");
const { db } = require("../firebase");
const verifyToken = require("../utils/verifyToken");

const router = express.Router();

// GET wallet balance
router.get("/", verifyToken, async (req, res) => {
  const userRef = db.collection("users").doc(req.user.uid);
  const doc = await userRef.get();
  if (!doc.exists) return res.json({ balance: 0 });
  res.json({ balance: doc.data().balance || 0 });
});

module.exports = router;
