import { useState } from "react";

// ─── NAVIGATION CONFIG ────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: "Main Menu",
    items: [
      { id: "dashboard",  icon: "⊞",  label: "Dashboard"       },
      { id: "complaints", icon: "📋", label: "All Complaints", badge: 12 },
      { id: "submit",     icon: "➕", label: "New Complaint"   },
      { id: "track",      icon: "🔍", label: "Track Complaint" },
    ],
  },
  {
    label: "Management",
    items: [
      { id: "hostels",   icon: "🏠", label: "Hostels"          },
      { id: "staff",     icon: "👥", label: "Staff Assign"     },
      { id: "analytics", icon: "📊", label: "Analytics"        },
      { id: "notifs",    icon: "🔔", label: "Notifications", badge: 3 },
    ],
  },
  {
    label: "System",
    items: [
      { id: "settings", icon: "⚙️", label: "Settings"      },
      { id: "help",     icon: "❓", label: "Help & Support" },
    ],
  },
];

const PAGE_TITLES = {
  dashboard:  "Dashboard",
  complaints: "All Complaints",
  submit:     "New Complaint",
  track:      "Track Complaint",
  hostels:    "Hostels",
  staff:      "Staff Assignment",
  analytics:  "Analytics",
  notifs:     "Notifications",
  settings:   "Settings",
  help:       "Help & Support",
};

// ─── SIDEBAR ──────────────────────────────────────────────────────
function Sidebar({ active, setActive }) {
  return (
    <aside className="w-60 bg-[#152B47] flex flex-col fixed top-0 left-0 bottom-0 z-30 shadow-xl">

      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#C9A227] rounded-lg flex items-center justify-center text-xl shadow">
            🏛️
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight"
               style={{ fontFamily: "'Playfair Display', serif" }}>
              HostelDesk
            </p>
            <p className="text-white/40 text-[11px] tracking-wide">Crawford University</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-5 pb-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest">
              {section.label}
            </p>
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`
                  w-full flex items-center gap-2.5 px-4 py-2.5 mx-0 text-sm font-medium
                  transition-all duration-150 text-left
                  ${active === item.id
                    ? "bg-[#2E6DA4] text-white"
                    : "text-white/50 hover:text-white hover:bg-white/8"
                  }
                `}
              >
                <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-[#C9A227] text-[#152B47] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2.5 bg-white/6 rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-[#C9A227] flex items-center justify-center
                          text-xs font-bold text-[#152B47] flex-shrink-0">
            AO
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold leading-tight truncate">Admin Officer</p>
            <p className="text-white/40 text-[11px]">Super Admin</p>
          </div>
          <button className="ml-auto text-white/30 hover:text-white/70 text-base">⋯</button>
        </div>
      </div>

    </aside>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────
function Topbar({ pageTitle }) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center
                       gap-4 px-6 sticky top-0 z-20 shadow-sm">

      <h2 className="text-lg font-bold text-[#1E3A5F]"
          style={{ fontFamily: "'Playfair Display', serif" }}>
        {pageTitle}
      </h2>

      <div className="ml-auto flex items-center gap-3">

        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200
                        rounded-lg px-3 py-1.5 w-52">
          <span className="text-slate-400 text-sm">🔍</span>
          <input
            placeholder="Search complaints..."
            className="bg-transparent text-sm text-slate-600 outline-none w-full
                       placeholder:text-slate-400"
          />
        </div>

        {/* Notification Bell */}
        <button className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200
                           flex items-center justify-center text-base relative
                           hover:bg-slate-200 transition-colors">
          🔔
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full
                           bg-red-500 border-2 border-white" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-[#C9A227] flex items-center
                        justify-content font-bold text-[#152B47] text-xs cursor-pointer
                        hover:opacity-90 transition-opacity justify-center">
          AO
        </div>

      </div>
    </header>
  );
}

// ─── PLACEHOLDER (temporary until we build each view) ─────────────
function PlaceholderView({ id }) {
  const icons = {
    complaints: "📋", submit: "➕", track: "🔍",
    hostels: "🏠", staff: "👥", analytics: "📊",
    notifs: "🔔", settings: "⚙️", help: "❓",
  };
  return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="text-center space-y-3">
        <div className="text-6xl">{icons[id] ?? "📄"}</div>
        <h2 className="text-xl font-bold text-[#1E3A5F]"
            style={{ fontFamily: "'Playfair Display', serif" }}>
          {PAGE_TITLES[id]}
        </h2>
        <p className="text-sm text-slate-400">This view is coming in the next step.</p>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("dashboard");

  return (
    <div
      className="flex min-h-screen bg-[#F4F7FB]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Google Fonts injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }
      `}</style>

      {/* Sidebar */}
      <Sidebar active={active} setActive={setActive} />

      {/* Main Content Area */}
      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        <Topbar pageTitle={PAGE_TITLES[active] ?? active} />

        <main className="flex-1 overflow-auto">
          {/* 👇 Each view will be swapped in here in the next steps */}
          {active === "dashboard"  ? <PlaceholderView id="dashboard" />  :
           active === "complaints" ? <PlaceholderView id="complaints" /> :
           active === "submit"     ? <PlaceholderView id="submit" />     :
           active === "track"      ? <PlaceholderView id="track" />      :
                                     <PlaceholderView id={active} />
          }
        </main>
      </div>

    </div>
  );
}