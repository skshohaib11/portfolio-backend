
console.log("CMS ROUTES FILE ACTIVE:", __filename);


const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { verifyToken } = require("./auth");

const router = express.Router();
const CMS_PATH = path.join(__dirname, "data", "content.json");

console.log("CMS FILE USED:", CMS_PATH);

/* ======================================================
   UTILITY FUNCTIONS
====================================================== */

function readCMS() {
  return JSON.parse(fs.readFileSync(CMS_PATH, "utf-8"));
}

function writeCMS(data) {
  fs.writeFileSync(CMS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}`;
}
/* ======================================================
   GET FULL CMS CONTENT (PUBLIC)
   GET /api/cms/content
====================================================== */
router.get("/content", (req, res) => {
  try {
    const data = readCMS();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load CMS content" });
  }
});

/* ======================================================
   HERO UPDATE (ADMIN)
====================================================== */
router.put("/hero", verifyToken, (req, res) => {
  const { name, title, tagline } = req.body;
  const cms = readCMS();

  cms.hero = { name, title, tagline };
  writeCMS(cms);

  res.json({ message: "Hero section updated" });
});

/* ======================================================
   SKILLS & Expertise CRUD
====================================================== */
router.post("/skill-categories/:id/items", verifyToken, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const cms = readCMS();
  const category = cms.skillCategories.find(c => c.id === id);

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  category.items.push(name);
  writeCMS(cms);

  res.json({ message: "Skill added" });
});

router.delete("/skill-categories/:id/items/:index", verifyToken, (req, res) => {
  const { id, index } = req.params;

  const cms = readCMS();
  const category = cms.skillCategories.find(c => c.id === id);

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  category.items.splice(index, 1);
  writeCMS(cms);

  res.json({ message: "Skill removed" });
});




/* ======================================================
   MULTER CONFIG (PROJECT IMAGES)
====================================================== */

const PROJECTS_UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "assets",
  "uploads",
  "projects"
);

// ensure folder exists
if (!fs.existsSync(PROJECTS_UPLOAD_DIR)) {
  fs.mkdirSync(PROJECTS_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PROJECTS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.originalname
      .replace(ext, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");

    cb(null, `${name}-${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/png", "image/jpeg", "image/jpg"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only PNG, JPG, JPEG allowed"), false);
  }
  cb(null, true);
};

const uploadProjectImage = multer({
  storage,
  fileFilter
});


/* ===============================
   EDUCATION & EXPERIENCE IMAGES
================================ */

const EDUCATION_UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "assets",
  "uploads",
  "education"
);

const EXPERIENCE_UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "assets",
  "uploads",
  "experience"
);

[EDUCATION_UPLOAD_DIR, EXPERIENCE_UPLOAD_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const educationStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, EDUCATION_UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `edu-${Date.now()}${ext}`);
  }
});

const experienceStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, EXPERIENCE_UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `exp-${Date.now()}${ext}`);
  }
});

const uploadEducationImage = multer({ storage: educationStorage });
const uploadExperienceLogo = multer({ storage: experienceStorage });


/* ======================================================
   PROJECTS CRUD (WITH IMAGE UPLOAD)
====================================================== */
router.post(
  "/projects",
  verifyToken,
  uploadProjectImage.single("image"),
  (req, res) => {
    const { title, tools, description, link } = req.body;
    const cms = readCMS();

    const imagePath = req.file
      ? `/assets/uploads/projects/${req.file.filename}`
      : "";

    cms.projects.push({
      id: generateId("project"),
      title,
      tools: tools ? tools.split(",").map(t => t.trim()) : [],
      description,
      image: imagePath,
      link
    });

    writeCMS(cms);
    res.json({ message: "Project added" });
  }
);

/* ======================================================
   DELETE PROJECT
====================================================== */
router.delete("/projects/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const cms = readCMS();

  const before = cms.projects.length;

  cms.projects = cms.projects.filter(p => p.id !== id);

  const after = cms.projects.length;

  writeCMS(cms);

  if (before === after) {
    return res.status(404).json({ message: "Project not found" });
  }

  res.json({ message: "Project deleted" });
});




/* ======================================================
   EXPERIENCE CRUD
====================================================== */
router.post(
  "/experience",
  verifyToken,
  uploadExperienceLogo.single("logo"),
  (req, res) => {
    const { company, designation, from, to, responsibilities } = req.body;

    const cms = readCMS();

    let parsedResponsibilities = [];

    if (Array.isArray(responsibilities)) {
      parsedResponsibilities = responsibilities;
    } else if (typeof responsibilities === "string") {
      try {
        parsedResponsibilities = JSON.parse(responsibilities);
      } catch {
        parsedResponsibilities = responsibilities
          .split("\n")
          .map(r => r.trim())
          .filter(Boolean);
      }
    }

    const logoPath = req.file
      ? `/assets/uploads/experience/${req.file.filename}`
      : "";

    cms.experience.push({
      id: generateId("exp"),
      company,
      designation,
      from,
      to,
      logo: logoPath,
      responsibilities: parsedResponsibilities
    });

    writeCMS(cms);
    res.json({ message: "Experience added" });
  }
);




router.put("/experience/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const cms = readCMS();

  cms.experience = cms.experience.map(exp =>
    exp.id === id ? { ...exp, ...req.body } : exp
  );

  writeCMS(cms);
  res.json({ message: "Experience updated" });
});

router.delete("/experience/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const cms = readCMS();

  cms.experience = cms.experience.filter(exp => exp.id !== id);

  writeCMS(cms);
  res.json({ message: "Experience deleted" });
});




/* ======================================================
   EDUCATION CRUD
====================================================== */
router.post(
  "/education",
  verifyToken,
  uploadEducationImage.single("image"),
  (req, res) => {
    const { institute, degree, year, description } = req.body;
    const cms = readCMS();

    if (!cms.education) cms.education = [];

    const imagePath = req.file
      ? `/assets/uploads/education/${req.file.filename}`
      : "";

    cms.education.push({
      id: generateId("edu"),
      institute,
      degree,
      year,
      image: imagePath,
      description
    });

    writeCMS(cms);
    res.json({ message: "Education added" });
  }
);


router.delete("/education/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const cms = readCMS();

  cms.education = (cms.education || []).filter(edu => edu.id !== id);

  writeCMS(cms);
  res.json({ message: "Education deleted" });
});


module.exports = router;
