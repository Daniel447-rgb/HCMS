import React from 'react'
import { useState } from "react";
import {
  Building2, Eye, EyeOff, GraduationCap, Home,
  ShieldCheck, ArrowRight, CheckCircle2,
  Zap, Search, Bell, BarChart2,
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";

const HOSTELS = [
  "Block A (Male Hostel)",
  "Block B (Female Hostel)",
  "Block C (Mixed)",
  "Block D (Postgraduate)",
];

// ─── PASSWORD INPUT ────────────────────────────────────────────────
function PasswordInput({ label, value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm
                      text-slate-700 outline-none transition-all
                      placeholder:text-slate-300
                      ${error
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 focus:border-[#1447A3] focus:ring-2 focus:ring-blue-100"
                      }`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2
                     text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

// ─── TEXT INPUT ────────────────────────────────────────────────────
function TextInput({ label, type = "text", value, onChange,
                     placeholder, error, maxLength, suffix }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full px-4 py-3 rounded-xl border text-sm
                      text-slate-700 outline-none transition-all
                      placeholder:text-slate-300
                      ${suffix ? "pr-14" : ""}
                      ${error
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 focus:border-[#1447A3] focus:ring-2 focus:ring-blue-100"
                      }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2
                           text-xs font-bold text-slate-300">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

// ─── LEFT PANEL ────────────────────────────────────────────────────
function LeftPanel({ mode }) {
  const isRegister = mode === "register";
  const features = isRegister
    ? [
        { Icon: CheckCircle2, text: "Instant complaint submission"      },
        { Icon: Search,       text: "Track your complaint in real time" },
        { Icon: Bell,         text: "Get notified on every update"      },
        { Icon: BarChart2,    text: "View your full complaint history"  },
      ]
    : [
        { Icon: Zap,       text: "Complaints reviewed within 24 hours" },
        { Icon: Search,    text: "Track status in real time"           },
        { Icon: Bell,      text: "Instant notifications on updates"    },
        { Icon: BarChart2, text: "Full complaint history at a glance"  },
      ];

  return (
    <div className="w-full md:w-[44%] flex-shrink-0 bg-[#1447A3] flex flex-col
                justify-between p-8 md:p-10 relative overflow-hidden min-h-[280px] md:min-h-screen">
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full
                      bg-white opacity-5 pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-72 h-72 rounded-full
                      bg-white opacity-5 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-11 h-11 bg-white rounded-xl flex items-center
                          justify-center shadow-lg flex-shrink-0">
            <Building2 className="w-6 h-6 text-[#1447A3]" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight"
               style={{ fontFamily: "'Playfair Display', serif" }}>
              HostelDesk
            </p>
            <p className="text-blue-200 text-xs tracking-wide">Crawford University</p>
          </div>
        </div>

        <h1 className="text-white text-3xl font-bold leading-tight mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}>
          {isRegister
            ? "Join HostelDesk today"
            : "Your hostel, managed smarter"}
        </h1>
        <p className="text-blue-200 text-sm leading-relaxed">
          {isRegister
            ? "Create your student account to submit and track hostel complaints instantly."
            : "Submit complaints, track resolutions and stay updated on your hostel's maintenance — all in one place."}
        </p>
      </div>

      <div className="relative z-10 space-y-4">
        {features.map(({ Icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center
                            justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-blue-200" />
            </div>
            <span className="text-blue-100 text-sm">{text}</span>
          </div>
        ))}
      </div>

      <div className="relative z-10">
        <p className="text-blue-300/60 text-xs">
          © 2026 Crawford University · HostelDesk v1.0
        </p>
      </div>
    </div>
  );
}

// ─── LOGIN FORM ────────────────────────────────────────────────────
function LoginForm({ onLogin, onSwitch }) {
  const [role, setRole]         = useState("student");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const ROLES = [
    { id: "student", Icon: GraduationCap, label: "Student" },
    { id: "porter",  Icon: Home,          label: "Porter"  },
    { id: "admin",   Icon: ShieldCheck,   label: "Admin"   },
  ];

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      // 1. Sign in with Firebase Auth
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password.trim()
      );

      // 2. Fetch their Firestore profile
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists()) {
        setError("No profile found. Please contact the admin.");
        await auth.signOut();
        setLoading(false);
        return;
      }

      // 3. Make sure they picked the right role tab
      const profile = snap.data();
      if (profile.role !== role) {
        setError(
          `This is a ${profile.role} account. ` +
          `Please click the "${profile.role}" tab above.`
        );
        await auth.signOut();
        setLoading(false);
        return;
      }

      // 4. Log them in
      onLogin({ uid: cred.user.uid, ...profile });

    } catch (err) {
      const code = err.code;
      if (
        code === "auth/user-not-found"     ||
        code === "auth/wrong-password"     ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-email"
      ) {
        setError("Wrong email or password. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment then try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-12 py-10 overflow-y-auto">
      <div className="max-w-sm w-full mx-auto">

        <div className="mb-7">
          <h2 className="text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Playfair Display', serif" }}>
            Welcome back
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Sign in to your HostelDesk account to continue.
          </p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {ROLES.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => { setRole(id); setError(""); }}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-xl
                           border-2 transition-all
                           ${role === id
                             ? "border-[#1447A3] bg-blue-50"
                             : "border-slate-200 bg-white hover:border-blue-200"}`}
            >
              <Icon className={`w-5 h-5
                ${role === id ? "text-[#1447A3]" : "text-slate-400"}`} />
              <span className={`text-xs font-bold
                ${role === id ? "text-[#1447A3]" : "text-slate-500"}`}>
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-4 mb-5">
          <TextInput
            label="Email Address"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(""); }}
            placeholder="yourname@example.com"
          />
          <PasswordInput
            label="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            placeholder="Enter your password"
          />
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl
                          px-4 py-3 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2
                     bg-[#1447A3] text-white font-bold text-sm py-3.5
                     rounded-xl hover:bg-blue-800 transition-colors
                     disabled:opacity-60 disabled:cursor-not-allowed
                     shadow-lg shadow-blue-200"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white
                              rounded-full animate-spin" />
              Signing in…
            </>
          ) : (
            <>Sign In <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        <p className="text-center text-sm text-slate-400 mt-5">
          New student?{" "}
          <button
            onClick={onSwitch}
            className="text-[#1447A3] font-bold hover:underline"
          >
            Create an account
          </button>
        </p>

      </div>
    </div>
  );
}

