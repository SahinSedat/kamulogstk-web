'use client';

import { useState, useEffect } from 'react';

interface SalaryParams {
  id: string;
  baseDailyWage: number;
  overtimeCoefficient: number;
  nightShiftCoefficient: number;
  holidayCoefficient: number;
  serviceBonusRate: number;
  socialAidMonthly: number;
  transportDaily: number;
  foodAidDaily: number;
  unionDuesDays: number;
  sgkEmployeeRate: number;
  sgkUnemploymentRate: number;
  stampTaxRate: number;
  minWageTaxExemption: number;
  updatedAt: string;
}

export default function SalarySettingsPage() {
  const [params, setParams] = useState<SalaryParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { fetchParams(); }, []);

  const fetchParams = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tools/salary-calculator');
      const data = await res.json();
      setParams(data.parameters);
    } catch (e) {
      setMessage({ type: 'error', text: 'Parametreler yüklenemedi' });
    }
    setLoading(false);
  };

  const saveParams = async () => {
    if (!params) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/tools/salary-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.success) {
        setParams(data.parameters);
        setMessage({ type: 'success', text: '✅ Parametreler başarıyla güncellendi!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Güncelleme başarısız' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Kayıt hatası' });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const update = (key: keyof SalaryParams, value: number) => {
    if (!params) return;
    setParams({ ...params, [key]: value });
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Yükleniyor...</div>;
  if (!params) return <div className="p-8 text-center text-red-400">Parametreler yüklenemedi.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">696 KHK Maaş Hesaplama Parametreleri</h1>
          <p className="text-sm text-gray-400 mt-1">Kamu işçisi maaş hesaplama motorundaki sabitleri buradan yönetin.</p>
        </div>
        <button onClick={saveParams} disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
          {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message.text}
        </div>
      )}

      {/* Temel Ücret */}
      <Section title="💰 Temel Ücret Bilgileri" color="yellow">
        <Field label="Günlük Brüt Ücret (₺)" value={params.baseDailyWage} onChange={v => update('baseDailyWage', v)} />
      </Section>

      {/* Katsayılar */}
      <Section title="⚙️ Katsayılar" color="blue">
        <Field label="Fazla Mesai Katsayısı" value={params.overtimeCoefficient} onChange={v => update('overtimeCoefficient', v)} step={0.01} />
        <Field label="Gece Zammı Katsayısı" value={params.nightShiftCoefficient} onChange={v => update('nightShiftCoefficient', v)} step={0.01} />
        <Field label="Resmi Tatil Katsayısı" value={params.holidayCoefficient} onChange={v => update('holidayCoefficient', v)} step={0.1} />
        <Field label="Kıdem Zammı Oranı" value={params.serviceBonusRate} onChange={v => update('serviceBonusRate', v)} step={0.01} />
      </Section>

      {/* Yardımlar */}
      <Section title="🎁 Yardımlar" color="green">
        <Field label="Sosyal Yardım (Aylık ₺)" value={params.socialAidMonthly} onChange={v => update('socialAidMonthly', v)} />
        <Field label="Yol Ücreti (Günlük ₺)" value={params.transportDaily} onChange={v => update('transportDaily', v)} />
        <Field label="Yemek Yardımı (Günlük ₺)" value={params.foodAidDaily} onChange={v => update('foodAidDaily', v)} />
      </Section>

      {/* Kesinti Oranları */}
      <Section title="📊 Kesinti Oranları" color="red">
        <Field label="SGK İşçi Payı" value={params.sgkEmployeeRate} onChange={v => update('sgkEmployeeRate', v)} step={0.01} suffix="oran" />
        <Field label="İşsizlik Sigortası" value={params.sgkUnemploymentRate} onChange={v => update('sgkUnemploymentRate', v)} step={0.001} suffix="oran" />
        <Field label="Damga Vergisi" value={params.stampTaxRate} onChange={v => update('stampTaxRate', v)} step={0.0001} suffix="oran" />
        <Field label="Sendika Aidatı (Yevmiye)" value={params.unionDuesDays} onChange={v => update('unionDuesDays', v)} step={1} isInt />
      </Section>

      {/* Vergi İstisnası */}
      <Section title="🏦 Vergi İstisnası" color="purple">
        <Field label="Asgari Ücret Vergi İstisnası (₺)" value={params.minWageTaxExemption} onChange={v => update('minWageTaxExemption', v)} />
      </Section>

      <p className="text-xs text-gray-500 text-right">Son güncelleme: {new Date(params.updatedAt).toLocaleString('tr-TR')}</p>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    yellow: 'border-yellow-500/20 bg-yellow-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    green: 'border-green-500/20 bg-green-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    purple: 'border-purple-500/20 bg-purple-500/5',
  };
  return (
    <div className={`border rounded-xl p-5 ${colors[color] || ''}`}>
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, step = 1, suffix, isInt }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string; isInt?: boolean;
}) {
  return (
    <div>
      <label className="text-sm text-gray-400 block mb-1">{label}</label>
      <input type="number" step={step} value={value}
        onChange={e => onChange(isInt ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none text-sm"
      />
      {suffix && <span className="text-xs text-gray-500 mt-1 block">{suffix === 'oran' ? `(${(value * 100).toFixed(2)}%)` : suffix}</span>}
    </div>
  );
}
