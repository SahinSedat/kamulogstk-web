import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'STK_MANAGER') {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const stk = await prisma.sTK.findFirst({
            where: { managerId: user.id }
        })

        if (!stk) {
            return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })
        }

        const decisions = [
            // İstifa kararları
            {
                subject: 'Üye İstifa Talebi Değerlendirmesi',
                content: 'Yönetim kurulu toplantısında üyenin istifa talebi görüşülmüş ve değerlendirilmiştir. İstifa talebinin kabulüne oybirliği ile karar verilmiştir.',
                description: 'İstifa talebi değerlendirmesi'
            },
            {
                subject: 'Üye Ayrılık Kararı',
                content: 'İlgili üyenin kişisel sebeplerle sunmuş olduğu istifa dilekçesi incelenmiştir. Tüzük hükümleri çerçevesinde istifanın kabulüne karar verilmiştir.',
                description: 'Kişisel nedenlerle istifa'
            },
            // Üyelik Kabulü
            {
                subject: 'Yeni Üye Kabul Kararı',
                content: 'Derneğimize yapılan üyelik başvurusu yönetim kurulunca değerlendirilmiş olup, başvuru sahibinin üyelik koşullarını taşıdığı tespit edilmiştir. Üyeliğinin kabulüne karar verilmiştir.',
                description: 'Yeni üyelik başvurusu kabulü'
            },
            {
                subject: 'Toplu Üye Kabul Kararı',
                content: 'Son dönemde alınan birden fazla üyelik başvurusu toplu olarak değerlendirilmiştir. Gerekli incelemelerin yapıldığı ve başvuruların uygun bulunduğu belirlenmiştir.',
                description: 'Birden fazla başvuru değerlendirmesi'
            },
            // İhraç
            {
                subject: 'Üye İhraç Kararı - Disiplin İhlali',
                content: 'Yönetim kurulunca, ilgili üyenin dernek tüzüğüne ve iç yönetmeliğine aykırı davranışları değerlendirilmiştir. Yapılan savunma dinlenmiş, disiplin ihlali nedeniyle üyelikten ihraç edilmesine karar verilmiştir.',
                description: 'Disiplin ihlali nedeniyle ihraç'
            },
            // Diğer
            {
                subject: 'Yıllık Faaliyet Planı Onayı',
                content: '2026 yılı faaliyet planı yönetim kurulunca görüşülmüş ve onaylanmıştır. Plan kapsamında yıl boyunca düzenlenecek etkinlikler, projeler ve eğitim programları belirlenmiştir.',
                description: '2026 faaliyet planı onayı'
            },
            {
                subject: 'Olağanüstü Genel Kurul Tarihi Belirlenmesi',
                content: 'Dernek tüzüğü uyarınca olağanüstü genel kurul toplantısının önümüzdeki ay yapılmasına karar verilmiştir.',
                description: 'Olağanüstü genel kurul tarihi'
            }
        ]

        let createdCount = 0
        const year = new Date().getFullYear()

        for (let i = 0; i < decisions.length; i++) {
            const d = decisions[i]
            // Generate unique decision number: YYYY/T-XXX (T for Taslak/Template)
            const num = `${year}/T-${(Math.floor(Math.random() * 1000) + 100).toString()}`

            await prisma.boardDecision.create({
                data: {
                    stkId: stk.id,
                    decisionNumber: num,
                    subject: d.subject,
                    content: d.content,
                    description: d.description,
                    decisionDate: new Date(),
                    status: 'DRAFT',
                    createdBy: user.id
                }
            })
            createdCount++
        }

        return NextResponse.json({ success: true, count: createdCount })

    } catch (error) {
        console.error('Seed error:', error)
        return NextResponse.json({ error: 'Taslaklar oluşturulamadı' }, { status: 500 })
    }
}
