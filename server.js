const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { prisma } = require("./config/database");

// ================= INIT =================
const app = express();

// ================= HELMET =================
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production" ? undefined : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ================= COMPRESSION =================
app.use(compression());

// ================= CORS (FIX FINAL) =================
const allowedOrigins = [
  "https://frontend-bpkad-garut-transparency-steel.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server, postman, curl
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: false, // 🔥 JANGAN TRUE
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight
app.options("*", cors());

// ================= BODY PARSER =================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ================= RATE LIMIT =================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// ================= ROOT =================
app.get("/", (req, res) => {
  res.json({
    message: "API Backend BPKAD Garut Transparansi Keuangan",
    version: "1.0.0",
    status: "Aktif",
    database: "Neon PostgreSQL",
    environment: process.env.NODE_ENV || "development",
  });
});

// ================= ROUTES =================
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/apbd", require("./routes/apbd"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/user-management", require("./routes/user-management"));
app.use("/api/tahun-anggaran", require("./routes/tahun-anggaran"));
app.use("/api/kategori-apbd", require("./routes/kategori-apbd"));
app.use("/api/transaksi-apbd", require("./routes/transaksi-apbd"));

// ================= HEALTH =================
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "OK",
      database: "Connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      database: "Disconnected",
      error: error.message,
    });
  }
});

// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// ================= 404 =================
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});
