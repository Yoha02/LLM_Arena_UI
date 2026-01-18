import { redirect } from "next/navigation";

// Root page redirects to the Arena experiment
export default function Home() {
  redirect("/arena");
}
