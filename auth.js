const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const USERS_PATH = path.join(__dirname, "data/users.json");
const SECRET = "shohaib_super_secret_key";

function login(req, res) {
  const { email, password } = req.body;

  console.log("👉 Login attempt:");
  console.log("Email received:", email);
  console.log("Password received:", password);

  const usersRaw = fs.readFileSync(USERS_PATH, "utf8");
  console.log("Users file raw:", usersRaw);

  const users = JSON.parse(usersRaw);
  console.log("Parsed users:", users);

  const user = users.find(u => u.email === email);
  console.log("Matched user:", user);

  if (!user) {
    console.log("❌ Email not found");
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  console.log("Password match:", isMatch);

  if (!isMatch) {
    console.log("❌ Password mismatch");
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    SECRET,
    { expiresIn: "2h" }
  );

  console.log("✅ Login success");
  res.json({ token });
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(403);

  const token = authHeader.split(" ")[1];
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.user = decoded;
    next();
  });
}

module.exports = {
  login,
  verifyToken
};
