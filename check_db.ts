import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const stk = await prisma.sTKOrganization.findFirst({
    where: { name: { contains: "KAMUDA ÇALIŞAN ÜNİVERSİTELİ İŞÇİLER DERNEĞİ", mode: "insensitive" } },
    include: {
      members: true,
      boardMembers: true
    }
  })

  if (stk) {
    console.log("STK BULUNDU:", stk.name)
    console.log("- Uye Sayisi (DB Column):", stk.memberCount)
    console.log("- Gercek Uye (Relation):", stk.members.length)
    console.log("- Yonetim Kurulu Sayisi:", stk.boardMembers.length)
    console.log("- Yonetim Kurulu Kisiler:", stk.boardMembers.map((b: any) => b.name).join(", "))
    console.log("- Sosyal Medya:")
    console.log("  Facebook:", stk.facebookUrl)
    console.log("  Instagram:", stk.instagramUrl)
    console.log("  Whatsapp Group 1:", stk.whatsappGroupUrl)
    console.log("- Yuklenen Dosyalar (Documents):", stk.documents)
    console.log("- Tüzük (StatuteFile):", stk.statuteFile)
  } else {
    console.log("STK BULUNAMADI!")
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
