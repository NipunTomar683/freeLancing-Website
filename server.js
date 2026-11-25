require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("Set a JWT_SECRET of at least 32 characters in .env");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === "production";
const ROLES = ["client", "freelancer"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Database ----------
const db = new Database(path.join(__dirname, "orbit.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('client', 'freelancer')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const findByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const findById = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?");
const insertUser = db.prepare(
  "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
);

// Used to keep login timing similar when the email doesn't exist
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

// ---------- Helpers ----------
function setSessionCookie(res, userId) {
  const token = jwt.sign({}, JWT_SECRET, { subject: String(userId), expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function getUserFromRequest(req) {
  const token = req.cookies.token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return findById.get(Number(payload.sub)) || null;
  } catch {
    return null;
  }
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// ---------- App ----------
const app = express();
if (IS_PROD) app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
    },
  },
}));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

// ---------- API ----------

app.post("/api/signup", authLimiter, (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
    return res.status(400).json({ error: "Please enter your full name." });
  }
  if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: "Password must be 8 to 72 characters." });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: "Please choose client or freelancer." });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (findByEmail.get(cleanEmail)) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const hash = bcrypt.hashSync(password, 12);
  const result = insertUser.run(name.trim(), cleanEmail, hash, role);
  setSessionCookie(res, result.lastInsertRowid);

  res.status(201).json({ user: publicUser(findById.get(result.lastInsertRowid)) });
});

app.post("/api/login", authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  const invalid = () => res.status(401).json({ error: "Incorrect email or password." });

  if (typeof email !== "string" || typeof password !== "string" || password.length > 72) {
    return invalid();
  }

  const user = findByEmail.get(email.trim().toLowerCase());
  const ok = bcrypt.compareSync(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) return invalid();

  setSessionCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax", secure: IS_PROD });
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not signed in." });
  res.json({ user: publicUser(user) });
});

// ---------- Pages ----------
// Protected page: must be registered BEFORE express.static
app.get("/dashboard.html", (req, res) => {
  if (!getUserFromRequest(req)) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Orbit running at http://localhost:${PORT}`);
});