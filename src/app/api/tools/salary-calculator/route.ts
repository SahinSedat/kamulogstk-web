import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workedDays = 30,
      nightShiftHours = 0,
      overtimeHours = 0,
      holidayDays = 0,
      seniorityYears = 0,
      isUnionMember = false,
      // ─── Kullanıcının mobilden girdiği değerler ───
      dailyGrossWage = 2354.15,
      dailyFoodAllowance = 100.0,
      dailyTransportAllowance = 195.83,
      taxBracket = 15, // %15, %20, %27, %35
    } = body;

    // Veritabanından sadece kanuni katsayıları çek
    let params = await prisma.salaryParameters.findUnique({ where: { id: "singleton" } });
    if (!params) {
      params = await prisma.salaryParameters.create({ data: { id: "singleton" } });
    }

    const hourlyWage = dailyGrossWage / 7.5;
    const taxRate = (taxBracket || 15) / 100;

    // ─── GELİRLER ─────────────────────────────────
    const basicSalary = workedDays * dailyGrossWage;
    const nightShiftPay = nightShiftHours * hourlyWage * params.nightShiftCoefficient;
    const overtimePay = overtimeHours * hourlyWage * params.overtimeCoefficient;
    const holidayPay = holidayDays * dailyGrossWage * params.holidayCoefficient;
    const seniorityBonus = seniorityYears > 0
      ? dailyGrossWage * params.serviceBonusRate * seniorityYears
      : 0;
    const foodAllowance = workedDays * dailyFoodAllowance;
    const transportAllowance = workedDays * dailyTransportAllowance;
    const socialAid = params.socialAidMonthly;

    const incomeDetails = [
      { label: "Temel Ücret (Yevmiye)", amount: r(basicSalary), formula: `${workedDays} gün × ₺${dailyGrossWage}` },
      { label: "Gece Zammı", amount: r(nightShiftPay), formula: `${nightShiftHours} saat × ₺${r(hourlyWage)} × ${params.nightShiftCoefficient}` },
      { label: "Fazla Mesai", amount: r(overtimePay), formula: `${overtimeHours} saat × ₺${r(hourlyWage)} × ${params.overtimeCoefficient}` },
      { label: "Resmi Tatil Ücreti", amount: r(holidayPay), formula: `${holidayDays} gün × ₺${dailyGrossWage} × ${params.holidayCoefficient}` },
      { label: "Kıdem Zammı", amount: r(seniorityBonus), formula: `${seniorityYears} yıl × ₺${dailyGrossWage} × ${params.serviceBonusRate}` },
      { label: "Yemek Yardımı", amount: r(foodAllowance), formula: `${workedDays} gün × ₺${dailyFoodAllowance}` },
      { label: "Yol Ücreti", amount: r(transportAllowance), formula: `${workedDays} gün × ₺${dailyTransportAllowance}` },
      { label: "Sosyal Yardım", amount: r(socialAid), formula: "Aylık sabit" },
    ].filter(d => d.amount > 0);

    const totalIncome = r(basicSalary + nightShiftPay + overtimePay + holidayPay + seniorityBonus + foodAllowance + transportAllowance + socialAid);

    // ─── KESİNTİLER ──────────────────────────────
    // SGK matrahı (yemek + yol hariç)
    const sgkBase = basicSalary + nightShiftPay + overtimePay + holidayPay + seniorityBonus;
    const sgkEmployee = sgkBase * params.sgkEmployeeRate;
    const unemploymentIns = sgkBase * params.sgkUnemploymentRate;

    // Gelir vergisi matrahı = SGK matrahı - SGK kesintileri
    const taxableIncome = Math.max(0, sgkBase - sgkEmployee - unemploymentIns);
    const incomeTax = taxableIncome * taxRate;

    // Damga vergisi (tüm brüt üzerinden)
    const stampTax = totalIncome * params.stampTaxRate;

    // Sendika aidatı
    const unionDues = isUnionMember ? params.unionDuesDays * dailyGrossWage : 0;

    const deductionDetails = [
      { label: `SGK İşçi Payı (%${(params.sgkEmployeeRate * 100).toFixed(0)})`, amount: r(sgkEmployee), formula: `₺${r(sgkBase)} × ${params.sgkEmployeeRate}` },
      { label: `İşsizlik Sigortası (%${(params.sgkUnemploymentRate * 100).toFixed(0)})`, amount: r(unemploymentIns), formula: `₺${r(sgkBase)} × ${params.sgkUnemploymentRate}` },
      { label: `Gelir Vergisi (%${taxBracket})`, amount: r(incomeTax), formula: `₺${r(taxableIncome)} × %${taxBracket}` },
      { label: "Damga Vergisi", amount: r(stampTax), formula: `₺${r(totalIncome)} × ${params.stampTaxRate}` },
      { label: "Sendika Aidatı", amount: r(unionDues), formula: isUnionMember ? `${params.unionDuesDays} gün × ₺${dailyGrossWage}` : "Üye değil" },
    ].filter(d => d.amount > 0);

    const totalDeductions = r(sgkEmployee + unemploymentIns + incomeTax + stampTax + unionDues);

    // Asgari ücret vergi istisnası
    const minWageExemption = params.minWageTaxExemption;
    const netSalary = r(totalIncome - totalDeductions + minWageExemption);

    return NextResponse.json({
      success: true,
      totalIncome,
      totalDeductions,
      minWageExemption: r(minWageExemption),
      netSalary,
      incomeDetails,
      deductionDetails,
      parameters: {
        dailyGrossWage,
        hourlyWage: r(hourlyWage),
        taxBracket,
      },
    });
  } catch (error: any) {
    console.error("[salary-calculator] Hesaplama hatası:", error);
    return NextResponse.json({ error: "Hesaplama başarısız: " + error.message }, { status: 500 });
  }
}

function r(n: number): number {
  return Math.round(n * 100) / 100;
}

// GET — Mevcut parametreleri getir
export async function GET() {
  try {
    let params = await prisma.salaryParameters.findUnique({ where: { id: "singleton" } });
    if (!params) {
      params = await prisma.salaryParameters.create({ data: { id: "singleton" } });
    }
    return NextResponse.json({ success: true, parameters: params });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
