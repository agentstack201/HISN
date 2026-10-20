/**
 * Shared input validation (Zod). Used by server actions so that every value
 * coming from a browser form is checked on the server before use.
 */
import { z } from "zod";
import { checkTargetUrl } from "./targets";

export const targetSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  url: z
    .string()
    .trim()
    .max(2048, "URL is too long")
    .transform((value, ctx) => {
      const result = checkTargetUrl(value);
      if (!result.ok) {
        ctx.addIssue({ code: "custom", message: result.error });
        return z.NEVER;
      }
      return result.url.toString();
    }),
  authorized: z.literal("on", { message: "You must confirm you are authorized to test this website" }),
});

export const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const profileSchema = z.object({
  display_name: z.string().trim().max(60),
  preferred_language: z.enum(["en", "ar"]),
});

export const uuidSchema = z.string().uuid();
