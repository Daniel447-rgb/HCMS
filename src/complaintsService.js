import React from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase.js";
import emailjs from "@emailjs/browser";

// ─── EmailJS Config ──────────────────────────────────────────────
const SERVICE_ID          = "service_y6ghu6n";
const PUBLIC_KEY          = "zn0JqYXhvlJmQzURk";
const STUDENT_TEMPLATE_ID = "template_29mxxrp";
const PORTER_TEMPLATE_ID  = "template_3924c1c";

emailjs.init(PUBLIC_KEY);

// ── Collection references ─────────────────────────────────────────
const complaintsRef    = collection(db, "complaints");
const usersRef         = collection(db, "users");
const notificationsRef = collection(db, "notifications");
const blocksRef        = collection(db, "blocks");

// ─────────────────────────────────────────────────────────────────
//  AI COMPLAINT ANALYSIS — uses Groq API
// ─────────────────────────────────────────────────────────────────

const GROQ_API_KEY = "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"; 

export async function analyzeComplaint(title, description) {
  const prompt = `
You are an AI assistant for a university hostel complaint management system in Nigeria.
Analyze the complaint below and return ONLY a valid JSON object. No explanation. No markdown. No extra text whatsoever.

Complaint Title: "${title}"
Complaint Description: "${description}"

Return exactly this JSON:
{
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "category": "Plumbing" | "Electricity" | "Security" | "Maintenance" | "Internet" | "Sanitation" | "Staff" | "Noise" | "Other",
  "anonymous": "YES" | "NO",
  "aiReason": "One short sentence explaining the priority and anonymous decision"
}

=== PRIORITY RULES (apply strictly) ===
HIGH — assign if ANY of these apply:
- No water, water supply cut off, flooding, major water leak
- No electricity, power outage, electrical fault or fire risk
- Theft, burglary, break-in, missing items, robbery
- Violence, fight, assault, physical threat
- Fire, smoke, gas leak, explosion risk
- Health emergency, injury, illness affecting students
- Security breach, broken locks on main doors or gates
- Issue affecting many students or the entire block

MEDIUM — assign if complaint is about:
- Broken fan, broken AC, broken bed, broken furniture
- Blocked toilet, leaking tap, minor plumbing issue
- WiFi not working, internet slow or down
- Dirty environment, uncollected waste, poor sanitation
- Minor electrical issues like a broken socket or bulb
- General maintenance issues affecting daily comfort

LOW — assign for:
- Cosmetic issues like peeling paint, worn surfaces
- Suggestions or improvement requests
- Very minor inconveniences with no health or safety risk

=== ANONYMOUS DETECTION RULES (apply strictly) ===
Set anonymous to YES if the complaint contains ANY of the following:
- Words expressing fear: "scared", "afraid", "fear", "frightened", "worried about my safety"
- Harassment or bullying: "harassing", "bullying", "intimidating", "picking on me", "victimizing"
- Threats: "threatened", "blackmailed", "warned me not to report", "they will deal with me"
- Staff misconduct: "porter misbehaving", "warden is corrupt", "staff is demanding", "officer collecting money"
- Corruption or bribery: "bribery", "paying before fixing", "demanding money", "collecting bribe"
- Sexual misconduct: "sexual", "harassed me sexually", "touched me inappropriately", "unwanted advances"
- Request to hide identity: "don't reveal", "please don't mention my name", "anonymous", "keep my identity", "confidential", "I don't want anyone to know it's me"
- Retaliation fear: "they will retaliate", "I will be punished", "I'm scared to be identified"

Set anonymous to NO for all other complaints.

=== CATEGORY RULES ===
Plumbing — pipes, taps, toilet, drainage, water supply, flooding
Electricity — power, lights, sockets, generator, electrical, no light
Security — theft, lock, gate, violence, danger, unsafe, robbery, burglary
Maintenance — furniture, fan, AC, bed, window, door, ceiling, broken items, repairs
Internet — WiFi, network, connection, slow internet, no data
Sanitation — cleaning, waste, trash, hygiene, smell, dirty
Staff — porter behavior, warden, security officer conduct, staff attitude
Noise — loud music, noise disturbance, neighbors making noise
Other — anything that does not fit above

Return ONLY the raw JSON object. Nothing else.
`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens:  300,
        messages: [
          {
            role:    "system",
            content: "You are a strict complaint analysis assistant for a Nigerian university hostel system. You ONLY respond with a valid JSON object. You never include markdown, code fences, or any explanation outside the JSON. You follow the priority and anonymous detection rules exactly as given.",
          },
          {
            role:    "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Groq API error:", errorData);
      throw new Error(`Groq API returned ${response.status}`);
    }

    const data    = await response.json();
    const rawText = data.choices?.[0]?.message?.content ?? "";
    const clean   = rawText.replace(/```json|```/g, "").trim();
    const parsed  = JSON.parse(clean);

    const validPriorities = ["HIGH", "MEDIUM", "LOW"];
    const validCategories = [
      "Plumbing", "Electricity", "Security", "Maintenance",
      "Internet", "Sanitation", "Staff", "Noise", "Other",
    ];
    const validAnonymous = ["YES", "NO"];

    return {
      priority:  validPriorities.includes(parsed.priority)  ? parsed.priority  : "MEDIUM",
      category:  validCategories.includes(parsed.category)  ? parsed.category  : "Other",
      anonymous: validAnonymous.includes(parsed.anonymous)  ? parsed.anonymous : "NO",
      aiReason:  typeof parsed.aiReason === "string"        ? parsed.aiReason  : "Automatically analyzed.",
    };

  } catch (err) {
    console.error("Groq AI analysis failed, using fallback:", err);
    return {
      priority:  "MEDIUM",
      category:  "Other",
      anonymous: "NO",
      aiReason:  "AI analysis unavailable. Please review this complaint manually.",
    };
  }
}
// ─────────────────────────────────────────────────────────────────
//  EMAIL HELPERS
// ─────────────────────────────────────────────────────────────────

