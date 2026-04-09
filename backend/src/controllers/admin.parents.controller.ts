import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { Prisma } from "@prisma/client";

// ✅ TYPE: Parent with nested students
type ParentWithStudents = Prisma.ParentGetPayload<{
  include: {
    students: {
      include: {
        student: true;
      };
    };
  };
}>;

// ✅ HELPER: Normalize ID from params
function getId(param: string | string[] | undefined): string | undefined {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

// ✅ CREATE PARENT
export async function createParent(req: Request, res: Response) {
  try {
    const {
      name,
      email,
      phone,
      address,
      city,
      relationship,
      notes,
    } = req.body;

    const parent = await prisma.parent.create({
      data: {
        name,
        email,
        phone,
        address,
        city,
        relationship,
        notes,
      },
    });

    res.json(parent);
  } catch (error) {
    console.error("CREATE PARENT ERROR:", error);
    res.status(500).json({ error: "Failed to create parent" });
  }
}

// ✅ GET ALL PARENTS
export async function getParents(req: Request, res: Response) {
  try {
    const parents = await prisma.parent.findMany({
      include: {
        students: {
          include: {
            student: true,
          },
        },
      },
    });

    const formatted = (parents as ParentWithStudents[]).map((p) => ({
      ...p,
      students: p.students.map((ps) => ps.student),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("GET PARENTS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch parents" });
  }
}

// ✅ GET SINGLE PARENT
export async function getParentById(req: Request, res: Response) {
  try {
    const id = getId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid parent ID" });
    }

    const parent = await prisma.parent.findUnique({
      where: { id },
      include: {
        students: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!parent) {
      return res.status(404).json({ error: "Parent not found" });
    }

    const typedParent = parent as ParentWithStudents;

    const formatted = {
      ...typedParent,
      students: typedParent.students.map((ps) => ps.student),
    };

    res.json(formatted);
  } catch (error) {
    console.error("GET PARENT ERROR:", error);
    res.status(500).json({ error: "Failed to fetch parent" });
  }
}

// ✅ UPDATE PARENT
export async function updateParent(req: Request, res: Response) {
  try {
    const id = getId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid parent ID" });
    }

    const {
      name,
      email,
      phone,
      address,
      city,
      relationship,
      notes,
    } = req.body;

    const parent = await prisma.parent.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        city,
        relationship,
        notes,
      },
    });

    res.json(parent);
  } catch (error) {
    console.error("UPDATE PARENT ERROR:", error);
    res.status(500).json({ error: "Failed to update parent" });
  }
}

// ✅ DELETE PARENT
export async function deleteParent(req: Request, res: Response) {
  try {
    const id = getId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid parent ID" });
    }

    await prisma.parent.delete({
      where: { id },
    });

    res.json({ message: "Parent deleted" });
  } catch (error) {
    console.error("DELETE PARENT ERROR:", error);
    res.status(500).json({ error: "Failed to delete parent" });
  }
}