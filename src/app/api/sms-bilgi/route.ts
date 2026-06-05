import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const params = {
      api_id: process.env.VATAN_API_ID,
      api_key: process.env.VATAN_API_KEY,
    };

    const response = await fetch('https://api.vatansms.net/api/v1/user/information', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await response.json();
    
    // VatanSMS genelde veriyi data objesi içinde veya direkt dönebilir.
    return NextResponse.json(data);
  } catch (error) {
    console.error('SMS Bilgi Hatası:', error);
    return NextResponse.json({ error: 'Bilgiler alınamadı.' }, { status: 500 });
  }
}
