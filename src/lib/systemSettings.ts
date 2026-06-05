import { prisma } from "@/lib/prisma";

/**
 * SystemSetting tablosundan dinamik ayar okur.
 * Ayar yoksa fallback değerini döndürür.
 */
export async function getSystemSetting(key: string, fallback: string): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    return setting?.value ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Yeni kullanıcıya verilecek jeton miktarını döndürür.
 * SystemSetting: key = "DEFAULT_WELCOME_CREDITS"
 * Fallback: 2
 */
export async function getWelcomeCredits(): Promise<number> {
  const val = await getSystemSetting("DEFAULT_WELCOME_CREDITS", "2");
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 2 : parsed;
}
