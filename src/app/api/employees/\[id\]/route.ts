import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const {
      name,
      designation,
      department,
      baseSalary,
      status,
      email,
      phone,
      profileImage,
      bankName,
      bankAccountNumber,
      notes,
      resignedAt,
    } = await req.json();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (designation !== undefined) updateData.designation = designation;
    if (department !== undefined) updateData.department = department;
    if (baseSalary !== undefined) updateData.baseSalary = parseFloat(baseSalary);
    if (status !== undefined) updateData.status = status;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (profileImage !== undefined) updateData.profileImage = profileImage || null;
    if (bankName !== undefined) updateData.bankName = bankName || null;
    if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (resignedAt !== undefined) updateData.resignedAt = resignedAt ? new Date(resignedAt) : null;

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
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
        email: employee.email,
        phone: employee.phone,
        profileImage: employee.profileImage,
        bankName: employee.bankName,
        bankAccountNumber: employee.bankAccountNumber,
        notes: employee.notes,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
