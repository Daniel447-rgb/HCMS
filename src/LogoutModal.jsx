import { LogOut, X } from "lucide-react";

export default function LogoutModal({ onConfirm, onCancel, userName }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8
                      w-full max-w-sm mx-4 text-center">

        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-100
                     flex items-center justify-center text-slate-400
                     hover:bg-slate-200 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center
                        justify-center mx-auto mb-5">
          <LogOut className="w-8 h-8 text-red-500" />
        </div>

        {/* Text */}
        <h2 className="text-xl font-bold text-slate-800 mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}>
          Log Out?
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Are you sure you want to log out
          {userName ? (
            <>, <span className="font-semibold text-slate-600">{userName.split(" ")[0]}</span>?</>
          ) : "?"}
          <br />
          You will be returned to the login screen.
        </p>

        {/* Buttons */}
        <div className="flex gap-3 mt-7">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200
                       text-sm font-bold text-slate-600
                       hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            Stay Logged In
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white
                       text-sm font-bold hover:bg-red-600 transition-colors
                       flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
}