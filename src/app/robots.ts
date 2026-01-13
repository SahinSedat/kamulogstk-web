import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin/', '/stk/', '/api/'],
            },
        ],
        sitemap: 'https://kamulogstk.net/sitemap.xml',
    }
}
