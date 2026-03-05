import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase.js";

// ── Collection references ──────────────────────────────────────────
const complaintsRef = collection(db, "complaints");
const usersRef      = collection(db, "users");

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
// Filters client-side to avoid needing a composite index
export function listenStudentComplaints(studentId, callback) {
  const q = query(complaintsRef, orderBy("submittedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map(formatComplaint).filter(c => c.studentId === studentId);
    callback(all);
  });
}

// CLAIM a complaint (Porter self-assigns)
export async function claimComplaint(complaintId, porterName, porterUid) {
  await updateDoc(doc(db, "complaints", complaintId), {
    claimedBy:   porterName,
    claimedById: porterUid,
    status:      "progress",
    updatedAt:   serverTimestamp(),
  });
}

// UPDATE complaint status (Porter who claimed it)
export async function updateComplaintStatus(complaintId, status, notes = "") {
  await updateDoc(doc(db, "complaints", complaintId), {
    status,
    resolutionNotes: notes,
    updatedAt:       serverTimestamp(),
  });
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