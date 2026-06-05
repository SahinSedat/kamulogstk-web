export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase } from "lucide-react";
import Link from "next/link";
import CareerEditForm from "./CareerEditForm";

export default async function CareerEditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const job = await prisma.jobListing.findUnique({ where: { id } });

    if (!job) notFound();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    href="/career"
                    className="p-2 rounded-xl transition-all hover:opacity-70"
                    style={{ background: "var(--bg-muted)" }}
                >
                    <ArrowLeft className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                </Link>
                <div>
                    <h2
                        className="text-2xl font-bold flex items-center gap-2"
                        style={{ color: "var(--text)" }}
                    >
                        <Briefcase className="w-6 h-6" style={{ color: "var(--primary)" }} /> İlan Düzenle
                    </h2>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {job.code || "—"} · {job.title}
                    </p>
                </div>
            </div>

            <CareerEditForm job={JSON.parse(JSON.stringify(job))} />
        </div>
    );
}
