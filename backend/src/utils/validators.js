import { z } from 'zod';

const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const signupSchema = z.object({
  email: z.email(),
  password: z.string().regex(strongPasswordRegex, 'Password must include uppercase, number, special char, min length 8'),
  fullName: z.string().min(2).max(120),
  charityId: z.uuid().optional(),
  charityPercentage: z.number().int().min(10).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const planTypeSchema = z.enum(['monthly', 'yearly']);

export const scoreSchema = z.object({
  score: z.number().int().min(1).max(45),
  playedAt: z.coerce.date().max(new Date()),
});

export const charitySchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().min(10),
  imageUrl: z.url(),
  websiteUrl: z.url(),
  email: z.email(),
});

export const donationSchema = z.object({
  amount: z.number().positive().max(100000),
  currency: z.string().min(3).max(3).default('INR'),
  note: z.string().max(500).optional().default(''),
  charityId: z.uuid(),
});

export const parseOrThrow = (schema, data) => schema.parse(data);
