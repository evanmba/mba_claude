"use server";

import { revalidatePath } from "next/cache";

export async function refreshDialerData() {
  revalidatePath("/dialers");
}
