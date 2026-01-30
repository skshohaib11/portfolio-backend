const express = require("express");
const multer = require("multer");
const { Upload } = require("@aws-sdk/lib-storage");
const r2 = require("./r2");
const { verifyToken } = require("./auth");
const pool = require("./db");

const router = express.Router();

/* ======================================================
   MULTER (MEMORY ONLY – REQUIRED FOR R2)
====================================================== */
const upload = multer({ storage: multer.memoryStorage() });

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
        .map(s => ({ id: s.id, name: s.name }))
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
   HERO
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
    res.status(500).json({ error: "Hero update failed" });
  }
});

/* ======================================================
   SKILLS
====================================================== */
router.post("/skills", verifyToken, async (req, res) => {
  const { category_id, name } = req.body;

  try {
    const cat = await pool.query(
      "SELECT id FROM skill_categories WHERE title = $1",
      [category_id]
    );

    if (!cat.rows.length) {
      return res.status(400).json({ message: "Category not found" });
    }

    await pool.query(
      "INSERT INTO skills (category_id, name) VALUES ($1,$2)",
      [cat.rows[0].id, name]
    );

    res.json({ message: "Skill added" });
  } catch {
    res.status(500).json({ message: "Failed to add skill" });
  }
});

router.delete("/skills/:id", verifyToken, async (req, res) => {
  await pool.query("DELETE FROM skills WHERE id=$1", [req.params.id]);
  res.json({ message: "Skill deleted" });
});

/* ======================================================
   PROJECTS (R2 UPLOAD)
====================================================== */
router.post(
  "/projects",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    try {
      let imageUrl = null;

      if (req.file) {
        const key = `projects/${Date.now()}-${req.file.originalname}`;

        const uploader = new Upload({
          client: r2,
          params: {
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
          }
        });

        await uploader.done();
        imageUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
      }

      const { title, description, link, tools } = req.body;

      await pool.query(
        `INSERT INTO projects (title, description, link, tools, image)
         VALUES ($1,$2,$3,$4,$5)`,
        [title, description, link, tools, imageUrl]
      );

      res.json({ message: "Project added" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Project upload failed" });
    }
  }
);

router.delete("/projects/:id", verifyToken, async (req, res) => {
  await pool.query("DELETE FROM projects WHERE id=$1", [req.params.id]);
  res.json({ message: "Project deleted" });
});

/* ======================================================
   EXPERIENCE (R2 LOGO)
====================================================== */
router.post(
  "/experience",
  verifyToken,
  upload.single("logo"),
  async (req, res) => {
    try {
      let logoUrl = null;

      if (req.file) {
        const key = `experience/${Date.now()}-${req.file.originalname}`;

        const uploader = new Upload({
          client: r2,
          params: {
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
          }
        });

        await uploader.done();
        logoUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
      }

      const { company, designation, from, to, responsibilities } = req.body;

      await pool.query(
        `INSERT INTO experience
         (company, designation, from_date, to_date, responsibilities, logo)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          company,
          designation,
          from || null,
          to || null,
          responsibilities.split("\n").filter(Boolean),
          logoUrl
        ]
      );

      res.json({ message: "Experience added" });
    } catch {
      res.status(500).json({ message: "Experience upload failed" });
    }
  }
);

/* ======================================================
   EDUCATION (R2 IMAGE)
====================================================== */
router.post(
  "/education",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    try {
      let imageUrl = null;

      if (req.file) {
        const key = `education/${Date.now()}-${req.file.originalname}`;

        const uploader = new Upload({
          client: r2,
          params: {
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
          }
        });

        await uploader.done();
        imageUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
      }

      const { institute, degree, year, description } = req.body;

      await pool.query(
        `INSERT INTO education (institute, degree, year, image, description)
         VALUES ($1,$2,$3,$4,$5)`,
        [institute, degree, year, imageUrl, description]
      );

      res.json({ message: "Education added" });
    } catch {
      res.status(500).json({ message: "Education upload failed" });
    }
  }
);

router.delete("/education/:id", verifyToken, async (req, res) => {
  await pool.query("DELETE FROM education WHERE id=$1", [req.params.id]);
  res.json({ message: "Education deleted" });
});

module.exports = router;
