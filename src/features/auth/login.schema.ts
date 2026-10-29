import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address.")),
});

export const loginCodeSchema = z.object({
    code: z.string().min(1, "Enter the code from your email.")
        .regex(/^[0-9]{6}$/, "Enter a six-digit code using numbers only."),
});

export const verifyLoginSchema = loginSchema.extend(loginCodeSchema.shape);
