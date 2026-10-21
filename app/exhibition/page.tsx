import { redirect } from "next/navigation";

/** The tour now lives at the home page; this keeps older links working. */
export default function ExhibitionPage() {
  redirect("/");
}
