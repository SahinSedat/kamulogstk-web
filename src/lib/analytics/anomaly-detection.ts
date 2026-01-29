/**
 * Anomaly Detection Module
 * İstifa/yeni üye oranlarındaki ani değişimleri tespit eder
 * Z-Score ve IQR yöntemleri kullanılır
 */

export interface DataPoint {
    year: number
    month: number
    value: number
    label?: string
}

export interface Anomaly {
    year: number
    month: number
    value: number
    expectedValue: number
    zScore: number
    severity: 'low' | 'medium' | 'high' | 'critical'
    type: 'spike' | 'drop'
    message: string
}

export interface AnomalyResult {
    anomalies: Anomaly[]
    mean: number
    stdDev: number
    threshold: number
}

/**
 * Z-Score hesaplama
 * z = (x - μ) / σ
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0
    return (value - mean) / stdDev
}

/**
 * Ortalama hesaplama
 */
function calculateMean(data: number[]): number {
    if (data.length === 0) return 0
    return data.reduce((a, b) => a + b, 0) / data.length
}

/**
 * Standart sapma hesaplama
 */
function calculateStandardDeviation(data: number[]): number {
    if (data.length < 2) return 0
    const mean = calculateMean(data)
    const squaredDiffs = data.map(x => (x - mean) ** 2)
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (data.length - 1)
    return Math.sqrt(variance)
}

/**
 * Severity belirleme
 * |z| < 2: normal
 * 2 <= |z| < 2.5: low
 * 2.5 <= |z| < 3: medium
 * 3 <= |z| < 4: high
 * |z| >= 4: critical
 */
function determineSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
    const absZ = Math.abs(zScore)
    if (absZ >= 4) return 'critical'
    if (absZ >= 3) return 'high'
    if (absZ >= 2.5) return 'medium'
    return 'low'
}

/**
 * Anomaly mesajı oluşturma
 */
function createAnomalyMessage(
    type: 'spike' | 'drop',
    severity: string,
    value: number,
    expected: number,
    label?: string
): string {
    const diff = Math.abs(value - expected)
    const percentChange = expected !== 0 ? Math.round((diff / expected) * 100) : 0

    const labelText = label || 'değer'

    if (type === 'spike') {
        return `⚠️ ${severity.toUpperCase()}: ${labelText} normalin %${percentChange} üzerinde (${value} vs beklenen ${Math.round(expected)})`
    } else {
        return `⚠️ ${severity.toUpperCase()}: ${labelText} normalin %${percentChange} altında (${value} vs beklenen ${Math.round(expected)})`
    }
}

/**
 * Z-Score tabanlı anomaly detection
 * @param dataPoints Aylık veri noktaları
 * @param threshold Z-Score eşik değeri (default: 2.0)
 * @param label Veri etiketi (örn: "İstifa sayısı")
 * @returns Tespit edilen anomaliler
 */
export function detectAnomalies(
    dataPoints: DataPoint[],
    threshold: number = 2.0,
    label?: string
): AnomalyResult {
    if (dataPoints.length < 3) {
        return { anomalies: [], mean: 0, stdDev: 0, threshold }
    }

    // Kronolojik sırala
    const sorted = [...dataPoints].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.month - b.month
    })

    const values = sorted.map(d => d.value)
    const mean = calculateMean(values)
    const stdDev = calculateStandardDeviation(values)

    const anomalies: Anomaly[] = []

    for (const point of sorted) {
        const zScore = calculateZScore(point.value, mean, stdDev)

        if (Math.abs(zScore) >= threshold) {
            const type: 'spike' | 'drop' = zScore > 0 ? 'spike' : 'drop'
            const severity = determineSeverity(zScore)

            anomalies.push({
                year: point.year,
                month: point.month,
                value: point.value,
                expectedValue: mean,
                zScore: Math.round(zScore * 100) / 100,
                severity,
                type,
                message: createAnomalyMessage(type, severity, point.value, mean, label)
            })
        }
    }

    return {
        anomalies,
        mean: Math.round(mean * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        threshold
    }
}

/**
 * Birden fazla metrik için anomaly detection
 */
export interface MultiMetricData {
    year: number
    month: number
    newMembers: number
    resignedMembers: number
    expelledMembers: number
}

export interface MultiMetricAnomalyResult {
    newMemberAnomalies: AnomalyResult
    resignationAnomalies: AnomalyResult
    expelledAnomalies: AnomalyResult
    allAnomalies: Anomaly[]
}

export function detectMultiMetricAnomalies(
    data: MultiMetricData[],
    threshold: number = 2.0
): MultiMetricAnomalyResult {
    const newMemberData: DataPoint[] = data.map(d => ({
        year: d.year,
        month: d.month,
        value: d.newMembers,
        label: 'Yeni üye sayısı'
    }))

    const resignationData: DataPoint[] = data.map(d => ({
        year: d.year,
        month: d.month,
        value: d.resignedMembers,
        label: 'İstifa sayısı'
    }))

    const expelledData: DataPoint[] = data.map(d => ({
        year: d.year,
        month: d.month,
        value: d.expelledMembers,
        label: 'İhraç sayısı'
    }))

    const newMemberAnomalies = detectAnomalies(newMemberData, threshold, 'Yeni üye sayısı')
    const resignationAnomalies = detectAnomalies(resignationData, threshold, 'İstifa sayısı')
    const expelledAnomalies = detectAnomalies(expelledData, threshold, 'İhraç sayısı')

    // Tüm anomalileri birleştir ve tarihe göre sırala
    const allAnomalies = [
        ...newMemberAnomalies.anomalies,
        ...resignationAnomalies.anomalies,
        ...expelledAnomalies.anomalies
    ].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year // En yeni önce
        return b.month - a.month
    })

    return {
        newMemberAnomalies,
        resignationAnomalies,
        expelledAnomalies,
        allAnomalies
    }
}

/**
 * Erken uyarı sistemi - son 3 aydaki trendleri kontrol eder
 */
export interface EarlyWarning {
    type: 'resignation_trend' | 'membership_decline' | 'collection_drop'
    severity: 'warning' | 'critical'
    message: string
    trend: number // Yüzde değişim
}

export function checkEarlyWarnings(data: MultiMetricData[]): EarlyWarning[] {
    if (data.length < 3) return []

    const sorted = [...data].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.month - b.month
    })

    const last3Months = sorted.slice(-3)
    const warnings: EarlyWarning[] = []

    // İstifa trendi kontrolü
    const resignations = last3Months.map(d => d.resignedMembers)
    if (resignations.every((v, i) => i === 0 || v > resignations[i - 1])) {
        const trend = resignations[0] > 0
            ? ((resignations[2] - resignations[0]) / resignations[0]) * 100
            : 0

        if (trend > 50) {
            warnings.push({
                type: 'resignation_trend',
                severity: trend > 100 ? 'critical' : 'warning',
                message: `Son 3 ayda istifa oranı sürekli artıyor (+%${Math.round(trend)})`,
                trend
            })
        }
    }

    // Yeni üye düşüşü kontrolü
    const newMembers = last3Months.map(d => d.newMembers)
    if (newMembers.every((v, i) => i === 0 || v < newMembers[i - 1])) {
        const trend = newMembers[0] > 0
            ? ((newMembers[0] - newMembers[2]) / newMembers[0]) * 100
            : 0

        if (trend > 30) {
            warnings.push({
                type: 'membership_decline',
                severity: trend > 60 ? 'critical' : 'warning',
                message: `Son 3 ayda yeni üye sayısı sürekli düşüyor (-%${Math.round(trend)})`,
                trend: -trend
            })
        }
    }

    return warnings
}
