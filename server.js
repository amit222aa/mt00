require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "2107",
    database: process.env.DB_NAME || "college_management",
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true
});

const asyncRoute = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

const tables = {
    students: {
        table: "students",
        id: "student_id",
        fields: ["roll_no", "full_name", "email", "phone", "gender", "admission_date", "course_id"],
        required: ["roll_no", "full_name", "email", "admission_date"],
        select: `SELECT s.student_id, s.roll_no, s.full_name, s.email, s.phone, s.gender,
                    DATE_FORMAT(s.admission_date, '%Y-%m-%d') AS admission_date,
                    s.course_id, c.course_name
             FROM students s LEFT JOIN courses c ON s.course_id = c.course_id`
    },
    courses: {
        table: "courses",
        id: "course_id",
        fields: ["course_code", "course_name", "duration_years", "fees", "department_id"],
        required: ["course_code", "course_name", "duration_years", "fees"],
        select: `SELECT c.course_id, c.course_code, c.course_name, c.duration_years, c.fees,
                    c.department_id, d.department_name
             FROM courses c LEFT JOIN departments d ON c.department_id = d.department_id`
    },
    faculty: {
        table: "faculty",
        id: "faculty_id",
        fields: ["employee_code", "full_name", "email", "phone", "designation", "department_id"],
        required: ["employee_code", "full_name", "email", "designation"],
        select: `SELECT f.faculty_id, f.employee_code, f.full_name, f.email, f.phone,
                    f.designation, f.department_id, d.department_name
             FROM faculty f LEFT JOIN departments d ON f.department_id = d.department_id`
    }
};

function cleanPayload(config, body) {
    const data = {};
    for (const field of config.fields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            data[field] = body[field] === "" ? null : body[field];
        }
    }
    return data;
}

app.get("/api/health", asyncRoute(async(_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: process.env.DB_NAME || "college_management" });
}));

app.get("/api/dashboard", asyncRoute(async(_req, res) => {
    const [
        [students]
    ] = await pool.query("SELECT COUNT(*) AS total FROM students");
    const [
        [courses]
    ] = await pool.query("SELECT COUNT(*) AS total FROM courses");
    const [
        [faculty]
    ] = await pool.query("SELECT COUNT(*) AS total FROM faculty");
    const [
        [enrollments]
    ] = await pool.query("SELECT COUNT(*) AS total FROM enrollments");
    res.json({
        students: students.total,
        courses: courses.total,
        faculty: faculty.total,
        enrollments: enrollments.total
    });
}));

app.get("/api/departments", asyncRoute(async(_req, res) => {
    const [rows] = await pool.query("SELECT department_id, department_name FROM departments ORDER BY department_name");
    res.json(rows);
}));

app.get("/api/reports/course-counts", asyncRoute(async(_req, res) => {
    const [rows] = await pool.query(`
    SELECT c.course_code, c.course_name, COUNT(s.student_id) AS total_students
    FROM courses c LEFT JOIN students s ON s.course_id = c.course_id
    GROUP BY c.course_id, c.course_code, c.course_name
    ORDER BY c.course_name
  `);
    res.json(rows);
}));

app.get("/api/reports/results", asyncRoute(async(_req, res) => {
    const [rows] = await pool.query(`
    SELECT
      r.result_id,
      r.enrollment_id,
      s.roll_no,
      s.full_name,
      c.course_name,
      e.semester,
      e.academic_year,
      r.marks_obtained,
      r.max_marks,
      r.grade,
      r.result_status
    FROM results r
    JOIN enrollments e ON e.enrollment_id = r.enrollment_id
    JOIN students s ON s.student_id = e.student_id
    JOIN courses c ON c.course_id = e.course_id
    ORDER BY s.full_name
  `);

    res.json(rows);
}));

// Get enrollments for the Add/Edit Result form
app.get("/api/enrollments", asyncRoute(async(_req, res) => {
    const [rows] = await pool.query(`
    SELECT
      e.enrollment_id,
      s.roll_no,
      s.full_name,
      c.course_name,
      e.semester,
      e.academic_year
    FROM enrollments e
    JOIN students s ON s.student_id = e.student_id
    JOIN courses c ON c.course_id = e.course_id
    ORDER BY s.full_name
  `);

    res.json(rows);
}));

// Add a result
app.post("/api/results", asyncRoute(async(req, res) => {
    const {
        enrollment_id,
        marks_obtained,
        max_marks,
        grade,
        result_status
    } = req.body || {};

    const enrollmentId = Number(enrollment_id);
    const marks = Number(marks_obtained);
    const maximum = Number(max_marks);
    const status = result_status || "Pending";

    if (!Number.isInteger(enrollmentId) ||
        enrollmentId < 1 ||
        marks_obtained === "" ||
        marks_obtained === undefined ||
        max_marks === "" ||
        max_marks === undefined ||
        !Number.isFinite(marks) ||
        !Number.isFinite(maximum) ||
        marks < 0 ||
        maximum <= 0 ||
        marks > maximum ||
        !["Pass", "Fail", "Pending"].includes(status)
    ) {
        return res.status(400).json({
            error: "Enter a valid enrollment, marks, maximum marks and result status."
        });
    }

    const [result] = await pool.query(
        `INSERT INTO results
      (enrollment_id, marks_obtained, max_marks, grade, result_status)
     VALUES (?, ?, ?, ?, ?)`, [enrollmentId, marks, maximum, grade || null, status]
    );

    res.status(201).json({
        message: "Result added successfully",
        result_id: result.insertId
    });
}));

