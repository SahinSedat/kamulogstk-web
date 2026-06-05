"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

interface JobData {
    id: string;
    code: string | null;
    title: string;
    company: string;
    location: string | null;
    description: string;
    requirements: string | null;
    type: string;
    sourceUrl: string | null;
    applicationUrl: string | null;
    salary: string | null;
    deadline: string | null;
    employerPhone: string | null;
}

export default function CareerEditForm({ job }: { job: JobData }) {
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setSaved(false);

        const formData = new FormData(e.currentTarget);
        const data = {
            title: formData.get("title"),
            company: formData.get("company"),
            location: formData.get("location"),
            type: formData.get("type"),
            description: formData.get("description"),
            requirements: formData.get("requirements"),
            sourceUrl: formData.get("sourceUrl"),
            applicationUrl: formData.get("applicationUrl"),
            salary: formData.get("salary"),
            deadline: formData.get("deadline"),
        };

        try {
            const res = await fetch(`/api/kariyer/jobs/${job.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setSaved(true);
                router.refresh();
                setTimeout(() => setSaved(false), 3000);
            } else {
                const err = await res.json();
                alert(err.error || "Güncellenemedi");
            }
        } catch {
            alert("Bir hata oluştu");
        } finally {
            setLoading(false);
        }
    }

    const deadlineDefault = job.deadline
        ? new Date(job.deadline).toISOString().split("T")[0]
        : "";

    return (
        <div className="card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                            İlan Kodu
                        </label>
                        <input value={job.code || ""} disabled className="w-full text-sm opacity-60" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                            İlan Başlığı *
                        </label>
                        <input name="title" required defaultValue={job.title} className="w-full text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                            Kurum / Şirket *
                        </label>
                        <input name="company" required defaultValue={job.company} className="w-full text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                            Şehir
                        </label>
                        <input name="location" defaultValue={job.location || ""} className="w-full text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                            Tür *
                        </label>
                        <select name="type" defaultValue={job.type} className="w-full text-sm">
                            <option value="PUBLIC">🏛️ Kamu</option>
                            <option value="PRIVATE">🏢 Özel Sektör</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                            Maaş
                        </label>
                        <input name="salary" defaultValue={job.salary || ""} className="w-full text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                            Son Başvuru Tarihi
                        </label>
                        <input name="deadline" type="date" defaultValue={deadlineDefault} className="w-full text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                            Kaynak URL
                        </label>
                        <input name="sourceUrl" type="url" defaultValue={job.sourceUrl || ""} className="w-full text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                            Başvuru URL
                        </label>
                        <input name="applicationUrl" type="url" defaultValue={job.applicationUrl || ""} className="w-full text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                            İşveren Telefonu
                        </label>
                        <input value={job.employerPhone || "—"} disabled className="w-full text-sm opacity-60" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        İlan Açıklaması *
                    </label>
                    <textarea name="description" required rows={5} defaultValue={job.description} className="w-full text-sm" />
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        Aranan Nitelikler
                    </label>
                    <textarea name="requirements" rows={3} defaultValue={job.requirements || ""} className="w-full text-sm" />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    {saved && (
                        <span className="text-sm font-medium" style={{ color: "#22c55e" }}>
                            ✅ Kaydedildi
                        </span>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                </div>
            </form>
        </div>
    );
}
