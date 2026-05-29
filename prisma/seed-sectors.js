const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const sectors = [
        { name: 'Eğitim', code: 'EDU', description: 'Eğitim alanında faaliyet gösteren STKlar' },
        { name: 'Sağlık', code: 'HEA', description: 'Sağlık alanında faaliyet gösteren STKlar' },
        { name: 'Çevre', code: 'ENV', description: 'Çevre koruma alanında faaliyet gösteren STKlar' },
        { name: 'Sosyal Yardım', code: 'SOC', description: 'Sosyal yardım alanında faaliyet gösteren STKlar' },
        { name: 'Kültür-Sanat', code: 'CUL', description: 'Kültür ve sanat alanında faaliyet gösteren STKlar' },
        { name: 'Spor', code: 'SPO', description: 'Spor alanında faaliyet gösteren STKlar' },
        { name: 'Gençlik', code: 'YOU', description: 'Gençlik alanında faaliyet gösteren STKlar' },
        { name: 'Kadın Hakları', code: 'WOM', description: 'Kadın hakları alanında faaliyet gösteren STKlar' },
        { name: 'Çocuk Hakları', code: 'CHI', description: 'Çocuk hakları alanında faaliyet gösteren STKlar' },
        { name: 'Engelli Hakları', code: 'DIS', description: 'Engelli hakları alanında faaliyet gösteren STKlar' },
        { name: 'Hayvan Hakları', code: 'ANI', description: 'Hayvan hakları alanında faaliyet gösteren STKlar' },
        { name: 'Teknoloji', code: 'TEC', description: 'Teknoloji alanında faaliyet gösteren STKlar' },
    ]

    for (const sector of sectors) {
        await prisma.sector.upsert({
            where: { code: sector.code },
            update: {},
            create: sector
        })
    }

    console.log('Sektörler başarıyla eklendi!')
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
