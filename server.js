const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const walletRoutes = require("./routes/wallet");
const paymentsRoutes = require("./routes/payments");
const purchasesRoutes = require("./routes/purchases");
const transactionsRoutes = require("./routes/transactions");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/api/wallet", walletRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/purchases", purchasesRoutes);
app.use("/api/transactions", transactionsRoutes);

app.get("/", (req, res) => res.send("Airtime/Data API running 🚀"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
