import { isMasterEmail, isNexoAdminEmail } from "../src/lib/master-user.ts";

const nexoEmail = "rafaelnexomidia@gmail.com";
console.log("isMasterEmail(nexo):", isMasterEmail(nexoEmail));
console.log("isNexoAdminEmail(nexo):", isNexoAdminEmail(nexoEmail));
