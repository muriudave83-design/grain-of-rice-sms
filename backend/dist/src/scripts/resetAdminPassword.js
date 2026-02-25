"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function main() {
    const hashedPassword = await bcrypt_1.default.hash("admin123", 10);
    await client_1.prisma.user.update({
        where: { email: "admin@school.com" },
        data: { password: hashedPassword },
    });
    console.log("✅ Admin password reset to: admin123");
    process.exit(0);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
