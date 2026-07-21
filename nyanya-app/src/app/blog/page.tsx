import Image from "next/image";
import Link from "next/link";
import { posts, formatDate } from "@/content/blog";
import { PageHero } from "@/components/ui/page-hero";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "Блог",
  description:
    "О доверии, заботе и правильном выборе: как выбирать няню, сиделку, репетитора и водителя — советы nyanya.uz.",
};

export default function BlogPage() {
  const [featured, ...rest] = posts;

  return (
    <main className="flex-1">
      <PageHero title="Блог" subtitle="О доверии, заботе и правильном выборе." />

      {/* BL2 — главная статья */}
      <section className="mx-auto max-w-[1400px] px-5 pt-10 sm:px-8">
        <Reveal>
          <Link
            href={`/blog/${featured.slug}`}
            className="group grid overflow-hidden rounded-[2px] border border-line bg-paper lg:grid-cols-2"
          >
            <div className="relative aspect-3/2 overflow-hidden lg:aspect-auto">
              <Image
                src={featured.cover}
                alt={featured.coverAlt}
                preload
                placeholder="blur"
                sizes="(max-width: 1024px) 92vw, 46vw"
                className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out-quart group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-col justify-center p-8 lg:p-14">
              <p className="label-caps text-bronze-text">{featured.tag}</p>
              <h2 className="mt-4 font-display text-3xl leading-[1.12] font-medium text-ink transition-colors duration-300 group-hover:text-bronze-text sm:text-4xl">
                {featured.title}
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
                {featured.excerpt}
              </p>
              <p className="mt-6 text-sm text-ink-faint">
                {formatDate(featured.date)} · {featured.readingMinutes} мин чтения
              </p>
            </div>
          </Link>
        </Reveal>
      </section>

      {/* BL3 — сетка статей */}
      <section className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {rest.map((post, i) => (
            <li key={post.slug}>
              <Reveal delay={(i % 3) * 0.08}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[2px] border border-line bg-paper"
                >
                  <div className="relative aspect-3/2 overflow-hidden">
                    <Image
                      src={post.cover}
                      alt={post.coverAlt}
                      placeholder="blur"
                      sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 30vw"
                      className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out-quart group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-7">
                    <p className="label-caps text-bronze-text">{post.tag}</p>
                    <h3 className="mt-3 font-display text-xl leading-snug font-medium text-ink transition-colors duration-300 group-hover:text-bronze-text">
                      {post.title}
                    </h3>
                    <p className="mt-auto pt-5 text-sm text-ink-faint">
                      {formatDate(post.date)} · {post.readingMinutes} мин чтения
                    </p>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
