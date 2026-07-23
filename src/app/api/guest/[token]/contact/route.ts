import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getGuestContext } from "@/lib/guest";
import { guestGroups } from "@/lib/schema";

const schema = z
  .object({
    contactEmail: z.union([z.string().trim().email().max(254), z.literal("")]),
    contactPhone: z.string().trim().max(30).regex(/^[0-9+() .-]*$/),
    shareEmail: z.boolean(),
    sharePhone: z.boolean()
  })
  .refine((value) => !value.shareEmail || Boolean(value.contactEmail), {
    message: "E-mail skal udfyldes, før den kan deles"
  })
  .refine((value) => !value.sharePhone || Boolean(value.contactPhone), {
    message: "Telefonnummer skal udfyldes, før det kan deles"
  });

export async function PUT(
  request: Request,
  { params }: { params: { token: string } }
) {
  const context = await getGuestContext(params.token);
  if (!context) {
    return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });
  }

  const payload = schema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.issues[0]?.message ?? "Kontrollér kontaktoplysningerne" },
      { status: 400 }
    );
  }

  await db
    .update(guestGroups)
    .set({
      contactEmail: payload.data.contactEmail || null,
      contactPhone: payload.data.contactPhone || null,
      shareEmail: payload.data.shareEmail,
      sharePhone: payload.data.sharePhone,
      lastSeenAt: Date.now()
    })
    .where(eq(guestGroups.id, context.group.id));

  return NextResponse.json({ ok: true });
}
