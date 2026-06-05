import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      baseDailyWage, overtimeCoefficient, nightShiftCoefficient,
      holidayCoefficient, serviceBonusRate, socialAidMonthly,
      transportDaily, foodAidDaily, unionDuesDays,
      sgkEmployeeRate, sgkUnemploymentRate, stampTaxRate, minWageTaxExemption,
    } = body;

    const params = await prisma.salaryParameters.upsert({
      where: { id: "singleton" },
      update: {
        baseDailyWage: parseFloat(baseDailyWage),
        overtimeCoefficient: parseFloat(overtimeCoefficient),
        nightShiftCoefficient: parseFloat(nightShiftCoefficient),
        holidayCoefficient: parseFloat(holidayCoefficient),
        serviceBonusRate: parseFloat(serviceBonusRate),
        socialAidMonthly: parseFloat(socialAidMonthly),
        transportDaily: parseFloat(transportDaily),
        foodAidDaily: parseFloat(foodAidDaily),
        unionDuesDays: parseInt(unionDuesDays),
        sgkEmployeeRate: parseFloat(sgkEmployeeRate),
        sgkUnemploymentRate: parseFloat(sgkUnemploymentRate),
        stampTaxRate: parseFloat(stampTaxRate),
        minWageTaxExemption: parseFloat(minWageTaxExemption),
      },
      create: {
        id: "singleton",
        baseDailyWage: parseFloat(baseDailyWage),
        overtimeCoefficient: parseFloat(overtimeCoefficient),
        nightShiftCoefficient: parseFloat(nightShiftCoefficient),
        holidayCoefficient: parseFloat(holidayCoefficient),
        serviceBonusRate: parseFloat(serviceBonusRate),
        socialAidMonthly: parseFloat(socialAidMonthly),
        transportDaily: parseFloat(transportDaily),
        foodAidDaily: parseFloat(foodAidDaily),
        unionDuesDays: parseInt(unionDuesDays),
        sgkEmployeeRate: parseFloat(sgkEmployeeRate),
        sgkUnemploymentRate: parseFloat(sgkUnemploymentRate),
        stampTaxRate: parseFloat(stampTaxRate),
        minWageTaxExemption: parseFloat(minWageTaxExemption),
      },
    });

    console.log("[salary-settings] ✅ Parametreler güncellendi");
    return NextResponse.json({ success: true, parameters: params });
  } catch (error: any) {
    console.error("[salary-settings] Hata:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