// ─── REGISTER FORM ─────────────────────────────────────────────────
function RegisterForm({ onRegister, onSwitch }) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    matric: "", hostel: "", room: "",
    password: "", confirm: "",
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim())  e.lastName  = "Last name is required";
    if (!form.email.trim())     e.email     = "Email is required";
    else if (!form.email.trim().toLowerCase().endsWith("@gmail.com"))
      e.email = "Must be a Gmail address (@gmail.com)";
    if (!form.matric.trim())    e.matric    = "Matric number is required";
    else if (!/^\d{9}$/.test(form.matric.trim()))
      e.matric = "Must be exactly 9 digits";
    if (!form.hostel)           e.hostel   = "Please select a hostel block";
    if (!form.room.trim())      e.room     = "Room number is required";
    if (!form.password)         e.password = "Password is required";
    else if (form.password.length < 6)
      e.password = "Minimum 6 characters";
    if (!form.confirm)          e.confirm  = "Please confirm your password";
    else if (form.confirm !== form.password)
      e.confirm = "Passwords do not match";
    return e;
  };

  const handleRegister = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    try {
      // 1. Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email.trim().toLowerCase(),
        form.password
      );

      // 2. Save profile to Firestore users collection
      const hostelShort = form.hostel.split(" (")[0];
      const profile = {
        role:     "student",
        name:     `${form.firstName.trim()} ${form.lastName.trim()}`,
        initials: `${form.firstName[0]}${form.lastName[0]}`.toUpperCase(),
        email:    form.email.trim().toLowerCase(),
        matric:   form.matric.trim(),
        hostel:   hostelShort,
        room:     form.room.trim(),
      };
      await setDoc(doc(db, "users", cred.user.uid), profile);

      // 3. Show success screen then log in
      setSuccess(true);
      setTimeout(() => onRegister({ uid: cred.user.uid, ...profile }), 1000);

    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setErrors(prev => ({
          ...prev, email: "This email is already registered. Try logging in."
        }));
      } else {
        setErrors(prev => ({
          ...prev, email: "Registration failed. Please try again."
        }));
      }
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center px-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center
                          justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Playfair Display', serif" }}>
            Account Created!
          </h2>
          <p className="text-slate-400 text-sm">
            Welcome to HostelDesk. Logging you in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-12 py-10">
      <div className="max-w-sm w-full mx-auto">

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Playfair Display', serif" }}>
            Create your account
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Student registration — fill in all fields below.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200
                        rounded-xl px-4 py-2.5 mb-5">
          <GraduationCap className="w-4 h-4 text-[#1447A3] flex-shrink-0" />
          <p className="text-sm text-[#1447A3] font-semibold">Student Registration</p>
          <span className="ml-auto text-[10px] text-blue-400 font-medium whitespace-nowrap">
            Porters & Admins are pre-registered
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="First Name *"
              value={form.firstName}
              onChange={e => set("firstName", e.target.value)}
              placeholder="Amara"
              error={errors.firstName}
            />
            <TextInput
              label="Last Name *"
              value={form.lastName}
              onChange={e => set("lastName", e.target.value)}
              placeholder="Johnson"
              error={errors.lastName}
            />
          </div>

          <TextInput
            label="Gmail Address *"
            type="email"
            value={form.email}
            onChange={e => set("email", e.target.value)}
            placeholder="yourname@gmail.com"
            error={errors.email}
          />

          <TextInput
            label="Matric Number * (9 digits)"
            value={form.matric}
            onChange={e => set("matric", e.target.value.replace(/\D/g, ""))}
            placeholder="210304042"
            maxLength={9}
            suffix={`${form.matric.length}/9`}
            error={errors.matric}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Hostel Block *
              </label>
              <select
                value={form.hostel}
                onChange={e => set("hostel", e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm
                             text-slate-700 bg-white outline-none transition-all
                             ${errors.hostel
                               ? "border-red-300 bg-red-50"
                               : "border-slate-200 focus:border-[#1447A3] focus:ring-2 focus:ring-blue-100"
                             }`}
              >
                <option value="">Select block…</option>
                {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              {errors.hostel && (
                <p className="text-xs text-red-500 font-medium">{errors.hostel}</p>
              )}
            </div>
            <TextInput
              label="Room Number *"
              value={form.room}
              onChange={e => set("room", e.target.value)}
              placeholder="Room 14"
              error={errors.room}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PasswordInput
              label="Password *"
              value={form.password}
              onChange={e => set("password", e.target.value)}
              placeholder="Min. 6 chars"
              error={errors.password}
            />
            <PasswordInput
              label="Confirm Password *"
              value={form.confirm}
              onChange={e => set("confirm", e.target.value)}
              placeholder="Repeat password"
              error={errors.confirm}
            />
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={loading}
          className="mt-6 w-full flex items-center justify-center gap-2
                     bg-[#1447A3] text-white font-bold text-sm py-3.5
                     rounded-xl hover:bg-blue-800 transition-colors
                     disabled:opacity-60 disabled:cursor-not-allowed
                     shadow-lg shadow-blue-200"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white
                              rounded-full animate-spin" />
              Creating account…
            </>
          ) : (
            <>Create Account <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        <p className="text-center text-sm text-slate-400 mt-5">
          Already have an account?{" "}
          <button
            onClick={onSwitch}
            className="text-[#1447A3] font-bold hover:underline"
          >
            Sign in here
          </button>
        </p>

      </div>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────
export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row overflow-hidden"
         style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <LeftPanel mode={mode} />
      {mode === "login"
        ? <LoginForm    onLogin={onLogin}    onSwitch={() => setMode("register")} />
        : <RegisterForm onRegister={onLogin} onSwitch={() => setMode("login")}    />
      }
    </div>
  );
}