-- Vishwakarma Enterprises - Admin + Staff Management System
-- Run this on your MySQL server after creating the database.

CREATE TABLE IF NOT EXISTS staff (
  staff_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NULL,
  aadhaar_number VARCHAR(12) NULL,
  username VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_image_path VARCHAR(255) NULL,
  role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  salary_per_day INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (staff_id),
  UNIQUE KEY uq_staff_aadhaar (aadhaar_number),
  UNIQUE KEY uq_staff_username (username)
);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT NOT NULL AUTO_INCREMENT,
  staff_id INT NOT NULL,
  date DATE NOT NULL,
  check_in_time DATETIME NULL,
  check_out_time DATETIME NULL,
  check_in_lat DECIMAL(10,7) NULL,
  check_in_lng DECIMAL(10,7) NULL,
  check_out_lat DECIMAL(10,7) NULL,
  check_out_lng DECIMAL(10,7) NULL,
  check_in_image_path VARCHAR(255) NULL,
  check_out_image_path VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_staff_date (staff_id, date),
  CONSTRAINT fk_attendance_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_detail (
  id BIGINT NOT NULL AUTO_INCREMENT,
  staff_id INT NOT NULL,
  date DATE NOT NULL,
  work_description TEXT NOT NULL,
  work_image_path VARCHAR(255) NULL,
  voice_record_path VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_work_detail_staff_date (staff_id, date),
  CONSTRAINT fk_work_detail_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leaves (
  id BIGINT NOT NULL AUTO_INCREMENT,
  staff_id INT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leaves_staff_date (staff_id, from_date, to_date),
  KEY idx_leaves_status_date (status, created_at),
  CONSTRAINT fk_leaves_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
  CONSTRAINT fk_leaves_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gallery (
  id BIGINT NOT NULL AUTO_INCREMENT,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  image_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS hero_images (
  id BIGINT NOT NULL AUTO_INCREMENT,
  title VARCHAR(120) NULL,
  subtitle VARCHAR(255) NULL,
  image_path VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hero_active_sort (active, sort_order, id)
);
