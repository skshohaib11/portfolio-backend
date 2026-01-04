const pool = require("./db"); // adjust path if needed


async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hero (
      id SERIAL PRIMARY KEY,
      name TEXT,
      title TEXT,
      tagline TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS skill_categories (
      id TEXT PRIMARY KEY,
      title TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS skills (
      id SERIAL PRIMARY KEY,
      category_id TEXT REFERENCES skill_categories(id),
      name TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title TEXT,
      description TEXT,
      image TEXT,
      link TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS experience (
      id SERIAL PRIMARY KEY,
      company TEXT,
      designation TEXT,
      from_date DATE,
      to_date DATE,
      logo TEXT,
      responsibilities TEXT[]
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS education (
      id SERIAL PRIMARY KEY,
      institute TEXT,
      degree TEXT,
      year TEXT,
      image TEXT,
      description TEXT
    );
  `);

  console.log("✅ Database initialized");
  process.exit();
}

init();
