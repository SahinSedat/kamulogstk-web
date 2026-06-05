"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Download } from "lucide-react";

export default function CareerActions() {
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

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
            employerPhone: formData.get("employerPhone"),
        };

        try {
            const res = await fetch("/api/kariyer/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setShowModal(false);
                router.refresh();
            } else {
                const err = await res.json();
                alert(err.error || "İlan oluşturulamadı");
            }
        } catch {
            alert("Bir hata oluştu");
        } finally {
            setLoading(false);
        }
    }

    async function handleFetchJobs() {
        if (!confirm("10 adet örnek iş ilanı oluşturulsun mu?")) return;
        setFetchLoading(true);
        try {
            const res = await fetch("/api/kariyer/admin/jobs/fetch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count: 10, source: "sample" }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`${data.created} ilan başarıyla oluşturuldu`);
                router.refresh();
            } else {
                alert(data.error || "Hata oluştu");
            }
        } catch {
            alert("Bir hata oluştu");
        } finally {
            setFetchLoading(false);
        }
    }

    return (
        <>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleFetchJobs}
                    disabled={fetchLoading}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
                    style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}
                >
                    <Download className="w-4 h-4" />
                    {fetchLoading ? "Çekiliyor..." : "Toplu Çek"}
                </button>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 flex items-center gap-1.5"
                >
                    <Plus className="w-4 h-4" /> Yeni İlan
                </button>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div
                        className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>Yeni İş İlanı</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:opacity-70">
                                <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>İlan Başlığı *</label>
                                    <input name="title" required placeholder="Yazılım Mühendisi" className="w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Kurum / Şirket *</label>
                                    <input name="company" required placeholder="Kamulog A.Ş." className="w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Şehir</label>
                                    <input name="location" placeholder="İstanbul" className="w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Tür *</label>
                                    <select name="type" defaultValue="PRIVATE" className="w-full text-sm">
                                        <option value="PUBLIC">🏛️ Kamu</option>
                                        <option value="PRIVATE">🏢 Özel Sektör</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Maaş</label>
                                    <input name="salary" placeholder="30.000 - 50.000 TL" className="w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Son Başvuru Tarihi</label>
                                    <input name="deadline" type="date" className="w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Kaynak URL</label>
                                    <input name="sourceUrl" type="url" placeholder="https://..." className="w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Başvuru URL</label>
                                    <input name="applicationUrl" type="url" placeholder="https://..." className="w-full text-sm" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>İşveren Telefonu</label>
                                    <input name="employerPhone" placeholder="+90 555 123 4567" className="w-full text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>İlan Açıklaması *</label>
                                <textarea name="description" required rows={4} placeholder="İş tanımı ve detaylar..." className="w-full text-sm" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Aranan Nitelikler</label>
                                <textarea name="requirements" rows={3} placeholder="Gerekli yetkinlikler ve deneyimler..." className="w-full text-sm" />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2.5 rounded-xl text-sm font-medium"
                                    style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                                >
                                    {loading ? "Oluşturuluyor..." : "İlan Oluştur"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
