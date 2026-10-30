import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q || q.trim() === '') {
    return NextResponse.json({ results: [] })
  }

  const query = q.trim()

  const [companies, technologies, grants] = await Promise.all([
    supabase
      .from('companies')
      .select('name, slug, sector')
      .ilike('name', `%${query}%`)
      .limit(5),
    supabase
      .from('technologies')
      .select('name, slug, sector')
      .ilike('name', `%${query}%`)
      .limit(5),
    supabase
      .from('grants')
      .select('name, slug, awarding_agency')
      .ilike('name', `%${query}%`)
      .limit(5),
  ])

  const results = [
    ...(companies.data || []).map((c) => ({
      title: c.name,
      type: 'Company',
      sector: c.sector,
      href: `/companies/${c.slug}`,
    })),
    ...(technologies.data || []).map((t) => ({
      title: t.name,
      type: 'Technology',
      sector: t.sector,
      href: `/technologies/${t.slug}`,
    })),
    ...(grants.data || []).map((g) => ({
      title: g.name,
      type: 'Contract',
      sector: g.awarding_agency,
      href: `/grants/${g.slug}`,
    })),
  ]

  return NextResponse.json({ results })
}
