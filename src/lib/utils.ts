import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getRoleBadge(role: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    ADMIN: { label: "Admin", color: "bg-red-500/20 text-red-400" },
    MODERATOR: { label: "Moderatör", color: "bg-orange-500/20 text-orange-400" },
    CONSULTANT: { label: "Danışman", color: "bg-blue-500/20 text-blue-400" },
    USER: { label: "Kullanıcı", color: "bg-gray-500/20 text-gray-400" },
  };
  return map[role] || map.USER;
}

export function getStatusBadge(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: "Taslak", color: "bg-gray-500/20 text-gray-400" },
    pending: { label: "Onay Bekliyor", color: "bg-yellow-500/20 text-yellow-400" },
    published: { label: "Yayında", color: "bg-green-500/20 text-green-400" },
    passive: { label: "Pasif", color: "bg-gray-500/20 text-gray-400" },
    matched: { label: "Eşleşti", color: "bg-purple-500/20 text-purple-400" },
  };
  return map[status] || { label: status, color: "bg-gray-500/20 text-gray-400" };
}

// ─── Slugify: Türkçe karakter destekli URL slug üretici ───
export function slugify(text: string): string {
  const turkishMap: Record<string, string> = {
    ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I",
    ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U",
  };
  return text
    .split("")
    .map((c) => turkishMap[c] || c)
    .join("")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
