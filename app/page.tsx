"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Hero } from "@/components/Hero";
import { getAllSections, getPublishedItems } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";

const sections = getAllSections();

export default function Home() {
  const { localize, t } = useTranslation();

  return (
    <main>
      <Hero />
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {sections.map((section) => {
            const hasContent = getPublishedItems(section.key).length > 0;
            return (
              <motion.div
                key={section.key}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              >
                <Link
                  href={`/${section.key}`}
                  className="flex h-full flex-col justify-between rounded-2xl border border-black/10 bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <span className="text-lg font-semibold">{localize(section.label)}</span>
                  <span className="mt-4 text-xs uppercase tracking-widest text-black/40">
                    {hasContent ? "→" : t("comingSoon.title")}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </main>
  );
}
