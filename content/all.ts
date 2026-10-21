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
import sunriseProject from "./leadership/sunrise-project.json";
import tranh1 from "./art-portfolio/tranh-1.json";
import tranh2 from "./art-portfolio/tranh-2.json";
import tranh3 from "./art-portfolio/tranh-3.json";
import tranh4 from "./art-portfolio/tranh-4.json";
import tranh5 from "./art-portfolio/tranh-5.json";
import tranh6 from "./art-portfolio/tranh-6.json";
import tranh7 from "./art-portfolio/tranh-7.json";
import tranh8 from "./art-portfolio/tranh-8.json";
import tranh9 from "./art-portfolio/tranh-9.json";
import tranh10 from "./art-portfolio/tranh-10.json";
import tranh11 from "./art-portfolio/tranh-11.json";
import harvardCrimson2026_awards from "./awards/harvard-crimson-2026.json";
import kangarooScience_awards from "./awards/kangaroo-science.json";
import extraCurriculars_awards from "./awards/extra-curriculars.json";
import exhibition_passionprojects from "./passion-projects/exhibition.json";
import khoiVanStartup_passionprojects from "./passion-projects/khoi-van-startup.json";
import socialSecurityOptionsVietnam_research from "./research/social-security-options-vietnam.json";
import ceramicCulturalHeritage_research from "./research/ceramic-cultural-heritage.json";
import vietinbank_internship from "./internship/vietinbank.json";
import kingler_internship from "./internship/kingler.json";
import youngBizfest2026_leadership from "./leadership/young-bizfest-2026.json";
import sunriseAutismCenter_volunteer from "./volunteer/sunrise-autism-center.json";
import quyUocMoXanh_volunteer from "./volunteer/quy-uoc-mo-xanh.json";
import basketball_interests from "./interests/basketball.json";
import musicalClub_interests from "./interests/musical-club.json";
import soccerVarsity_interests from "./interests/soccer-varsity.json";

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
  sunriseProject as ActivityItem,
  tranh1 as ActivityItem,
  tranh2 as ActivityItem,
  tranh3 as ActivityItem,
  tranh4 as ActivityItem,
  tranh5 as ActivityItem,
  tranh6 as ActivityItem,
  tranh7 as ActivityItem,
  tranh8 as ActivityItem,
  tranh9 as ActivityItem,
  tranh10 as ActivityItem,
  tranh11 as ActivityItem,
  harvardCrimson2026_awards as ActivityItem,
  kangarooScience_awards as ActivityItem,
  extraCurriculars_awards as ActivityItem,
  exhibition_passionprojects as ActivityItem,
  khoiVanStartup_passionprojects as ActivityItem,
  socialSecurityOptionsVietnam_research as ActivityItem,
  ceramicCulturalHeritage_research as ActivityItem,
  vietinbank_internship as ActivityItem,
  kingler_internship as ActivityItem,
  youngBizfest2026_leadership as ActivityItem,
  sunriseAutismCenter_volunteer as ActivityItem,
  quyUocMoXanh_volunteer as ActivityItem,
  basketball_interests as ActivityItem,
  musicalClub_interests as ActivityItem,
  soccerVarsity_interests as ActivityItem,
];
