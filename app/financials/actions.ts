"use server";

import { revalidatePath } from "next/cache";

export async function revalidateFinancials() {
  revalidatePath("/financials");
}
