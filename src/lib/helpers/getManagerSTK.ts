import { prisma } from "@/lib/prisma";

/**
 * STK_MANAGER kullanıcısının yönettiği STK'yı bulur.
 * 3 katmanlı arama: managerId → managedStkId → branch bağlantısı
 */
export async function getManagerSTK(userId: string) {
  // 1. Öncelik: STKOrganization.managerId ile eşleşme
  const byManager = await prisma.sTKOrganization.findFirst({
    where: { managerId: userId },
    select: { id: true, name: true },
  });
  if (byManager) return byManager;

  // 2. User.managedStkId ile doğrudan bağlantı
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { managedStkId: true, managedBranchId: true },
  });
  if (user?.managedStkId) {
    const org = await prisma.sTKOrganization.findUnique({
      where: { id: user.managedStkId },
      select: { id: true, name: true },
    });
    if (org) return org;
  }

  // 3. Fallback: User'ın STKBranch bağlantısından STK'yı bul  
  if (user?.managedBranchId) {
    const branch = await prisma.sTKBranch.findUnique({
      where: { id: user.managedBranchId },
      select: { stkId: true },
    });
    if (branch) {
      const org = await prisma.sTKOrganization.findUnique({
        where: { id: branch.stkId },
        select: { id: true, name: true },
      });
      if (org) return org;
    }
  }

  return null;
}
