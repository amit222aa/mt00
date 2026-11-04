# College Management System — MCA SQL Project

A beginner-friendly college management web application using **MySQL, Node.js, Express, HTML, CSS and JavaScript**.

## Features

- Dashboard with counts for students, courses, faculty and enrollments.
- Student CRUD: create, read, update, delete and search.
- Course CRUD.
- Faculty CRUD.
- Department lookup.
- SQL reports: student count by course and student results.
- MySQL primary keys, foreign keys, unique constraints and validation.
- Parameterized SQL queries to reduce SQL injection risk.
- Sample records included in `database.sql`.

> This is an academic demonstration project. It does not include production authentication, role permissions, or a payment system. Do not deploy it publicly without adding security controls.

## Requirements

Install:
1. Node.js (LTS): https://nodejs.org/
2. MySQL Server and preferably MySQL Workbench: https://dev.mysql.com/downloads/
3. Visual Studio Code: https://code.visualstudio.com/

## Step 1 — Create the database

### Option A: MySQL Workbench
1. Start MySQL Server.
2. Open MySQL Workbench and connect to your local server.
3. Open `database.sql` from this project.
4. Click the lightning bolt **Execute** button.
5. Confirm the `college_management` schema appears in the SCHEMAS panel.

### Option B: MySQL command line
Open a terminal in the project folder and run (adjust the path if needed):

```bash
mysql -u root -p < database.sql
```

Enter your MySQL password when asked.

## Step 2 — Configure the project

1. Open this project folder in VS Code.
2. Copy `.env.example` and rename the copy to `.env`.
3. Open `.env` and set the password for your MySQL `root` account.

Example:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=college_management
PORT=3000
```

If your MySQL root account has no password, leave `DB_PASSWORD=` empty. Do not share the `.env` file or upload it publicly.

## Step 3 — Install Node.js packages

In the VS Code terminal, make sure the terminal is in the project folder and run:

```bash
npm install
```

## Step 4 — Start the application

```bash
npm start
```

When the connection works, the terminal should show:

```text
College Management System running at http://localhost:3000
```

Open this address in your browser:

http://localhost:3000

Keep the terminal open while using the application.

## Step 5 — Try the sample data

The database script creates these demo records:

### Courses
| Code | Course |
|---|---|
| MCA-GEN | Master of Computer Applications |
| MCA-AI | MCA Artificial Intelligence |
| BCA-GEN | Bachelor of Computer Applications |

### Students
| Roll number | Name | Course |
|---|---|---|
| MCA2026001 | Aarav Sharma | MCA |
| MCA2026002 | Priya Verma | MCA AI |
| BCA2026001 | Rohan Singh | BCA |

You can add, edit, search and delete records using the website.

## Step 6 — Verify data in MySQL

Run these commands in MySQL Workbench:

```sql
USE college_management;

SHOW TABLES;

SELECT * FROM students;
SELECT * FROM courses;
SELECT * FROM faculty;
SELECT * FROM enrollments;
SELECT * FROM results;
```

### Report 1: Students with course names

```sql
SELECT s.roll_no, s.full_name, s.email, c.course_name
FROM students AS s
LEFT JOIN courses AS c ON s.course_id = c.course_id;
```

### Report 2: Count students in each course

```sql
SELECT c.course_name, COUNT(s.student_id) AS total_students
FROM courses AS c
LEFT JOIN students AS s ON c.course_id = s.course_id
GROUP BY c.course_id, c.course_name;
```

### Report 3: Student result report

```sql
SELECT s.roll_no, s.full_name, c.course_name,
       e.semester, r.marks_obtained, r.max_marks,
       r.grade, r.result_status
FROM results AS r
JOIN enrollments AS e ON r.enrollment_id = e.enrollment_id
JOIN students AS s ON e.student_id = s.student_id
JOIN courses AS c ON e.course_id = c.course_id;
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check database connection |
| GET | `/api/dashboard` | Dashboard counts |
| GET | `/api/students` | List students |
| GET | `/api/students?search=Aarav` | Search students |
| POST | `/api/students` | Add student |
| PUT | `/api/students/1` | Update student ID 1 |
| DELETE | `/api/students/1` | Delete student ID 1 |
| GET/POST/PUT/DELETE | `/api/courses` | Course CRUD |
| GET/POST/PUT/DELETE | `/api/faculty` | Faculty CRUD |
| GET | `/api/reports/course-counts` | Course enrollment counts |
| GET | `/api/reports/results` | Student result report |

For POST and PUT endpoints, send a JSON body containing the relevant field names.

## Project folder structure

```text
college-management-system/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example
├── .gitignore
├── database.sql
├── package.json
├── server.js
└── README.md
```

## Troubleshooting

**Error: Access denied for user 'root'**
- Check `DB_USER` and `DB_PASSWORD` in `.env`.
- Restart `npm start` after changing `.env`.

**Error: Unknown database 'college_management'**
- Import `database.sql` into MySQL first.

**Error: connect ECONNREFUSED 127.0.0.1:3306**
- Start your MySQL service and check `DB_PORT`.

**Port 3000 is already in use**
- Change `PORT=3001` in `.env` and open `http://localhost:3001`.

**Duplicate entry**
- Roll number, email, course code and employee code must be unique.

## Concepts for your MCA viva

- **Primary key:** Uniquely identifies a record.
- **Foreign key:** Links a record to another table.
- **CRUD:** Create, Read, Update and Delete.
- **JOIN:** Combines related rows from tables.
- **GROUP BY:** Groups rows for aggregate calculations such as `COUNT()`.
- **REST API:** Lets the frontend exchange data with the backend using HTTP.
- **Parameterized query:** Passes values separately from SQL text to help prevent SQL injection.
- **Normalization:** Organizes data into related tables to reduce duplication.

## Aim

To design and implement a College Management System using MySQL for storing and managing students, courses, faculty, enrollments and academic results.

## Learning outcomes

1. Create relational tables with primary and foreign keys.
2. Perform CRUD operations using SQL and a web interface.
3. Connect a Node.js application to MySQL.
4. Use joins and aggregate functions to create reports.
5. Validate user input and handle common database errors.
6. Understand how a database-backed web application works.
