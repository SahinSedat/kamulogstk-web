const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const sectors = [
        { id: 'sec_edu_res', name: 'Eğitim ve Araştırma', code: 'EDU_RES', description: 'Eğitim, bilimsel araştırma ve geliştirme faaliyetleri' },
        { id: 'sec_health_soc', name: 'Sağlık ve Sosyal Hizmetler', code: 'HEA_SOC', description: 'Sağlık hizmetleri, hasta hakları ve sosyal hizmetler' },
        { id: 'sec_social_aid', name: 'Sosyal Yardım ve Dayanışma', code: 'SOC_AID', description: 'Yoksullukla mücadele, gıda ve giyim yardımları' },
        { id: 'sec_cult_art', name: 'Kültür, Sanat ve Turizm', code: 'CUL_ART', description: 'Kültürel miras, sanat ve turizm tanıtım faaliyetleri' },
        { id: 'sec_sports_rec', name: 'Spor ve Rekreasyon', code: 'SPO_REC', description: 'Amatör sporlar, fiziksel aktiviteler ve kulüpler' },
        { id: 'sec_youth_child', name: 'Gençlik ve Çocuk', code: 'YOU_CHI', description: 'Gençlerin ve çocukların gelişimine yönelik faaliyetler' },
        { id: 'sec_women_emp', name: 'Kadın Hakları ve Güçlendirme', code: 'WOM_EMP', description: 'Kadın hakları, toplumsal cinsiyet eşitliği ve istihdam' },
        { id: 'sec_dis_eld', name: 'Engelli ve Yaşlı Hakları', code: 'DIS_ELD', description: 'Engellilerin ve yaşlıların yaşam kalitesini artırma' },
        { id: 'sec_animals_pro', name: 'Hayvan Hakları ve Koruma', code: 'ANI_PRO', description: 'Sokak hayvanları, vahşi yaşam ve hayvan hakları' },
        { id: 'sec_env_nat', name: 'Çevre, Doğa ve Sürdürülebilirlik', code: 'ENV_NAT', description: 'Doğa koruma, iklim değişikliği ve geri dönüşüm' },
        { id: 'sec_sci_tech', name: 'Bilim, Teknoloji ve İnovasyon', code: 'SCI_TEC', description: 'Dijitalleşme, Ar-Ge ve teknoloji okuryazarlığı' },
        { id: 'sec_human_rights', name: 'İnsan Hakları ve Hukuk', code: 'HUM_RIG', description: 'Hukukun üstünlüğü, adalet ve temel haklar' },
        { id: 'sec_econ_bus', name: 'Ekonomi, Ticaret ve İş Dünyası', code: 'ECO_BUS', description: 'Girişimcilik, esnaf ve ticaret odası faaliyetleri' },
        { id: 'sec_huma_emergency', name: 'İnsani Yardım ve Acil Durum', code: 'HUM_EME', description: 'Afet yardımı, insani destek ve arama kurtarma' },
        { id: 'sec_rel_edu', name: 'Dini Hizmetler ve Eğitim', code: 'REL_EDU', description: 'Cami, kuran kursu ve dini içerikli vakıf faaliyetleri' },
        { id: 'sec_village_home', name: 'Köy, Kasaba ve Hemşehri Dernekleri', code: 'VIL_HOM', description: 'Hemşehri yardımlaşması ve köy dernekleri' },
        { id: 'sec_prof_aid', name: 'Mesleki Dayanışma ve Yardımlaşma', code: 'PRO_AID', description: 'Mesleki etik, dayanışma ve hak arama' },
        { id: 'sec_urban_arch', name: 'Şehircilik, Mimari ve Restorasyon', code: 'URB_ARC', description: 'Tarihi binalar, şehir estetiği ve mimari' },
        { id: 'sec_think_tank', name: 'Fikir ve Düşünce Kuruluşları', code: 'THI_TAN', description: 'Politika analizi, stratejik araştırmalar' },
        { id: 'sec_intl_rel', name: 'Uluslararası İlişkiler ve İşbirliği', code: 'INT_REL', description: 'Sınır ötesi işbirlikleri ve barış elçiliği' },
        { id: 'sec_cons_rights', name: 'Tüketici Hakları', code: 'CON_RIG', description: 'Tüketici bilinci ve hak savunuculuğu' },
        { id: 'sec_media_comm', name: 'Medya ve İletişim', code: 'MED_COM', description: 'Bağımsız medya, gazeteciler ve iletişim' },
        { id: 'sec_pol_admin', name: 'Politika ve Kamu Yönetimi', code: 'POL_ADM', description: 'Demokrasi, şeffaflık ve kamu denetçiliği' },
        { id: 'sec_disaster_search', name: 'Afet Yönetimi ve Arama Kurtarma', code: 'DIS_SEA', description: 'Deprem hazırlığı, acil müdahale ekipleri' },
        { id: 'sec_social_ent', name: 'Sosyal Girişimcilik', code: 'SOC_ENT', description: 'Sosyal fayda odaklı iş modelleri' },
        { id: 'sec_local_dev', name: 'Yerel Kalkınma', code: 'LOC_DEV', description: 'Bölgesel ekonomik ve sosyal gelişim' }
    ]

    console.log('🧹 Mevcut sektörler temizleniyor...')
    await prisma.sTKSector.deleteMany({})
    await prisma.userInterest.deleteMany({})
    await prisma.competitor.deleteMany({})
    await prisma.sectorRegionalData.deleteMany({})
    await prisma.sector.deleteMany({})

    console.log('🌱 Kapsamlı sektörler yükleniyor...')

    for (const sector of sectors) {
        await prisma.sector.create({
            data: sector
        })
    }

    console.log(`✅ ${sectors.length} sektör başarıyla yüklendi!`)
}

main()
    .catch(e => {
        console.error('❌ Hata:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
