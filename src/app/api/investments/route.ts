import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateInvestmentSchema = z.object({
  entityId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["WEB_THEME", "PLUGIN", "SOFTWARE_SUBSCRIPTION", "TEMPLATE", "DIGITAL_LICENSE", "OTHER"]),
  status: z.enum(["ACTIVE", "FULLY_PAID", "EXPIRED"]).default("ACTIVE"),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const where = entityId && entityId !== "consolidated" ? { entityId } : {};

    const investments = await prisma.investment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        payments: {
          select: { amount: true, paymentDate: true, source: true, note: true, currency: true },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: investments.map((inv) => ({
        id: inv.id,
        entityId: inv.entityId,
        name: inv.name,
        description: inv.description,
        category: inv.category,
        status: inv.status,
        totalPaid: inv.payments.reduce((sum, p) => sum + Number(p.amount), 0),
        paymentCount: inv.payments.length,
        payments: inv.payments,
        createdAt: inv.createdAt,
      })),
    });
  } catch (err) {
    console.error("Investment list error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = CreateInvestmentSchema.parse(body);

    const investment = await prisma.investment.create({
      data: {
        entityId: data.entityId,
        name: data.name,
        description: data.description,
        category: data.category as any,
        status: data.status as any,
        createdById: session.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: investment,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    console.error("Investment creation error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
