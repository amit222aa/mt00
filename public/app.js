const $ = (id) => document.getElementById(id);

let coursesCache = [];
let departmentsCache = [];

// API helper
async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

// Display success and error messages
function showMessage(text, type = "success") {
    const box = $("message");

    if (!box) {
        alert(text);
        return;
    }

    box.textContent = text;
    box.className = `message ${type}`;

    window.scrollTo({ top: 0, behavior: "smooth" });

    window.setTimeout(() => {
        box.classList.add("hidden");
    }, 4500);
}

// Escape HTML to prevent unsafe HTML insertion
function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[ch]));
}

// Format money in Indian Rupees
function money(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value || 0));
}

// Empty table row
function emptyRow(cols, text = "No records found.") {
    return `
    <tr>
      <td colspan="${cols}" class="empty">
        ${escapeHtml(text)}
      </td>
    </tr>
  `;
}

// Generate HTML table
function table(headers, rows) {
    return `
    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows || emptyRow(headers.length)}
      </tbody>
    </table>
  `;
}

// Generate Edit and Delete buttons
function actions(resource, id) {
  return `
    <div class="actions">
      <button
        type="button"
        class="action-btn"
        data-edit="${resource}"
        data-id="${id}">
        Edit
      </button>

      <button
        type="button"
        class="action-btn delete"
        data-delete="${resource}"
        data-id="${id}">
        Delete
      </button>
    </div>
  `;
}

// Navigate between sections
function navigate(view) {
  document.querySelectorAll(".view").forEach(el => {
    el.classList.add("hidden");
  });

  const target = $(`${view}-view`);

  if (!target) {
    showMessage(`Section "${view}" was not found.`, "error");
    return;
  }

  target.classList.remove("hidden");

  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.view === view);
  });

  const titles = {
    dashboard: "Dashboard",
    students: "Students",
    courses: "Courses",
    faculty: "Faculty",
    reports: "Reports"
  };

  if ($("page-title")) {
    $("page-title").textContent = titles[view] || "Dashboard";
  }

  if (view === "dashboard") loadDashboard();
  if (view === "students") loadStudents();
  if (view === "courses") loadCourses();
  if (view === "faculty") loadFaculty();
  if (view === "reports") loadReports();
}

// Sidebar navigation
document.querySelectorAll("[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    navigate(btn.dataset.view);
  });
});

// Load dropdown data
async function loadLookups() {
  [coursesCache, departmentsCache] = await Promise.all([
    api("/api/courses"),
    api("/api/departments")
  ]);

  if ($("course_id")) {
    $("course_id").innerHTML =
      `<option value="">No course selected</option>` +
      coursesCache.map(c => `
        <option value="${c.course_id}">
          ${escapeHtml(c.course_code)} — ${escapeHtml(c.course_name)}
        </option>
      `).join("");
  }

  const deptOptions =
    `<option value="">No department</option>` +
    departmentsCache.map(d => `
      <option value="${d.department_id}">
        ${escapeHtml(d.department_name)}
      </option>
    `).join("");

  if ($("course_department_id")) {
    $("course_department_id").innerHTML = deptOptions;
  }

  if ($("faculty_department_id")) {
    $("faculty_department_id").innerHTML = deptOptions;
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const d = await api("/api/dashboard");

    if ($("stat-students")) {
      $("stat-students").textContent = d.students;
    }

    if ($("stat-courses")) {
      $("stat-courses").textContent = d.courses;
    }

    if ($("stat-faculty")) {
      $("stat-faculty").textContent = d.faculty;
    }

    if ($("stat-enrollments")) {
      $("stat-enrollments").textContent = d.enrollments;
    }

    const rows = await api("/api/reports/course-counts");

    if ($("course-summary")) {
      $("course-summary").innerHTML = table(
        ["Course code", "Course name", "Total students"],
        rows.map(r => `
          <tr>
            <td>
              <span class="pill">${escapeHtml(r.course_code)}</span>
            </td>
            <td>${escapeHtml(r.course_name)}</td>
            <td><strong>${escapeHtml(r.total_students)}</strong></td>
          </tr>
        `).join("")
      );
    }
  } catch (e) {
    showMessage(e.message, "error");
  }
}

