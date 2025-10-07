const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const User = require("./models/User");

const app = express();

// --- Middleware ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

// --- MongoDB Connection ---
mongoose
  .connect("mongodb://localhost:27017/messagingapp")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log(err));

// --- Routes ---

// Homepage
app.get("/", (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  } else {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  }
});

// Register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.send("User already exists. <a href='/login.html'>Login</a>");

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashedPassword });
  await user.save();

  req.session.userId = user._id;
  res.redirect("/");
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.send("No user found. <a href='/register.html'>Register</a>");

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.send("Invalid password. Try again.");

  req.session.userId = user._id;
  res.redirect("/");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Get user details
app.get("/user", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  const user = await User.findById(req.session.userId).select("-password");
  res.json(user);
});

const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
