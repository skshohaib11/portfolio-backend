console.log("CMS ROUTES FILE ACTIVE:", __filename);

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { verifyToken } = require("./auth");
const pool = require("./db");

const router = express.Router();

/* ======================================================
   PUBLIC: GET CMS CONTENT
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
        .map(s => s.name)
    }));

    res.json({
      hero: hero.rows[0] || { name: "", title: "", tagline: "" },
      skillCategories,
      projects: projects.rows,
      experience: experience.rows,
      education: education.rows
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
  const { title } = req.body;

  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  await pool.query(
    "INSERT INTO skill_categories (id, title) VALUES ($1,$2)",
    [id, title]
  );

  res.json({ message: "Category added", id });
});


router.post("/skills", verifyToken, async (req, res) => {
  const { category_id, name } = req.body;
  await pool.query(
    "INSERT INTO skills (category_id, name) VALUES ($1,$2)",
    [category_id, name]
  );
  res.json({ message: "Skill added" });
});

router.delete("/skills/:id", verifyToken, async (req, res) => {
  await pool.query("DELETE FROM skills WHERE id=$1", [req.params.id]);
  res.json({ message: "Skill deleted" });
});

/* ======================================================
   PROJECTS (NO FILE CMS, DB ONLY)
====================================================== */
router.post("/projects", verifyToken, async (req, res) => {
  const { title, description, link } = req.body;

  await pool.query(
    `INSERT INTO projects (title, description, link)
     VALUES ($1,$2,$3)`,
    [title, description, link]
  );

  res.json({ message: "Project added" });
});


router.delete("/projects/:id", verifyToken, async (req, res) => {
  await pool.query("DELETE FROM projects WHERE id=$1", [req.params.id]);
  res.json({ message: "Project deleted" });
});

/* ======================================================
   EXPERIENCE
====================================================== */
router.post("/experience", verifyToken, async (req, res) => {
  const { company, designation, from, to, responsibilities } = req.body;

  const responsibilitiesArray = Array.isArray(responsibilities)
    ? responsibilities
    : responsibilities.split("\n").filter(Boolean);

  await pool.query(
    `INSERT INTO experience
     (company, designation, from_date, to_date, responsibilities)
     VALUES ($1,$2,$3,$4,$5)`,
    [company, designation, from, to, responsibilitiesArray]
  );

  res.json({ message: "Experience added" });
});


router.delete("/experience/:id", verifyToken, async (req, res) => {
  await pool.query("DELETE FROM experience WHERE id=$1", [req.params.id]);
  res.json({ message: "Experience deleted" });
});

/* ======================================================
   EDUCATION
====================================================== */
router.post("/education", verifyToken, async (req, res) => {
  const { institute, degree, year, image, description } = req.body;

  await pool.query(
    `INSERT INTO education
     (institute, degree, year, image, description)
     VALUES ($1,$2,$3,$4,$5)`,
    [institute, degree, year, image, description]
  );

  res.json({ message: "Education added" });
});


router.delete("/education/:id", verifyToken, async (req, res) => {
  await pool.query("DELETE FROM education WHERE id=$1", [req.params.id]);
  res.json({ message: "Education deleted" });
});

/* ======================================================
   EXPORT (THIS IS THE KEY)
====================================================== */
module.exports = router;
