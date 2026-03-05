import { useState, useEffect } from "react";
import {
  listenAllComplaints,
  claimComplaint,
  updateComplaintStatus,
} from "./complaintsService.js";
import LogoutModal from "./LogoutModal.jsx";
import {
  LayoutDashboard, ClipboardList, CheckCircle2,
  Bell, User, Building2, ChevronRight, LogOut,
  AlertCircle, Clock, Wrench, MessageSquare, BarChart2,
  Hand,
} from "lucide-react";

// ─── NAV ───────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: "Work Queue",
    items: [
      { id: "dashboard", icon: LayoutDashboard, label: "Dashboard"      },
      { id: "open",      icon: ClipboardList,   label: "Open Complaints" },
      { id: "mine",      icon: Wrench,          label: "My Tasks"        },
      { id: "resolved",  icon: CheckCircle2,    label: "Resolved"        },
    ],
  },
  {
    label: "Hostel",
    items: [
      { id: "block",    icon: Building2,     label: "Block Overview" },
      { id: "notifs",   icon: Bell,          label: "Notifications"  },
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

const PAGE_TITLES = {
  dashboard: "Dashboard",
  open:      "Open Complaints",
  mine:      "My Tasks",
  resolved:  "Resolved",
  block:     "Block Overview",
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
function Sidebar({ active, setActive, user, onLogout, openCount, myCount }) {
  return (
    <aside className="w-64 bg-emerald-700 flex flex-col fixed top-0 left-0 bottom-0 z-30 shadow-2xl">

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
              const badge    = item.id === "open" ? (openCount || null)
                             : item.id === "mine" ? (myCount  || null)
                             : null;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                               transition-all duration-150 text-left
                               ${isActive
                                 ? "bg-white text-emerald-700"
                                 : "text-emerald-100/70 hover:text-white hover:bg-white/10"}`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-emerald-700" : "text-emerald-200"}`} />
                  <span className="flex-1">{item.label}</span>
                  {badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                      ${isActive ? "bg-emerald-700 text-white" : "bg-white/20 text-white"}`}>
                      {badge}
                    </span>
                  )}
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
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                     text-emerald-200 hover:text-white hover:bg-white/10
                     transition-all text-sm font-medium"
        >
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
      <div className="ml-auto flex items-center gap-3">
        <button className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200
                           flex items-center justify-center relative
                           hover:bg-emerald-50 hover:border-emerald-200 transition-colors group">
          <Bell className="w-4 h-4 text-slate-500 group-hover:text-emerald-700" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        </button>
        <div className="w-px h-6 bg-slate-200" />
        <div className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white">
            {user.initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-400">{user.staffId} · Porter</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </div>
      </div>
    </header>
  );
}

// ─── PLACEHOLDER ───────────────────────────────────────────────────
function PlaceholderView({ id }) {
  const icons = {
    block:    <Building2     className="w-14 h-14 text-emerald-300 mx-auto" />,
    notifs:   <Bell          className="w-14 h-14 text-emerald-300 mx-auto" />,
    messages: <MessageSquare className="w-14 h-14 text-emerald-300 mx-auto" />,
    profile:  <User          className="w-14 h-14 text-emerald-300 mx-auto" />,
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
    <div className="p-6 space-y-6 w-full">

      {/* Banner */}
      <div className="bg-emerald-700 rounded-2xl p-6 flex items-center justify-between
                      shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
          <div className="w-48 h-48 rounded-full bg-white absolute -top-10 -right-10" />
          <div className="w-32 h-32 rounded-full bg-white absolute bottom-0 right-16" />
        </div>
        <div className="relative z-10">
          <p className="text-emerald-200 text-sm font-medium mb-1">Good morning 👋</p>
          <h1 className="text-white text-2xl font-bold mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}>
            Welcome, {user.name.split(" ").slice(-1)[0]}!
          </h1>
          <p className="text-emerald-200 text-sm">
            {user.staffId} &nbsp;·&nbsp;
            <span className="font-bold text-white">{open.length} open</span> complaints waiting
          </p>
        </div>
        <button
          onClick={() => setActive("open")}
          className="relative z-10 flex items-center gap-2 bg-white text-emerald-700 font-bold
                     text-sm px-5 py-3 rounded-xl shadow hover:bg-emerald-50 transition-colors"
        >
          <ClipboardList className="w-4 h-4" /> View Open Complaints
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5">
        <StatCard icon={ClipboardList} iconBg="bg-blue-50"    iconColor="text-blue-600"    label="Open Complaints"  value={open.length}     sub="Waiting to be claimed"  subColor="text-blue-500"    />
        <StatCard icon={Wrench}        iconBg="bg-amber-50"   iconColor="text-amber-500"   label="My Active Tasks"  value={mine.filter(c => c.status !== "resolved").length} sub="Claimed by you" subColor="text-amber-500"   />
        <StatCard icon={CheckCircle2}  iconBg="bg-emerald-50" iconColor="text-emerald-500" label="I've Resolved"    value={resolved.length} sub="Total resolved by you"  subColor="text-emerald-500" />
        <StatCard icon={AlertCircle}   iconBg="bg-red-50"     iconColor="text-red-500"     label="Urgent"           value={urgent.length}   sub="High priority open"     subColor="text-red-500"     />
      </div>

      {/* Recent open complaints */}
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-lg flex-shrink-0">
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
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${PRIORITY_CONFIG[c.priority]?.badge}`}>
                    {c.priority?.charAt(0).toUpperCase() + c.priority?.slice(1)}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Tasks summary */}
        <div className="col-span-2 space-y-4">
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
  const [status, setStatus] = useState(complaint.status);
  const [notes, setNotes]   = useState(complaint.resolutionNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [claiming, setClaiming] = useState(false);

  const isMine      = complaint.claimedById === user.uid;
  const isClaimed   = !!complaint.claimedBy;
  const isResolved  = complaint.status === "resolved";

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await claimComplaint(complaint.id, user.name, user.uid);
    } catch (err) { console.error(err); }
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
    <div className="p-6 w-full">
      <button onClick={onBack}
              className="flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline mb-6">
        <ChevronRight className="w-4 h-4 rotate-180" /> Back to List
      </button>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">

          {/* Info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Complaint</p>
                <h2 className="text-xl font-bold text-slate-800"
                    style={{ fontFamily: "'Playfair Display', serif" }}>{c.title}</h2>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{c.desc}</p>
            <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
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

          {/* Claim / Claimed banner */}
          {!isResolved && (
            <div className={`rounded-2xl p-5 flex items-center justify-between
              ${isMine
                ? "bg-emerald-50 border border-emerald-200"
                : isClaimed
                  ? "bg-slate-50 border border-slate-200"
                  : "bg-blue-50 border border-blue-200"}`}>
              <div className="flex items-center gap-3">
                <Hand className={`w-5 h-5 flex-shrink-0
                  ${isMine ? "text-emerald-600" : isClaimed ? "text-slate-400" : "text-blue-600"}`} />
                <div>
                  <p className={`text-sm font-bold
                    ${isMine ? "text-emerald-700" : isClaimed ? "text-slate-600" : "text-blue-700"}`}>
                    {isMine
                      ? "You claimed this complaint"
                      : isClaimed
                        ? `Claimed by ${c.claimedBy}`
                        : "This complaint is unclaimed"}
                  </p>
                  <p className={`text-xs mt-0.5
                    ${isMine ? "text-emerald-600" : isClaimed ? "text-slate-400" : "text-blue-600"}`}>
                    {isMine
                      ? "Update its status below when done"
                      : isClaimed
                        ? "Another porter is handling this"
                        : "Claim it to start working on it"}
                  </p>
                </div>
              </div>
              {!isClaimed && (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600
                             text-white text-sm font-bold hover:bg-blue-700 transition-colors
                             disabled:opacity-60"
                >
                  {claiming ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Hand className="w-4 h-4" /> Claim This Task</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Status Update — only if porter claimed it */}
          {isMine && !isResolved && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Resolution Notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Describe what was done, parts replaced, or any follow-up needed..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                             text-slate-700 outline-none resize-none leading-relaxed
                             focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100
                             transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handleUpdate} disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700
                                   text-white text-sm font-bold hover:bg-emerald-800 transition-colors
                                   disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Save Update</>
                  )}
                </button>
                {saved && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Updated! Student notified.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resolved state */}
          {isResolved && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-700">This complaint has been resolved</p>
                {c.resolutionNotes && (
                  <p className="text-sm text-emerald-600 mt-1">{c.resolutionNotes}</p>
                )}
                <p className="text-xs text-emerald-500 mt-2">Resolved by {c.claimedBy} · {c.updatedAt}</p>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-fit">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 text-emerald-700" />
            <p className="text-sm font-bold text-slate-700">Timeline</p>
          </div>
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-100" />
            <div className="space-y-6">
              {[
                { event: "Complaint submitted",  done: true                                                     },
                { event: "Claimed by porter",    done: !!c.claimedBy                                            },
                { event: "Work in progress",     done: c.status === "progress" || c.status === "resolved"       },
                { event: "Resolved & closed",    done: c.status === "resolved"                                  },
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
    c.title.toLowerCase().includes(search.toLowerCase())           ||
    (c.studentName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.hostel ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    // Keep selected in sync with live complaints
    const live = complaints.find(c => c.id === selected.id) ?? selected;
    return <ComplaintDetail complaint={live} onBack={() => setSelected(null)} user={user} />;
  }

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h1 className="text-2xl font-bold text-slate-800"
                style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200
                        rounded-xl px-4 py-2.5 w-64 shadow-sm">
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

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((c) => {
          const isMine    = c.claimedById === user.uid;
          const isClaimed = !!c.claimedBy && !isMine;
          return (
            <div key={c.id} onClick={() => setSelected(c)}
                 className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5
                            hover:shadow-md hover:border-emerald-200 cursor-pointer transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">
                    {CATEGORY_ICONS[c.category] ?? "📌"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-600">{c.category}</p>
                    <p className="text-sm font-bold text-slate-700 leading-tight">{c.title}</p>
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
                <div>
                  <p className="text-xs font-semibold text-slate-700">{c.studentName}</p>
                  <p className="text-[10px] text-slate-400">{c.hostel} · {c.room}</p>
                </div>
                <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${PRIORITY_CONFIG[c.priority]?.badge}`}>
                  {c.priority?.charAt(0).toUpperCase() + c.priority?.slice(1)}
                </span>
              </div>

              {/* Claimed indicator */}
              {isMine && (
                <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2 mb-2">
                  <Hand className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-emerald-700">Claimed by you</span>
                </div>
              )}
              {isClaimed && (
                <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 mb-2">
                  <Hand className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-500">Claimed by {c.claimedBy}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-slate-300" />
                  <span className="text-xs text-slate-400">{c.submittedAt}</span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 group-hover:underline flex items-center gap-1">
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
  const [active, setActive]         = useState("dashboard");
  const [showLogout, setShowLogout] = useState(false);
  const [complaints, setComplaints] = useState([]);

  // Live — all complaints from Firestore
  useEffect(() => {
    const unsub = listenAllComplaints(setComplaints);
    return () => unsub();
  }, []);

  const openComplaints     = complaints.filter(c => c.status === "open" || c.status === "urgent");
  const myComplaints       = complaints.filter(c => c.claimedById === user.uid && c.status !== "resolved");
  const resolvedComplaints = complaints.filter(c => c.status === "resolved");

  return (
    <div className="flex min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {showLogout && (
        <LogoutModal
          userName={user.name}
          onConfirm={onLogout}
          onCancel={() => setShowLogout(false)}
        />
      )}

      <Sidebar
        active={active} setActive={setActive} user={user}
        onLogout={() => setShowLogout(true)}
        openCount={openComplaints.length}
        myCount={myComplaints.length}
      />

      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <Topbar pageTitle={PAGE_TITLES[active] ?? active} user={user} />
        <main className="flex-1 overflow-auto w-full">
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
          ) : (
            <PlaceholderView id={active} />
          )}
        </main>
      </div>
    </div>
  );
}