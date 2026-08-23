import type { ActivityItem } from "@/lib/types";
import bebras from "./awards/bebras.json";
import moneyMaze from "./awards/money-maze.json";
import veo from "./awards/veo.json";
import owlypia from "./awards/owlypia.json";
import nguyenSieuScholarship from "./awards/nguyen-sieu-scholarship.json";
import vinhThanh from "./volunteer/vinh-thanh.json";
import mucHoaNguyetHoa from "./volunteer/muc-hoa-nguyet-hoa.json";
import studentCouncilDemNhacKich from "./leadership/student-council-dem-nhac-kich.json";
import studentCouncilNgayHoiAmApMuaXuan from "./leadership/student-council-ngay-hoi-am-ap-mua-xuan.json";
import soccerVarsity from "./leadership/soccer-varsity.json";
import sunriseProject from "./leadership/sunrise-project.json";
import tranh1 from "./art-portfolio/tranh-1.json";
import tranh2 from "./art-portfolio/tranh-2.json";
import tranh4 from "./art-portfolio/tranh-4.json";
import tranh5 from "./art-portfolio/tranh-5.json";
import tranh6 from "./art-portfolio/tranh-6.json";
import tranh7 from "./art-portfolio/tranh-7.json";
import tranh8 from "./art-portfolio/tranh-8.json";
import tranh9 from "./art-portfolio/tranh-9.json";

/**
 * Every published/coming-soon item across all sections. Add a new item by
 * dropping a JSON file under content/<section>/ and importing it here — a
 * section with no entries here automatically renders as "coming soon".
 */
export const allItems: ActivityItem[] = [
  bebras as ActivityItem,
  moneyMaze as ActivityItem,
  veo as ActivityItem,
  owlypia as ActivityItem,
  nguyenSieuScholarship as ActivityItem,
  vinhThanh as ActivityItem,
  mucHoaNguyetHoa as ActivityItem,
  studentCouncilDemNhacKich as ActivityItem,
  studentCouncilNgayHoiAmApMuaXuan as ActivityItem,
  soccerVarsity as ActivityItem,
  sunriseProject as ActivityItem,
  tranh1 as ActivityItem,
  tranh2 as ActivityItem,
  tranh4 as ActivityItem,
  tranh5 as ActivityItem,
  tranh6 as ActivityItem,
  tranh7 as ActivityItem,
  tranh8 as ActivityItem,
  tranh9 as ActivityItem,
];
