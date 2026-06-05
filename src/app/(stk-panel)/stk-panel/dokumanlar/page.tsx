"use client";

import { FolderOpen, Upload } from "lucide-react";

export default function DokumanlarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1E293B" }}>Dökümanlar</h1>
          <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>Dernek belgeleri ve dosya yönetimi</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)" }}>
          <Upload className="w-4 h-4" /> Dosya Yükle
        </button>
      </div>
      <div className="rounded-2xl p-12 text-center" style={{ background: "#FFFFFF", border: "1px solid rgba(139, 92, 246, 0.06)", boxShadow: "0 1px 8px rgba(99, 102, 241, 0.04)" }}>
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.06))" }}>
          <FolderOpen className="w-8 h-8" style={{ color: "#6366F1" }} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: "#1E293B" }}>Henüz belge yüklenmedi</h3>
        <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: "#94A3B8" }}>Tüzük, üye listeleri, tutanaklar ve diğer belgeleri yükleyin.</p>
      </div>
    </div>
  );
}
