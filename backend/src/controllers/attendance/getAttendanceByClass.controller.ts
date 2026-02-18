import { Request, Response } from 'express';
import { AttendanceSessionService } from '../../services/attendance/attendanceSession.service';

export const getAttendanceByClass = async (req: Request, res: Response) => {
  try {
    const classId = Number(req.params.classId);

    if (Number.isNaN(classId)) {
      return res.status(400).json({ message: 'Invalid classId' });
    }

    const sessions = await AttendanceSessionService.getByClass({
      classId,
      requester: {
        role: req.user!.role,
        teacherId: req.user!.id,
      },
    });

    res.json(sessions);
  } catch (err: any) {
    res.status(err.status || 500).json({
      message: err.message || 'Failed to fetch attendance',
    });
  }
};