// Students
async function loadStudents(search = "") {
  try {
    const rows = await api(
      `/api/students?search=${encodeURIComponent(search)}`
    );

    $("students-table").innerHTML = table(
      ["Roll no.", "Student", "Email", "Course", "Admission date", "Actions"],
      rows.map(s => `
        <tr>
          <td>
            <span class="pill">${escapeHtml(s.roll_no)}</span>
          </td>
          <td>
            <strong>${escapeHtml(s.full_name)}</strong>
            <br>
            <small class="muted">${escapeHtml(s.gender)}</small>
          </td>
          <td>${escapeHtml(s.email)}</td>
          <td>${escapeHtml(s.course_name || "Not assigned")}</td>
          <td>${escapeHtml(s.admission_date)}</td>
          <td>${actions("students", s.student_id)}</td>
        </tr>
      `).join("")
    );
  } catch (e) {
    showMessage(e.message, "error");
  }
}

// Courses
async function loadCourses() {
  try {
    coursesCache = await api("/api/courses");

    $("courses-table").innerHTML = table(
      ["Code", "Course name", "Duration", "Fees", "Department", "Actions"],
      coursesCache.map(c => `
        <tr>
          <td>
            <span class="pill">${escapeHtml(c.course_code)}</span>
          </td>
          <td><strong>${escapeHtml(c.course_name)}</strong></td>
          <td>${escapeHtml(c.duration_years)} years</td>
          <td>${money(c.fees)}</td>
          <td>${escapeHtml(c.department_name || "Not assigned")}</td>
          <td>${actions("courses", c.course_id)}</td>
        </tr>
      `).join("")
    );
  } catch (e) {
    showMessage(e.message, "error");
  }
}

// Faculty
async function loadFaculty() {
  try {
    const rows = await api("/api/faculty");

    $("faculty-table").innerHTML = table(
      [
        "Employee code",
        "Faculty name",
        "Email",
        "Designation",
        "Department",
        "Actions"
      ],
      rows.map(f => `
        <tr>
          <td>
            <span class="pill">${escapeHtml(f.employee_code)}</span>
          </td>
          <td><strong>${escapeHtml(f.full_name)}</strong></td>
          <td>${escapeHtml(f.email)}</td>
          <td>${escapeHtml(f.designation)}</td>
          <td>${escapeHtml(f.department_name || "Not assigned")}</td>
          <td>${actions("faculty", f.faculty_id)}</td>
        </tr>
      `).join("")
    );
  } catch (e) {
    showMessage(e.message, "error");
  }
}

