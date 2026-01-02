const express = require("express");
const cors = require("cors");
const path = require("path");
const { login } = require("./auth");
const cmsRoutes = require("./cmsRoutes");

const app = express();
const PORT = 3000;

/* ======================================================
   DEBUG LOGS (VERY IMPORTANT)
====================================================== */

// Shows exactly which server.js is running
console.log("SERVER FILE:", __filename);

// Shows exactly which cmsRoutes.js is loaded
console.log("CMS ROUTES LOADED FROM:", require.resolve("./cmsRoutes"));

/* -------------------------
   MIDDLEWARE
-------------------------- */
app.use(cors());
app.use(express.json());

/* -------------------------
   AUTH ROUTES
-------------------------- */
app.post("/api/login", login);

/* -------------------------
   CMS ROUTES (NAMESPACED)
-------------------------- */
app.use("/api/cms", cmsRoutes);

/* -------------------------
   STATIC FILES (IMAGES)
-------------------------- */
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "assets"))
);

app.use(
  "/assets/uploads",
  express.static(path.join(__dirname, "..", "assets", "uploads"))
);


/* -------------------------
   START SERVER
-------------------------- */
app.listen(PORT, () => {
  console.log("✅ Admin server running on http://localhost:" + PORT);
});
