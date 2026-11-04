-- MCA College Management System
-- Run this file in MySQL Workbench or the MySQL command line.

CREATE DATABASE IF NOT EXISTS college_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE college_management;

CREATE TABLE IF NOT EXISTS departments (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  office_location VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS courses (
  course_id INT AUTO_INCREMENT PRIMARY KEY,
  course_code VARCHAR(20) NOT NULL UNIQUE,
  course_name VARCHAR(120) NOT NULL,
  duration_years TINYINT UNSIGNED NOT NULL DEFAULT 2,
  fees DECIMAL(10,2) NOT NULL DEFAULT 0,
  department_id INT,
  CONSTRAINT fk_course_department FOREIGN KEY (department_id)
    REFERENCES departments(department_id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS students (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  roll_no VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  gender ENUM('Female','Male','Other','Prefer not to say') DEFAULT 'Prefer not to say',
  admission_date DATE NOT NULL,
  course_id INT,
  CONSTRAINT fk_student_course FOREIGN KEY (course_id)
    REFERENCES courses(course_id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS faculty (
  faculty_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  designation VARCHAR(80) NOT NULL,
  department_id INT,
  CONSTRAINT fk_faculty_department FOREIGN KEY (department_id)
    REFERENCES departments(department_id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  semester TINYINT UNSIGNED NOT NULL,
  academic_year VARCHAR(9) NOT NULL,
  enrolled_on DATE NOT NULL,
  CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id)
    REFERENCES students(student_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_enrollment_course FOREIGN KEY (course_id)
    REFERENCES courses(course_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT uq_student_course_term UNIQUE (student_id, course_id, semester, academic_year)
);

CREATE TABLE IF NOT EXISTS results (
  result_id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL UNIQUE,
  marks_obtained DECIMAL(5,2) NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL DEFAULT 100,
  grade VARCHAR(3),
  result_status ENUM('Pass','Fail','Pending') NOT NULL DEFAULT 'Pending',
  CONSTRAINT chk_marks CHECK (marks_obtained >= 0 AND max_marks > 0 AND marks_obtained <= max_marks),
  CONSTRAINT fk_result_enrollment FOREIGN KEY (enrollment_id)
    REFERENCES enrollments(enrollment_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Seed data. INSERT IGNORE makes this safe to run again.
INSERT IGNORE INTO departments (department_id, department_name, office_location) VALUES
(1, 'Computer Applications', 'Block A'),
(2, 'Computer Science', 'Block B'),
(3, 'Management Studies', 'Block C');

INSERT IGNORE INTO courses (course_id, course_code, course_name, duration_years, fees, department_id) VALUES
(1, 'MCA-GEN', 'Master of Computer Applications', 2, 85000.00, 1),
(2, 'MCA-AI', 'MCA Artificial Intelligence', 2, 95000.00, 2),
(3, 'BCA-GEN', 'Bachelor of Computer Applications', 3, 65000.00, 1);

INSERT IGNORE INTO students (student_id, roll_no, full_name, email, phone, gender, admission_date, course_id) VALUES
(1, 'MCA2026001', 'Aarav Sharma', 'aarav@example.com', '9876500001', 'Male', '2026-08-01', 1),
(2, 'MCA2026002', 'Priya Verma', 'priya@example.com', '9876500002', 'Female', '2026-08-02', 2),
(3, 'BCA2026001', 'Rohan Singh', 'rohan@example.com', '9876500003', 'Male', '2026-08-03', 3);

INSERT IGNORE INTO faculty (faculty_id, employee_code, full_name, email, phone, designation, department_id) VALUES
(1, 'FAC001', 'Dr. Neha Kapoor', 'neha.kapoor@example.com', '9876510001', 'Associate Professor', 1),
(2, 'FAC002', 'Mr. Karan Mehta', 'karan.mehta@example.com', '9876510002', 'Assistant Professor', 2),
(3, 'FAC003', 'Ms. Simran Gill', 'simran.gill@example.com', '9876510003', 'Lecturer', 3);

INSERT IGNORE INTO enrollments (enrollment_id, student_id, course_id, semester, academic_year, enrolled_on) VALUES
(1, 1, 1, 1, '2026-2027', '2026-08-05'),
(2, 2, 2, 1, '2026-2027', '2026-08-05'),
(3, 3, 3, 1, '2026-2027', '2026-08-06');

INSERT IGNORE INTO results (result_id, enrollment_id, marks_obtained, max_marks, grade, result_status) VALUES
(1, 1, 86, 100, 'A', 'Pass'),
(2, 2, 92, 100, 'A+', 'Pass'),
(3, 3, 67, 100, 'B', 'Pass');

-- Example SQL reports
-- 1. Student list with course name:
-- SELECT s.roll_no, s.full_name, s.email, c.course_name
-- FROM students s LEFT JOIN courses c ON s.course_id = c.course_id;

-- 2. Number of students in each course:
-- SELECT c.course_name, COUNT(s.student_id) AS total_students
-- FROM courses c LEFT JOIN students s ON c.course_id = s.course_id
-- GROUP BY c.course_id, c.course_name;

-- 3. Student result report:
-- SELECT s.full_name, c.course_name, e.semester, r.marks_obtained,
--        r.max_marks, r.grade, r.result_status
-- FROM results r
-- JOIN enrollments e ON r.enrollment_id = e.enrollment_id
-- JOIN students s ON e.student_id = s.student_id
-- JOIN courses c ON e.course_id = c.course_id;
