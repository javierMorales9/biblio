import { unstable_noStore as noStore } from "next/cache";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import PdfReader from "./_components/pdf_reader";

export default async function Home() {
  noStore();
  const session = await getServerAuthSession();

  return (
    <main className="w-full flex justify-center">
      <PdfReader />
    </main>
  );
}
