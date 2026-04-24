"use server";

import { redirect } from "next/navigation";
import { createServerActionClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=credenciales_invalidas");
  }

  const supabase = await createServerActionClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    if (authError.message.toLowerCase().includes("invalid")) {
      redirect("/login?error=credenciales_invalidas");
    }
    redirect("/login?error=error_servidor");
  }

  // Verificar que el usuario existe en la tabla usuarios
  const usuario = await prisma.usuario.findUnique({
    where: { email: authData.user.email },
    select: { id: true },
  });

  if (!usuario) {
    await supabase.auth.signOut();
    redirect("/login?error=sin_acceso");
  }

  redirect("/dashboard");
}
