import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Frontend'den gelen mesajı ve telefon numaralarını alıyoruz
    const body = await request.json();
    const { message, phones, contentType } = body;

    // Gerekli alanların kontrolü
    if (!message || !phones || !Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ error: 'Mesaj ve en az bir telefon numarası gereklidir.' }, { status: 400 });
    }

    // VatanSMS'in beklediği parametreleri hazırlıyoruz
    const params = {
      api_id: process.env.VATAN_API_ID,
      api_key: process.env.VATAN_API_KEY,
      sender: process.env.VATAN_SENDER,
      message_type: 'turkce',
      message: message,
      message_content_type: contentType || 'bilgi',
      phones: phones
    };

    // VatanSMS API'sine istek atıyoruz
    const response = await fetch('https://api.vatansms.net/api/v1/1toN', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    const data = await response.json();

    return NextResponse.json(data);
    
  } catch (error) {
    console.error('SMS API Hatası:', error);
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.' }, { status: 500 });
  }
}
