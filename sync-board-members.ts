import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const boardMembers = await prisma.sTKBoardMember.findMany({
    include: { STKOrganization: true }
  });

  console.log(`Bulunan Yönetim Kurulu Üyesi Sayısı: ${boardMembers.length}`);

  let addedUsers = 0;
  let addedMembers = 0;

  for (const board of boardMembers) {
    if (!board.phone && !board.email) {
      console.log(`[ATLANDI] ${board.name} - Telefon ve Mail yok.`);
      continue;
    }

    const nameParts = board.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

    let userId = null;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(board.phone ? [{ phone: board.phone }] : []),
          ...(board.email ? [{ email: board.email }] : [])
        ]
      }
    });

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const dummyPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      try {
        const newUser = await prisma.user.create({
          data: {
            phone: board.phone || undefined,
            email: board.email || undefined,
            password: dummyPassword,
            name: board.name,
            firstName,
            lastName,
            role: "USER",
            isVerified: false
          }
        });
        userId = newUser.id;
        addedUsers++;
        console.log(`[USER EKLENDI] ${board.name}`);
      } catch (e: any) {
        console.log(`[USER HATA] ${board.name}: ${e.message}`);
      }
    }

    const existingMember = await prisma.member.findFirst({
      where: {
        stkId: board.stkId,
        OR: [
          ...(board.phone ? [{ phone: board.phone }] : []),
          ...(board.email ? [{ email: board.email }] : []),
          ...(board.tcKimlik ? [{ tcKimlik: board.tcKimlik }] : [])
        ]
      }
    });

    if (existingMember) {
      if (existingMember.status !== 'ACTIVE' || !existingMember.userId) {
        await prisma.member.update({
          where: { id: existingMember.id },
          data: { 
            status: 'ACTIVE',
            userId: userId || existingMember.userId
          }
        });
      }
    } else {
      try {
        await prisma.member.create({
          data: {
            stkId: board.stkId,
            userId: userId,
            name: firstName,
            surname: lastName,
            phone: board.phone || "0000000000",
            email: board.email || `no-email-${Date.now()}-${Math.random().toString(36).substring(2,7)}@kamulog.com`,
            tcKimlik: board.tcKimlik || null,
            status: 'ACTIVE',
            category: 'ASIL'
          }
        });
        addedMembers++;
        console.log(`[MEMBER EKLENDI] ${board.name}`);
      } catch (e: any) {
        console.log(`[MEMBER HATA] ${board.name}: ${e.message}`);
      }
    }
  }

  console.log(`İşlem tamam! Eklenen User: ${addedUsers}, Eklenen Member: ${addedMembers}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
