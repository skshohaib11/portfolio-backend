const pool = require("./db");

(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB OK:", res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("DB ERROR:", err);
    process.exit(1);
  }
})();
