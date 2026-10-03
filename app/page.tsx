import type { Metadata } from "next";
import { ModeLanding } from "@/components/landing/ModeLanding";

export const metadata: Metadata = {
  title: "Art Exhibition",
  description: "A gallery of original paintings, in 3D. Choose how to walk through it.",
};

export default function Home() {
  return <ModeLanding />;
}
