"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import { hero } from "@/content/home";
import { easeOutQuart } from "@/lib/motion";
import { ButtonLink } from "@/components/ui/button-link";
import { TrustSeal } from "@/components/trust-seal";

export function Hero() {
  const reduce = useReducedMotion();

  const item = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: easeOutQuart },
        };

  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
      <div className="grid items-center gap-12 pt-10 pb-16 lg:grid-cols-2 lg:gap-10 lg:pt-20 lg:pb-28">
        <div className="max-w-xl">
          <motion.p
            {...item(0)}
            className="max-w-md text-base leading-relaxed text-ink-soft"
          >
            {hero.eyebrow}
          </motion.p>
          {/* короткая бронзовая черта между позиционированием и заголовком */}
          <motion.span
            {...item(0.06)}
            aria-hidden="true"
            className="mt-8 block h-px w-24 bg-bronze"
          />
          <motion.h1
            {...item(0.12)}
            className="mt-8 font-display text-[3.25rem] leading-[1.04] font-medium tracking-[-0.01em] text-ink sm:text-6xl xl:text-[4.5rem]"
          >
            {hero.title}
          </motion.h1>
          <motion.div {...item(0.2)} className="mt-10">
            <ButtonLink href={hero.primary.href} className="gap-4">
              {hero.primary.label}
              <ArrowRight size={18} aria-hidden="true" />
            </ButtonLink>
          </motion.div>
        </div>

        <motion.div
          className="relative mx-auto w-full max-w-[420px] sm:max-w-[500px] lg:max-w-none"
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, scale: 0.985 },
                animate: { opacity: 1, scale: 1 },
                transition: { duration: 1.1, delay: 0.12, ease: easeOutQuart },
              })}
        >
          <Image
            src={hero.image.src}
            alt={hero.image.alt}
            preload
            placeholder="blur"
            sizes="(max-width: 1024px) 92vw, 46vw"
            className="hero-mask h-auto w-full"
          />
          <motion.div
            className="absolute bottom-[7%] right-2 size-32 sm:right-0 sm:size-36 xl:-right-4 xl:size-44"
            {...(reduce
              ? {}
              : {
                  initial: { opacity: 0, scale: 0.8 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.9, delay: 0.55, ease: easeOutQuart },
                })}
          >
            <div className="relative size-full">
              <TrustSeal words={hero.seal} className="relative block size-full" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
