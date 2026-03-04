import { getNewsAction } from '@/app/actions';
import { getGradientClass } from '@/lib/colors';
import { Newspaper, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 43200; // 12 hours in seconds

export default async function NewsPage() {
    const articles = await getNewsAction().catch(() => []);

    return (
        <div className="w-full min-h-screen pb-24 pt-24 px-4 md:px-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 rounded-full hover:bg-white/5 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">Music News</h1>
                    <p className="text-muted-foreground text-sm">Latest headlines from the music industry</p>
                </div>
            </div>

            {articles && articles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.map((article: any, i: number) => (
                        <a
                            key={i}
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group glass rounded-xl overflow-hidden card-hover animate-fade-up"

                        >
                            <div className="relative aspect-[16/9] w-full bg-muted overflow-hidden">
                                {article.urlToImage ? (
                                    <img src={article.urlToImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradientClass(article.title)}`}>
                                        <span className="text-xl font-bold text-white/40">{article.title?.charAt(0)?.toUpperCase()}</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-5">
                                <h3 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">
                                    {article.title}
                                </h3>
                                {article.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{article.description}</p>
                                )}
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className="font-medium text-primary/70">{article.source?.name || 'News'}</span>
                                    <span>{new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center glass rounded-2xl">
                    <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No News Available</h3>
                    <p className="text-muted-foreground">Check back later for the latest music news.</p>
                </div>
            )}
        </div>
    );
}