// Reports
// Course enrollment report is read-only.
// Student result report supports Add, Edit and Delete.
async function loadReports() {
  try {
    const [counts, results, enrollments] = await Promise.all([
      api("/api/reports/course-counts"),
      api("/api/reports/results"),
      api("/api/enrollments")
    ]);

    // Course enrollment report
    $("report-course-table").innerHTML = table(
      ["Course code", "Course name", "Total students"],
      counts.map(r => `
        <tr>
          <td>${escapeHtml(r.course_code)}</td>
          <td>${escapeHtml(r.course_name)}</td>
          <td>${escapeHtml(r.total_students)}</td>
        </tr>
      `).join("")
    );

    // Save data for the result form
    window.resultEnrollments = enrollments;
    window.resultRecords = results;

    // Student result report
    $("report-results-table").innerHTML = `
      <div style="margin-bottom:15px">
        <button type="button" id="add-result" class="action-btn">
          + Add Result
        </button>
      </div>

      <div id="result-form-panel" class="panel hidden">
        <h3 id="result-form-title">Add Student Result</h3>

        <form id="result-form">
          <input type="hidden" id="result-id">

          <div style="margin-bottom:12px">
            <label for="result-enrollment">Student Enrollment</label>
            <select id="result-enrollment" required>
              <option value="">Select student enrollment</option>
            </select>
          </div>

          <div style="margin-bottom:12px">
            <label for="result-marks">Marks Obtained</label>
            <input
              type="number"
              id="result-marks"
              min="0"
              step="0.01"
              required
            >
          </div>

          <div style="margin-bottom:12px">
            <label for="result-max-marks">Maximum Marks</label>
            <input
              type="number"
              id="result-max-marks"
              min="0.01"
              step="0.01"
              value="100"
              required
            >
          </div>

          <div style="margin-bottom:12px">
            <label for="result-grade">Grade</label>
            <input
              type="text"
              id="result-grade"
              maxlength="3"
              placeholder="e.g. A, B, A+"
            >
          </div>

          <div style="margin-bottom:12px">
            <label for="result-status">Result Status</label>
            <select id="result-status" required>
              <option value="Pending">Pending</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          </div>

          <div style="margin-top:15px">
            <button type="submit" class="action-btn">
              Save Result
            </button>

            <button
              type="button"
              id="cancel-result"
              class="action-btn">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div id="result-table"></div>
    `;

    $("result-table").innerHTML = table(
      [
        "Roll no.",
        "Student",
        "Course",
        "Semester",
        "Year",
        "Marks",
        "Grade",
        "Status",
        "Actions"
      ],
      results.map(r => `
        <tr>
          <td>${escapeHtml(r.roll_no)}</td>
          <td>${escapeHtml(r.full_name)}</td>
          <td>${escapeHtml(r.course_name)}</td>
          <td>${escapeHtml(r.semester)}</td>
          <td>${escapeHtml(r.academic_year)}</td>
          <td>
            ${escapeHtml(r.marks_obtained)}/${escapeHtml(r.max_marks)}
          </td>
          <td>
            <span class="pill">${escapeHtml(r.grade || "—")}</span>
          </td>
          <td>${escapeHtml(r.result_status)}</td>
          <td>${actions("results", r.result_id)}</td>
        </tr>
      `).join("")
    );

  } catch (e) {
    showMessage(e.message, "error");
  }
}

