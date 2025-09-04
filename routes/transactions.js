const express = require("express");
const { db } = require("../firebase");
const verifyToken = require("../utils/verifyToken");

const router = express.Router();

// GET all user transactions
router.get("/", verifyToken, async (req, res) => {
  const snap = await db
    .collection("transactions")
    .where("userId", "==", req.user.uid)
    .orderBy("createdAt", "desc")
    .get();

  const txns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(txns);
});

module.exports = router;
