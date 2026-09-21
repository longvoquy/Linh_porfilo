import type { SectionMeta } from "@/lib/types";

export const sections: SectionMeta[] = [
  { key: "awards", label: { en: "Awards & Honors", vi: "Giải thưởng & Danh hiệu" }, order: 1 },
  { key: "passion-projects", label: { en: "Passion Projects", vi: "Dự án cá nhân" }, order: 2 },
  { key: "research", label: { en: "Research", vi: "Nghiên cứu" }, order: 3 },
  { key: "internship", label: { en: "Internship", vi: "Thực tập" }, order: 4 },
  { key: "art-portfolio", label: { en: "Art Portfolio", vi: "Hồ sơ nghệ thuật" }, order: 5 },
  { key: "leadership", label: { en: "Leadership", vi: "Lãnh đạo" }, order: 6 },
  { key: "volunteer", label: { en: "Volunteer & Philanthropy", vi: "Thiện nguyện & Cộng đồng" }, order: 7 },
];

export function getSectionMeta(key: string): SectionMeta | undefined {
  return sections.find((s) => s.key === key);
}
