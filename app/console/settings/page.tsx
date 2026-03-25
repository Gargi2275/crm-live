"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <div className="bg-white border border-blue-100 rounded-lg p-4">
        <h2 className="text-slate-900 font-semibold mb-2">Security Features</h2>
        <ul className="space-y-1 text-sm text-slate-300">
          <li>Login with OTP enabled</li>
          <li>Role badge in navbar active</li>
          <li>Auto-logout warning banner after idle</li>
          <li>Staff export/download actions hidden by role</li>
        </ul>
      </div>
      <div className="bg-white border border-blue-100 rounded-lg p-4">
        <h2 className="text-slate-900 font-semibold mb-2">Audit Log</h2>
        <p className="text-sm text-slate-300">09:48 AM | Nimit accessed PASSPORT_DevkishanSuthar_2026.pdf</p>
        <p className="text-sm text-slate-300">10:14 AM | Riya changed stage to DOCUMENTS_REQUIRED</p>
      </div>
    </div>
  );
}

