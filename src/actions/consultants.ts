"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createConsultant(data: {
  name: string;
  title: string;
  category: string;
  bio: string;
  specializations: string[];
  experienceYears: number;
  avatarUrl?: string;
  isFeatured?: boolean;
}) {
  await prisma.consultant.create({ data });
  revalidatePath("/consultants");
  return { success: true };
}

export async function updateConsultant(id: string, data: {
  name?: string;
  title?: string;
  category?: string;
  bio?: string;
  specializations?: string[];
  experienceYears?: number;
  avatarUrl?: string;
  isFeatured?: boolean;
  isOnline?: boolean;
  isActive?: boolean;
}) {
  await prisma.consultant.update({ where: { id }, data });
  revalidatePath("/consultants");
  return { success: true };
}

export async function deleteConsultant(id: string) {
  await prisma.consultant.delete({ where: { id } });
  revalidatePath("/consultants");
  return { success: true };
}

export async function toggleOnlineStatus(id: string) {
  const c = await prisma.consultant.findUnique({ where: { id }, select: { isOnline: true } });
  if (!c) return { success: false };
  await prisma.consultant.update({ where: { id }, data: { isOnline: !c.isOnline } });
  revalidatePath("/consultants");
  return { success: true };
}

export async function toggleFeatured(id: string) {
  const c = await prisma.consultant.findUnique({ where: { id }, select: { isFeatured: true } });
  if (!c) return { success: false };
  await prisma.consultant.update({ where: { id }, data: { isFeatured: !c.isFeatured } });
  revalidatePath("/consultants");
  return { success: true };
}

// Hizmet Paketleri
export async function createPackage(consultantId: string, data: {
  name: string;
  price: number;
  description: string;
  durationMins: number;
  includes: string[];
}) {
  await prisma.servicePackage.create({ data: { ...data, consultantId } });
  revalidatePath("/consultants");
  return { success: true };
}

export async function deletePackage(id: string) {
  await prisma.servicePackage.delete({ where: { id } });
  revalidatePath("/consultants");
  return { success: true };
}

export async function updateConsultantCredits(id: string, credits: number, creditPrice: number) {
  await prisma.consultant.update({
    where: { id },
    data: { consultantCredits: credits, creditPrice },
  });
  revalidatePath("/consultants");
  return { success: true };
}
