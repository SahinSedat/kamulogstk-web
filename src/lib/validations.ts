import { z } from "zod";

// ─── Becayiş İlan Oluşturma ────────────────────────────────
export const createListingSchema = z.object({
    title: z.string().min(3, "Başlık en az 3 karakter olmalı").max(200, "Başlık en fazla 200 karakter olabilir"),
    branch: z.string().min(2, "Branş gerekli").max(100),
    currentCity: z.string().min(2, "Mevcut şehir gerekli").max(100),
    targetCity: z.string().min(2, "Hedef şehir gerekli").max(100),
    description: z.string().max(2000, "Açıklama en fazla 2000 karakter olabilir").optional().default(""),
    role: z.string().max(100).optional().default(""),
    assignmentMethod: z.string().max(100).optional().default(""),
    institutionId: z.string().max(100).optional(),
    institutionName: z.string().max(200).optional(),
});

// ─── Becayiş İlan Düzenleme ────────────────────────────────
export const updateListingSchema = z.object({
    title: z.string().min(3).max(200).optional(),
    branch: z.string().min(2).max(100).optional(),
    currentCity: z.string().min(2).max(100).optional(),
    targetCity: z.string().min(2).max(100).optional(),
    description: z.string().max(2000).optional(),
    role: z.string().max(100).optional(),
    assignmentMethod: z.string().max(100).optional(),
});

// ─── OTP Gönderim ──────────────────────────────────────────
export const otpSendSchema = z.object({
    phone: z.string().min(10, "Geçerli bir telefon numarası girin").max(20),
});

export const otpVerifySchema = z.object({
    phone: z.string().min(10).max(20),
    code: z.string().length(6, "Doğrulama kodu 6 haneli olmalı"),
    displayName: z.string().max(100).optional(),
});

export const emailOtpSendSchema = z.object({
    email: z.string().email("Geçerli bir e-posta adresi girin").max(254),
});

export const emailOtpVerifySchema = z.object({
    email: z.string().email().max(254),
    code: z.string().length(6, "Doğrulama kodu 6 haneli olmalı"),
    displayName: z.string().max(100).optional(),
});

// ─── Profil Güncelleme ─────────────────────────────────────
export const updateProfileSchema = z.object({
    firstName: z.string().max(50).optional(),
    lastName: z.string().max(50).optional(),
    name: z.string().max(100).optional(),
    tcKimlik: z.string().length(11).optional(),
    city: z.string().max(100).optional(),
    district: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    postalCode: z.string().max(10).optional(),
    title: z.string().max(200).optional(),
    istihdamTuru: z.string().max(50).optional(),
    bakanlik: z.string().max(200).optional(),
    kurum: z.string().max(200).optional(),
    unvan: z.string().max(200).optional(),
    atamaUsulu: z.string().max(50).optional(),
    yearsWorking: z.number().min(0).max(50).optional(),
});

// ─── Yardımcı: Zod hatasını okunabilir mesaja çevir ────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatZodError(error: z.ZodError<any>): string {
    return error.issues.map((e) => e.message).join(", ");
}
