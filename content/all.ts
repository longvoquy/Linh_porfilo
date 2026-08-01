import type { ActivityItem } from "@/lib/types";
import bebras from "./awards/bebras.json";
import tranh1 from "./art-portfolio/tranh-1.json";

/**
 * Every published/coming-soon item across all sections. Add a new item by
 * dropping a JSON file under content/<section>/ and importing it here — a
 * section with no entries here automatically renders as "coming soon".
 */
export const allItems: ActivityItem[] = [bebras as ActivityItem, tranh1 as ActivityItem];
