import { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://veroyx.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    { data: companies },
    { data: technologies },
    { data: grants }
  ] = await Promise.all([
    supabase.from("companies").select("slug, updated_at"),
    supabase.from("technologies").select("slug, updated_at"),
    supabase.from("grants").select("slug, updated_at"),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/companies`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/technologies`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/grants`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ]

  const companyRoutes: MetadataRoute.Sitemap = (companies ?? []).map((c) => ({
    url: `${BASE_URL}/companies/${c.slug}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  const techRoutes: MetadataRoute.Sitemap = (technologies ?? []).map((t) => ({
    url: `${BASE_URL}/technologies/${t.slug}`,
    lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }))

  const grantRoutes: MetadataRoute.Sitemap = (grants ?? []).map((g) => ({
    url: `${BASE_URL}/grants/${g.slug}`,
    lastModified: g.updated_at ? new Date(g.updated_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }))

  return [...staticRoutes, ...companyRoutes, ...techRoutes, ...grantRoutes]
}
