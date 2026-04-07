"use server";

import { redirect } from "next/navigation";
import { createServerActionClient } from "@/lib/supabase";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=credenciales_invalidas");
  }

  const supabase = createServerActionClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("invalid")) {
      redirect("/login?error=credenciales_invalidas");
    }
    redirect("/login?error=error_servidor");
  }

  redirect("/dashboard");
}
