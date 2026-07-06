import { redirect } from "next/navigation";

// The athlete roster is now the app's main screen at "/". Keep this path
// working for any existing bookmarks by redirecting home.
export default function AthletesRedirect() {
  redirect("/");
}
