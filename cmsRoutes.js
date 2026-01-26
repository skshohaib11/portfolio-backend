console.log("CMS ROUTES FILE ACTIVE:", __filename);

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { verifyToken } = require("./auth");
const pool = require("./db");

const router = express.Router();


const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });





/* ======================================================
   PUBLIC: GET CMS CONTENT (SAFE IMAGE PATHS)
====================================================== */
router.get("/content", async (req, res) => {
  try {
    const hero = await pool.query("SELECT * FROM hero LIMIT 1");
    const categories = await pool.query("SELECT * FROM skill_categories");
    const skills = await pool.query("SELECT * FROM skills");
    const projects = await pool.query("SELECT * FROM projects");
    const experience = await pool.query("SELECT * FROM experience");
    const education = await pool.query("SELECT * FROM education");

    const skillCategories = categories.rows.map(cat => ({
      id: cat.id,
      title: cat.title,
      items: skills.rows
        .filter(s => s.category_id === cat.id)
        .map(s => ({
          id: s.id,
          name: s.name
        }))
    }));

    /* ===============================
       IMAGE SAFETY HELPERS
    =============================== */
    const safeImage = (row, key) => {
      if (!row[key]) return null;

      const fullPath = path.join(__dirname, row[key]);
      return fs.existsSync(fullPath) ? row[key] : null;
    };

    const safeProjects = projects.rows.map(p => ({
      ...p,
      image: safeImage(p, "image")
    }));

    const safeExperience = experience.rows.map(e => ({
      ...e,
      logo: safeImage(e, "logo")
    }));

    const safeEducation = education.rows.map(e => ({
      ...e,
      image: safeImage(e, "image")
    }));

    res.json({
      hero: hero.rows[0] || { name: "", title: "", tagline: "" },
      skillCategories,
      projects: safeProjects,
      experience: safeExperience,
      education: safeEducation
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load CMS content" });
  }
});

/* ======================================================
   HERO (ADMIN)
====================================================== */
router.put("/hero", verifyToken, async (req, res) => {
  const { name, title, tagline } = req.body;

  try {
    await pool.query("DELETE FROM hero");
    await pool.query(
      "INSERT INTO hero (name, title, tagline) VALUES ($1,$2,$3)",
      [name, title, tagline]
    );
    res.json({ message: "Hero updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Hero update failed" });
  }
});

/* ======================================================
   SKILLS
====================================================== */
router.post("/skill-categories", verifyToken, async (req, res) => {
  return res.status(403).json({
    message: "Skill categories are fixed and cannot be modified"
  });
});




router.post("/skills", verifyToken, async (req, res) => {
  const { category_id, name } = req.body;

  if (!category_id || !name) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    // 🔑 Convert title → UUID
    const catResult = await pool.query(
      "SELECT id FROM skill_categories WHERE title = $1",
      [category_id]
    );

    if (catResult.rows.length === 0) {
      return res.status(400).json({
        message: "Skill category not found in database"
      });
    }

    const realCategoryId = catResult.rows[0].id;

    await pool.query(
      "INSERT INTO skills (category_id, name) VALUES ($1, $2)",
      [realCategoryId, name]
    );

    res.status(201).json({ message: "Skill added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add skill" });
  }
});

router.delete("/skills/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM skills WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Skill not found" });
    }

    res.json({ message: "Skill deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete skill" });
  }
});


/* ======================================================
   PROJECTS (NO FILE CMS, DB ONLY)
====================================================== */
router.post(
  "/projects",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    const { title, description, link, tools } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    await pool.query(
      `INSERT INTO projects (title, description, link, tools, image)
       VALUES ($1,$2,$3,$4,$5)`,
      [title, description, link, tools, image]
    );

    res.json({ message: "Project added" });
  }
);



router.delete("/projects/:id", verifyToken, async (req, res) => {
  await pool.query("DELETE FROM projects WHERE id=$1", [req.params.id]);
  res.json({ message: "Project deleted" });
});

/* ======================================================
   EXPERIENCE
====================================================== */
router.post(
  "/experience",
  verifyToken,
  upload.single("logo"),
  async (req, res) => {
    try {
      const { company, designation, from, to, responsibilities } = req.body;

      // ✅ HTML date inputs already send YYYY-MM-DD
      const fromDate = from && from !== "" ? from : null;
      const toDate = to && to !== "" ? to : null;

      const responsibilitiesArray = responsibilities
        .split("\n")
        .filter(Boolean);

      const logo = req.file ? `/uploads/${req.file.filename}` : null;

      await pool.query(
        `INSERT INTO experience
         (company, designation, from_date, to_date, responsibilities, logo)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [company, designation, fromDate, toDate, responsibilitiesArray, logo]
      );

      res.json({ message: "Experience added" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to add experience" });
    }
  }
);




router.delete("/experience/:id", verifyToken, async (req, res) => {
  await pool.query("DELETE FROM experience WHERE id=$1", [req.params.id]);
  res.json({ message: "Experience deleted" });
});

/* ======================================================
   EDUCATION
====================================================== */
router.post(
  "/education",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    const { institute, degree, year, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    await pool.query(
      `INSERT INTO education (institute, degree, year, image, description)
       VALUES ($1,$2,$3,$4,$5)`,
      [institute, degree, year, image, description]
    );

    res.json({ message: "Education added" });
  }
);


router.delete("/education/:id", verifyToken, async (req, res) => {
  await pool.query("DELETE FROM education WHERE id=$1", [req.params.id]);
  res.json({ message: "Education deleted" });
});

/* ======================================================
   EXPORT (THIS IS THE KEY)
====================================================== */
module.exports = router;
