import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // İlk STK'yı bul
    const stk = await prisma.sTK.findFirst()
    if (!stk) {
        console.error('STK bulunamadı!')
        return
    }
    console.log(`STK bulundu: ${stk.name} (${stk.id})`)

    // Manager kullanıcıyı bul
    const manager = await prisma.user.findUnique({ where: { id: stk.managerId } })
    if (!manager) {
        console.error('Manager bulunamadı!')
        return
    }
    console.log(`Manager: ${manager.name} (${manager.id})`)

    const decisions = [
        // İstifa kararları (3 adet)
        {
            decisionNumber: '2026/003',
            subject: 'Üye İstifa Talebi Değerlendirmesi',
            content: 'Yönetim kurulu toplantısında üyenin istifa talebi görüşülmüş ve değerlendirilmiştir. İstifa talebinin kabulüne oybirliği ile karar verilmiştir.',
            description: 'İstifa talebi değerlendirmesi'
        },
        {
            decisionNumber: '2026/004',
            subject: 'Üye Ayrılık Kararı',
            content: 'İlgili üyenin kişisel sebeplerle sunmuş olduğu istifa dilekçesi incelenmiştir. Tüzük hükümleri çerçevesinde istifanın kabulüne karar verilmiştir.',
            description: 'Kişisel nedenlerle istifa'
        },
        {
            decisionNumber: '2026/005',
            subject: 'İstifa Başvurusu Görüşmesi',
            content: 'Yönetim kurulunca üyenin istifa başvurusu ele alınmış, dernek tüzüğünün ilgili maddeleri gereğince istifanın kabul edilmesine karar verilmiştir.',
            description: 'İstifa başvurusu görüşmesi'
        },

        // Üyelik Kabulü kararları (3 adet)
        {
            decisionNumber: '2026/006',
            subject: 'Yeni Üye Kabul Kararı',
            content: 'Derneğimize yapılan üyelik başvurusu yönetim kurulunca değerlendirilmiş olup, başvuru sahibinin üyelik koşullarını taşıdığı tespit edilmiştir. Üyeliğinin kabulüne karar verilmiştir.',
            description: 'Yeni üyelik başvurusu kabulü'
        },
        {
            decisionNumber: '2026/007',
            subject: 'Üyelik Başvurusu Değerlendirmesi',
            content: 'Başvuru sahibinin evrakları incelenmiş, dernek tüzüğünde belirtilen şartları taşıdığı görülmüştür. Üyelik başvurusunun onaylanmasına oybirliği ile karar verilmiştir.',
            description: 'Üyelik başvuru değerlendirmesi'
        },
        {
            decisionNumber: '2026/008',
            subject: 'Toplu Üye Kabul Kararı',
            content: 'Son dönemde alınan birden fazla üyelik başvurusu toplu olarak değerlendirilmiştir. Gerekli incelemelerin yapıldığı ve başvuruların uygun bulunduğu belirlenmiştir.',
            description: 'Birden fazla başvuru değerlendirmesi'
        },

        // İhraç kararları (2 adet)
        {
            decisionNumber: '2026/009',
            subject: 'Üye İhraç Kararı - Disiplin İhlali',
            content: 'Yönetim kurulunca, ilgili üyenin dernek tüzüğüne ve iç yönetmeliğine aykırı davranışları değerlendirilmiştir. Yapılan savunma dinlenmiş, disiplin ihlali nedeniyle üyelikten ihraç edilmesine karar verilmiştir.',
            description: 'Disiplin ihlali nedeniyle ihraç'
        },
        {
            decisionNumber: '2026/010',
            subject: 'Üye İhraç Kararı - Aidat Borcu',
            content: 'Uzun süredir aidat yükümlülüklerini yerine getirmeyen ve yapılan uyarılara rağmen ödeme yapmayan üyenin, tüzüğün ilgili maddesi uyarınca üyeliğinin sona erdirilmesine karar verilmiştir.',
            description: 'Aidat borcu nedeniyle ihraç'
        },

        // Diğer kararlar (2 adet)
        {
            decisionNumber: '2026/011',
            subject: 'Yıllık Faaliyet Planı Onayı',
            content: '2026 yılı faaliyet planı yönetim kurulunca görüşülmüş ve onaylanmıştır. Plan kapsamında yıl boyunca düzenlenecek etkinlikler, projeler ve eğitim programları belirlenmiştir.',
            description: '2026 faaliyet planı onayı'
        },
        {
            decisionNumber: '2026/012',
            subject: 'Olağanüstü Genel Kurul Tarihi Belirlenmesi',
            content: 'Dernek tüzüğü uyarınca olağanüstü genel kurul toplantısının 2026 yılı Mart ayının son haftasında yapılmasına, gündem maddelerinin belirlenmesine ve üyelere bildirilmesine karar verilmiştir.',
            description: 'Olağanüstü genel kurul tarihi'
        }
    ]

    let created = 0
    for (const d of decisions) {
        // Aynı karar numarası varsa atla
        const existing = await prisma.boardDecision.findFirst({
            where: { stkId: stk.id, decisionNumber: d.decisionNumber }
        })
        if (existing) {
            console.log(`  ⏭ ${d.decisionNumber} zaten mevcut, atlanıyor`)
            continue
        }

        await prisma.boardDecision.create({
            data: {
                stkId: stk.id,
                decisionNumber: d.decisionNumber,
                subject: d.subject,
                content: d.content,
                description: d.description,
                decisionDate: new Date(),
                status: 'DRAFT',
                createdBy: manager.id,
                updatedBy: manager.id
            }
        })
        console.log(`  ✅ ${d.decisionNumber} - ${d.subject}`)
        created++
    }

    console.log(`\n${created} yeni taslak karar oluşturuldu.`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
