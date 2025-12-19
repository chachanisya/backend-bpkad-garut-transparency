const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { prisma } = require("../config/database");
const { handleError } = require("../utils/helpers");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// =======================
// Middleware JWT
// =======================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access token required",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    req.user = user;
    next();
  });
};

// =======================
// POST /login
// =======================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username dan password harus diisi",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: "Username tidak ditemukan",
      });
    }

    let isValidPassword = false;

    if (admin.passwordHash.startsWith("$2b$")) {
      isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    } else {
      isValidPassword = password === admin.passwordHash;

      if (isValidPassword) {
        const hashed = await bcrypt.hash(password, 10);
        await prisma.admin.update({
          where: { idAdmin: admin.idAdmin },
          data: { passwordHash: hashed },
        });
      }
    }

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Password salah",
      });
    }

    const token = jwt.sign(
      {
        idAdmin: admin.idAdmin,
        username: admin.username,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // ✅ RESPONSE KONSISTEN & JELAS
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          idAdmin: admin.idAdmin,
          username: admin.username,
          role: admin.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    handleError(res, error, "Login failed");
  }
});

// =======================
// GET /verify
// =======================
router.get("/verify", authenticateToken, async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { idAdmin: req.user.idAdmin },
      select: {
        idAdmin: true,
        username: true,
        role: true,
      },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: admin },
    });
  } catch (error) {
    handleError(res, error, "Token verification failed");
  }
});

// =======================
// POST /logout
// =======================
router.post("/logout", authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

module.exports = router;