// Edit an existing result
app.put("/api/results/:id", asyncRoute(async(req, res) => {
    const id = Number(req.params.id);
    const {
        enrollment_id,
        marks_obtained,
        max_marks,
        grade,
        result_status
    } = req.body || {};

    const enrollmentId = Number(enrollment_id);
    const marks = Number(marks_obtained);
    const maximum = Number(max_marks);
    const status = result_status;

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid result ID." });
    }

    if (!Number.isInteger(enrollmentId) ||
        enrollmentId < 1 ||
        marks_obtained === "" ||
        marks_obtained === undefined ||
        max_marks === "" ||
        max_marks === undefined ||
        !Number.isFinite(marks) ||
        !Number.isFinite(maximum) ||
        marks < 0 ||
        maximum <= 0 ||
        marks > maximum ||
        !["Pass", "Fail", "Pending"].includes(status)
    ) {
        return res.status(400).json({
            error: "Enter valid result details."
        });
    }

    const [result] = await pool.query(
        `UPDATE results
     SET enrollment_id = ?,
         marks_obtained = ?,
         max_marks = ?,
         grade = ?,
         result_status = ?
     WHERE result_id = ?`, [enrollmentId, marks, maximum, grade || null, status, id]
    );

    if (!result.affectedRows) {
        return res.status(404).json({ error: "Result not found." });
    }

    res.json({ message: "Result updated successfully" });
}));

// Delete a result
app.delete("/api/results/:id", asyncRoute(async(req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid result ID." });
    }

    const [result] = await pool.query(
        "DELETE FROM results WHERE result_id = ?", [id]
    );

    if (!result.affectedRows) {
        return res.status(404).json({ error: "Result not found." });
    }

    res.json({ message: "Result deleted successfully" });
}));

for (const [resource, config] of Object.entries(tables)) {
    app.get(`/api/${resource}`, asyncRoute(async(req, res) => {
        const search = String(req.query.search || "").trim();
        let sql = config.select;
        const params = [];
        if (search) {
            const searchable = resource === "students" ? ["s.roll_no", "s.full_name", "s.email", "c.course_name"] :
                resource === "courses" ? ["c.course_code", "c.course_name", "d.department_name"] : ["f.employee_code", "f.full_name", "f.email", "d.department_name"];
            sql += " WHERE " + searchable.map((col) => `${col} LIKE ?`).join(" OR ");
            params.push(...searchable.map(() => `%${search}%`));
        }
        sql += ` ORDER BY ${config.id} DESC`;
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    }));

    app.post(`/api/${resource}`, asyncRoute(async(req, res) => {
        const data = cleanPayload(config, req.body || {});
        const missing = config.required.filter((field) =>
            data[field] === undefined || data[field] === null || String(data[field]).trim() === ""
        );
        if (missing.length) return res.status(400).json({ error: `Required fields: ${missing.join(", ")}` });
        const fields = Object.keys(data);
        const placeholders = fields.map(() => "?").join(", ");
        const [result] = await pool.query(
            `INSERT INTO ${config.table} (${fields.join(", ")}) VALUES (${placeholders})`,
            fields.map((field) => data[field])
        );
        res.status(201).json({ message: "Record created successfully", id: result.insertId });
    }));

    app.put(`/api/${resource}/:id`, asyncRoute(async(req, res) => {
                    const id = Number(req.params.id);
                    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid record ID" });
                    const data = cleanPayload(config, req.body || {});
                    const fields = Object.keys(data);
                    if (!fields.length) return res.status(400).json({ error: "No fields supplied to update" });
                    const missing = config.required.filter((field) =>
                        fields.includes(field) && (data[field] === null || String(data[field]).trim() === "")
                    );
                    if (missing.length) return res.status(400).json({ error: `Required fields: ${missing.join(", ")}` });
                    const [result] = await pool.query(
                            `UPDATE ${config.table} SET ${fields.map((field) => `${field} = ?`).join(", ")} WHERE ${config.id} = ?`,
      [...fields.map((field) => data[field]), id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Record not found" });
    res.json({ message: "Record updated successfully" });
  }));

  app.delete(`/api/${resource}/:id`, asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid record ID" });
    const [result] = await pool.query(`DELETE FROM ${config.table} WHERE ${config.id} = ?`, [id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Record not found" });
    res.json({ message: "Record deleted successfully" });
  }));
}

app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found" }));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "Duplicate value. Roll number, email, course code, or employee code must be unique." });
  }
  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ error: "Selected course or department does not exist." });
  }
  if (err.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(409).json({ error: "This record is linked to other records and cannot be deleted yet." });
  }
  res.status(500).json({ error: "Server/database error. Check terminal and MySQL connection." });
});

async function start() {
  try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => console.log(`College Management System running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("Could not connect to MySQL. Check .env and make sure MySQL is running.");
    console.error(err.message);
    process.exit(1);
  }
}
start();