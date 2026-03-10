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
} from "firebase/firestore";
import { db } from "./firebase.js";

// ── Collection references ──────────────────────────────────────────
const complaintsRef  = collection(db, "complaints");
const usersRef       = collection(db, "users");
const notificationsRef = collection(db, "notifications");

// ─────────────────────────────────────────────────────────────────
//  COMPLAINTS
// ─────────────────────────────────────────────────────────────────

// SUBMIT a new complaint (Student)
export async function submitComplaint(data) {
  const ref = await addDoc(complaintsRef, {
    ...data,
    status:          "open",
    claimedBy:       null,
    claimedById:     null,
    resolutionNotes: "",
    submittedAt:     serverTimestamp(),
    updatedAt:       serverTimestamp(),
  });

  // Notify student that complaint was submitted
  await createNotification({
    userId:  data.studentId,
    type:    "submitted",
    title:   "Complaint Submitted",
    message: `Your complaint "${data.title}" has been received and is under review.`,
    complaintId: ref.id,
  });

  return ref.id;
}

// LISTEN to ALL complaints — real time (Porter + Head Porter)
export function listenAllComplaints(callback) {
  const q = query(complaintsRef, orderBy("submittedAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(formatComplaint));
  });
}

// LISTEN to complaints for a specific student — real time
export function listenStudentComplaints(studentId, callback) {
  const q = query(complaintsRef, orderBy("submittedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map(formatComplaint).filter(c => c.studentId === studentId);
    callback(all);
  });
}

// CLAIM a complaint (Porter self-assigns)
export async function claimComplaint(complaintId, porterName, porterUid) {
  // Get complaint data first so we can notify the student
  const snap = await import("firebase/firestore").then(({ getDoc }) =>
    getDoc(doc(db, "complaints", complaintId))
  );
  const data = snap.data();

  await updateDoc(doc(db, "complaints", complaintId), {
    claimedBy:   porterName,
    claimedById: porterUid,
    status:      "progress",
    updatedAt:   serverTimestamp(),
  });

  // Notify the student
  await createNotification({
    userId:      data.studentId,
    type:        "claimed",
    title:       "Porter Assigned",
    message:     `${porterName} has claimed your complaint "${data.title}" and is now working on it.`,
    complaintId,
  });
}

// UPDATE complaint status (Porter who claimed it)
export async function updateComplaintStatus(complaintId, status, notes = "") {
  // Get complaint data first so we can notify the student
  const snap = await import("firebase/firestore").then(({ getDoc }) =>
    getDoc(doc(db, "complaints", complaintId))
  );
  const data = snap.data();

  await updateDoc(doc(db, "complaints", complaintId), {
    status,
    resolutionNotes: notes,
    updatedAt:       serverTimestamp(),
  });

  // Notify the student based on new status
  if (status === "progress") {
    await createNotification({
      userId:      data.studentId,
      type:        "progress",
      title:       "Work In Progress",
      message:     `Your complaint "${data.title}" is now being actively worked on.`,
      complaintId,
    });
  } else if (status === "resolved") {
    await createNotification({
      userId:      data.studentId,
      type:        "resolved",
      title:       "Complaint Resolved ✅",
      message:     `Your complaint "${data.title}" has been resolved. ${notes ? `Note: ${notes}` : ""}`,
      complaintId,
    });
  }
}

// ─────────────────────────────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────

// CREATE a notification
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

// LISTEN to notifications for a student — real time
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
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      }) ?? "Just now",
    })));
  });
}

// MARK a single notification as read
export async function markNotificationRead(notificationId) {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

// MARK ALL notifications as read for a user
export async function markAllNotificationsRead(studentId) {
  const { getDocs } = await import("firebase/firestore");
  const q    = query(notificationsRef, where("userId", "==", studentId), where("read", "==", false));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
}

// ─────────────────────────────────────────────────────────────────
//  PORTER MANAGEMENT (Head Porter only)
// ─────────────────────────────────────────────────────────────────

// LISTEN to all porter profiles — real time
export function listenPorters(callback) {
  return onSnapshot(usersRef, (snap) => {
    const porters = snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => u.role === "porter");
    callback(porters);
  });
}

// DELETE a porter's Firestore profile (Head Porter)
export async function deletePorter(porterUid) {
  await deleteDoc(doc(db, "users", porterUid));
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