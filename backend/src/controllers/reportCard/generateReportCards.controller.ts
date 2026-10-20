import { Request, Response } from "express";
import { generateReportCardsForClass } from "../../services/reportCard.service";

/** Generate snapshots only for students whose complete authoritative results can be represented safely. */
export async function generateReportCards(req: Request, res: Response) {
  try {
    const termId = Number(req.body?.termId);
    const classId = Number(req.body?.classId);
    if (!Number.isInteger(termId) || !Number.isInteger(classId)) {
      return res.status(400).json({ message: "termId and classId are required" });
    }

    const result = await generateReportCardsForClass({ classId, termId });
    return res.status(201).json({
      message: "Complete report cards generated; incomplete students were not snapshotted",
      termId,
      classId,
      createdCount: result.generated,
      preservedPublishedCount: result.preservedPublished,
      incomplete: result.incomplete,
    });
  } catch (error) {
    const message = (error as Error).message;
    const status = message === "Term does not belong to this class" ? 400 : 500;
    return res.status(status).json({ message });
  }
}
