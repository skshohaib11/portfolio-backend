require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { login } = require("./auth");
const cmsRoutes = require("./cmsRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

/* ======================================================
   DEBUG LOGS
====================================================== */
console.log("SERVER FILE:", __filename);
console.log("CMS ROUTES LOADED FROM:", require.resolve("./cmsRoutes"));

/* -------------------------
   MIDDLEWARE
-------------------------- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


/* -------------------------
   AUTH ROUTES
-------------------------- */
app.post("/api/login", login);

/* -------------------------
   CMS ROUTES
-------------------------- */
app.use("/api/cms", cmsRoutes);

/* -------------------------
   STATIC FILES
-------------------------- */

app.use(
  "/assets",
  express.static(path.join(__dirname, "assets"))
);

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* -------------------------
   HEALTH CHECK
-------------------------- */
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

const uploadPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}


/* -------------------------
   START SERVER
-------------------------- */
app.listen(PORT, () => {
  console.log("✅ Admin server running on http://localhost:" + PORT);
});
