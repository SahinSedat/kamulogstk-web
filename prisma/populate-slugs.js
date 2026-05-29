const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function generateSlug(text) {
    const trMap = {
        'ç': 'c', 'Ç': 'c',
        'ğ': 'g', 'Ğ': 'g',
        'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u',
        'ö': 'o', 'Ö': 'o',
        'ı': 'i', 'İ': 'i'
    }

    let slug = text.trim()
    for (const key in trMap) {
        slug = slug.replace(new RegExp(key, 'g'), trMap[key])
    }

    return slug
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

async function main() {
    console.log('Fetching STKs...')
    const stks = await prisma.sTK.findMany({
        where: { slug: null }
    })

    console.log(`Found ${stks.length} STKs without slugs.`)

    for (const stk of stks) {
        let baseSlug = generateSlug(stk.name)
        let slug = baseSlug
        let counter = 1

        // Check for uniqueness
        while (true) {
            const existing = await prisma.sTK.findUnique({
                where: { slug }
            })
            if (!existing) break
            slug = `${baseSlug}-${counter}`
            counter++
        }

        await prisma.sTK.update({
            where: { id: stk.id },
            data: { slug }
        })
        console.log(`Updated: ${stk.name} -> ${slug}`)
    }

    console.log('Done.')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
