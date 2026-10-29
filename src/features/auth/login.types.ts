import type { z } from "zod";
import type { loginSchema, loginCodeSchema, verifyLoginSchema } from "./login.schema";

export type LoginFormData = z.infer<typeof loginSchema>;
export type LoginCodeFormData = z.infer<typeof loginCodeSchema>;
export type VerifyLoginData = z.infer<typeof verifyLoginSchema>;
