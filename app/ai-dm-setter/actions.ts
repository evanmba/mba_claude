"use server";
import { revalidatePath } from "next/cache";
export async function refreshAIDMData() {
  revalidatePath("/ai-dm-setter");
}
