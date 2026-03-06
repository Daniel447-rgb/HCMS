import React from 'react'
import { useState, useEffect } from "react";
import {
  listenAllComplaints,
  listenPorters,
  deletePorter,
} from "./complaintsService.js";
import {
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import LogoutModal from "./LogoutModal.jsx";
import {
  LayoutDashboard, ClipboardList, Users, Building2,
  BarChart2, Bell, ChevronRight, LogOut, ShieldCheck,
  AlertCircle, CheckCircle2, Flame, Clock, UserCheck,
  Wrench, Search, Trash2, Plus, Eye, EyeOff, X,
} from "lucide-react";

// ─── NAV ───────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard",  icon: LayoutDashboard, label: "Dashboard"       },
      { id: "complaints", icon: ClipboardList,   label: "All Complaints"  },
      { id: "analytics",  icon: BarChart2,        label: "Analytics"       },
    ],
  },
  {
    label: "Management",
    items: [
      { id: "porters", icon: UserCheck, label: "Manage Porters" },
      { id: "hostels", icon: Building2, label: "Hostel Blocks"  },
    ],
  },
  {
    label: "System",
    items: [
      { id: "notifs",   icon: Bell,        label: "Notifications" },
    ],
  },
];

const PAGE_TITLES = {
  dashboard:  "Head Porter Dashboard",
  complaints: "All Complaints",
  analytics:  "Analytics",
  porters:    "Manage Porters",
  hostels:    "Hostel Blocks",
  notifs:     "Notifications",
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
function Sidebar({ active, setActive, user, onLogout }) {
  return (
    <aside className="w-64 bg-slate-900 flex flex-col fixed top-0 left-0 bottom-0 z-30 shadow-2xl">

      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow">
            <ShieldCheck className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight"
               style={{ fontFamily: "'Playfair Display', serif" }}>HostelDesk</p>
            <p className="text-slate-400 text-[11px] tracking-wide">Head Porter Panel</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4 px-4 py-3 bg-amber-400/10 border border-amber-400/30 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center
                          text-xs font-bold text-slate-900 flex-shrink-0">
            {user.initials}
          </div>
          <div>
            <p className="text-white text-xs font-semibold leading-tight">{user.name}</p>
            <p className="text-amber-300 text-[10px]">Head Porter · {user.staffId}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 mt-1 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-5 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon     = item.icon;
              const isActive = active === item.id;
              return (
                <button key={item.id} onClick={() => setActive(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                     transition-all duration-150 text-left
                                     ${isActive
                                       ? "bg-amber-400 text-slate-900"
                                       : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-slate-900" : "text-slate-500"}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center
                          text-xs font-bold text-slate-900 flex-shrink-0">
            {user.initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold leading-tight truncate">{user.name}</p>
            <p className="text-slate-500 text-[11px]">Head Porter</p>
          </div>
        </div>
        <button onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                           text-slate-400 hover:text-white hover:bg-white/5
                           transition-all text-sm font-medium">
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

// ─── TOPBAR ────────────────────────────────────────────────────────
function Topbar({ pageTitle, user }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center
                       gap-4 px-6 sticky top-0 z-20 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}>{pageTitle}</h2>
        <p className="text-xs text-slate-400 leading-tight">Crawford University Hostels</p>
      </div>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <button className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200
                           flex items-center justify-center relative
                           hover:bg-amber-50 hover:border-amber-200 transition-colors group">
          <Bell className="w-4 h-4 text-slate-500 group-hover:text-amber-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        </button>
        <div className="w-px h-6 bg-slate-200" />
        <div className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-slate-900">
            {user.initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-400">{user.staffId} · Head Porter</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </div>
      </div>
    </header>
  );
}

// ─── PLACEHOLDER ───────────────────────────────────────────────────
function PlaceholderView({ id }) {
  return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="text-center space-y-4">
        <Bell className="w-14 h-14 text-amber-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-700"
            style={{ fontFamily: "'Playfair Display', serif" }}>{PAGE_TITLES[id]}</h2>
        <p className="text-sm text-slate-400">Coming soon.</p>
      </div>
    </div>
  );
}

// ─── ADD PORTER MODAL ──────────────────────────────────────────────
function AddPorterModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState({ name: "", email: "", staffId: "", block: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const BLOCKS = ["Block A", "Block B", "Block C", "Block D", "All Blocks"];

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.staffId || !form.block || !form.password) {
      setError("Please fill in all fields."); return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    setLoading(true);
    setError("");
    try {
      // 1. Create Firebase Auth account for the porter
      const cred = await createUserWithEmailAndPassword(
        auth, form.email.trim().toLowerCase(), form.password
      );
      // 2. Save porter profile to Firestore
      const initials = form.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
      const profile = {
        role:     "porter",
        name:     form.name.trim(),
        initials,
        email:    form.email.trim().toLowerCase(),
        staffId:  form.staffId.trim(),
        block:    form.block,
      };
      await setDoc(doc(db, "users", cred.user.uid), profile);
      onSuccess(form.name);
      onClose();
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else {
        setError("Failed to create porter. Try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50
                    flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800"
                style={{ fontFamily: "'Playfair Display', serif" }}>Add New Porter</h2>
            <p className="text-sm text-slate-400 mt-0.5">Create a porter account for HostelDesk</p>
          </div>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center
                             hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
                   placeholder="Mr. John Doe"
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                              text-slate-700 outline-none focus:border-amber-400 focus:ring-2
                              focus:ring-amber-100 transition-all placeholder:text-slate-300" />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email *</label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                   placeholder="porter@crawford.edu.ng"
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                              text-slate-700 outline-none focus:border-amber-400 focus:ring-2
                              focus:ring-amber-100 transition-all placeholder:text-slate-300" />
          </div>

          {/* Staff ID + Block */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff ID *</label>
              <input type="text" value={form.staffId} onChange={e => set("staffId", e.target.value)}
                     placeholder="PRT/005"
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                                text-slate-700 outline-none focus:border-amber-400 focus:ring-2
                                focus:ring-amber-100 transition-all placeholder:text-slate-300" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Block *</label>
              <select value={form.block} onChange={e => set("block", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                                 text-slate-700 bg-white outline-none focus:border-amber-400
                                 focus:ring-2 focus:ring-amber-100 transition-all">
                <option value="">Select…</option>
                {BLOCKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password *</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={form.password}
                     onChange={e => set("password", e.target.value)}
                     placeholder="Min. 6 characters"
                     className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm
                                text-slate-700 outline-none focus:border-amber-400 focus:ring-2
                                focus:ring-amber-100 transition-all placeholder:text-slate-300" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm
                             font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleAdd} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                             bg-amber-400 text-slate-900 text-sm font-bold
                             hover:bg-amber-500 transition-colors disabled:opacity-60">
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <><Plus className="w-4 h-4" /> Add Porter</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DELETE CONFIRM MODAL ──────────────────────────────────────────
function DeleteConfirmModal({ porter, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    setLoading(true);
    await onConfirm(porter.uid);
    setLoading(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50
                    flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}>Remove Porter?</h2>
        <p className="text-sm text-slate-500 mb-6">
          Are you sure you want to remove <strong>{porter.name}</strong>?
          They will no longer be able to log in to HostelDesk.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm
                             font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                             bg-red-500 text-white text-sm font-bold
                             hover:bg-red-600 transition-colors disabled:opacity-60">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Trash2 className="w-4 h-4" /> Remove</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ────────────────────────────────────────────────
function DashboardView({ setActive, user, complaints, porters }) {
  const open     = complaints.filter(c => c.status === "open" || c.status === "urgent");
  const progress = complaints.filter(c => c.status === "progress");
  const resolved = complaints.filter(c => c.status === "resolved");
  const urgent   = complaints.filter(c => c.priority === "high" && c.status !== "resolved");

  return (
    <div className="p-6 space-y-6 w-full">

      {/* Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 flex items-center justify-between
                      shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-full opacity-5 pointer-events-none">
          <div className="w-48 h-48 rounded-full bg-white absolute -top-10 -right-10" />
          <div className="w-32 h-32 rounded-full bg-white absolute bottom-0 right-16" />
        </div>
        <div className="relative z-10">
          <p className="text-amber-400 text-sm font-medium mb-1">Head Porter Overview 👋</p>
          <h1 className="text-white text-2xl font-bold mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}>
            Welcome, {user.name.split(" ").slice(-1)[0]}!
          </h1>
          <p className="text-slate-400 text-sm">
            {porters.length} porters on duty &nbsp;·&nbsp;
            <span className="font-bold text-amber-400">{open.length} open</span> complaints
          </p>
        </div>
        <div className="relative z-10 flex gap-3">
          <button onClick={() => setActive("complaints")}
                  className="flex items-center gap-2 bg-amber-400 text-slate-900 font-bold
                             text-sm px-5 py-3 rounded-xl shadow hover:bg-amber-300 transition-colors">
            <ClipboardList className="w-4 h-4" /> View All Complaints
          </button>
          <button onClick={() => setActive("porters")}
                  className="flex items-center gap-2 bg-white/10 text-white font-bold
                             text-sm px-5 py-3 rounded-xl hover:bg-white/20 transition-colors">
            <Users className="w-4 h-4" /> Manage Porters
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5">
        <StatCard icon={ClipboardList} iconBg="bg-blue-50"    iconColor="text-blue-600"    label="Total Complaints" value={complaints.length} sub="All time"           subColor="text-slate-400"   />
        <StatCard icon={AlertCircle}   iconBg="bg-amber-50"   iconColor="text-amber-500"   label="Open / Urgent"    value={open.length}       sub="Awaiting action"    subColor="text-amber-500"   />
        <StatCard icon={Wrench}        iconBg="bg-blue-50"    iconColor="text-blue-500"    label="In Progress"      value={progress.length}   sub="Being handled"      subColor="text-blue-500"    />
        <StatCard icon={CheckCircle2}  iconBg="bg-emerald-50" iconColor="text-emerald-500" label="Resolved"         value={resolved.length}   sub="Successfully closed" subColor="text-emerald-500" />
      </div>

      {/* Recent Complaints + Porter Overview */}
      <div className="grid grid-cols-5 gap-5">

        {/* Recent Complaints */}
        <div className="col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-bold text-slate-700">Recent Complaints</p>
            </div>
            <button onClick={() => setActive("complaints")}
                    className="text-xs text-amber-600 font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {complaints.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-slate-400">No complaints yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {complaints.slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-lg flex-shrink-0">
                    {CATEGORY_ICONS[c.category] ?? "📌"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{c.hostel} · {c.room}</span>
                      <span className="text-slate-200">·</span>
                      <span className="text-xs text-slate-400">{c.studentName}</span>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Porter Summary */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-bold text-slate-700">Porter Activity</p>
            </div>
            <button onClick={() => setActive("porters")}
                    className="text-xs text-amber-600 font-semibold hover:underline flex items-center gap-1">
              Manage <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {porters.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No porters registered yet.</p>
          ) : (
            <div className="space-y-3">
              {porters.map((p) => {
                const porterResolved = complaints.filter(c => c.claimedById === p.uid && c.status === "resolved").length;
                const porterActive   = complaints.filter(c => c.claimedById === p.uid && c.status !== "resolved").length;
                return (
                  <div key={p.uid} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center
                                    justify-center text-xs font-bold text-white flex-shrink-0">
                      {p.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.block} · {p.staffId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-600">{porterResolved} resolved</p>
                      <p className="text-xs text-slate-400">{porterActive} active</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Urgent alert */}
      {urgent.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Flame className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">
              {urgent.length} urgent complaint{urgent.length > 1 ? "s" : ""} need attention
            </p>
            <p className="text-sm text-red-600 mt-0.5">
              These are high priority and have not been resolved yet.
            </p>
          </div>
          <button onClick={() => setActive("complaints")}
                  className="flex-shrink-0 px-4 py-2 rounded-xl bg-red-500 text-white
                             text-xs font-bold hover:bg-red-600 transition-colors">
            View Now
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ALL COMPLAINTS VIEW ───────────────────────────────────────────
function AllComplaintsView({ complaints }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filters = [
    { key: "all",      label: "All",         count: complaints.length                                       },
    { key: "open",     label: "Open",         count: complaints.filter(c => c.status === "open").length     },
    { key: "urgent",   label: "Urgent",       count: complaints.filter(c => c.status === "urgent").length   },
    { key: "progress", label: "In Progress",  count: complaints.filter(c => c.status === "progress").length },
    { key: "resolved", label: "Resolved",     count: complaints.filter(c => c.status === "resolved").length },
  ];

  const filtered = complaints.filter(c => {
    const matchFilter = filter === "all" || c.status === filter;
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase())            ||
      (c.studentName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.hostel ?? "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Playfair Display', serif" }}>All Complaints</h1>
          <p className="text-sm text-slate-400 mt-1">System-wide view of every complaint</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200
                        rounded-xl px-4 py-2.5 w-64 shadow-sm">
          <Search className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Search complaints..."
                 className="bg-transparent text-sm text-slate-600 outline-none w-full placeholder:text-slate-300" />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                               border transition-all
                               ${filter === f.key
                                 ? "bg-amber-400 text-slate-900 border-amber-400"
                                 : "bg-white text-slate-500 border-slate-200 hover:border-amber-300"}`}>
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
              ${filter === f.key ? "bg-slate-900/20 text-slate-900" : "bg-slate-100 text-slate-500"}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-400 text-sm">No complaints found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Title", "Student", "Hostel", "Category", "Priority", "Claimed By", "Status", "Date"].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors last:border-0">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700 max-w-[180px]">
                    <p className="truncate">{c.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-700">{c.studentName}</p>
                    <p className="text-[10px] text-slate-400">{c.matric}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.hostel} · {c.room}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs bg-slate-100 rounded-lg px-2 py-1 font-medium text-slate-600">
                      {CATEGORY_ICONS[c.category] ?? "📌"} {c.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${PRIORITY_CONFIG[c.priority]?.badge}`}>
                      {c.priority?.charAt(0).toUpperCase() + c.priority?.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                    {c.claimedBy ?? <span className="text-slate-300 italic">Unclaimed</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.submittedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── MANAGE PORTERS VIEW ───────────────────────────────────────────
function ManagePortersView({ porters, complaints }) {
  const [showAdd, setShowAdd]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successMsg, setSuccessMsg]   = useState("");

  const handleDeleteConfirm = async (uid) => {
    await deletePorter(uid);
    setSuccessMsg("Porter removed successfully.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleAddSuccess = (name) => {
    setSuccessMsg(`${name} has been added as a porter!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div className="p-6 w-full">

      {showAdd    && <AddPorterModal    onClose={() => setShowAdd(false)}         onSuccess={handleAddSuccess}   />}
      {deleteTarget && <DeleteConfirmModal porter={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Playfair Display', serif" }}>Manage Porters</h1>
          <p className="text-sm text-slate-400 mt-1">
            Add or remove porters from HostelDesk
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400
                           text-slate-900 text-sm font-bold hover:bg-amber-500 transition-colors shadow">
          <Plus className="w-4 h-4" /> Add New Porter
        </button>
      </div>

      {successMsg && (
        <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3
                        flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-700">{successMsg}</p>
        </div>
      )}

      {porters.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl
                        border border-slate-100 shadow-sm">
          <div className="text-center space-y-3">
            <UserCheck className="w-12 h-12 text-slate-200 mx-auto" />
            <p className="text-slate-400 text-sm">No porters yet. Add your first porter above.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {porters.map((p) => {
            const porterResolved = complaints.filter(c => c.claimedById === p.uid && c.status === "resolved").length;
            const porterActive   = complaints.filter(c => c.claimedById === p.uid && c.status !== "resolved").length;
            const total          = porterResolved + porterActive;
            const rate           = total > 0 ? Math.round((porterResolved / total) * 100) : 0;

            return (
              <div key={p.uid} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center
                                    justify-center text-sm font-bold text-white flex-shrink-0">
                      {p.initials}
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.block} · {p.staffId}</p>
                      <p className="text-xs text-slate-400">{p.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setDeleteTarget(p)}
                          className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center
                                     justify-center hover:bg-red-100 transition-colors group">
                    <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Active",   value: porterActive,   color: "text-amber-600"   },
                    { label: "Resolved", value: porterResolved, color: "text-emerald-600" },
                    { label: "Total",    value: total,           color: "text-slate-700"   },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold ${s.color}`}
                         style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Resolution rate */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">Resolution rate</span>
                    <span className="font-bold text-emerald-600">{rate}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all"
                         style={{ width: `${rate}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────
export default function AdminApp({ user, onLogout }) {
  const [active, setActive]         = useState("dashboard");
  const [showLogout, setShowLogout] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [porters, setPorters]       = useState([]);

  // Live listeners
  useEffect(() => {
    const unsubC = listenAllComplaints(setComplaints);
    const unsubP = listenPorters(setPorters);
    return () => { unsubC(); unsubP(); };
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {showLogout && (
        <LogoutModal userName={user.name} onConfirm={onLogout} onCancel={() => setShowLogout(false)} />
      )}

      <Sidebar active={active} setActive={setActive} user={user} onLogout={() => setShowLogout(true)} />

      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <Topbar pageTitle={PAGE_TITLES[active] ?? active} user={user} />
        <main className="flex-1 overflow-auto w-full">
          {active === "dashboard"  ? <DashboardView    setActive={setActive} user={user} complaints={complaints} porters={porters} /> :
           active === "complaints" ? <AllComplaintsView complaints={complaints} /> :
           active === "porters"    ? <ManagePortersView porters={porters} complaints={complaints} /> :
                                    <PlaceholderView   id={active} />
          }
        </main>
      </div>
    </div>
  );
}