'use client'

import { Wallet } from 'lucide-react'

export default function AidatPlanlariPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Wallet className="w-8 h-8 text-emerald-600" />
                <h1 className="text-3xl font-bold text-gray-900">Aidat Planları</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                <p className="text-gray-500">Bu sayfa yapım aşamasındadır.</p>
            </div>
        </div>
    )
}
