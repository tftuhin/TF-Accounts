import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const employees = await prisma.employee.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        designation: true,
        department: true,
        baseSalary: true,
        status: true,
        joinedAt: true,
        resignedAt: true,
        notes: true,
        createdAt: true,
        _count: { select: { increments: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: employees.map((e) => ({
        id: e.id,
        name: e.name,
        designation: e.designation,
        department: e.department,
        baseSalary: Number(e.baseSalary),
        status: e.status,
        joinedAt: e.joinedAt ? e.joinedAt.toISOString().split("T")[0] : null,
        resignedAt: e.resignedAt ? e.resignedAt.toISOString().split("T")[0] : null,
        notes: e.notes,
        incrementCount: e._count.increments,
        createdAt: e.createdAt,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { name, designation, department, baseSalary, joinedAt, notes } = await req.json();

    if (!name || !baseSalary)
      return NextResponse.json(
        { error: "name and baseSalary are required" },
        { status: 400 }
      );

    const employee = await prisma.employee.create({
      data: {
        name,
        designation: designation || null,
        department: department || null,
        baseSalary: parseFloat(baseSalary),
        joinedAt: joinedAt ? new Date(joinedAt) : null,
        notes: notes || null,
        createdById: session.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: employee.id,
        name: employee.name,
        designation: employee.designation,
        department: employee.department,
        baseSalary: Number(employee.baseSalary),
        status: employee.status,
        joinedAt: employee.joinedAt ? employee.joinedAt.toISOString().split("T")[0] : null,
        notes: employee.notes,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