// Open Add/Edit Student Result form
function openResultForm(record = null) {
  const panel = $("result-form-panel");
  const form = $("result-form");

  if (!panel || !form) {
    showMessage("Result form could not be found.", "error");
    return;
  }

  form.reset();

  $("result-id").value = record ? record.result_id : "";

  $("result-form-title").textContent = record
    ? "Edit Student Result"
    : "Add Student Result";

  const enrollments = window.resultEnrollments || [];
  const results = window.resultRecords || [];

  const options = enrollments.map(e => {
    const alreadyHasResult = results.some(r =>
      String(r.enrollment_id) === String(e.enrollment_id)
    );

    // Each enrollment can have only one result.
    // Keep the current enrollment selectable while editing.
    const disabled = alreadyHasResult &&
      String(e.enrollment_id) !== String(record?.enrollment_id);

    return `
      <option
        value="${escapeHtml(e.enrollment_id)}"
        ${disabled ? "disabled" : ""}
        ${
          record &&
          String(record.enrollment_id) === String(e.enrollment_id)
            ? "selected"
            : ""
        }>
        ${escapeHtml(e.roll_no)} — ${escapeHtml(e.full_name)}
        — ${escapeHtml(e.course_name)}
        — Semester ${escapeHtml(e.semester)}
        — ${escapeHtml(e.academic_year)}
        ${disabled ? "(Result already exists)" : ""}
      </option>
    `;
  }).join("");

  $("result-enrollment").innerHTML =
    `<option value="">Select student enrollment</option>` + options;

  if (record) {
    $("result-enrollment").value = record.enrollment_id;
    $("result-marks").value = record.marks_obtained;
    $("result-max-marks").value = record.max_marks;
    $("result-grade").value = record.grade || "";
    $("result-status").value = record.result_status;
  } else {
    $("result-max-marks").value = 100;
    $("result-status").value = "Pending";
  }

  panel.classList.remove("hidden");

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// Open Student, Course or Faculty form
function openForm(resource, record = null) {
  const prefix = resource === "students"
    ? "student"
    : resource === "courses"
      ? "course"
      : "faculty";

  const panel = $(`${prefix}-form-panel`);
  const form = $(`${prefix}-form`);

  panel.classList.remove("hidden");
  form.reset();

  $(`${prefix}-id`).value = "";

  $(`${prefix}-form-title`).textContent = record
    ? `Edit ${resource.slice(0, -1)}`
    : `Add ${resource.slice(0, -1)}`;

  if (!record) {
    if (resource === "students") {
      $("admission_date").value = new Date().toISOString().slice(0, 10);
      $("gender").value = "Prefer not to say";
    }

    if (resource === "courses") {
      $("duration_years").value = 2;
      $("fees").value = 0;
    }
  } else if (resource === "students") {
    $("student-id").value = record.student_id;
    $("roll_no").value = record.roll_no;
    $("full_name").value = record.full_name;
    $("email").value = record.email;
    $("phone").value = record.phone || "";
    $("gender").value = record.gender || "Prefer not to say";
    $("admission_date").value = record.admission_date;
    $("course_id").value = record.course_id || "";
  } else if (resource === "courses") {
    $("course-id").value = record.course_id;
    $("course_code").value = record.course_code;
    $("course_name").value = record.course_name;
    $("duration_years").value = record.duration_years;
    $("fees").value = record.fees;
    $("course_department_id").value = record.department_id || "";
  } else {
    $("faculty-id").value = record.faculty_id;
    $("employee_code").value = record.employee_code;
    $("faculty_name").value = record.full_name;
    $("faculty_email").value = record.email;
    $("faculty_phone").value = record.phone || "";
    $("designation").value = record.designation;
    $("faculty_department_id").value = record.department_id || "";
  }

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// Close Student, Course or Faculty form
function closeForm(resource) {
  const prefix = resource === "students"
    ? "student"
    : resource === "courses"
      ? "course"
      : "faculty";

  $(`${prefix}-form-panel`).classList.add("hidden");
  $(`${prefix}-form`).reset();
}

// Add buttons
$("add-student").addEventListener("click", () => {
  openForm("students");
});

$("add-course").addEventListener("click", () => {
  openForm("courses");
});

$("add-faculty").addEventListener("click", () => {
  openForm("faculty");
});

// Cancel and reset buttons
["students", "courses", "faculty"].forEach(resource => {
  const prefix = resource === "students"
    ? "student"
    : resource === "courses"
      ? "course"
      : "faculty";

  $(`cancel-${prefix}`).addEventListener("click", () => {
    closeForm(resource);
  });

  $(`reset-${prefix}`).addEventListener("click", () => {
    openForm(resource);
  });
});

// Student search
$("student-search-btn").addEventListener("click", () => {
  loadStudents($("student-search").value);
});

$("student-search").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    loadStudents(e.target.value);
  }
});

$("student-clear-btn").addEventListener("click", () => {
  $("student-search").value = "";
  loadStudents();
});

