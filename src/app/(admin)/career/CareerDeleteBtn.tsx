"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function CareerDeleteBtn({ id, title }: { id: string; title: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        if (!confirm(`"${title}" ilanını silmek istediğinize emin misiniz?`)) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/kariyer/jobs/${id}`, { method: "DELETE" });
            if (res.ok) {
                router.refresh();
            } else {
                const err = await res.json();
                alert(err.error || "Silinemedi");
            }
        } catch {
            alert("Bir hata oluştu");
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
        >
            <Trash2 className="w-3.5 h-3.5 inline" />
        </button>
    );
}
