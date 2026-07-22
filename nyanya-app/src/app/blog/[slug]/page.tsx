import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { posts, getPost, formatDate, type BlogBlock } from "@/content/blog";
import { ButtonLink } from "@/components/ui/button-link";
import { Reveal } from "@/components/reveal";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Статья не найдена" };
  return { title: post.title, description: post.excerpt };
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="mt-10 font-display text-2xl font-medium text-ink sm:text-3xl">
          {block.text}
        </h2>
      );
    case "ul":
      return (
        <ul className="mt-5 space-y-3">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-base leading-relaxed text-ink-soft">
              <span
                aria-hidden="true"
                className="mt-[0.7em] block size-1.5 shrink-0 rounded-full bg-bronze"
              />
              {item}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <p className="mt-5 text-base leading-relaxed text-ink-soft">{block.text}</p>
      );
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <main className="flex-1">
      <article className="mx-auto max-w-[840px] px-5 sm:px-8">
        <Link
          href="/blog"
          className="label-caps mt-8 inline-flex min-h-11 items-center gap-2 text-ink-soft transition-colors duration-300 hover:text-ink"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Блог
        </Link>

        <p className="label-caps mt-8 text-bronze-text">{post.tag}</p>
        <h1 className="mt-4 font-display text-4xl leading-[1.1] font-medium tracking-[-0.01em] text-ink sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-5 text-sm text-ink-faint">
          {formatDate(post.date)} · {post.readingMinutes} мин чтения
        </p>

        <Image
          src={post.cover}
          alt={post.coverAlt}
          preload
          placeholder="blur"
          sizes="(max-width: 840px) 92vw, 776px"
          className="mt-10 aspect-3/2 w-full rounded-[2px] object-cover"
        />

        <div className="pt-4 pb-16">
          {post.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </article>

      {/* Читайте также */}
      <section className="border-t border-line bg-cream-deep/60 py-16 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <Reveal>
            <h2 className="font-display text-3xl font-medium text-ink">
              Читайте также
            </h2>
          </Reveal>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((p, i) => (
              <li key={p.slug}>
                <Reveal delay={i * 0.08}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-[2px] border border-line bg-paper"
                  >
                    <div className="relative aspect-3/2 overflow-hidden">
                      <Image
                        src={p.cover}
                        alt={p.coverAlt}
                        placeholder="blur"
                        sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 30vw"
                        className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out-quart group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-7">
                      <p className="label-caps text-bronze-text">{p.tag}</p>
                      <h3 className="mt-3 font-display text-lg leading-snug font-medium text-ink transition-colors duration-300 group-hover:text-bronze-text">
                        {p.title}
                      </h3>
                      <p className="mt-auto pt-4 text-sm text-ink-faint">
                        {p.readingMinutes} мин чтения
                      </p>
                    </div>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 text-center sm:px-8 lg:py-24">
        <Reveal>
          <h2 className="mx-auto max-w-lg font-display text-3xl leading-[1.12] font-medium text-ink sm:text-4xl">
            Проверенные специалисты уже в каталоге
          </h2>
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/catalog">Подобрать специалиста</ButtonLink>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