// Handle Edit, Delete, Add Result and Cancel Result buttons
document.addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-edit]");
  const del = event.target.closest("[data-delete]");

  // Add Student Result
  if (event.target.closest("#add-result")) {
    try {
      await loadReports();
      openResultForm();
    } catch (e) {
      showMessage(e.message, "error");
    }

    return;
  }

  // Cancel Student Result form
  if (event.target.closest("#cancel-result")) {
    $("result-form-panel").classList.add("hidden");
    $("result-form").reset();
    return;
  }

  // Edit records
  if (edit) {
    const { edit: resource, id } = edit.dataset;

    // Edit Student Result
    if (resource === "results") {
      const record = (window.resultRecords || []).find(row =>
        String(row.result_id) === String(id)
      );

      if (record) {
        openResultForm(record);
      } else {
        showMessage("Result not found. Refresh the Reports section.", "error");
      }

      return;
    }

    // Edit Student, Course or Faculty
    try {
      const rows = await api(`/api/${resource}`);

      const key = resource === "students"
        ? "student_id"
        : resource === "courses"
          ? "course_id"
          : "faculty_id";

      const record = rows.find(row => String(row[key]) === String(id));

      if (record) {
        openForm(resource, record);
      }
    } catch (e) {
      showMessage(e.message, "error");
    }

    return;
  }

  // Delete records
  if (del) {
    const { delete: resource, id } = del.dataset;

    const label = resource === "results"
      ? "student result"
      : resource.slice(0, -1);

    if (!confirm(
      `Delete this ${label} record? This action cannot be undone.`
    )) {
      return;
    }

    try {
      await api(`/api/${resource}/${id}`, {
        method: "DELETE"
      });

      showMessage(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted successfully.`);

      if (resource === "students") {
        await loadStudents();
      }

      if (resource === "courses") {
        await loadLookups();
        await loadCourses();
      }

      if (resource === "faculty") {
        await loadFaculty();
      }

      if (resource === "results") {
        await loadReports();
      }

      await loadDashboard();

    } catch (e) {
      showMessage(e.message, "error");
    }
  }
});

// Submit Student Result form
document.addEventListener("submit", async (event) => {
  if (event.target.id !== "result-form") {
    return;
  }

  event.preventDefault();

  const id = $("result-id").value;

  const body = {
    enrollment_id: $("result-enrollment").value,
    marks_obtained: $("result-marks").value,
    max_marks: $("result-max-marks").value,
    grade: $("result-grade").value.trim(),
    result_status: $("result-status").value
  };

  // Frontend validation
  const marks = Number(body.marks_obtained);
  const maxMarks = Number(body.max_marks);

  if (!body.enrollment_id) {
    showMessage("Please select a student enrollment.", "error");
    return;
  }

  if (
    body.marks_obtained === "" ||
    body.max_marks === "" ||
    !Number.isFinite(marks) ||
    !Number.isFinite(maxMarks) ||
    marks < 0 ||
    maxMarks <= 0 ||
    marks > maxMarks
  ) {
    showMessage(
      "Enter valid marks. Marks obtained cannot exceed maximum marks.",
      "error"
    );
    return;
  }

  try {
    await api(
      id ? `/api/results/${id}` : "/api/results",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body)
      }
    );

    showMessage(
      id
        ? "Student result updated successfully."
        : "Student result added successfully."
    );

    await loadReports();
    await loadDashboard();

  } catch (e) {
    showMessage(e.message, "error");
  }
});

// Student form submission
$("student-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = $("student-id").value;

  const body = {
    roll_no: $("roll_no").value.trim(),
    full_name: $("full_name").value.trim(),
    email: $("email").value.trim(),
    phone: $("phone").value.trim(),
    gender: $("gender").value,
    admission_date: $("admission_date").value,
    course_id: $("course_id").value || null
  };

  try {
    await api(
      id ? `/api/students/${id}` : "/api/students",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body)
      }
    );

    closeForm("students");

    showMessage(
      id ? "Student updated." : "Student added."
    );

    await loadStudents();
    await loadDashboard();

  } catch (err) {
    showMessage(err.message, "error");
  }
});

// Course form submission
$("course-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = $("course-id").value;

  const body = {
    course_code: $("course_code").value.trim(),
    course_name: $("course_name").value.trim(),
    duration_years: Number($("duration_years").value),
    fees: Number($("fees").value),
    department_id: $("course_department_id").value || null
  };

  try {
    await api(
      id ? `/api/courses/${id}` : "/api/courses",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body)
      }
    );

    closeForm("courses");

    showMessage(
      id ? "Course updated." : "Course added."
    );

    await loadLookups();
    await loadCourses();
    await loadDashboard();

  } catch (err) {
    showMessage(err.message, "error");
  }
});

// Faculty form submission
$("faculty-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = $("faculty-id").value;

  const body = {
    employee_code: $("employee_code").value.trim(),
    full_name: $("faculty_name").value.trim(),
    email: $("faculty_email").value.trim(),
    phone: $("faculty_phone").value.trim(),
    designation: $("designation").value.trim(),
    department_id: $("faculty_department_id").value || null
  };

  try {
    await api(
      id ? `/api/faculty/${id}` : "/api/faculty",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body)
      }
    );

    closeForm("faculty");

    showMessage(
      id ? "Faculty updated." : "Faculty added."
    );

    await loadFaculty();
    await loadDashboard();

  } catch (err) {
    showMessage(err.message, "error");
  }
});

// Initialize application
(async function init() {
  try {
    await api("/api/health");

    await loadLookups();
    await loadDashboard();

  } catch (e) {
    showMessage(
      "Cannot connect to the app database. Confirm MySQL is running, " +
      "database.sql was imported, and .env settings are correct. " +
      e.message,
      "error"
    );
  }
})();