async function emailStudent({ toEmail, toName, complaintTitle, newStatus }) {
  try {
    await emailjs.send(SERVICE_ID, STUDENT_TEMPLATE_ID, {
      to_email:        toEmail,
      to_name:         toName,
      complaint_title: complaintTitle,
      new_status:      newStatus,
    });
    console.log("✅ Student email sent to", toEmail);
  } catch (err) {
    console.error("❌ Student email failed:", err);
  }
}

async function emailPorters({ complaintTitle, hostel, room, category, priority }) {
  try {
    const { getDocs } = await import("firebase/firestore");
    const snap        = await getDocs(usersRef);
    const porters     = snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => u.role === "porter" && u.email);

    await Promise.all(
      porters.map(porter =>
        emailjs.send(SERVICE_ID, PORTER_TEMPLATE_ID, {
          to_email:        porter.email,
          to_name:         porter.name,
          complaint_title: complaintTitle,
          hostel,
          room,
          category,
          priority,
        })
      )
    );
    console.log(`✅ Porter emails sent to ${porters.length} porter(s)`);
  } catch (err) {
    console.error("❌ Porter email failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────
//  PHOTO UPLOAD
// ─────────────────────────────────────────────────────────────────

export async function uploadEvidencePhoto(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader   = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const formData = new FormData();
  formData.append("key",        "YOUR_IMGBB_API_KEY");
  formData.append("image",      base64);
  formData.append("expiration", "15552000");

  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body:   formData,
  });

  const data = await response.json();
  if (!data.success) throw new Error("Photo upload failed");

  return {
    url:       data.data.url,
    viewUrl:   data.data.display_url,
    deleteUrl: data.data.delete_url,
  };
}

// ─────────────────────────────────────────────────────────────────
//  COMPLAINTS — SUBMIT (now includes AI analysis)
// ─────────────────────────────────────────────────────────────────

export async function submitComplaint(data) {
  let evidenceUrl     = null;
  let evidenceViewUrl = null;

  // 1. Upload photo if attached
  if (data.photoFile) {
    try {
      const uploaded  = await uploadEvidencePhoto(data.photoFile);
      evidenceUrl     = uploaded.url;
      evidenceViewUrl = uploaded.viewUrl;
    } catch (err) {
      console.error("Photo upload failed, submitting without photo:", err);
    }
  }

  // 2. Run AI analysis — this determines priority, category, anonymous, aiReason
  const aiResult = await analyzeComplaint(data.title, data.desc);

  // 3. Remove photoFile before saving to Firestore
  const { photoFile, ...complaintData } = data;

  // 4. Save to Firestore — AI fields override whatever the student selected
  const ref = await addDoc(complaintsRef, {
    ...complaintData,

    // ── AI fields — these are what actually get stored ───────────
    priority:   aiResult.priority,   // HIGH / MEDIUM / LOW
    category:   aiResult.category,   // AI-detected category
    anonymous:  aiResult.anonymous,  // YES / NO
    aiReason:   aiResult.aiReason,   // Short explanation
    aiAnalyzed: true,

    // ── Photo ────────────────────────────────────────────────────
    evidenceUrl,
    evidenceViewUrl,

    // ── Status ───────────────────────────────────────────────────
    status:          "open",
    claimedBy:       null,
    claimedById:     null,
    resolutionNotes: "",
    submittedAt:     serverTimestamp(),
    updatedAt:       serverTimestamp(),
  });

  // 5. In-app notification to student
  await createNotification({
    userId:      data.studentId,
    type:        "submitted",
    title:       "Complaint Submitted",
    message:     `Your complaint "${data.title}" has been received. AI Priority: ${aiResult.priority}.`,
    complaintId: ref.id,
  });

  // 6. Email all porters
  await emailPorters({
    complaintTitle: data.title,
    hostel:         data.hostel,
    room:           data.room,
    category:       aiResult.category,
    priority:       aiResult.priority,
  });

  // 7. Return BOTH the id AND the aiResult so StudentApp can display it
  return { id: ref.id, aiResult };
}
// ─────────────────────────────────────────────────────────────────
//  COMPLAINTS — LISTEN
// ─────────────────────────────────────────────────────────────────

