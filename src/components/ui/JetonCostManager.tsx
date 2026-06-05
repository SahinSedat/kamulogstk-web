"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Coins, Save } from "lucide-react"

export function JetonCostManager({ currentCost }: { currentCost: number }) {
  const [cost, setCost] = useState(currentCost)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "becayis_listing_cost", value: String(cost) }),
        })
        const data = await res.json()
        if (res.ok) {
          setResult("Jeton ücreti güncellendi!")
          router.refresh()
          setTimeout(() => setResult(null), 3000)
        } else {
          setResult(data.error || "Hata oluştu")
        }
      } catch {
        setResult("İşlem sırasında hata oluştu.")
      }
    })
  }

  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <Coins className="w-5 h-5 text-amber-500" />
      <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>İlan Jeton Ücreti:</span>
      <input
        type="number"
        min={0}
        max={1000}
        value={cost}
        onChange={(e) => setCost(parseInt(e.target.value) || 0)}
        className="w-20 px-3 py-1.5 rounded-lg text-center text-sm font-bold"
        style={{ background: "var(--bg-muted)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Jeton</span>
      <button
        disabled={pending || cost === currentCost}
        onClick={handleSave}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
        style={{ background: "var(--primary)", color: "white" }}
      >
        {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        Kaydet
      </button>
      {result && (
        <span className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400 font-medium animate-fade-in">
          {result}
        </span>
      )}
    </div>
  )
}
