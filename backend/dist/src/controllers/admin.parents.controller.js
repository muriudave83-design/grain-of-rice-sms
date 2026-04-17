"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createParent = createParent;
exports.getParents = getParents;
exports.getParentById = getParentById;
exports.updateParent = updateParent;
exports.deleteParent = deleteParent;
const client_1 = require("../../prisma/client");
// ✅ HELPER: Normalize ID from params
function getId(param) {
    if (!param)
        return undefined;
    return Array.isArray(param) ? param[0] : param;
}
// ✅ CREATE PARENT
async function createParent(req, res) {
    try {
        const { name, email, phone, address, city, relationship, notes, } = req.body;
        const parent = await client_1.prisma.parent.create({
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
    }
    catch (error) {
        console.error("CREATE PARENT ERROR:", error);
        res.status(500).json({ error: "Failed to create parent" });
    }
}
// ✅ GET ALL PARENTS
async function getParents(req, res) {
    try {
        const parents = await client_1.prisma.parent.findMany({
            include: {
                students: {
                    include: {
                        student: true,
                    },
                },
            },
        });
        const formatted = parents.map((p) => ({
            ...p,
            students: p.students.map((ps) => ps.student),
        }));
        res.json(formatted);
    }
    catch (error) {
        console.error("GET PARENTS ERROR:", error);
        res.status(500).json({ error: "Failed to fetch parents" });
    }
}
// ✅ GET SINGLE PARENT
async function getParentById(req, res) {
    try {
        const id = getId(req.params.id);
        if (!id) {
            return res.status(400).json({ error: "Invalid parent ID" });
        }
        const parent = await client_1.prisma.parent.findUnique({
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
        const typedParent = parent;
        const formatted = {
            ...typedParent,
            students: typedParent.students.map((ps) => ps.student),
        };
        res.json(formatted);
    }
    catch (error) {
        console.error("GET PARENT ERROR:", error);
        res.status(500).json({ error: "Failed to fetch parent" });
    }
}
// ✅ UPDATE PARENT
async function updateParent(req, res) {
    try {
        const id = getId(req.params.id);
        if (!id) {
            return res.status(400).json({ error: "Invalid parent ID" });
        }
        const { name, email, phone, address, city, relationship, notes, } = req.body;
        const parent = await client_1.prisma.parent.update({
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
    }
    catch (error) {
        console.error("UPDATE PARENT ERROR:", error);
        res.status(500).json({ error: "Failed to update parent" });
    }
}
// ✅ DELETE PARENT
async function deleteParent(req, res) {
    try {
        const id = getId(req.params.id);
        if (!id) {
            return res.status(400).json({ error: "Invalid parent ID" });
        }
        await client_1.prisma.parent.delete({
            where: { id },
        });
        res.json({ message: "Parent deleted" });
    }
    catch (error) {
        console.error("DELETE PARENT ERROR:", error);
        res.status(500).json({ error: "Failed to delete parent" });
    }
}
