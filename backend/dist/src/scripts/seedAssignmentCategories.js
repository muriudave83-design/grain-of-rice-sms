"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../prisma/client");
async function main() {
    const categories = ["Homework", "Quiz", "Test", "Project"];
    for (const name of categories) {
        await client_1.prisma.assignmentCategory.upsert({
            where: { name },
            update: {},
            create: { name, weight: 1 },
        });
    }
    console.log("Assignment categories seeded.");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await client_1.prisma.$disconnect();
});
