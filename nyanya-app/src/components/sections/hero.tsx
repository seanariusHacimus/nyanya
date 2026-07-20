"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
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
          <motion.p {...item(0)} className="label-caps text-bronze-text">
            {hero.eyebrow}
          </motion.p>
          <motion.h1
            {...item(0.08)}
            className="mt-6 font-display text-[3.25rem] leading-[1.04] font-medium tracking-[-0.01em] text-ink sm:text-6xl lg:mt-8 xl:text-[5.25rem]"
          >
            {hero.title}
          </motion.h1>
          <motion.p
            {...item(0.16)}
            className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft"
          >
            {hero.subtitle}
          </motion.p>
          <motion.div
            {...item(0.24)}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5"
          >
            <ButtonLink href={hero.primary.href}>{hero.primary.label}</ButtonLink>
            <Link
              href={hero.secondary.href}
              className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
            >
              {hero.secondary.label}
            </Link>
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
