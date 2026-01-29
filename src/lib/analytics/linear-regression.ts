/**
 * Linear Regression Module
 * STK üye sayısı tahmini için basit linear regression
 */

export interface MonthlyData {
  year: number
  month: number
  totalMembers: number
  newMembers: number
  resignedMembers: number
}

export interface Prediction {
  year: number
  month: number
  predictedMembers: number
  lowerBound: number
  upperBound: number
  confidence: number
}

export interface RegressionResult {
  slope: number
  intercept: number
  rSquared: number
  predictions: Prediction[]
}

/**
 * Simple Linear Regression hesaplama
 * y = mx + b formülü
 */
function calculateLinearRegression(data: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = data.length
  if (n < 2) {
    return { slope: 0, intercept: data[0] || 0, rSquared: 0 }
  }

  // x değerleri: 0, 1, 2, ..., n-1 (ay indeksleri)
  const xValues = Array.from({ length: n }, (_, i) => i)
  const yValues = data

  // Ortalamalar
  const xMean = xValues.reduce((a, b) => a + b, 0) / n
  const yMean = yValues.reduce((a, b) => a + b, 0) / n

  // Slope (m) hesaplama
  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean)
    denominator += (xValues[i] - xMean) ** 2
  }
  const slope = denominator !== 0 ? numerator / denominator : 0

  // Intercept (b) hesaplama
  const intercept = yMean - slope * xMean

  // R-squared hesaplama
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept
    ssRes += (yValues[i] - predicted) ** 2
    ssTot += (yValues[i] - yMean) ** 2
  }
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0

  return { slope, intercept, rSquared }
}

/**
 * Stadart sapma hesaplama
 */
function calculateStdDev(data: number[], predictions: number[]): number {
  if (data.length < 2) return 0
  
  const residuals = data.map((actual, i) => actual - predictions[i])
  const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length
  const squaredDiffs = residuals.map(r => (r - mean) ** 2)
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (residuals.length - 1)
  
  return Math.sqrt(variance)
}

/**
 * Gelecek 6 ay için üye sayısı tahmini
 * @param historicalData Son 12 aylık veri
 * @returns 6 aylık tahmin ve güven aralıkları
 */
export function predictMemberGrowth(historicalData: MonthlyData[]): RegressionResult {
  // Veriyi kronolojik sırala
  const sortedData = [...historicalData].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })

  // Üye sayılarını çıkar
  const memberCounts = sortedData.map(d => d.totalMembers)
  
  // Linear regression hesapla
  const { slope, intercept, rSquared } = calculateLinearRegression(memberCounts)
  
  // Historical predictions (residual hesabı için)
  const historicalPredictions = memberCounts.map((_, i) => slope * i + intercept)
  
  // Standart sapma
  const stdDev = calculateStdDev(memberCounts, historicalPredictions)
  
  // Son ay bilgisi
  const lastData = sortedData[sortedData.length - 1]
  let currentYear = lastData?.year || new Date().getFullYear()
  let currentMonth = lastData?.month || new Date().getMonth() + 1
  
  // 6 aylık tahmin oluştur
  const predictions: Prediction[] = []
  const n = memberCounts.length
  
  for (let i = 1; i <= 6; i++) {
    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
    
    const x = n - 1 + i // Gelecek ay indeksi
    const predictedMembers = Math.round(slope * x + intercept)
    
    // %95 güven aralığı (1.96 * stdDev)
    const margin = 1.96 * stdDev
    
    predictions.push({
      year: currentYear,
      month: currentMonth,
      predictedMembers: Math.max(0, predictedMembers),
      lowerBound: Math.max(0, Math.round(predictedMembers - margin)),
      upperBound: Math.round(predictedMembers + margin),
      confidence: Math.max(0, Math.min(100, rSquared * 100))
    })
  }
  
  return {
    slope,
    intercept,
    rSquared,
    predictions
  }
}

/**
 * Büyüme oranı hesaplama
 */
export function calculateGrowthRate(historicalData: MonthlyData[]): number {
  if (historicalData.length < 2) return 0
  
  const sorted = [...historicalData].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })
  
  const first = sorted[0].totalMembers
  const last = sorted[sorted.length - 1].totalMembers
  
  if (first === 0) return 0
  
  return ((last - first) / first) * 100
}

/**
 * Aylık ortalama büyüme
 */
export function calculateAverageMonthlyGrowth(historicalData: MonthlyData[]): number {
  if (historicalData.length < 2) return 0
  
  const sorted = [...historicalData].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })
  
  let totalGrowth = 0
  for (let i = 1; i < sorted.length; i++) {
    totalGrowth += sorted[i].totalMembers - sorted[i - 1].totalMembers
  }
  
  return Math.round(totalGrowth / (sorted.length - 1))
}
