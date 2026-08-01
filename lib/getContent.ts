import { allItems } from "@/content/all";
import { getSectionMeta, sections } from "@/content/sections";
import type { ActivityItem, SectionKey, SectionMeta } from "@/lib/types";

export function getAllSections(): SectionMeta[] {
  return [...sections].sort((a, b) => a.order - b.order);
}

export function getSectionItems(key: SectionKey): ActivityItem[] {
  return allItems.filter((item) => item.section === key);
}

export function getPublishedItems(key: SectionKey): ActivityItem[] {
  return getSectionItems(key).filter((item) => item.status === "published");
}

export function groupBySubgroup(items: ActivityItem[]): Map<string | undefined, ActivityItem[]> {
  const groups = new Map<string | undefined, ActivityItem[]>();
  for (const item of items) {
    const group = groups.get(item.subgroup) ?? [];
    group.push(item);
    groups.set(item.subgroup, group);
  }
  return groups;
}

export { getSectionMeta };
