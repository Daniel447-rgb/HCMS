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

// ─── EmailJS Config ──────
const SERVICE_ID          = "service_y6ghu6n";
const PUBLIC_KEY          = "zn0JqYXhvlJmQzURk";
const STUDENT_TEMPLATE_ID = "template_29mxxrp";
const PORTER_TEMPLATE_ID  = "template_3924c1c";

emailjs.init(PUBLIC_KEY);

// ── Collection references ──────────────────────────────────────────
const complaintsRef    = collection(db, "complaints");
const usersRef         = collection(db, "users");
const notificationsRef = collection(db, "notifications");
const blocksRef        = collection(db, "blocks"); // ← NEW

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
//  COMPLAINTS
// ─────────────────────────────────────────────────────────────────

export async function submitComplaint(data) {
  let evidenceUrl     = null;
  let evidenceViewUrl = null;

  if (data.photoFile) {
    try {
      const uploaded  = await uploadEvidencePhoto(data.photoFile);
      evidenceUrl     = uploaded.url;
      evidenceViewUrl = uploaded.viewUrl;
    } catch (err) {
      console.error("Photo upload failed, submitting without photo:", err);
    }
  }

  const { photoFile, ...complaintData } = data;

  const ref = await addDoc(complaintsRef, {
    ...complaintData,
    evidenceUrl,
    evidenceViewUrl,
    status:          "open",
    claimedBy:       null,
    claimedById:     null,
    resolutionNotes: "",
    submittedAt:     serverTimestamp(),
    updatedAt:       serverTimestamp(),
  });

  await createNotification({
    userId:      data.studentId,
    type:        "submitted",
    title:       "Complaint Submitted",
    message:     `Your complaint "${data.title}" has been received and is under review.`,
    complaintId: ref.id,
  });

  await emailPorters({
    complaintTitle: data.title,
    hostel:         data.hostel,
    room:           data.room,
    category:       data.category,
    priority:       data.priority,
  });

  return ref.id;
}

export function listenAllComplaints(callback) {
  const q = query(complaintsRef, orderBy("submittedAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(formatComplaint));
  });
}

export function listenStudentComplaints(studentId, callback) {
  const q = query(complaintsRef, orderBy("submittedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map(formatComplaint).filter(c => c.studentId === studentId);
    callback(all);
  });
}

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
//  BLOCKS & ROOMS MANAGEMENT ← ALL NEW
// ─────────────────────────────────────────────────────────────────

// Listen to all blocks in real time
export function listenBlocks(callback) {
  const q = query(blocksRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// Add a new block
export async function addBlock(blockName) {
  await addDoc(blocksRef, {
    name:      blockName.trim(),
    rooms:     [],
    createdAt: serverTimestamp(),
  });
}

// Delete a block and all its rooms
export async function deleteBlock(blockId) {
  await deleteDoc(doc(db, "blocks", blockId));
}

// Add a room to a block
export async function addRoom(blockId, roomName) {
  await updateDoc(doc(db, "blocks", blockId), {
    rooms: arrayUnion(roomName.trim()),
  });
}

// Remove a room from a block
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