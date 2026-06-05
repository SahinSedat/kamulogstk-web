// Script: TIS dosya URL'lerini lokal yollara güncelle
// Kullanım: node scripts/update-tis-urls.mjs

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    // TIS Documents - URL'leri güncelle
    const documents = await prisma.tISDocument.findMany()
    for (const doc of documents) {
        if (doc.fileUrl && doc.fileUrl.includes('kamulog.net/media/tis/')) {
            // https://kamulog.net/media/tis/DOSYA.pdf -> /tis-media/DOSYA.pdf
            const fileName = doc.fileUrl.split('/media/tis/').pop()
            const newUrl = `/tis-media/${fileName}`
            await prisma.tISDocument.update({
                where: { id: doc.id },
                data: { fileUrl: newUrl }
            })
            console.log(`✅ Document: ${doc.title} -> ${newUrl}`)
        }
    }

    // TIS Files - URL'leri güncelle
    const files = await prisma.tISFile.findMany()
    for (const file of files) {
        if (file.fileUrl && file.fileUrl.includes('kamulog.net/media/tis/')) {
            const fileName = file.fileUrl.split('/media/tis/').pop()
            const newUrl = `/tis-media/${fileName}`
            await prisma.tISFile.update({
                where: { id: file.id },
                data: { fileUrl: newUrl }
            })
            console.log(`✅ File: ${file.title} -> ${newUrl}`)
        }
    }

    console.log('\n🎉 Tüm URL\'ler güncellendi!')
    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
