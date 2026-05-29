import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Ek-2 Kuruluş Bildirimi Formatı
export const generateEstablishmentPetition = (stkData: any) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const margin = 15 // Standart kenar boşluğu

    // --- BAŞLIK BÖLÜMÜ ---
    // Sağ üst köşe: EK-2
    doc.setFont('times', 'bold')
    doc.setFontSize(11)
    doc.text('EK-2', pageWidth - margin, 15, { align: 'right' })

    // Başlık
    doc.setFontSize(12)
    doc.text('KURULUŞ BİLDİRİMİ', pageWidth / 2, 25, { align: 'center' })

    // Valilik Makamı
    doc.setFontSize(11)
    const valilikText = stkData.city ? `${stkData.city.toUpperCase()} VALİLİĞİNE` : '................ VALİLİĞİNE'
    doc.text(valilikText, pageWidth / 2, 35, { align: 'center' })
    doc.setFont('times', 'normal')
    doc.text('(İl Sivil Toplumla İlişkiler Müdürlüğü)', pageWidth / 2, 40, { align: 'center' })

    // --- BÖLÜM 1: KURULUŞ BİLGİLERİ ---
    // Bu bölümü tek bir tablo olarak yapacağız

    // Verileri hazırla
    const foundedYear = stkData.foundedAt ? new Date(stkData.foundedAt).getFullYear().toString() : ''
    const fullAddress = `${stkData.address || ''} ${stkData.district || ''}/${stkData.city || ''}`

    autoTable(doc, {
        startY: 50,
        margin: { left: margin, right: margin },
        head: [],
        body: [
            [{ content: '1. Kuruluşun Adı', styles: { fontStyle: 'bold', cellWidth: 50 } }, stkData.name || ''],
            [{ content: '2. Kuruluşun Adresi', styles: { fontStyle: 'bold' } }, fullAddress],
            [{ content: '3. Yerleşim Yeri', styles: { fontStyle: 'bold' } }, stkData.city || ''],
            [{ content: '4. İletişim Bilgileri', styles: { fontStyle: 'bold' } }, `Tel: ${stkData.phone || ''}\nE-posta: ${stkData.email || ''}\nWeb: ${stkData.website || ''}`],
            [{ content: '5. Amaç', styles: { fontStyle: 'bold' } }, stkData.description || '(Tüzükte belirtilen amaç buraya yazılabilir)'],
            [{ content: 'Kuruluş Tarihi', styles: { fontStyle: 'bold' } }, foundedYear]
        ],
        theme: 'plain',
        styles: {
            font: 'times',
            fontSize: 10,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            cellPadding: 2,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 'auto' }
        }
    })

    // --- BÖLÜM 2: KURUCULAR LİSTESİ ---
    // @ts-ignore
    let currentY = doc.lastAutoTable.finalY + 10

    doc.setFont('times', 'bold')
    doc.setFontSize(11)
    doc.text('KURUCULAR', margin, currentY)

    currentY += 5

    // Kurucular tablosu başlıkları (Resmi formattaki gibi)
    const foundersHead = [
        ['S.No', 'Adı ve Soyadı', 'T.C. Kimlik No', 'Öğrenim Durumu', 'Mesleği', 'İkametgah Adresi', 'İmza']
    ]

    // Kurucu verisi (Şimdilik sadece yöneticiyi ekleyip boş satırlar bırakacağız)
    // Gerçek uygulamada tüm kurucuların girilmesi gerekir.
    const managerRow = [
        '1',
        stkData.manager?.name || '',
        '...........', // TC No KVKK gereği açıkta olmayabilir veya DB'de yok
        '', // Öğrenim
        '', // Meslek
        '', // Adres
        ''  // İmza
    ]

    // 5-6 tane boş satır ekleyelim ki çıktı alıp doldurabilsinler
    const emptyRows = Array(6).fill(['', '', '', '', '', '', ''])

    // Veritabanında founder verisi olmadığı için şimdilik boşluklu yapı
    const bodyData = [managerRow, ...emptyRows.map((row, index) => [(index + 2).toString(), ...row.slice(1)])]

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: foundersHead,
        body: bodyData,
        theme: 'plain',
        styles: {
            font: 'times',
            fontSize: 9,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            cellPadding: 3,
            valign: 'middle',
            minCellHeight: 10 // İmza için yükseklik
        },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: 0,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // S.No
            1: { cellWidth: 35 }, // Ad Soyad
            2: { cellWidth: 25 }, // TC
            3: { cellWidth: 20 }, // Öğrenim
            4: { cellWidth: 20 }, // Meslek
            5: { cellWidth: 'auto' }, // Adres
            6: { cellWidth: 20 }  // İmza
        }
    })

    // --- BÖLÜM 3: EKLER ve BEYAN ---
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 10

    // Sayfa sonuna sığmıyorsa yeni sayfa
    if (currentY > 250) {
        doc.addPage()
        currentY = 20
    }

    const declarationText = `    Yukarıdaki bilgilerin doğruluğunu, kurucuların fiil ehliyetine sahip olduğunu, kurucular arasında Türk vatandaşı olmayanların Türkiye'de ikamet etme hakkına sahip olduğunu beyan ederiz.`

    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(declarationText, margin, currentY, { maxWidth: pageWidth - (margin * 2), align: 'justify' })

    currentY += 20

    // Yönetim Kurulu / Temsilci İmzaları
    // İki sütun halinde imza blokları
    const colWidth = (pageWidth - (margin * 2)) / 2

    // Sol Blok (Varsa Geçici YK Başkanı)
    // doc.text('Geçici Yönetim Kurulu Başkanı', margin + (colWidth/2), currentY, { align: 'center' })
    // doc.text('Adı Soyadı: ........................', margin + (colWidth/2), currentY + 10, { align: 'center' })
    // doc.text('İmza', margin + (colWidth/2), currentY + 20, { align: 'center' })

    // Tek imza yeterli mi? Genelde kurucular adına bir temsilci imzalar veya tüm YK.
    // Şimdilik ortalı tek bir yetkili koyalım.

    doc.setFont('times', 'bold')
    doc.text('KURUCULAR ADINA / GEÇİCİ YÖNETİM KURULU', pageWidth / 2, currentY, { align: 'center' })

    currentY += 10

    // Yönetici Bilgisi
    doc.setFont('times', 'normal')
    if (stkData.manager?.name) {
        doc.text(stkData.manager.name, pageWidth / 2, currentY, { align: 'center' })
        doc.setFontSize(9)
        doc.text('(Yetkili Temsilci)', pageWidth / 2, currentY + 5, { align: 'center' })
    } else {
        doc.text('Adı Soyadı: ........................', pageWidth / 2, currentY, { align: 'center' })
    }

    doc.setFontSize(10)
    doc.text('İmza', pageWidth / 2, currentY + 15, { align: 'center' })

    doc.save(`${stkData.name?.replace(/ /g, '_') || 'Dernek'}_Ek2_Kurulus_Bildirimi.pdf`)
}
