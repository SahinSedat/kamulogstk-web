"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/actions/users";
import { Plus, X, Loader2, UserPlus } from "lucide-react";

export default function CreateUserModal() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", phone: "", role: "USER" });
  const router = useRouter();

  const handleSubmit = () => {
    if (!form.email || !form.password) { setError("E-posta ve şifre gerekli"); return; }
    setError("");
    startTransition(async () => {
      const result = await createUser(form);
      if (result.success) {
        setOpen(false);
        setForm({ email: "", password: "", firstName: "", lastName: "", phone: "", role: "USER" });
        router.refresh();
      } else {
        setError(result.error || "Bir hata oluştu");
      }
    });
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all glow-primary">
        <Plus className="w-4 h-4" /> Yeni Kullanıcı
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div className="glass-card p-6 w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Yeni Kullanıcı</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>

            {error && <div className="p-3 mb-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Ad</label>
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Soyad</label>
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted">E-posta *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full text-sm mt-1" required />
              </div>
              <div>
                <label className="text-xs text-text-muted">Şifre *</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full text-sm mt-1" required />
              </div>
              <div>
                <label className="text-xs text-text-muted">Telefon</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full text-sm mt-1" placeholder="+90 5XX XXX XX XX" />
              </div>
              <div>
                <label className="text-xs text-text-muted">Rol</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full text-sm mt-1">
                  <option value="USER">Kullanıcı</option>
                  <option value="CONSULTANT">Danışman</option>
                  <option value="MODERATOR">Moderatör</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <button onClick={handleSubmit} disabled={pending}
                className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-medium flex items-center justify-center gap-2">
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
