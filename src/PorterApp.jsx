import React from 'react'
import { useState, useEffect } from "react";
import {
  listenAllComplaints,
  claimComplaint,
  updateComplaintStatus,
  listenStudentNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  listenBlocks,
} from "./complaintsService.js";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import LogoutModal from "./LogoutModal.jsx";
import {
  LayoutDashboard, ClipboardList, CheckCircle2,
  Bell, User, Building2, ChevronRight, LogOut,
  AlertCircle, Clock, Wrench, MessageSquare, BarChart2,
  Hand, BellRing, Info, PlusCircle, Trash2, X, Plus,
} from "lucide-react";

const PAGE_TITLES = {
  dashboard: "Dashboard",
  open:      "Open Complaints",
  mine:      "My Tasks",
  resolved:  "Resolved",
  block:     "Manage Blocks & Rooms",
  notifs:    "Notifications",
  messages:  "Messages",
  profile:   "My Profile",
};

const STATUS_CONFIG = {
  open:     { label: "Open",        dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-600 ring-blue-200"           },
  urgent:   { label: "Urgent",      dot: "bg-red-500",     badge: "bg-red-50 text-red-600 ring-red-200"              },
  progress: { label: "In Progress", dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-600 ring-amber-200"        },
  resolved: { label: "Resolved",    dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-600 ring-emerald-200"  },
};

const PRIORITY_CONFIG = {
  high:   { label: "High",   badge: "bg-red-50 text-red-600 ring-red-200"             },
  medium: { label: "Medium", badge: "bg-amber-50 text-amber-600 ring-amber-200"       },
  low:    { label: "Low",    badge: "bg-emerald-50 text-emerald-600 ring-emerald-200" },
};

const CATEGORY_ICONS = {
  Plumbing: "🔧", Electrical: "💡", Furniture: "🪑",
  Security: "🔒", Pest: "🐛",       Cleaning:  "🧹", Other: "📌",
};

const NOTIF_CONFIG = {
  submitted: { icon: ClipboardList, bg: "bg-blue-50",    iconColor: "text-blue-600",    border: "border-blue-100"    },
  claimed:   { icon: Wrench,        bg: "bg-amber-50",   iconColor: "text-amber-500",   border: "border-amber-100"   },
  progress:  { icon: Clock,         bg: "bg-purple-50",  iconColor: "text-purple-500",  border: "border-purple-100"  },
  resolved:  { icon: CheckCircle2,  bg: "bg-emerald-50", iconColor: "text-emerald-500", border: "border-emerald-100" },
};

// ─── REUSABLE ──────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                      text-xs font-semibold ring-1 ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, subColor }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-800 leading-none mb-1"
         style={{ fontFamily: "'Playfair Display', serif" }}>{value}</p>
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      {sub && <p className={`text-xs font-semibold ${subColor ?? "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

// ─── SIDEBAR ───────────────────────────────────────────────────────
function Sidebar({ active, setActive, user, onLogout, openCount, myCount, unreadCount }) {
  const NAV_SECTIONS = [
    {
      label: "Work Queue",
      items: [
        { id: "dashboard", icon: LayoutDashboard, label: "Dashboard"       },
        { id: "open",      icon: ClipboardList,   label: "Open Complaints" },
        { id: "mine",      icon: Wrench,          label: "My Tasks"        },
        { id: "resolved",  icon: CheckCircle2,    label: "Resolved"        },
      ],
    },
    {
      label: "Hostel",
      items: [
        { id: "block", icon: Building2, label: "Block Overview" },
        { id: "notifs",   icon: Bell,          label: "Notifications", badge: unreadCount > 0 ? unreadCount : null },
        { id: "messages", icon: MessageSquare, label: "Messages"       },
      ],
    },
    {
      label: "Account",
      items: [
        { id: "profile", icon: User, label: "My Profile" },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-emerald-700 flex flex-col fixed top-0 left-0 bottom-0 z-30 shadow-2xl
                      -translate-x-full md:translate-x-0 transition-transform duration-300">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow">
            <Building2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight"
               style={{ fontFamily: "'Playfair Display', serif" }}>HostelDesk</p>
            <p className="text-emerald-200 text-[11px] tracking-wide">Crawford University</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4 px-4 py-3 bg-white/10 border border-white/20 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center
                          text-xs font-bold text-emerald-700 flex-shrink-0">
            {user.initials}
          </div>
          <div>
            <p className="text-white text-xs font-semibold leading-tight">{user.name}</p>
            <p className="text-emerald-200 text-[10px]">Porter · {user.block ?? "All Blocks"}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 mt-1 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-5 pb-2 text-[10px] font-bold text-emerald-300/60 uppercase tracking-widest">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon     = item.icon;
              const isActive = active === item.id;
              const badge    = item.id === "open"  ? (openCount || null)
                             : item.id === "mine"  ? (myCount   || null)
                             : item.badge          ? item.badge
                             : null;
              return (
                <button key={item.id} onClick={() => setActive(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                     transition-all duration-150 text-left
                                     ${isActive
                                       ? "bg-white text-emerald-700"
                                       : "text-emerald-100/70 hover:text-white hover:bg-white/10"}`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-emerald-700" : "text-emerald-200"}`} />
                  <span className="flex-1">{item.label}</span>
                  {badge ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                      ${isActive ? "bg-emerald-700 text-white"
                        : item.id === "notifs" ? "bg-red-500 text-white"
                        : "bg-white/20 text-white"}`}>
                      {badge}
                    </span>
                  ) : null}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2.5 bg-white/6 rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center
                          text-xs font-bold text-emerald-700 flex-shrink-0">
            {user.initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold leading-tight truncate">{user.name}</p>
            <p className="text-white/40 text-[11px]">{user.staffId}</p>
          </div>
        </div>
        <button onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                           text-emerald-200 hover:text-white hover:bg-white/10
                           transition-all text-sm font-medium">
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

// ─── TOPBAR ────────────────────────────────────────────────────────
function Topbar({ pageTitle, user, onLogout, onNavigate, unreadCount }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center
                       gap-4 px-4 md:px-6 sticky top-0 z-20 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}>{pageTitle}</h2>
        <p className="text-xs text-slate-400 leading-tight">Crawford University Hostels</p>
      </div>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <button onClick={() => onNavigate("notifs")}
                className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200
                           flex items-center justify-center relative
                           hover:bg-emerald-50 hover:border-emerald-200 transition-colors group">
          <Bell className="w-4 h-4 text-slate-500 group-hover:text-emerald-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
                             bg-red-500 border-2 border-white flex items-center justify-center
                             text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button onClick={onLogout}
                className="flex md:hidden w-9 h-9 rounded-xl bg-slate-100 border border-slate-200
                           items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors group">
          <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-500" />
        </button>
        <div className="w-px h-6 bg-slate-200" />
        <div onClick={() => onNavigate("profile")}
             className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white">
            {user.initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-700 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-400">{user.staffId} · Porter</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </div>
      </div>
    </header>
  );
}

// ─── BLOCK OVERVIEW — Porter read-only view ────────────────────────
function BlockOverviewView() {
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    const unsub = listenBlocks(setBlocks);
    return () => unsub();
  }, []);

  return (
    <div className="p-4 md:p-6 w-full max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}>Block Overview</h1>
        <p className="text-sm text-slate-400 mt-1">
          View all hostel blocks and their rooms
        </p>
      </div>

      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white
                        rounded-2xl border border-slate-100 shadow-sm">
          <Building2 className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-400 text-sm">No blocks have been added yet.</p>
          <p className="text-slate-300 text-xs mt-1">The Head Porter manages hostel blocks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map(block => (
            <div key={block.id}
                 className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{block.name}</p>
                    <p className="text-xs text-slate-400">
                      {block.rooms?.length ?? 0} room{(block.rooms?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                {block.rooms && block.rooms.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {[...block.rooms].sort().map(room => (
                      <div key={room}
                           className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-center">
                        <p className="text-xs font-semibold text-slate-600">{room}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-700">
          Block and room management is handled by the Head Porter. Contact them to add or remove blocks and rooms.
        </p>
      </div>
    </div>
  );
}

// ─── PROFILE VIEW ──────────────────────────────────────────────────
function ProfileView({ user }) {
  const [photo, setPhoto]           = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm]         = useState({ current: "", newPw: "", confirm: "" });
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwMsg, setPwMsg]           = useState(null);
  const fileRef                     = React.useRef();

  React.useEffect(() => {
    const saved = localStorage.getItem(`profile_photo_${user.uid}`);
    if (saved) setPhoto(saved);
  }, [user.uid]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPhoto(dataUrl);
      localStorage.setItem(`profile_photo_${user.uid}`, dataUrl);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async () => {
    setPwMsg(null);
    if (!pwForm.current)                return setPwMsg({ type: "error", text: "Enter your current password."                });
    if (pwForm.newPw.length < 6)        return setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
    if (pwForm.newPw !== pwForm.confirm) return setPwMsg({ type: "error", text: "Passwords do not match."                    });
    setPwSaving(true);
    try {
      const auth        = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No user logged in");
      const credential = EmailAuthProvider.credential(currentUser.email, pwForm.current);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, pwForm.newPw);
      setPwMsg({ type: "success", text: "Password updated successfully!" });
      setPwForm({ current: "", newPw: "", confirm: "" });
      setShowPwForm(false);
    } catch (err) {
      const msg =
        err.code === "auth/wrong-password"        ? "Current password is incorrect."         :
        err.code === "auth/weak-password"         ? "New password is too weak."              :
        err.code === "auth/requires-recent-login" ? "Please log out and log in again first." :
        err.code === "auth/invalid-credential"    ? "Current password is incorrect."         :
                                                    `Error: ${err.message}`;
      setPwMsg({ type: "error", text: msg });
    }
    setPwSaving(false);
  };

  const INFO_ROWS = [
    { label: "Full Name", value: user.name,           icon: User          },
    { label: "Staff ID",  value: user.staffId,        icon: ClipboardList  },
    { label: "Block",     value: user.block ?? "All", icon: Building2      },
    { label: "Role",      value: "Porter",            icon: CheckCircle2   },
  ];

  return (
    <div className="p-4 md:p-6 w-full max-w-2xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-24 bg-emerald-700 relative">
          <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
            <div className="w-48 h-48 rounded-full bg-white absolute -top-10 -right-10" />
            <div className="w-32 h-32 rounded-full bg-white absolute bottom-0 right-16" />
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden
                              bg-emerald-700 flex items-center justify-center">
                {photo
                  ? <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                  : <span className="text-white text-2xl font-bold">{user.initials}</span>}
              </div>
              <button onClick={() => fileRef.current.click()} disabled={uploading}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-700
                                 border-2 border-white flex items-center justify-center
                                 hover:bg-emerald-800 transition-colors disabled:opacity-60">
                {uploading
                  ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <PlusCircle className="w-3.5 h-3.5 text-white" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                             bg-emerald-50 text-emerald-700 text-xs font-bold ring-1 ring-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Porter
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800"
              style={{ fontFamily: "'Playfair Display', serif" }}>{user.name}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{user.staffId} · {user.block ?? "All Blocks"}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-700" />
          <p className="text-sm font-bold text-slate-700">Account Information</p>
        </div>
        <div className="divide-y divide-slate-50">
          {INFO_ROWS.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <row.icon className="w-4 h-4 text-emerald-700" />
                </div>
                <p className="text-sm text-slate-500 font-medium">{row.label}</p>
              </div>
              <p className="text-sm font-semibold text-slate-700">{row.value ?? "—"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button onClick={() => { setShowPwForm(v => !v); setPwMsg(null); }}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-sm font-bold text-slate-700">Change Password</p>
          </div>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showPwForm ? "rotate-90" : ""}`} />
        </button>
        {showPwForm && (
          <div className="px-5 pb-5 space-y-4 border-t border-slate-100">
            <div className="space-y-3 pt-4">
              {[
                { key: "current", label: "Current Password", placeholder: "Enter current password" },
                { key: "newPw",   label: "New Password",     placeholder: "At least 6 characters"  },
                { key: "confirm", label: "Confirm Password", placeholder: "Repeat new password"    },
              ].map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{f.label}</label>
                  <input type="password" value={pwForm[f.key]}
                         onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                         placeholder={f.placeholder}
                         className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                                    text-slate-700 outline-none focus:border-emerald-500
                                    focus:ring-2 focus:ring-emerald-100 transition-all placeholder:text-slate-300" />
                </div>
              ))}
            </div>
            {pwMsg && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                ${pwMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"}`}>
                {pwMsg.type === "success"
                  ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  : <AlertCircle  className="w-4 h-4 flex-shrink-0" />}
                {pwMsg.text}
              </div>
            )}
            <button onClick={handlePasswordChange} disabled={pwSaving}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                               bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800
                               transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {pwSaving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating…</>
                : <><CheckCircle2 className="w-4 h-4" /> Update Password</>}
            </button>
          </div>
        )}
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-700">
          Tap the <strong>+</strong> button on your avatar to upload a profile photo.
          Photos are stored locally on this device.
        </p>
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS VIEW ────────────────────────────────────────────
function NotificationsView({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [marking, setMarking]             = useState(false);

  useEffect(() => {
    const unsub = listenStudentNotifications(user.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid]);

  const unread = notifications.filter(n => !n.read).length;

  const handleMarkAll = async () => {
    if (unread === 0) return;
    setMarking(true);
    await markAllNotificationsRead(user.uid);
    setMarking(false);
  };

  const handleMarkOne = async (id, isRead) => {
    if (isRead) return;
    await markNotificationRead(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Playfair Display', serif" }}>Notifications</h1>
          <p className="text-sm text-slate-400 mt-1">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={handleMarkAll} disabled={marking}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200
                             text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors
                             disabled:opacity-50">
            {marking
              ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              : <CheckCircle2 className="w-4 h-4" />}
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
            <BellRing className="w-9 h-9 text-emerald-300" />
          </div>
          <h2 className="text-lg font-bold text-slate-600"
              style={{ fontFamily: "'Playfair Display', serif" }}>No notifications yet</h2>
          <p className="text-sm text-slate-400 text-center max-w-xs">
            Activity related to your assigned complaints will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const cfg  = NOTIF_CONFIG[n.type] ?? NOTIF_CONFIG.submitted;
            const Icon = cfg.icon;
            return (
              <div key={n.id} onClick={() => handleMarkOne(n.id, n.read)}
                   className={`relative bg-white rounded-2xl border shadow-sm p-4 md:p-5
                               transition-all cursor-pointer hover:shadow-md
                               ${n.read ? "border-slate-100 opacity-70" : `${cfg.border} ring-1 ring-inset ${cfg.border}`}`}>
                {!n.read && (
                  <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-emerald-600" />
                )}
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className={`text-sm font-bold leading-tight mb-1
                      ${n.read ? "text-slate-500" : "text-slate-800"}`}>{n.title}</p>
                    <p className="text-sm text-slate-500 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {n.createdAt}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {notifications.length > 0 && (
        <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700">
            Tap a notification to mark it as read.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── PLACEHOLDER ───────────────────────────────────────────────────
function PlaceholderView({ id }) {
  const icons = {
    messages: <MessageSquare className="w-14 h-14 text-emerald-300 mx-auto" />,
  };
  return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="text-center space-y-4">
        {icons[id] ?? <LayoutDashboard className="w-14 h-14 text-emerald-300 mx-auto" />}
        <h2 className="text-xl font-bold text-slate-700"
            style={{ fontFamily: "'Playfair Display', serif" }}>{PAGE_TITLES[id]}</h2>
        <p className="text-sm text-slate-400">Coming soon.</p>
      </div>
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────
function DashboardView({ setActive, user, complaints }) {
  const open     = complaints.filter(c => c.status === "open" || c.status === "urgent");
  const mine     = complaints.filter(c => c.claimedById === user.uid);
  const resolved = complaints.filter(c => c.status === "resolved" && c.claimedById === user.uid);
  const urgent   = complaints.filter(c => c.priority === "high" && c.status !== "resolved");

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 w-full">
      <div className="bg-emerald-700 rounded-2xl p-5 md:p-6 flex items-center justify-between
                      shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
          <div className="w-48 h-48 rounded-full bg-white absolute -top-10 -right-10" />
          <div className="w-32 h-32 rounded-full bg-white absolute bottom-0 right-16" />
        </div>
        <div className="relative z-10">
          <p className="text-emerald-200 text-sm font-medium mb-1">Good morning 👋</p>
          <h1 className="text-white text-xl md:text-2xl font-bold mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}>
            Welcome, {user.name.split(" ").slice(-1)[0]}!
          </h1>
          <p className="text-emerald-200 text-xs md:text-sm">
            {user.staffId} &nbsp;·&nbsp;
            <span className="font-bold text-white">{open.length} open</span> complaints waiting
          </p>
        </div>
        <button onClick={() => setActive("open")}
                className="relative z-10 hidden sm:flex items-center gap-2 bg-white text-emerald-700
                           font-bold text-sm px-5 py-3 rounded-xl shadow hover:bg-emerald-50
                           transition-colors flex-shrink-0">
          <ClipboardList className="w-4 h-4" /> View Open Complaints
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        <StatCard icon={ClipboardList} iconBg="bg-blue-50"    iconColor="text-blue-600"    label="Open Complaints"  value={open.length}                                     sub="Waiting to be claimed" subColor="text-blue-500"    />
        <StatCard icon={Wrench}        iconBg="bg-amber-50"   iconColor="text-amber-500"   label="My Active Tasks"  value={mine.filter(c => c.status !== "resolved").length} sub="Claimed by you"        subColor="text-amber-500"   />
        <StatCard icon={CheckCircle2}  iconBg="bg-emerald-50" iconColor="text-emerald-500" label="I've Resolved"    value={resolved.length}                                 sub="Total resolved by you" subColor="text-emerald-500" />
        <StatCard icon={AlertCircle}   iconBg="bg-red-50"     iconColor="text-red-500"     label="Urgent"           value={urgent.length}                                   sub="High priority open"    subColor="text-red-500"     />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="col-span-1 md:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-700" />
              <p className="text-sm font-bold text-slate-700">Latest Open Complaints</p>
            </div>
            <button onClick={() => setActive("open")}
                    className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {open.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto" />
                <p className="text-sm text-slate-400">No open complaints right now 🎉</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {open.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-lg flex-shrink-0">
                    {CATEGORY_ICONS[c.category] ?? "📌"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{c.title}</p>
                    <span className="text-xs text-slate-400 truncate">{c.hostel} · {c.room}</span>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-1 md:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-700">My Resolution Rate</p>
              <BarChart2 className="w-4 h-4 text-emerald-700" />
            </div>
            {mine.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No tasks claimed yet.</p>
            ) : (
              <>
                <p className="text-4xl font-bold text-emerald-600 mb-1"
                   style={{ fontFamily: "'Playfair Display', serif" }}>
                  {Math.round((resolved.length / mine.length) * 100)}%
                </p>
                <p className="text-xs text-slate-400 mb-3">{resolved.length} of {mine.length} resolved</p>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full"
                       style={{ width: `${Math.round((resolved.length / mine.length) * 100)}%` }} />
                </div>
              </>
            )}
          </div>

          <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-red-700">Urgent Open</p>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-4xl font-bold text-red-600 mb-1"
               style={{ fontFamily: "'Playfair Display', serif" }}>{urgent.length}</p>
            <p className="text-xs text-red-400 mb-3">High priority, not yet resolved</p>
            <button onClick={() => setActive("open")}
                    className="w-full px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors">
              Handle Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPLAINT DETAIL ──────────────────────────────────────────────
function ComplaintDetail({ complaint, onBack, user }) {
  const [status,   setStatus]   = useState(complaint.status);
  const [notes,    setNotes]    = useState(complaint.resolutionNotes ?? "");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [claiming, setClaiming] = useState(false);

  const isMine     = complaint.claimedById === user.uid;
  const isClaimed  = !!complaint.claimedBy;
  const isResolved = complaint.status === "resolved";

  const handleClaim = async () => {
    setClaiming(true);
    try { await claimComplaint(complaint.id, user.name, user.uid); }
    catch (err) { console.error(err); }
    setClaiming(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updateComplaintStatus(complaint.id, status, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const c = complaint;

  return (
    <div className="p-4 md:p-6 w-full">
      <button onClick={onBack}
              className="flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline mb-6">
        <ChevronRight className="w-4 h-4 rotate-180" /> Back to List
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="col-span-1 md:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 md:p-6">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Complaint</p>
                <h2 className="text-xl font-bold text-slate-800"
                    style={{ fontFamily: "'Playfair Display', serif" }}>{c.title}</h2>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{c.desc}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
              {[
                { label: "Category",  value: `${CATEGORY_ICONS[c.category] ?? "📌"} ${c.category}` },
                { label: "Location",  value: `${c.hostel} · ${c.room}`                              },
                { label: "Student",   value: c.studentName                                           },
                { label: "Submitted", value: c.submittedAt                                           },
              ].map(row => (
                <div key={row.label}>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{row.label}</p>
                  <p className="text-sm font-semibold text-slate-700">{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Photo evidence */}
          {c.evidenceUrl && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">
                📷 Photo Evidence
              </p>
              <img src={c.evidenceUrl} alt="Complaint evidence"
                   className="w-full rounded-xl object-cover max-h-64 border border-slate-100" />
              <a href={c.evidenceUrl} target="_blank" rel="noopener noreferrer"
                 className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline">
                View Full Photo ↗
              </a>
            </div>
          )}

          {!isResolved && (
            <div className={`rounded-2xl p-5 flex items-center justify-between gap-3
              ${isMine ? "bg-emerald-50 border border-emerald-200"
                : isClaimed ? "bg-slate-50 border border-slate-200"
                : "bg-blue-50 border border-blue-200"}`}>
              <div className="flex items-center gap-3">
                <Hand className={`w-5 h-5 flex-shrink-0
                  ${isMine ? "text-emerald-600" : isClaimed ? "text-slate-400" : "text-blue-600"}`} />
                <div>
                  <p className={`text-sm font-bold
                    ${isMine ? "text-emerald-700" : isClaimed ? "text-slate-600" : "text-blue-700"}`}>
                    {isMine ? "You claimed this complaint"
                      : isClaimed ? `Claimed by ${c.claimedBy}`
                      : "This complaint is unclaimed"}
                  </p>
                  <p className={`text-xs mt-0.5
                    ${isMine ? "text-emerald-600" : isClaimed ? "text-slate-400" : "text-blue-600"}`}>
                    {isMine ? "Update its status below when done"
                      : isClaimed ? "Another porter is handling this"
                      : "Claim it to start working on it"}
                  </p>
                </div>
              </div>
              {!isClaimed && (
                <button onClick={handleClaim} disabled={claiming}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600
                                   text-white text-sm font-bold hover:bg-blue-700 transition-colors
                                   disabled:opacity-60 flex-shrink-0">
                  {claiming
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Hand className="w-4 h-4" /> Claim</>}
                </button>
              )}
            </div>
          )}

          {isMine && !isResolved && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-700">Update Status</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "progress", label: "In Progress", Icon: Wrench,       bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-400"   },
                  { value: "resolved", label: "Resolved",    Icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-400" },
                ].map((s) => {
                  const isActive = status === s.value;
                  return (
                    <button key={s.value} onClick={() => setStatus(s.value)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2
                                         text-center transition-all
                                         ${isActive ? `${s.border} ${s.bg}` : "border-slate-200 bg-white hover:border-slate-300"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? s.bg : "bg-slate-100"}`}>
                        <s.Icon className={`w-5 h-5 ${isActive ? s.text : "text-slate-400"}`} />
                      </div>
                      <span className={`text-xs font-bold ${isActive ? s.text : "text-slate-500"}`}>{s.label}</span>
                      {isActive && <CheckCircle2 className={`w-4 h-4 ${s.text}`} />}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolution Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                          placeholder="Describe what was done, parts replaced, or any follow-up needed..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                                     text-slate-700 outline-none resize-none leading-relaxed
                                     focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100
                                     transition-all placeholder:text-slate-300" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleUpdate} disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700
                                   text-white text-sm font-bold hover:bg-emerald-800 transition-colors
                                   disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                    : <><CheckCircle2 className="w-4 h-4" /> Save Update</>}
                </button>
                {saved && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Updated!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isResolved && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-700">This complaint has been resolved</p>
                {c.resolutionNotes && <p className="text-sm text-emerald-600 mt-1">{c.resolutionNotes}</p>}
                <p className="text-xs text-emerald-500 mt-2">Resolved by {c.claimedBy} · {c.updatedAt}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-fit">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 text-emerald-700" />
            <p className="text-sm font-bold text-slate-700">Timeline</p>
          </div>
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-100" />
            <div className="space-y-6">
              {[
                { event: "Complaint submitted", done: true                                               },
                { event: "Claimed by porter",   done: !!c.claimedBy                                     },
                { event: "Work in progress",    done: c.status === "progress" || c.status === "resolved" },
                { event: "Resolved & closed",   done: c.status === "resolved"                            },
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center
                                   flex-shrink-0 z-10 border-2
                                   ${t.done ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-200"}`}>
                    {t.done
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                  </div>
                  <div className="pt-0.5">
                    <p className={`text-sm font-semibold ${t.done ? "text-slate-700" : "text-slate-400"}`}>
                      {t.event}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPLAINT LIST VIEW ───────────────────────────────────────────
function ComplaintListView({ title, subtitle, icon, complaints, emptyText, user }) {
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState("");

  const filtered = complaints.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.studentName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.hostel ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    const live = complaints.find(c => c.id === selected.id) ?? selected;
    return <ComplaintDetail complaint={live} onBack={() => setSelected(null)} user={user} />;
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800"
                style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200
                        rounded-xl px-4 py-2.5 w-full sm:w-64 shadow-sm">
          <AlertCircle className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Search complaints..."
                 className="bg-transparent text-sm text-slate-600 outline-none w-full placeholder:text-slate-300" />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center space-y-3">
            <ClipboardList className="w-14 h-14 text-slate-200 mx-auto" />
            <p className="text-slate-400 text-sm font-medium">{emptyText}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => {
          const isMine    = c.claimedById === user.uid;
          const isClaimed = !!c.claimedBy && !isMine;
          return (
            <div key={c.id} onClick={() => setSelected(c)}
                 className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5
                            hover:shadow-md hover:border-emerald-200 cursor-pointer transition-all group">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">
                    {CATEGORY_ICONS[c.category] ?? "📌"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-600">{c.category}</p>
                    <p className="text-sm font-bold text-slate-700 leading-tight truncate">{c.title}</p>
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3">{c.desc}</p>
              <div className="flex items-center gap-2.5 mb-3 bg-slate-50 rounded-xl px-3 py-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center
                                justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {(c.studentName ?? "?").split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700 truncate">{c.studentName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{c.hostel} · {c.room}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full
                                  text-[10px] font-bold ring-1 flex-shrink-0
                                  ${PRIORITY_CONFIG[c.priority]?.badge}`}>
                  {c.priority?.charAt(0).toUpperCase() + c.priority?.slice(1)}
                </span>
              </div>
              {isMine && (
                <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2 mb-2">
                  <Hand className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-emerald-700">Claimed by you</span>
                </div>
              )}
              {isClaimed && (
                <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 mb-2">
                  <Hand className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-500 truncate">Claimed by {c.claimedBy}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-slate-300" />
                  <span className="text-xs text-slate-400">{c.submittedAt}</span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 group-hover:underline flex items-center gap-1 flex-shrink-0">
                  {isMine ? "Update status" : isClaimed ? "View details" : "Claim & resolve"}
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────
export default function PorterApp({ user, onLogout }) {
  const [active,        setActive]        = useState("dashboard");
  const [showLogout,    setShowLogout]    = useState(false);
  const [complaints,    setComplaints]    = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsub = listenAllComplaints(setComplaints);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = listenStudentNotifications(user.uid, setNotifications);
    return () => unsub();
  }, [user.uid]);

  const openComplaints     = complaints.filter(c => c.status === "open" || c.status === "urgent");
  const myComplaints       = complaints.filter(c => c.claimedById === user.uid && c.status !== "resolved");
  const resolvedComplaints = complaints.filter(c => c.status === "resolved");
  const unreadCount        = notifications.filter(n => !n.read).length;

  return (
    <div className="flex min-h-screen bg-slate-50 relative" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {showLogout && (
        <LogoutModal userName={user.name} onConfirm={onLogout} onCancel={() => setShowLogout(false)} />
      )}

      <Sidebar
        active={active} setActive={setActive} user={user}
        onLogout={() => setShowLogout(true)}
        openCount={openComplaints.length}
        myCount={myComplaints.length}
        unreadCount={unreadCount}
      />

      <div className="ml-0 md:ml-64 flex-1 flex flex-col min-h-screen pb-16 md:pb-0 min-w-0 overflow-hidden">
        <Topbar
          pageTitle={PAGE_TITLES[active] ?? active}
          user={user}
          onLogout={() => setShowLogout(true)}
          onNavigate={setActive}
          unreadCount={unreadCount}
        />
        <main className="flex-1 w-full min-w-0 overflow-x-hidden overflow-y-auto">
          {active === "dashboard" ? (
            <DashboardView setActive={setActive} user={user} complaints={complaints} />
          ) : active === "open" ? (
            <ComplaintListView
              title="Open Complaints" subtitle="All unresolved complaints — claim one to start working"
              icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
              complaints={openComplaints} emptyText="No open complaints right now." user={user}
            />
          ) : active === "mine" ? (
            <ComplaintListView
              title="My Active Tasks" subtitle="Complaints you have claimed and are working on"
              icon={<Wrench className="w-5 h-5 text-amber-500" />}
              complaints={myComplaints} emptyText="You haven't claimed any tasks yet." user={user}
            />
          ) : active === "resolved" ? (
            <ComplaintListView
              title="Resolved Complaints" subtitle="All complaints that have been fully resolved"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              complaints={resolvedComplaints} emptyText="No resolved complaints yet." user={user}
            />
          ): active === "block" ? (
    <BlockOverviewView />
          ) : active === "profile" ? (
            <ProfileView user={user} />
          ) : active === "notifs" ? (
            <NotificationsView user={user} />
          ) : (
            <PlaceholderView id={active} />
          )}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex md:hidden z-40">
        {[
          { id: "dashboard", icon: LayoutDashboard, label: "Home"     },
          { id: "open",      icon: ClipboardList,   label: "Open"     },
          { id: "mine",      icon: Wrench,          label: "My Tasks" },
          { id: "notifs",    icon: Bell,            label: "Alerts"   },
          { id: "profile",   icon: User,            label: "Profile"  },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActive(id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-semibold relative
                              ${active === id ? "text-emerald-700" : "text-slate-400"}`}>
            <div className="relative">
              <Icon className="w-5 h-5" />
              {id === "notifs" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full
                                 bg-red-500 flex items-center justify-center text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}