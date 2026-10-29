import { createClient } from "@supabase/supabase-js"
import type { CompanyWithRelations } from "@/types/database"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { CompanyDetailView } from "@/components/company-detail-view"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Props {
  params: Promise<{ slug: string }>
}

async function getCompany(slug: string): Promise<CompanyWithRelations | null> {
    const { data, error } = await supabase
    .from("companies")
    .select(`
      *,
      technologies:company_technologies(
        *,
        technology:technologies(*)
      ),
      grants:company_grants(
        *,
        grant:grants(*)
      )
    `)
    .eq("slug", slug)
    .single()

  if (error || !data) return null
  return data as CompanyWithRelations
}

export async function generateStaticParams() {
  const { data } = await supabase
    .from("companies")
    .select("slug")
    .limit(1000)

  return (data ?? []).map((row) => ({ slug: row.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const company = await getCompany(slug)

  if (!company) return { title: "Company Not Found" }

  const title = `${company.name} · Space Infrastructure`
  const description = company.description?.slice(0, 160) ?? `${company.name} operates in the space infrastructure economy.`
  const url = `https://veroyx.com/companies/${company.slug}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Veroyx",
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical: url },
  }
}

export default async function CompanyPage({ params }: Props) {
  const { slug } = await params
  const company = await getCompany(slug)

  if (!company) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url: company.website ?? `https://veroyx.com/companies/${company.slug}`,
    description: company.description,
    foundingDate: company.founded_year?.toString(),
    address: company.headquarters
      ? { "@type": "PostalAddress", addressLocality: company.headquarters }
      : undefined,
    sameAs: company.website ? [company.website] : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompanyDetailView company={company} />
    </>
  )
}
