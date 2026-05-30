"use client";

import React, { type ReactNode } from "react";
import { motion } from "framer-motion";
import { SectionHeader, SectionRow } from "./Shared";

interface DiscoverySectionProps {
  title: string;
  description?: string;
  link?: string;
  badge?: ReactNode;
  variant?: "standard" | "hq";
  items: any[];
  loading: boolean;
  renderCard: (item: any) => ReactNode;
}

function DiscoverySection({
  title,
  description,
  link,
  badge,
  variant,
  items,
  loading,
  renderCard,
}: DiscoverySectionProps) {
  if (!loading && items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px", amount: 0.1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <SectionHeader
        title={title}
        description={description}
        link={link}
        badge={badge}
        variant={variant}
      />
      <SectionRow items={items} loading={loading} renderCard={renderCard} />
    </motion.section>
  );
}

export default React.memo(DiscoverySection);
