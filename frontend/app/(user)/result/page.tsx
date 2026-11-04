import { Metadata } from "next";
import ResultRedirectView from "./ResultRedirectView";

export const metadata: Metadata = {
  title: "BEU Result - Check Result on Alpha Result App",
  description:
    "Check your Bihar Engineering University (BEU) semester results instantly on the Alpha Result App. 1-Tap result lookup, release notifications, and SGPA calculation.",
  keywords: [
    "BEU result",
    "Bihar Engineering University result",
    "Alpha Result app",
    "BEU semester result check",
    "BEU btech result",
  ],
};

export default function ResultPage() {
  return <ResultRedirectView />;
}
