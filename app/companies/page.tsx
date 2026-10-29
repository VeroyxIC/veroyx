import { createClient } from "@supabase/supabase-js"
import type { Company } from "@/types/database"
import type { Metadata } from "next"
import { DirectoryView } from "@/components/directory-view"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const metadata: Metadata = {
  title: "Directory · Space Infrastructure Primes & Hardware Developers | Veroyx",
  description: "Comprehensive repository of active commercial space stations, launch operators, and orbital hardware infrastructure companies.",
  alternates: {
    canonical: "https://veroyx.com/companies",
  },
}


export default async function DirectoryPage() {
  const { data } = await supabase
    .from("companies")
    .select("*")
    .order("name", { ascending: true })

  const companies = (data ?? []) as Company[]

  return <DirectoryView initialCompanies={companies} />
}
