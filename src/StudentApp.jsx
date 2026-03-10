import React from 'react'
import { useState, useEffect } from "react";
import { submitComplaint, listenStudentComplaints } from "./complaintsService.js";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import LogoutModal from "./LogoutModal.jsx";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  History,
  Bell,
  User,
  HelpCircle,
  MessageCircle,
  Building2,
  ChevronRight,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Flame,
  Info,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "My Complaints",
    items: [
      { id: "dashboard", icon: LayoutDashboard, label: "Dashboard"        },
      { id: "submit",    icon: PlusCircle,      label: "Submit Complaint" },
      { id: "track",     icon: ClipboardList,   label: "My Complaints"    },
      { id: "history",   icon: History,         label: "History"          },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "notifs",  icon: Bell, label: "Notifications", badge: 2 },
      { id: "profile", icon: User, label: "My Profile"              },
    ],
  },
  {
    label: "Support",
    items: [
      { id: "faq",  icon: HelpCircle,    label: "FAQ"          },
      { id: "help", icon: MessageCircle, label: "Contact Help" },
    ],
  },
];

const PAGE_TITLES = {
  dashboard: "Dashboard",
  submit:    "Submit a Complaint",
  track:     "My Complaints",
  history:   "Complaint History",
  notifs:    "Notifications",
  profile:   "My Profile",
  faq:       "FAQ",
  help:      "Contact Help",
};

