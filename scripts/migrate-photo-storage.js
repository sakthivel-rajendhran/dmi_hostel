import { query } from "../src/lib/db/mysql.js";

async function migrate() {
  console.log("Applying student_photos table migration to MySQL...");
  
  await query(`
    CREATE TABLE IF NOT EXISTS student_photos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id VARCHAR(64) NOT NULL UNIQUE,
      user_id VARCHAR(64) NULL,
      photo_data MEDIUMBLOB NOT NULL,
      mime_type VARCHAR(50) NOT NULL DEFAULT 'image/jpeg',
      file_name VARCHAR(255) NULL,
      file_size INT NOT NULL,
      width INT DEFAULT 400,
      height INT DEFAULT 400,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_student_photos_student (student_id),
      INDEX idx_student_photos_user (user_id)
    ) ENGINE=InnoDB;
  `);

  console.log("✓ student_photos table created/verified successfully in MySQL!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
