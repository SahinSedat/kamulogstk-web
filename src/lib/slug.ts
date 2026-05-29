export function generateSlug(text: string): string {
    const trMap: { [key: string]: string } = {
        'ç': 'c', 'Ç': 'c',
        'ğ': 'g', 'Ğ': 'g',
        'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u',
        'ö': 'o', 'Ö': 'o',
        'ı': 'i', 'İ': 'i'
    }

    let slug = text.trim()

    // Türkçe karakterleri çevir
    for (const key in trMap) {
        slug = slug.replace(new RegExp(key, 'g'), trMap[key])
    }

    return slug
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-') // Alfanümerik olmayanları tire yap
        .replace(/-+/g, '-')        // Birden fazla tireyi teke indir
        .replace(/^-|-$/g, '')      // Baştaki ve sondaki tireleri kaldır
}