const STATUS_CONFIG = {
  urgent:   { label: "Urgent",      dot: "bg-red-500",     badge: "bg-red-50 text-red-600 ring-red-200"             },
  progress: { label: "In Progress", dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-600 ring-amber-200"       },
  resolved: { label: "Resolved",    dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-600 ring-emerald-200" },
  open:     { label: "Open",        dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-600 ring-blue-200"          },
};

const PRIORITY_CONFIG = {
  high:   { label: "High",   badge: "bg-red-50 text-red-600 ring-red-200"             },
  medium: { label: "Medium", badge: "bg-amber-50 text-amber-600 ring-amber-200"       },
  low:    { label: "Low",    badge: "bg-emerald-50 text-emerald-600 ring-emerald-200" },
};

const CATEGORY_ICONS = {
  Plumbing: "🔧", Electrical: "💡", Furniture: "🪑",
  Security: "🔒", Pest: "🐛",       Cleaning: "🧹", Other: "📌",
};

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

function QuickAction({ icon: Icon, iconBg, iconColor, label, desc, onClick }) {
  return (
    <button onClick={onClick}
            className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-left
                       hover:shadow-md hover:border-blue-200 transition-all group w-full">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3
                       ${iconBg} group-hover:scale-105 transition-transform`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <p className="text-sm font-bold text-slate-700 leading-tight">{label}</p>
      <p className="text-xs text-slate-400 mt-1">{desc}</p>
    </button>
  );
}

// ─── SIDEBAR ───────────────────────────────────────────────────────
function Sidebar({ active, setActive, user, onLogout }) {
  return (
    <aside className="w-64 bg-[#1447A3] flex flex-col fixed top-0 left-0 bottom-0 z-30 shadow-2xl
                      -translate-x-full md:translate-x-0 transition-transform duration-300">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow">
            <Building2 className="w-5 h-5 text-[#1447A3]" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight"
               style={{ fontFamily: "'Playfair Display', serif" }}>HostelDesk</p>
            <p className="text-blue-200 text-[11px] tracking-wide">Crawford University</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4 px-4 py-3 bg-white/10 border border-white/20 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center
                          text-xs font-bold text-[#1447A3] flex-shrink-0">{user.initials}</div>
          <div>
            <p className="text-white text-xs font-semibold leading-tight">{user.name}</p>
            <p className="text-blue-200 text-[10px]">{user.hostel} · {user.room}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 mt-1 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-5 pb-2 text-[10px] font-bold text-blue-300/60 uppercase tracking-widest">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button key={item.id} onClick={() => setActive(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                     transition-all duration-150 text-left
                                     ${isActive ? "bg-white text-[#1447A3]" : "text-blue-100/70 hover:text-white hover:bg-white/10"}`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#1447A3]" : "text-blue-200"}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                      ${isActive ? "bg-[#1447A3] text-white" : "bg-white/20 text-white"}`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#1447A3] flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2.5 bg-white/6 rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center
                          text-xs font-bold text-[#1447A3] flex-shrink-0">{user.initials}</div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold leading-tight truncate">{user.name}</p>
            <p className="text-white/40 text-[11px]">{user.matric}</p>
          </div>
        </div>
        <button onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                           text-blue-200 hover:text-white hover:bg-white/10
                           transition-all text-sm font-medium">
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

// ─── TOPBAR ────────────────────────────────────────────────────────
function Topbar({ pageTitle, user, onLogout, onNavigate }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center
                       gap-4 px-4 md:px-6 sticky top-0 z-20 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}>{pageTitle}</h2>
        <p className="text-xs text-slate-400 leading-tight">Crawford University Hostels</p>
      </div>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <button className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200
                           flex items-center justify-center relative
                           hover:bg-blue-50 hover:border-blue-200 transition-colors group">
          <Bell className="w-4 h-4 text-slate-500 group-hover:text-[#1447A3]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        </button>
        <button onClick={onLogout}
                className="flex md:hidden w-9 h-9 rounded-xl bg-slate-100 border border-slate-200
                           items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors group">
          <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-500" />
        </button>
        <div className="w-px h-6 bg-slate-200" />
        <div onClick={() => onNavigate("profile")}
     className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors">
  <div className="w-8 h-8 rounded-full bg-[#1447A3] flex items-center justify-center text-xs font-bold text-white">
    {user.initials}
  </div>
  <div className="hidden sm:block">
    <p className="text-sm font-semibold text-slate-700 leading-tight">{user.name}</p>
    <p className="text-[10px] text-slate-400">{user.matric} · Student</p>
  </div>
  <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-1" />
</div>
      </div>
    </header>
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
  if (!pwForm.current)                 return setPwMsg({ type: "error", text: "Enter your current password."                });
  if (pwForm.newPw.length < 6)         return setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
  if (pwForm.newPw !== pwForm.confirm)  return setPwMsg({ type: "error", text: "Passwords do not match."                    });

  setPwSaving(true);
  try {
    const auth       = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user logged in");

    const credential = EmailAuthProvider.credential(currentUser.email, pwForm.current);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, pwForm.newPw);

    setPwMsg({ type: "success", text: "Password updated successfully!" });
    setPwForm({ current: "", newPw: "", confirm: "" });
    setShowPwForm(false);
  } catch (err) {
    console.error("Password update error:", err.code, err.message);
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
    { label: "Full Name",     value: user.name,   icon: User          },
    { label: "Matric Number", value: user.matric, icon: ClipboardList  },
    { label: "Hostel Block",  value: user.hostel, icon: Building2      },
    { label: "Room Number",   value: user.room,   icon: Building2      },
    { label: "Role",          value: "Student",   icon: CheckCircle2   },
  ];

  return (
    <div className="p-4 md:p-6 w-full max-w-2xl mx-auto space-y-5">

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-24 bg-[#1447A3] relative">
          <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
            <div className="w-48 h-48 rounded-full bg-white absolute -top-10 -right-10" />
            <div className="w-32 h-32 rounded-full bg-white absolute bottom-0 right-16" />
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden
                              bg-[#1447A3] flex items-center justify-center">
                {photo
                  ? <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                  : <span className="text-white text-2xl font-bold">{user.initials}</span>}
              </div>
              <button onClick={() => fileRef.current.click()} disabled={uploading}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1447A3]
                                 border-2 border-white flex items-center justify-center
                                 hover:bg-blue-800 transition-colors disabled:opacity-60">
                {uploading
                  ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <PlusCircle className="w-3.5 h-3.5 text-white" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                             bg-blue-50 text-[#1447A3] text-xs font-bold ring-1 ring-blue-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Student
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800"
              style={{ fontFamily: "'Playfair Display', serif" }}>{user.name}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{user.matric} · {user.hostel} · {user.room}</p>
        </div>
      </div>

      {/* Info Rows */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-[#1447A3]" />
          <p className="text-sm font-bold text-slate-700">Account Information</p>
        </div>
        <div className="divide-y divide-slate-50">
          {INFO_ROWS.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <row.icon className="w-4 h-4 text-[#1447A3]" />
                </div>
                <p className="text-sm text-slate-500 font-medium">{row.label}</p>
              </div>
              <p className="text-sm font-semibold text-slate-700">{row.value ?? "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Change Password */}
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
                                    text-slate-700 outline-none focus:border-[#1447A3]
                                    focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300" />
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
                               bg-[#1447A3] text-white text-sm font-bold hover:bg-blue-800
                               transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {pwSaving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating…</>
                : <><CheckCircle2 className="w-4 h-4" /> Update Password</>}
            </button>
          </div>
        )}
      </div>

      {/* Photo tip */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#1447A3] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Tap the <strong>+</strong> button on your avatar to upload a profile photo.
          Photos are stored locally on this device.
        </p>
      </div>

    </div>
  );
}

// ─── PLACEHOLDER ───────────────────────────────────────────────────
function PlaceholderView({ id }) {
  const icons = {
    notifs:  <Bell          className="w-14 h-14 text-blue-300 mx-auto" />,
    profile: <User          className="w-14 h-14 text-blue-300 mx-auto" />,
    faq:     <HelpCircle    className="w-14 h-14 text-blue-300 mx-auto" />,
    help:    <MessageCircle className="w-14 h-14 text-blue-300 mx-auto" />,
  };
  return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="text-center space-y-4">
        {icons[id] ?? <LayoutDashboard className="w-14 h-14 text-blue-300 mx-auto" />}
        <h2 className="text-xl font-bold text-slate-700"
            style={{ fontFamily: "'Playfair Display', serif" }}>{PAGE_TITLES[id]}</h2>
        <p className="text-sm text-slate-400">Coming soon.</p>
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ────────────────────────────────────────────────
function DashboardView({ setActive, user }) {
  const [complaints, setComplaints] = React.useState([]);
  React.useEffect(() => {
    const unsub = listenStudentComplaints(user.uid, setComplaints);
    return () => unsub();
  }, [user.uid]);

  const total    = complaints.length;
  const pending  = complaints.filter(c => c.status === "open" || c.status === "progress").length;
  const resolved = complaints.filter(c => c.status === "resolved").length;
  const urgent   = complaints.filter(c => c.status === "urgent").length;
  const recent   = complaints.slice(0, 4);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 w-full">
      <div className="bg-[#1447A3] rounded-2xl p-5 md:p-6 flex items-center justify-between
                      shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
          <div className="w-48 h-48 rounded-full bg-white absolute -top-10 -right-10" />
          <div className="w-32 h-32 rounded-full bg-white absolute bottom-0 right-16" />
        </div>
        <div className="relative z-10">
          <p className="text-blue-200 text-sm font-medium mb-1">Good morning 👋</p>
          <h1 className="text-white text-xl md:text-2xl font-bold mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}>
            Welcome back, {user.name.split(" ")[0]}!
          </h1>
          <p className="text-blue-200 text-xs md:text-sm">
            {user.hostel} · {user.room} &nbsp;·&nbsp; {user.matric}
          </p>
        </div>
        <button onClick={() => setActive("submit")}
                className="relative z-10 hidden sm:flex items-center gap-2 bg-white text-[#1447A3]
                           font-bold text-sm px-5 py-3 rounded-xl shadow
                           hover:bg-blue-50 transition-colors flex-shrink-0">
          <PlusCircle className="w-4 h-4" /> New Complaint
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        <StatCard icon={ClipboardList} iconBg="bg-blue-50"    iconColor="text-[#1447A3]"   label="Total Complaints" value={total}    sub="Since session start" subColor="text-slate-400"   />
        <StatCard icon={AlertCircle}   iconBg="bg-amber-50"   iconColor="text-amber-500"   label="Pending"          value={pending}  sub="Awaiting action"      subColor="text-amber-500"   />
        <StatCard icon={CheckCircle2}  iconBg="bg-emerald-50" iconColor="text-emerald-500" label="Resolved"         value={resolved} sub="↑ Great progress!"    subColor="text-emerald-500" />
        <StatCard icon={Flame}         iconBg="bg-red-50"     iconColor="text-red-500"     label="Urgent"           value={urgent}   sub="Needs attention"      subColor="text-red-500"     />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="col-span-1 md:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#1447A3]" />
              <p className="text-sm font-bold text-slate-700">Recent Complaints</p>
            </div>
            <button onClick={() => setActive("track")}
                    className="text-xs text-[#1447A3] font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {recent.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <div className="text-center space-y-2">
                  <ClipboardList className="w-8 h-8 text-slate-200 mx-auto" />
                  <p className="text-sm text-slate-400">No complaints yet.</p>
                  <button onClick={() => setActive("submit")}
                          className="text-[#1447A3] text-xs font-bold hover:underline">
                    Submit your first →
                  </button>
                </div>
              </div>
            ) : recent.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
                  {CATEGORY_ICONS[c.category] ?? "📌"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{c.category}</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-xs text-slate-400">{c.submittedAt}</span>
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 space-y-3">
          <p className="text-sm font-bold text-slate-600 px-1">Quick Actions</p>
          <QuickAction icon={PlusCircle}    iconBg="bg-blue-50"    iconColor="text-[#1447A3]"   label="Submit a Complaint"  desc="Report a new hostel issue" onClick={() => setActive("submit")}  />
          <QuickAction icon={ClipboardList} iconBg="bg-amber-50"   iconColor="text-amber-500"   label="Track My Complaints" desc="Check status updates"       onClick={() => setActive("track")}   />
          <QuickAction icon={History}       iconBg="bg-emerald-50" iconColor="text-emerald-500" label="View History"        desc="All past complaints"        onClick={() => setActive("history")} />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#1447A3] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[#1447A3]">Complaint Response Policy</p>
          <p className="text-sm text-blue-700 mt-0.5">
            All complaints are reviewed within <strong>24 hours</strong>. Urgent issues are
            escalated immediately to the hostel porter. You will receive a notification
            when your complaint status changes.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SUBMIT COMPLAINT VIEW ─────────────────────────────────────────
function SubmitComplaintView({ setActive, user }) {
  const [step, setStep]           = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [form, setForm]           = useState({
    hostel: "", room: "", category: "", title: "", description: "", priority: "",
  });

  const HOSTELS = [
    "Block A (Male Hostel)", "Block B (Female Hostel)",
    "Block C (Mixed)",       "Block D (Postgraduate)",
  ];

  const CATEGORIES = [
    { value: "Plumbing",   icon: "🔧", desc: "Pipes, taps, toilets, drainage"  },
    { value: "Electrical", icon: "💡", desc: "Power, sockets, lighting"         },
    { value: "Furniture",  icon: "🪑", desc: "Beds, wardrobes, desks, chairs"  },
    { value: "Security",   icon: "🔒", desc: "Locks, doors, windows, gates"     },
    { value: "Pest",       icon: "🐛", desc: "Insects, rodents, infestation"    },
    { value: "Cleaning",   icon: "🧹", desc: "Sanitation, waste, hygiene"       },
    { value: "Other",      icon: "📌", desc: "Anything not listed above"        },
  ];

  const PRIORITIES = [
    { value: "low",    icon: <CheckCircle2 className="w-5 h-5" />, label: "Low",           desc: "Minor issue, not urgent",   border: "border-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", iconColor: "text-emerald-500" },
    { value: "medium", icon: <AlertCircle  className="w-5 h-5" />, label: "Medium",        desc: "Needs attention soon",      border: "border-amber-400",   bg: "bg-amber-50",   text: "text-amber-700",   iconColor: "text-amber-500"   },
    { value: "high",   icon: <Flame        className="w-5 h-5" />, label: "High / Urgent", desc: "Immediate action required", border: "border-red-400",     bg: "bg-red-50",     text: "text-red-700",     iconColor: "text-red-500"     },
  ];

  const STEPS = [
    { n: 1, label: "Location", icon: <Building2     className="w-4 h-4" /> },
    { n: 2, label: "Details",  icon: <ClipboardList className="w-4 h-4" /> },
    { n: 3, label: "Priority", icon: <Flame         className="w-4 h-4" /> },
    { n: 4, label: "Review",   icon: <CheckCircle2  className="w-4 h-4" /> },
  ];

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const canProceed = () => {
    if (step === 1) return form.hostel && form.room;
    if (step === 2) return form.category && form.title && form.description.length >= 20;
    if (step === 3) return form.priority;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitComplaint({
        title:       form.title,
        desc:        form.description,
        category:    form.category,
        priority:    form.priority,
        hostel:      form.hostel.split(" (")[0],
        room:        form.room,
        studentId:   user.uid,
        studentName: user.name,
        matric:      user.matric,
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit complaint:", err);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-lg
                        p-8 md:p-10 max-w-md w-full text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800"
                style={{ fontFamily: "'Playfair Display', serif" }}>Complaint Submitted!</h2>
            <p className="text-slate-500 text-sm mt-2">Your complaint has been logged and will be reviewed within 24 hours.</p>
          </div>
          <div className="bg-[#1447A3] rounded-2xl px-6 py-5">
            <p className="text-blue-200 text-xs uppercase tracking-widest mb-1">Status</p>
            <p className="text-white text-lg font-bold"
               style={{ fontFamily: "'Playfair Display', serif" }}>Saved to HostelDesk ✓</p>
            <p className="text-blue-200 text-xs mt-2">Track it under "My Complaints"</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-medium">Category</span>
              <span className="text-slate-700 font-semibold">{form.category}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-medium">Location</span>
              <span className="text-slate-700 font-semibold">{form.hostel.split(" (")[0]} · {form.room}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-medium">Priority</span>
              <span className="text-slate-700 font-semibold capitalize">{form.priority}</span>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setSubmitted(false); setStep(1); setForm({ hostel: "", room: "", category: "", title: "", description: "", priority: "" }); }}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200
                         text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Submit Another
            </button>
            <button onClick={() => setActive("track")}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#1447A3] text-white
                               text-sm font-semibold hover:bg-blue-800 transition-colors">
              Track Complaint
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}>Submit a Complaint</h1>
        <p className="text-sm text-slate-400 mt-1">Fill in the details below. Complaints are reviewed within 24 hours.</p>
      </div>

      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => {
          const done   = s.n < step;
          const active = s.n === step;
          return (
            <div key={s.n} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center
                                 text-sm font-bold transition-all
                                 ${done ? "bg-emerald-500 text-white"
                                 : active ? "bg-[#1447A3] text-white ring-4 ring-blue-100"
                                          : "bg-slate-100 text-slate-400"}`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : s.icon}
                </div>
                <span className={`text-xs font-semibold hidden sm:block
                  ${done ? "text-emerald-600" : active ? "text-[#1447A3]" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all
                  ${done ? "bg-emerald-400" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 text-[#1447A3]" />
                <h3 className="text-base font-bold text-slate-700">Your Location</h3>
              </div>
              <p className="text-sm text-slate-400">Tell us which hostel and room the issue is in.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Hostel Block <span className="text-red-500">*</span>
              </label>
              <select value={form.hostel} onChange={(e) => update("hostel", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                                 text-slate-700 bg-white outline-none
                                 focus:border-[#1447A3] focus:ring-2 focus:ring-blue-100 transition-all">
                <option value="">Select your hostel block...</option>
                {HOSTELS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Room Number <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.room} onChange={(e) => update("room", e.target.value)}
                     placeholder="e.g. Room 14, Room 7B..."
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                                text-slate-700 outline-none focus:border-[#1447A3] focus:ring-2
                                focus:ring-blue-100 transition-all placeholder:text-slate-300" />
            </div>
          </div>
          <div className="bg-[#1447A3] rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Where is the issue?
              </h3>
              <p className="text-blue-200 text-sm leading-relaxed">
                Let us know your exact hostel block and room number so the right porter is notified immediately.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {["Fast response routing", "Right porter notified", "Your room tracked"].map((tip) => (
                <div key={tip} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-300 flex-shrink-0" />
                  <span className="text-blue-100 text-sm">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="w-5 h-5 text-[#1447A3]" />
                <h3 className="text-base font-bold text-slate-700">Complaint Details</h3>
              </div>
              <p className="text-sm text-slate-400">Describe the issue clearly so we can resolve it faster.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Complaint Title <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)}
                     placeholder="Brief title e.g. Burst pipe under sink..."
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                                text-slate-700 outline-none focus:border-[#1447A3] focus:ring-2
                                focus:ring-blue-100 transition-all placeholder:text-slate-300" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)}
                        rows={6} placeholder="Describe the issue in detail..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                                   text-slate-700 outline-none resize-none leading-relaxed
                                   focus:border-[#1447A3] focus:ring-2 focus:ring-blue-100
                                   transition-all placeholder:text-slate-300" />
              <div className="flex justify-between">
                <p className="text-xs text-slate-400">Minimum 20 characters</p>
                <p className={`text-xs font-semibold ${form.description.length >= 20 ? "text-emerald-500" : "text-slate-400"}`}>
                  {form.description.length} characters
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-5 h-5 text-[#1447A3]" />
                <h3 className="text-base font-bold text-slate-700">Select Category</h3>
              </div>
              <p className="text-sm text-slate-400">Pick the type of issue you are reporting.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button key={cat.value} onClick={() => update("category", cat.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2
                                     text-center transition-all
                                     ${form.category === cat.value
                                       ? "border-[#1447A3] bg-blue-50"
                                       : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}>
                  <span className="text-3xl">{cat.icon}</span>
                  <span className={`text-xs font-bold leading-tight
                    ${form.category === cat.value ? "text-[#1447A3]" : "text-slate-600"}`}>{cat.value}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">{cat.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-5 h-5 text-[#1447A3]" />
                <h3 className="text-base font-bold text-slate-700">Priority Level</h3>
              </div>
              <p className="text-sm text-slate-400">How urgent is this issue?</p>
            </div>
            <div className="space-y-3">
              {PRIORITIES.map((p) => (
                <button key={p.value} onClick={() => update("priority", p.value)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2
                                     text-left transition-all
                                     ${form.priority === p.value ? `${p.border} ${p.bg}` : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                                   ${form.priority === p.value ? p.bg : "bg-slate-100"}`}>
                    <span className={form.priority === p.value ? p.iconColor : "text-slate-400"}>{p.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${form.priority === p.value ? p.text : "text-slate-700"}`}>{p.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                  </div>
                  {form.priority === p.value && <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${p.iconColor}`} />}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-white text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                How urgent is it?
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Choosing the right priority helps us respond faster to the most critical issues first.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { label: "Low — resolved within 7 days",    color: "text-emerald-400" },
                { label: "Medium — resolved within 3 days", color: "text-amber-400"   },
                { label: "High — resolved within 24 hours", color: "text-red-400"     },
              ].map((tip) => (
                <div key={tip.label} className="flex items-center gap-2.5">
                  <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${tip.color}`} />
                  <span className="text-slate-300 text-sm">{tip.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-[#1447A3]" />
                <h3 className="text-base font-bold text-slate-700">Review & Submit</h3>
              </div>
              <p className="text-sm text-slate-400">Please review your complaint before submitting.</p>
            </div>
            <div className="bg-slate-50 rounded-xl divide-y divide-slate-200">
              {[
                { label: "Hostel Block", value: form.hostel.split(" (")[0] },
                { label: "Room Number",  value: form.room },
                { label: "Category",     value: `${CATEGORY_ICONS[form.category] ?? "📌"} ${form.category}` },
                { label: "Priority",     value: form.priority.charAt(0).toUpperCase() + form.priority.slice(1) },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-slate-400 font-medium">{row.label}</span>
                  <span className="text-sm text-slate-700 font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</p>
              <p className="text-sm font-semibold text-slate-700">{form.title}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</p>
              <p className="text-sm text-slate-600 leading-relaxed">{form.description}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <Info className="w-4 h-4 text-[#1447A3] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">Once submitted, your complaint will appear instantly in "My Complaints".</p>
            </div>
          </div>
          <div className="bg-emerald-600 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Almost done!
              </h3>
              <p className="text-emerald-100 text-sm leading-relaxed">Review your complaint carefully before submitting.</p>
            </div>
            <div className="mt-6 space-y-3">
              {["Saved to Firestore instantly", "You can track it in real time", "Porter will be notified"].map((tip) => (
                <div key={tip} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200 flex-shrink-0" />
                  <span className="text-emerald-100 text-sm">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200
                           text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </button>
        {step < 4 ? (
          <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1447A3]
                             text-white text-sm font-semibold hover:bg-blue-800 transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1447A3]
                             text-white text-sm font-semibold hover:bg-blue-800 transition-colors
                             disabled:opacity-60 disabled:cursor-not-allowed">
            {loading
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting…</>
              : <><CheckCircle2 className="w-4 h-4" /> Submit Complaint</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MY COMPLAINTS VIEW ────────────────────────────────────────────
function MyComplaintsView({ setActive, user }) {
  const [selected, setSelected]     = useState(null);
  const [filter, setFilter]         = useState("all");
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    const unsub = listenStudentComplaints(user.uid, setComplaints);
    return () => unsub();
  }, [user.uid]);

  const filters = [
    { key: "all",      label: "All",         count: complaints.length                                      },
    { key: "urgent",   label: "Urgent",      count: complaints.filter(c => c.status === "urgent").length   },
    { key: "open",     label: "Open",        count: complaints.filter(c => c.status === "open").length     },
    { key: "progress", label: "In Progress", count: complaints.filter(c => c.status === "progress").length },
    { key: "resolved", label: "Resolved",    count: complaints.filter(c => c.status === "resolved").length },
  ];

  const filtered = complaints.filter((c) => filter === "all" || c.status === filter);

  if (selected) {
    const c = selected;
    return (
      <div className="p-4 md:p-6 w-full">
        <button onClick={() => setSelected(null)}
                className="flex items-center gap-2 text-sm font-semibold text-[#1447A3] hover:underline mb-6">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to My Complaints
        </button>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="col-span-1 md:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Complaint</p>
                  <h2 className="text-xl font-bold text-slate-800"
                      style={{ fontFamily: "'Playfair Display', serif" }}>{c.title}</h2>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">{c.desc}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
                {[
                  { label: "Category",  value: `${CATEGORY_ICONS[c.category] ?? "📌"} ${c.category}` },
                  { label: "Location",  value: `${c.hostel} · ${c.room}`                              },
                  { label: "Submitted", value: c.submittedAt                                           },
                ].map((row) => (
                  <div key={row.label}>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{row.label}</p>
                    <p className="text-sm font-semibold text-slate-700">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Priority</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                  text-sm font-bold ring-1 ${PRIORITY_CONFIG[c.priority]?.badge}`}>
                  {c.priority ? c.priority.charAt(0).toUpperCase() + c.priority.slice(1) : "—"}
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Assigned To</p>
                {c.assignedTo ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1447A3] flex items-center justify-center text-white text-xs font-bold">
                      {c.assignedTo.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{c.assignedTo}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-sm text-slate-400 italic">Not yet assigned</span>
                  </div>
                )}
              </div>
            </div>

            {c.status === "resolved" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-700">This complaint has been resolved</p>
                  <p className="text-sm text-emerald-600 mt-1">Was your issue fixed properly? Confirm below.</p>
                  <div className="flex gap-3 mt-3">
                    <button className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors">
                      Yes, it's fixed
                    </button>
                    <button className="px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors">
                      No, reopen it
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-fit">
            <div className="flex items-center gap-2 mb-5">
              <History className="w-4 h-4 text-[#1447A3]" />
              <p className="text-sm font-bold text-slate-700">Complaint Timeline</p>
            </div>
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-100" />
              <div className="space-y-6">
                {[
                  { event: "Complaint submitted",   done: true                                               },
                  { event: "Under review by admin", done: true                                               },
                  { event: "Assigned to porter",    done: !!c.assignedTo                                     },
                  { event: "Work in progress",      done: c.status === "progress" || c.status === "resolved" },
                  { event: "Resolved & closed",     done: c.status === "resolved"                            },
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-4 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center
                                     flex-shrink-0 z-10 border-2
                                     ${t.done ? "bg-[#1447A3] border-[#1447A3]" : "bg-white border-slate-200"}`}>
                      {t.done
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                    </div>
                    <div className="pt-0.5">
                      <p className={`text-sm font-semibold ${t.done ? "text-slate-700" : "text-slate-400"}`}>{t.event}</p>
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

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Playfair Display', serif" }}>My Complaints</h1>
          <p className="text-sm text-slate-400 mt-1">Track and manage all your submitted complaints</p>
        </div>
        <button onClick={() => setActive("submit")}
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1447A3]
                           text-white text-sm font-semibold hover:bg-blue-800 transition-colors flex-shrink-0">
          <PlusCircle className="w-4 h-4" /> New Complaint
        </button>
      </div>

      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                               border transition-all flex-shrink-0
                               ${filter === f.key
                                 ? "bg-[#1447A3] text-white border-[#1447A3]"
                                 : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"}`}>
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
              ${filter === f.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <ClipboardList className="w-12 h-12 text-slate-200 mx-auto" />
            <p className="text-slate-400 font-medium text-sm">No complaints found.</p>
            <button onClick={() => setActive("submit")}
                    className="text-[#1447A3] text-sm font-bold hover:underline">
              Submit your first complaint →
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <div key={c.id} onClick={() => setSelected(c)}
               className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5
                          hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">
                  {CATEGORY_ICONS[c.category] ?? "📌"}
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-500">{c.category}</p>
                  <p className="text-sm font-bold text-slate-700 leading-tight">{c.title}</p>
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4">{c.desc}</p>
            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-slate-400 truncate">{c.hostel} · {c.room}</span>
                <span className="text-slate-200 flex-shrink-0">·</span>
                <span className="text-xs text-slate-400 flex-shrink-0">{c.submittedAt}</span>
              </div>
              <span className="text-xs font-semibold text-[#1447A3] group-hover:underline
                               flex items-center gap-1 flex-shrink-0 ml-2">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HISTORY VIEW ──────────────────────────────────────────────────
function HistoryView({ user }) {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    const unsub = listenStudentComplaints(user.uid, (all) => {
      setComplaints(all.filter(c => c.status === "resolved"));
    });
    return () => unsub();
  }, [user.uid]);

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}>Complaint History</h1>
        <p className="text-sm text-slate-400 mt-1">All your resolved and closed complaints</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Submitted", value: complaints.length, Icon: ClipboardList, iconBg: "bg-blue-50",    iconColor: "text-[#1447A3]"   },
          { label: "Resolved",        value: complaints.length, Icon: CheckCircle2,  iconBg: "bg-emerald-50", iconColor: "text-emerald-500" },
          { label: "Avg. Resolution", value: "—",               Icon: History,       iconBg: "bg-amber-50",   iconColor: "text-amber-500"   },
        ].map((s) => (
          <div key={s.label}
               className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.iconBg}`}>
              <s.Icon className={`w-5 h-5 ${s.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800"
                 style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#1447A3]" />
            <p className="text-sm font-bold text-slate-700">Resolved Complaints</p>
          </div>
          <span className="text-xs text-slate-400">{complaints.length} complaints</span>
        </div>
        {complaints.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto" />
              <p className="text-sm text-slate-400">No resolved complaints yet.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Title", "Category", "Location", "Submitted", "Assigned To", "Priority"].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400
                                           uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors last:border-0">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">{c.title}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100
                                       rounded-lg text-xs font-medium text-slate-600">
                        {CATEGORY_ICONS[c.category] ?? "📌"} {c.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{c.hostel} · {c.room}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{c.submittedAt}</td>
                    <td className="px-5 py-4 text-xs text-slate-600 font-medium">{c.assignedTo ?? "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full
                                        text-xs font-bold ring-1 ${PRIORITY_CONFIG[c.priority]?.badge ?? ""}`}>
                        {c.priority ? c.priority.charAt(0).toUpperCase() + c.priority.slice(1) : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────
export default function StudentApp({ user, onLogout }) {
  const [active, setActive]         = useState("dashboard");
  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 relative"
         style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {showLogout && (
        <LogoutModal userName={user.name} onConfirm={onLogout} onCancel={() => setShowLogout(false)} />
      )}

      <Sidebar active={active} setActive={setActive} user={user} onLogout={() => setShowLogout(true)} />

      <div className="ml-0 md:ml-64 flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
       <Topbar pageTitle={PAGE_TITLES[active] ?? active} user={user} onLogout={() => setShowLogout(true)} onNavigate={setActive} />
        <main className="flex-1 overflow-auto w-full">
          {active === "dashboard" ? <DashboardView       setActive={setActive} user={user} /> :
           active === "submit"    ? <SubmitComplaintView setActive={setActive} user={user} /> :
           active === "track"     ? <MyComplaintsView    setActive={setActive} user={user} /> :
           active === "history"   ? <HistoryView         user={user}                        /> :
           active === "profile"   ? <ProfileView         user={user}                        /> :
                                    <PlaceholderView id={active} />}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex md:hidden z-40">
        {[
          { id: "dashboard", icon: LayoutDashboard, label: "Home"    },
          { id: "submit",    icon: PlusCircle,      label: "Submit"  },
          { id: "track",     icon: ClipboardList,   label: "Track"   },
          { id: "history",   icon: History,         label: "History" },
          { id: "profile",   icon: User,            label: "Profile" },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActive(id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-semibold
                              ${active === id ? "text-[#1447A3]" : "text-slate-400"}`}>
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}