import React from 'react'
import { useState, useEffect } from "react";
import {
  listenAllComplaints,
  listenPorters,
  deletePorter,
} from "./complaintsService.js";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import LogoutModal from "./LogoutModal.jsx";
import {
  LayoutDashboard, ClipboardList, Users, Building2,
  BarChart2, Bell, ChevronRight, LogOut, ShieldCheck,
  AlertCircle, CheckCircle2, Flame, Clock, UserCheck,
  Wrench, Search, Trash2, Plus, Eye, EyeOff, X, Menu,
} from "lucide-react";

// ─── CONSTANTS ─────────────────────────────────────────────────────
const BLOCKS_LIST = [
  "Oyo Block", "Edo Block", "Ekiti Block", "Osun 1",
  "Ondo Hall", "Abesan 1", "Abesan 2", "Anthony 1", "Anthony 2", "Anthony 3",
];

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard",  icon: LayoutDashboard, label: "Dashboard"      },
      { id: "complaints", icon: ClipboardList,   label: "All Complaints" },
      { id: "analytics",  icon: BarChart2,        label: "Analytics"      },
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
      { id: "notifs", icon: Bell, label: "Notifications" },
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
  open:     { label: "Open",        dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-600 ring-blue-200"          },
  urgent:   { label: "Urgent",      dot: "bg-red-500",     badge: "bg-red-50 text-red-600 ring-red-200"             },
  progress: { label: "In Progress", dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-600 ring-amber-200"       },
  resolved: { label: "Resolved",    dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-600 ring-emerald-200" },
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

const CAT_COLORS = [
  "bg-amber-400", "bg-blue-500", "bg-emerald-500",
  "bg-purple-500", "bg-red-400", "bg-pink-400", "bg-slate-400",
];

const HEALTH_CONFIG = {
  great: { label: "All Clear",        bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", text: "text-emerald-700" },
  good:  { label: "Good",             bg: "bg-blue-50",    border: "border-blue-200",    dot: "bg-blue-500",    text: "text-blue-700"    },
  fair:  { label: "Needs Attention",  bg: "bg-amber-50",   border: "border-amber-200",   dot: "bg-amber-500",   text: "text-amber-700"   },
  poor:  { label: "High Load",        bg: "bg-red-50",     border: "border-red-200",     dot: "bg-red-500",     text: "text-red-700"     },
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
    <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-3 md:mb-4">
        <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 md:w-5 md:h-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-none mb-1"
         style={{ fontFamily: "'Playfair Display', serif" }}>{value}</p>
      <p className="text-xs md:text-sm font-medium text-slate-500 mb-1">{label}</p>
      {sub && <p className={`text-xs font-semibold ${subColor ?? "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

// ─── SIDEBAR ───────────────────────────────────────────────────────
function Sidebar({ active, setActive, user, onLogout, open, onClose }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
             onClick={onClose} />
      )}
      <aside className={`w-64 bg-slate-900 flex flex-col fixed top-0 left-0 bottom-0 z-50 shadow-2xl
                         transition-transform duration-300
                         ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>

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
            <button onClick={onClose} className="ml-auto md:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
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
                  <button key={item.id}
                          onClick={() => { setActive(item.id); onClose(); }}
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
    </>
  );
}

// ─── TOPBAR ────────────────────────────────────────────────────────
function Topbar({ pageTitle, user, onMenuOpen, onLogout }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center
                       gap-3 px-4 md:px-6 sticky top-0 z-20 shadow-sm">
      <button onClick={onMenuOpen}
              className="md:hidden w-9 h-9 rounded-xl bg-slate-100 border border-slate-200
                         flex items-center justify-center hover:bg-amber-50 hover:border-amber-200
                         transition-colors flex-shrink-0">
        <Menu className="w-4 h-4 text-slate-600" />
      </button>

      <div className="min-w-0">
        <h2 className="text-base md:text-lg font-bold text-slate-800 truncate"
            style={{ fontFamily: "'Playfair Display', serif" }}>{pageTitle}</h2>
        <p className="text-xs text-slate-400 leading-tight hidden sm:block">Crawford University Hostels</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200
                           flex items-center justify-center relative
                           hover:bg-amber-50 hover:border-amber-200 transition-colors group">
          <Bell className="w-4 h-4 text-slate-500 group-hover:text-amber-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        </button>
        <button onClick={onLogout}
                className="md:hidden w-9 h-9 rounded-xl bg-slate-100 border border-slate-200
                           flex items-center justify-center hover:bg-red-50 hover:border-red-200
                           transition-colors group">
          <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-500" />
        </button>
        <div className="hidden md:flex items-center gap-2.5 cursor-pointer hover:bg-slate-50
                        rounded-xl px-2 py-1.5 transition-colors">
          <div className="w-px h-6 bg-slate-200 mr-1" />
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center
                          text-xs font-bold text-slate-900">
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
  const [form, setForm]       = useState({ name: "", email: "", staffId: "", block: "", password: "" });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const BLOCKS = ["Block A", "Block B", "Block C", "Block D", "All Blocks"];
  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.staffId || !form.block || !form.password) {
      setError("Please fill in all fields."); return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    setLoading(true); setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim().toLowerCase(), form.password);
      const initials = form.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
      await setDoc(doc(db, "users", cred.user.uid), {
        role: "porter", name: form.name.trim(), initials,
        email: form.email.trim().toLowerCase(), staffId: form.staffId.trim(), block: form.block,
      });
      onSuccess(form.name); onClose();
    } catch (err) {
      setError(err.code === "auth/email-already-in-use"
        ? "This email is already registered."
        : "Failed to create porter. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800"
                style={{ fontFamily: "'Playfair Display', serif" }}>Add New Porter</h2>
            <p className="text-sm text-slate-400 mt-0.5">Create a porter account for HostelDesk</p>
          </div>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          {[
            { key: "name",  label: "Full Name", type: "text",  placeholder: "Mr. John Doe"           },
            { key: "email", label: "Email",     type: "email", placeholder: "porter@crawford.edu.ng" },
          ].map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{f.label} *</label>
              <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                     placeholder={f.placeholder}
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700
                                outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                                transition-all placeholder:text-slate-300" />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff ID *</label>
              <input type="text" value={form.staffId} onChange={e => set("staffId", e.target.value)}
                     placeholder="PRT/005"
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700
                                outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                                transition-all placeholder:text-slate-300" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Block *</label>
              <select value={form.block} onChange={e => set("block", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700
                                 bg-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all">
                <option value="">Select…</option>
                {BLOCKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password *</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={form.password}
                     onChange={e => set("password", e.target.value)} placeholder="Min. 6 characters"
                     className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm text-slate-700
                                outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                                transition-all placeholder:text-slate-300" />
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
            {loading
              ? <div className="w-4 h-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
              : <><Plus className="w-4 h-4" /> Add Porter</>}
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
    setLoading(false); onClose();
  };
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 md:p-8 text-center">
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
                             bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Trash2 className="w-4 h-4" /> Remove</>}
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 w-full">

      {/* Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 md:p-6 shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-full opacity-5 pointer-events-none">
          <div className="w-48 h-48 rounded-full bg-white absolute -top-10 -right-10" />
          <div className="w-32 h-32 rounded-full bg-white absolute bottom-0 right-16" />
        </div>
        <div className="relative z-10 mb-4">
          <p className="text-amber-400 text-sm font-medium mb-1">Head Porter Overview 👋</p>
          <h1 className="text-white text-xl md:text-2xl font-bold mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}>
            Welcome, {user.name.split(" ").slice(-1)[0]}!
          </h1>
          <p className="text-slate-400 text-sm">
            {porters.length} porters on duty &nbsp;·&nbsp;
            <span className="font-bold text-amber-400">{open.length} open</span> complaints
          </p>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button onClick={() => setActive("complaints")}
                  className="flex items-center justify-center gap-2 bg-amber-400 text-slate-900 font-bold
                             text-sm px-4 py-2.5 rounded-xl shadow hover:bg-amber-300 transition-colors">
            <ClipboardList className="w-4 h-4" /> View All Complaints
          </button>
          <button onClick={() => setActive("porters")}
                  className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold
                             text-sm px-4 py-2.5 rounded-xl hover:bg-white/20 transition-colors">
            <Users className="w-4 h-4" /> Manage Porters
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        <StatCard icon={ClipboardList} iconBg="bg-blue-50"    iconColor="text-blue-600"    label="Total Complaints" value={complaints.length} sub="All time"            subColor="text-slate-400"   />
        <StatCard icon={AlertCircle}   iconBg="bg-amber-50"   iconColor="text-amber-500"   label="Open / Urgent"    value={open.length}       sub="Awaiting action"    subColor="text-amber-500"   />
        <StatCard icon={Wrench}        iconBg="bg-blue-50"    iconColor="text-blue-500"    label="In Progress"      value={progress.length}   sub="Being handled"      subColor="text-blue-500"    />
        <StatCard icon={CheckCircle2}  iconBg="bg-emerald-50" iconColor="text-emerald-500" label="Resolved"         value={resolved.length}   sub="Successfully closed" subColor="text-emerald-500" />
      </div>

      {/* Recent Complaints + Porter Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-5">
        <div className="col-span-1 md:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
                <div key={c.id} className="flex items-center gap-3 px-4 md:px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-lg flex-shrink-0">
                    {CATEGORY_ICONS[c.category] ?? "📌"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{c.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-slate-400 truncate">{c.hostel} · {c.room}</span>
                      <span className="text-slate-200 hidden sm:inline">·</span>
                      <span className="text-xs text-slate-400 hidden sm:inline truncate">{c.studentName}</span>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-1 md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
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
                    <div className="text-right flex-shrink-0">
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

      {urgent.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 md:px-5 py-4 flex items-start gap-3">
          <Flame className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">
              {urgent.length} urgent complaint{urgent.length > 1 ? "s" : ""} need attention
            </p>
            <p className="text-sm text-red-600 mt-0.5">High priority and not yet resolved.</p>
          </div>
          <button onClick={() => setActive("complaints")}
                  className="flex-shrink-0 px-3 md:px-4 py-2 rounded-xl bg-red-500 text-white
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
    { key: "all",      label: "All",        count: complaints.length                                       },
    { key: "open",     label: "Open",        count: complaints.filter(c => c.status === "open").length     },
    { key: "urgent",   label: "Urgent",      count: complaints.filter(c => c.status === "urgent").length   },
    { key: "progress", label: "In Progress", count: complaints.filter(c => c.status === "progress").length },
    { key: "resolved", label: "Resolved",    count: complaints.filter(c => c.status === "resolved").length },
  ];

  const filtered = complaints.filter(c => {
    const matchFilter = filter === "all" || c.status === filter;
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.studentName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.hostel ?? "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Playfair Display', serif" }}>All Complaints</h1>
          <p className="text-sm text-slate-400 mt-1">System-wide view of every complaint</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200
                        rounded-xl px-4 py-2.5 w-full sm:w-64 shadow-sm">
          <Search className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Search complaints..."
                 className="bg-transparent text-sm text-slate-600 outline-none w-full placeholder:text-slate-300" />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full text-sm font-semibold
                               border transition-all whitespace-nowrap flex-shrink-0
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
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
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
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700 max-w-[160px]">
                        <p className="truncate">{c.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-700">{c.studentName}</p>
                        <p className="text-[10px] text-slate-400">{c.matric}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{c.hostel} · {c.room}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-100 rounded-lg px-2 py-1 font-medium text-slate-600 whitespace-nowrap">
                          {CATEGORY_ICONS[c.category] ?? "📌"} {c.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${PRIORITY_CONFIG[c.priority]?.badge}`}>
                          {c.priority?.charAt(0).toUpperCase() + c.priority?.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-medium whitespace-nowrap">
                        {c.claimedBy ?? <span className="text-slate-300 italic">Unclaimed</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.submittedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl flex-shrink-0">
                      {CATEGORY_ICONS[c.category] ?? "📌"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-600">{c.category}</p>
                      <p className="text-sm font-bold text-slate-700 leading-tight truncate max-w-[180px]">{c.title}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-slate-400 font-medium">Student</p>
                    <p className="text-slate-700 font-semibold truncate">{c.studentName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Location</p>
                    <p className="text-slate-700 font-semibold">{c.hostel} · {c.room}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Claimed By</p>
                    <p className={`font-semibold ${c.claimedBy ? "text-slate-700" : "text-slate-300 italic"}`}>
                      {c.claimedBy ?? "Unclaimed"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Date</p>
                    <p className="text-slate-700 font-semibold">{c.submittedAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${PRIORITY_CONFIG[c.priority]?.badge}`}>
                    {c.priority?.charAt(0).toUpperCase() + c.priority?.slice(1)} Priority
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MANAGE PORTERS VIEW ───────────────────────────────────────────
function ManagePortersView({ porters, complaints }) {
  const [showAdd, setShowAdd]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successMsg, setSuccessMsg]     = useState("");

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
    <div className="p-4 md:p-6 w-full">
      {showAdd      && <AddPorterModal    onClose={() => setShowAdd(false)}           onSuccess={handleAddSuccess}   />}
      {deleteTarget && <DeleteConfirmModal porter={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} />}

      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Playfair Display', serif" }}>Manage Porters</h1>
          <p className="text-sm text-slate-400 mt-1">Add or remove porters from HostelDesk</p>
        </div>
        <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-3 md:px-5 py-2.5 rounded-xl bg-amber-400
                           text-slate-900 text-sm font-bold hover:bg-amber-500 transition-colors shadow">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add New Porter</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {successMsg && (
        <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-700">{successMsg}</p>
        </div>
      )}

      {porters.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-center space-y-3">
            <UserCheck className="w-12 h-12 text-slate-200 mx-auto" />
            <p className="text-slate-400 text-sm">No porters yet. Add your first porter above.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {porters.map((p) => {
            const porterResolved = complaints.filter(c => c.claimedById === p.uid && c.status === "resolved").length;
            const porterActive   = complaints.filter(c => c.claimedById === p.uid && c.status !== "resolved").length;
            const total          = porterResolved + porterActive;
            const rate           = total > 0 ? Math.round((porterResolved / total) * 100) : 0;
            return (
              <div key={p.uid} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 md:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-emerald-700 flex items-center
                                    justify-center text-sm font-bold text-white flex-shrink-0">
                      {p.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.block} · {p.staffId}</p>
                      <p className="text-xs text-slate-400 truncate">{p.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setDeleteTarget(p)}
                          className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center
                                     justify-center hover:bg-red-100 transition-colors group flex-shrink-0">
                    <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
                  {[
                    { label: "Active",   value: porterActive,   color: "text-amber-600"   },
                    { label: "Resolved", value: porterResolved, color: "text-emerald-600" },
                    { label: "Total",    value: total,           color: "text-slate-700"   },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 rounded-xl p-2.5 md:p-3 text-center">
                      <p className={`text-lg md:text-xl font-bold ${s.color}`}
                         style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">Resolution rate</span>
                    <span className="font-bold text-emerald-600">{rate}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${rate}%` }} />
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

// ─── HOSTEL BLOCKS VIEW ────────────────────────────────────────────
function HostelBlocksView({ complaints, porters }) {
  const [selected, setSelected] = useState(null);

  const blockStats = BLOCKS_LIST.map(block => {
    const blockComplaints = complaints.filter(c =>
      (c.hostel ?? "").toLowerCase() === block.toLowerCase()
    );
    const open     = blockComplaints.filter(c => c.status === "open" || c.status === "urgent").length;
    const progress = blockComplaints.filter(c => c.status === "progress").length;
    const resolved = blockComplaints.filter(c => c.status === "resolved").length;
    const total    = blockComplaints.length;
    const rate     = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const assignedPorters = porters.filter(p =>
      (p.block ?? "").toLowerCase() === block.toLowerCase() ||
      (p.block ?? "").toLowerCase() === "all blocks"
    );
    const health = open === 0 ? "great" : open <= 2 ? "good" : open <= 5 ? "fair" : "poor";
    return { block, total, open, progress, resolved, rate, assignedPorters, health, blockComplaints };
  });

  if (selected) {
    const s   = blockStats.find(b => b.block === selected);
    const cfg = HEALTH_CONFIG[s.health];
    const categories = {};
    s.blockComplaints.forEach(c => {
      categories[c.category] = (categories[c.category] ?? 0) + 1;
    });

    return (
      <div className="p-4 md:p-6 w-full">
        <button onClick={() => setSelected(null)}
                className="flex items-center gap-2 text-sm font-semibold text-amber-600 hover:underline mb-6">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to All Blocks
        </button>

        <div className="max-w-3xl mx-auto space-y-5">
          <div className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5 md:p-6`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-800"
                    style={{ fontFamily: "'Playfair Display', serif" }}>{s.block}</h1>
                <p className="text-sm text-slate-500 mt-1">Crawford University Hostel</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                               text-xs font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: "Total",       value: s.total,    color: "text-slate-700"   },
                { label: "Open",        value: s.open,     color: "text-amber-600"   },
                { label: "In Progress", value: s.progress, color: "text-blue-600"    },
                { label: "Resolved",    value: s.resolved, color: "text-emerald-600" },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className={`text-2xl font-bold ${stat.color}`}
                     style={{ fontFamily: "'Playfair Display', serif" }}>{stat.value}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-700">Resolution Rate</p>
              <span className="text-lg font-bold text-emerald-600"
                    style={{ fontFamily: "'Playfair Display', serif" }}>{s.rate}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${s.rate}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">{s.resolved} of {s.total} complaints resolved</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-bold text-slate-700">Assigned Porters</p>
            </div>
            {s.assignedPorters.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No porters assigned to this block.</p>
            ) : (
              <div className="space-y-3">
                {s.assignedPorters.map(p => (
                  <div key={p.uid} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center
                                    justify-center text-xs font-bold text-white flex-shrink-0">
                      {p.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.staffId} · {p.block}</p>
                    </div>
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200
                                     px-2 py-1 rounded-full font-semibold flex-shrink-0">Porter</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {Object.keys(categories).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-bold text-slate-700">Complaint Categories</p>
              </div>
              <div className="space-y-3">
                {Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-600">{CATEGORY_ICONS[cat] ?? "📌"} {cat}</span>
                      <span className="font-bold text-slate-700">{count}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full"
                           style={{ width: `${Math.round((count / s.total) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {s.blockComplaints.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-bold text-slate-700">Recent Complaints</p>
              </div>
              <div className="divide-y divide-slate-50">
                {s.blockComplaints.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-base flex-shrink-0">
                      {CATEGORY_ICONS[c.category] ?? "📌"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{c.title}</p>
                      <p className="text-xs text-slate-400">{c.room} · {c.studentName}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}>Hostel Blocks</h1>
        <p className="text-sm text-slate-400 mt-1">
          Overview of all {BLOCKS_LIST.length} blocks · tap a block for details
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Blocks",   value: BLOCKS_LIST.length,                                                        icon: Building2,    bg: "bg-slate-100",  color: "text-slate-700"   },
          { label: "Active Issues",  value: complaints.filter(c => c.status !== "resolved").length,                    icon: AlertCircle,  bg: "bg-amber-50",   color: "text-amber-600"   },
          { label: "Resolved",       value: complaints.filter(c => c.status === "resolved").length,                    icon: CheckCircle2, bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "Blocks w/ Load", value: blockStats.filter(b => b.health === "fair" || b.health === "poor").length, icon: Flame,        bg: "bg-red-50",     color: "text-red-600"     },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800"
                 style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {blockStats.map(s => {
          const cfg = HEALTH_CONFIG[s.health];
          return (
            <div key={s.block} onClick={() => setSelected(s.block)}
                 className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5
                            hover:shadow-md hover:border-amber-200 cursor-pointer transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-amber-600 transition-colors"
                      style={{ fontFamily: "'Playfair Display', serif" }}>{s.block}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {s.assignedPorters.length} porter{s.assignedPorters.length !== 1 ? "s" : ""} assigned
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                 text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Open",     value: s.open,     color: s.open > 0 ? "text-amber-600" : "text-slate-400"    },
                  { label: "Active",   value: s.progress, color: s.progress > 0 ? "text-blue-600" : "text-slate-400" },
                  { label: "Resolved", value: s.resolved, color: "text-emerald-600"                                   },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-50 rounded-xl p-2.5 text-center">
                    <p className={`text-lg font-bold ${stat.color}`}
                       style={{ fontFamily: "'Playfair Display', serif" }}>{stat.value}</p>
                    <p className="text-[10px] text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Resolution rate</span>
                  <span className="font-bold text-emerald-600">{s.rate}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.rate}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                <span className="text-xs text-slate-400">{s.total} total complaint{s.total !== 1 ? "s" : ""}</span>
                <span className="text-xs font-semibold text-amber-600 group-hover:underline flex items-center gap-1">
                  View details <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ANALYTICS VIEW ────────────────────────────────────────────────
function AnalyticsView({ complaints, porters }) {
  const resolved  = complaints.filter(c => c.status === "resolved");
  const open      = complaints.filter(c => c.status === "open" || c.status === "urgent");
  const progress  = complaints.filter(c => c.status === "progress");
  const totalRate = complaints.length > 0
    ? Math.round((resolved.length / complaints.length) * 100) : 0;

  const categories = {};
  complaints.forEach(c => { categories[c.category] = (categories[c.category] ?? 0) + 1; });
  const catEntries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const catMax     = catEntries[0]?.[1] ?? 1;

  const monthlyData = (() => {
    const now    = new Date();
    const months = [];
    for (let i = 6; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ label, key, count: 0, resolved: 0 });
    }
    complaints.forEach(c => {
      if (!c.submittedAt) return;
      const d = new Date(c.submittedAt);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m   = months.find(m => m.key === key);
      if (m) { m.count++; if (c.status === "resolved") m.resolved++; }
    });
    return months;
  })();
  const chartMax = Math.max(...monthlyData.map(m => m.count), 1);

  const porterPerf = porters.map(p => {
    const claimed   = complaints.filter(c => c.claimedById === p.uid);
    const pResolved = claimed.filter(c => c.status === "resolved").length;
    const pActive   = claimed.filter(c => c.status !== "resolved").length;
    const rate      = claimed.length > 0 ? Math.round((pResolved / claimed.length) * 100) : 0;
    return { ...p, claimed: claimed.length, resolved: pResolved, active: pActive, rate };
  }).sort((a, b) => b.resolved - a.resolved);

  const statusDist = [
    { label: "Open",        value: open.length,     color: "bg-blue-500",    text: "text-blue-600",    pct: complaints.length > 0 ? Math.round((open.length / complaints.length) * 100) : 0     },
    { label: "In Progress", value: progress.length, color: "bg-amber-400",   text: "text-amber-600",   pct: complaints.length > 0 ? Math.round((progress.length / complaints.length) * 100) : 0 },
    { label: "Resolved",    value: resolved.length, color: "bg-emerald-500", text: "text-emerald-600", pct: totalRate },
  ];

  return (
    <div className="p-4 md:p-6 w-full space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}>Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">System-wide performance overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Complaints", value: complaints.length, icon: ClipboardList, bg: "bg-blue-50",    color: "text-blue-600",    sub: "All time"             },
          { label: "Resolution Rate",  value: `${totalRate}%`,  icon: CheckCircle2,  bg: "bg-emerald-50", color: "text-emerald-600", sub: "Of all complaints"    },
          { label: "Open Issues",      value: open.length,      icon: AlertCircle,   bg: "bg-amber-50",   color: "text-amber-600",   sub: "Awaiting resolution"  },
          { label: "Active Porters",   value: porters.length,   icon: UserCheck,     bg: "bg-purple-50",  color: "text-purple-600",  sub: "Registered on system" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.bg}`}>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-none mb-1"
               style={{ fontFamily: "'Playfair Display', serif" }}>{k.value}</p>
            <p className="text-xs font-medium text-slate-500">{k.label}</p>
            <p className={`text-xs font-semibold mt-0.5 ${k.color}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Complaints over time */}
        <div className="col-span-1 md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-bold text-slate-700">Complaints Over Time</p>
            <span className="ml-auto text-xs text-slate-400">Last 7 months</span>
          </div>
          <div className="flex items-end gap-2 md:gap-3 h-36">
            {monthlyData.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-400 font-semibold">{m.count > 0 ? m.count : ""}</span>
                <div className="w-full flex flex-col-reverse gap-0.5">
                  <div className="w-full bg-amber-400 rounded-t-lg transition-all"
                       style={{ height: `${Math.round((m.count / chartMax) * 112)}px`, minHeight: m.count > 0 ? "4px" : "0" }} />
                  {m.resolved > 0 && (
                    <div className="w-full bg-emerald-500 rounded-t-lg -mb-0.5"
                         style={{ height: `${Math.round((m.resolved / chartMax) * 112)}px` }} />
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-400" /><span className="text-xs text-slate-500">Submitted</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500" /><span className="text-xs text-slate-500">Resolved</span></div>
          </div>
        </div>

        {/* Status distribution */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-bold text-slate-700">Status Distribution</p>
          </div>
          <div className="flex flex-col gap-3">
            {statusDist.map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                    <span className="font-semibold text-slate-600">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${s.text}`}>{s.value}</span>
                    <span className="text-slate-400">({s.pct}%)</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-4xl font-bold text-emerald-600"
               style={{ fontFamily: "'Playfair Display', serif" }}>{totalRate}%</p>
            <p className="text-xs text-slate-400 mt-1">Overall resolution rate</p>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-5">
          <ClipboardList className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-bold text-slate-700">Complaints by Category</p>
        </div>
        {catEntries.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No data yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {catEntries.map(([cat, count], i) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600">{CATEGORY_ICONS[cat] ?? "📌"} {cat}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">{count}</span>
                    <span className="text-slate-400">{Math.round((count / complaints.length) * 100)}%</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${CAT_COLORS[i % CAT_COLORS.length]} rounded-full`}
                       style={{ width: `${Math.round((count / catMax) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Porter performance */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-bold text-slate-700">Porter Performance</p>
        </div>
        {porterPerf.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-slate-400 italic">No porters registered yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Porter", "Block", "Claimed", "Active", "Resolved", "Resolution Rate"].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porterPerf.map((p, i) => (
                    <tr key={p.uid} className="border-b border-slate-50 hover:bg-slate-50 transition-colors last:border-0">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="text-base w-6 text-center flex-shrink-0">
                            {i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉"
                              : <span className="text-xs font-bold text-slate-400">{i + 1}</span>}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center
                                          justify-center text-xs font-bold text-white flex-shrink-0">
                            {p.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.staffId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{p.block}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-700">{p.claimed}</td>
                      <td className="px-5 py-3.5"><span className="text-sm font-bold text-amber-600">{p.active}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm font-bold text-emerald-600">{p.resolved}</span></td>
                      <td className="px-5 py-3.5 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.rate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-emerald-600 w-8 text-right">{p.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-50">
              {porterPerf.map((p, i) => (
                <div key={p.uid} className="flex items-center gap-3 px-4 py-4">
                  <div className="w-6 text-center flex-shrink-0 text-base">
                    {i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉"
                      : <span className="text-xs font-bold text-slate-400">{i + 1}</span>}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center
                                  justify-center text-xs font-bold text-white flex-shrink-0">
                    {p.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.block}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-amber-600 font-bold">{p.active} active</span>
                      <span className="text-xs text-emerald-600 font-bold">{p.resolved} resolved</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.rate}%` }} />
                      </div>
                      <span className="text-xs font-bold text-emerald-600">{p.rate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────
export default function AdminApp({ user, onLogout }) {
  const [active,      setActive]      = useState("dashboard");
  const [showLogout,  setShowLogout]  = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [complaints,  setComplaints]  = useState([]);
  const [porters,     setPorters]     = useState([]);

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

      <Sidebar
        active={active} setActive={setActive} user={user}
        onLogout={() => setShowLogout(true)}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
      />

      <div className="ml-0 md:ml-64 flex-1 flex flex-col min-h-screen">
        <Topbar
          pageTitle={PAGE_TITLES[active] ?? active}
          user={user}
          onMenuOpen={() => setSidebarOpen(true)}
          onLogout={() => setShowLogout(true)}
        />
        <main className="flex-1 overflow-auto w-full">
          {active === "dashboard"  ? <DashboardView     setActive={setActive} user={user} complaints={complaints} porters={porters} /> :
           active === "complaints" ? <AllComplaintsView  complaints={complaints} /> :
           active === "porters"    ? <ManagePortersView  porters={porters} complaints={complaints} /> :
           active === "hostels"    ? <HostelBlocksView   complaints={complaints} porters={porters} /> :
           active === "analytics"  ? <AnalyticsView      complaints={complaints} porters={porters} /> :
                                     <PlaceholderView    id={active} />}
        </main>
      </div>
    </div>
  );
}