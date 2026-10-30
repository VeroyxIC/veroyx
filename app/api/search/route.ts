import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const [compRes, techRes, grantRes] = await Promise.all([
      supabase
        .from('companies')
        .select('name, slug, sector')
        .ilike('name', `%${q}%`)
        .limit(5),
      supabase
        .from('technologies')
        .select('name, slug, sector, trl')
        .ilike('name', `%${q}%`)
        .limit(5),
      supabase
        .from('grants')
        .select('name, slug, awarding_agency')
        .ilike('name', `%${q}%`)
        .limit(5),
    ])

    const results = [
      ...(compRes.data || []).map((c) => ({
        name: c.name,
        href: `/companies/${c.slug}`,
        category: 'Companies',
        sub: c.sector || 'Aerospace Prime',
      })),
      ...(techRes.data || []).map((t) => ({
        name: t.name,
        href: `/technologies/${t.slug}`,
        category: 'Technologies',
        sub: `TRL ${t.trl || 7} • ${t.sector || 'Flight System'}`,
      })),
      ...(grantRes.data || []).map((g) => ({
        name: g.name,
        href: `/grants/${g.slug}`,
        category: 'Contracts',
        sub: g.awarding_agency || 'Federal Award',
      })),
    ]

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
