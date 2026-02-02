'use client'

import { FileText } from 'lucide-react'

export default function BasvurularPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-emerald-600" />
                <h1 className="text-3xl font-bold text-gray-900">Başvurular</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                <p className="text-gray-500">Bu sayfa yapım aşamasındadır.</p>
            </div>
        </div>
    )
}