export function listenAllComplaints(callback) {
  const q = query(complaintsRef, orderBy("submittedAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(formatComplaint));
  });
}

export function listenStudentComplaints(studentId, callback) {
  const q = query(
    complaintsRef,
    where("studentId", "==", studentId),
    orderBy("submittedAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(formatComplaint));
  });
}

// ─────────────────────────────────────────────────────────────────
//  COMPLAINTS — CLAIM & UPDATE
// ─────────────────────────────────────────────────────────────────

export async function claimComplaint(complaintId, porterName, porterUid) {
  const { getDoc } = await import("firebase/firestore");
  const snap       = await getDoc(doc(db, "complaints", complaintId));
  const data       = snap.data();

  await updateDoc(doc(db, "complaints", complaintId), {
    claimedBy:   porterName,
    claimedById: porterUid,
    status:      "progress",
    updatedAt:   serverTimestamp(),
  });

  await createNotification({
    userId:      data.studentId,
    type:        "claimed",
    title:       "Porter Assigned",
    message:     `${porterName} has claimed your complaint "${data.title}" and is now working on it.`,
    complaintId,
  });

  if (data.studentEmail) {
    await emailStudent({
      toEmail:        data.studentEmail,
      toName:         data.studentName,
      complaintTitle: data.title,
      newStatus:      "In Progress — A porter has been assigned to your complaint",
    });
  }
}

export async function updateComplaintStatus(complaintId, status, notes = "") {
  const { getDoc } = await import("firebase/firestore");
  const snap       = await getDoc(doc(db, "complaints", complaintId));
  const data       = snap.data();

  await updateDoc(doc(db, "complaints", complaintId), {
    status,
    resolutionNotes: notes,
    updatedAt:       serverTimestamp(),
  });

  let notifType    = "";
  let notifTitle   = "";
  let notifMessage = "";
  let emailStatus  = "";

  if (status === "progress") {
    notifType    = "progress";
    notifTitle   = "Work In Progress";
    notifMessage = `Your complaint "${data.title}" is now being actively worked on.`;
    emailStatus  = "In Progress — Work on your complaint has begun";
  } else if (status === "resolved") {
    notifType    = "resolved";
    notifTitle   = "Complaint Resolved ✅";
    notifMessage = `Your complaint "${data.title}" has been resolved. ${notes ? `Note: ${notes}` : ""}`;
    emailStatus  = `Resolved — Your complaint has been fixed. ${notes ? `Porter note: ${notes}` : ""}`;
  }

  if (notifType) {
    await createNotification({
      userId:      data.studentId,
      type:        notifType,
      title:       notifTitle,
      message:     notifMessage,
      complaintId,
    });

    if (data.studentEmail) {
      await emailStudent({
        toEmail:        data.studentEmail,
        toName:         data.studentName,
        complaintTitle: data.title,
        newStatus:      emailStatus,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────

export async function createNotification({ userId, type, title, message, complaintId }) {
  await addDoc(notificationsRef, {
    userId,
    type,
    title,
    message,
    complaintId: complaintId ?? null,
    read:        false,
    createdAt:   serverTimestamp(),
  });
}

export function listenStudentNotifications(studentId, callback) {
  const q = query(
    notificationsRef,
    where("userId", "==", studentId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }) ?? "Just now",
    })));
  });
}

export async function markNotificationRead(notificationId) {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function markAllNotificationsRead(studentId) {
  const { getDocs } = await import("firebase/firestore");
  const q    = query(notificationsRef, where("userId", "==", studentId), where("read", "==", false));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
}

// ─────────────────────────────────────────────────────────────────
//  PORTER MANAGEMENT
// ─────────────────────────────────────────────────────────────────

export function listenPorters(callback) {
  return onSnapshot(usersRef, (snap) => {
    const porters = snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => u.role === "porter");
    callback(porters);
  });
}

export async function deletePorter(porterUid) {
  await deleteDoc(doc(db, "users", porterUid));
}

// ─────────────────────────────────────────────────────────────────
//  BLOCKS & ROOMS
// ─────────────────────────────────────────────────────────────────

export function listenBlocks(callback) {
  const q = query(blocksRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addBlock(blockName) {
  await addDoc(blocksRef, {
    name:      blockName.trim(),
    rooms:     [],
    createdAt: serverTimestamp(),
  });
}

export async function deleteBlock(blockId) {
  await deleteDoc(doc(db, "blocks", blockId));
}

export async function addRoom(blockId, roomName) {
  await updateDoc(doc(db, "blocks", blockId), {
    rooms: arrayUnion(roomName.trim()),
  });
}

export async function removeRoom(blockId, roomName) {
  await updateDoc(doc(db, "blocks", blockId), {
    rooms: arrayRemove(roomName),
  });
}

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────

function formatComplaint(d) {
  const data = d.data();
  return {
    id: d.id,
    ...data,
    submittedAt: data.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    }) ?? "Just now",
    updatedAt: data.updatedAt?.toDate?.()?.toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    }) ?? "Just now",
  };
}