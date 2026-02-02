import { Metadata } from 'next'
import Link from 'next/link'
import { Navbar, Footer } from '@/components/landing'
import { BookOpen, Calendar, ArrowRight, Tag } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Blog',
    description: 'STK yönetimi, dijital dönüşüm ve sivil toplum kuruluşları hakkında güncel yazılar ve rehberler.',
}

const blogPosts = [
    {
        id: 1,
        title: 'STK\'larda Dijital Dönüşüm: Nereden Başlamalı?',
        excerpt: 'Sivil toplum kuruluşlarının dijital çağa uyum sağlaması için atılması gereken ilk adımlar ve stratejiler.',
        date: '10 Ocak 2026',
        category: 'Dijital Dönüşüm',
        slug: 'stk-dijital-donusum'
    },
    {
        id: 2,
        title: 'Yapay Zeka ile Üye Yönetimi',
        excerpt: 'AI destekli araçlarla üye davranışlarını analiz etme ve tahminleme yöntemleri.',
        date: '8 Ocak 2026',
        category: 'Yapay Zeka',
        slug: 'yapay-zeka-uye-yonetimi'
    },
    {
        id: 3,
        title: 'KVKK Uyumlu Üye Veri Yönetimi',
        excerpt: 'STK\'ların KVKK mevzuatına uygun şekilde üye verilerini yönetmesi için kapsamlı rehber.',
        date: '5 Ocak 2026',
        category: 'Yasal',
        slug: 'kvkk-uyumlu-veri-yonetimi'
    },
    {
        id: 4,
        title: 'Online Aidat Tahsilatının Avantajları',
        excerpt: 'Dijital ödeme sistemleriyle aidat tahsilatını kolaylaştırmanın yolları ve faydaları.',
        date: '2 Ocak 2026',
        category: 'Finans',
        slug: 'online-aidat-tahsilati'
    },
    {
        id: 5,
        title: 'STK\'larda Şeffaflık ve Hesap Verebilirlik',
        excerpt: 'Üyelere ve kamuoyuna karşı şeffaflığı sağlamanın dijital araçları ve yöntemleri.',
        date: '28 Aralık 2025',
        category: 'Yönetişim',
        slug: 'seffaflik-hesap-verebilirlik'
    },
    {
        id: 6,
        title: '2026 Yılında STK Trendleri',
        excerpt: 'Önümüzdeki yıl sivil toplum kuruluşlarını bekleyen fırsatlar ve zorluklar.',
        date: '25 Aralık 2025',
        category: 'Trend',
        slug: '2026-stk-trendleri'
    },
]

const categories = ['Tümü', 'Dijital Dönüşüm', 'Yapay Zeka', 'Yasal', 'Finans', 'Yönetişim', 'Trend']

export default function BlogPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <Navbar />

            <main className="pt-24 pb-20">
                <section className="px-4 py-16">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-6">
                                <BookOpen className="w-4 h-4" />
                                <span>Blog</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                                Güncel <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Yazılar</span>
                            </h1>
                            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                                STK yönetimi, dijital dönüşüm ve sivil toplum kuruluşları hakkında
                                güncel yazılar ve rehberler.
                            </p>
                        </div>

                        {/* Categories */}
                        <div className="flex flex-wrap justify-center gap-3 mb-12">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    className={`px-4 py-2 rounded-full text-sm transition-colors ${cat === 'Tümü'
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Blog Posts Grid */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {blogPosts.map((post) => (
                                <article
                                    key={post.id}
                                    className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all duration-300 group"
                                >
                                    <div className="h-48 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                                        <BookOpen className="w-16 h-16 text-emerald-500/50" />
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                                                <Tag className="w-3 h-3" />
                                                {post.category}
                                            </span>
                                            <span className="flex items-center gap-1 text-slate-500 text-xs">
                                                <Calendar className="w-3 h-3" />
                                                {post.date}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                                            {post.title}
                                        </h2>
                                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                                            {post.excerpt}
                                        </p>
                                        <Link
                                            href={`/blog/${post.slug}`}
                                            className="inline-flex items-center text-emerald-400 text-sm font-medium hover:text-emerald-300"
                                        >
                                            Devamını Oku
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
