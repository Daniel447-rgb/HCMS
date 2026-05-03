import emailjs from "@emailjs/browser";

// ── Put your EmailJS credentials here ──────────────────────────
const SERVICE_ID  = "your_service_id";
const PUBLIC_KEY  = "your_public_key";

// Template IDs — create one template per email type in EmailJS
const TEMPLATES = {
  student: "your_student_template_id",
  porter:  "your_porter_template_id",
  admin:   "your_admin_template_id",
};

// ── Initialize once ─────────────────────────────────────────────
emailjs.init(PUBLIC_KEY);

// ── Send email to student when complaint status changes ─────────
export async function sendStudentEmail({ toEmail, toName, complaintTitle, newStatus }) {
  try {
    await emailjs.send(SERVICE_ID, TEMPLATES.student, {
      to_email:        toEmail,
      to_name:         toName,
      complaint_title: complaintTitle,
      new_status:      newStatus,
      app_name:        "HostelDesk",
      university:      "Crawford University",
    });
    console.log("Student email sent");
  } catch (err) {
    console.error("Email failed:", err);
  }
}

// ── Send email to porter when a new complaint is submitted ──────
export async function sendPorterEmail({ toEmail, toName, complaintTitle, hostel, room, category }) {
  try {
    await emailjs.send(SERVICE_ID, TEMPLATES.porter, {
      to_email:        toEmail,
      to_name:         toName,
      complaint_title: complaintTitle,
      hostel:          hostel,
      room:            room,
      category:        category,
      app_name:        "HostelDesk",
      university:      "Crawford University",
    });
    console.log("Porter email sent");
  } catch (err) {
    console.error("Email failed:", err);
  }
}

// ── Send email to Head Porter (admin summary) ───────────────────
export async function sendAdminEmail({ toEmail, toName, complaintTitle, studentName, hostel, priority }) {
  try {
    await emailjs.send(SERVICE_ID, TEMPLATES.admin, {
      to_email:        toEmail,
      to_name:         toName,
      complaint_title: complaintTitle,
      student_name:    studentName,
      hostel:          hostel,
      priority:        priority,
      app_name:        "HostelDesk",
      university:      "Crawford University",
    });
    console.log("Admin email sent");
  } catch (err) {
    console.error("Email failed:", err);
  }
}