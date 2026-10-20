import { generateReportCardsForClass } from "../services/reportCard.service";

/** Compatibility entry point. All snapshots use the authoritative report calculation. */
export async function generateReportCards(termId: number, classId: number) {
  return generateReportCardsForClass({ termId, classId });
}
