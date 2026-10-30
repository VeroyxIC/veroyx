import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const { data, error } = await supabase
    .from("user_watchlist")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { entityType, entityId, entityName, entitySlug } = body

    if (!entityType || !entityId || !entityName) {
      return NextResponse.json({ error: "Missing required entity parameters" }, { status: 400 })
    }

    // Check if already in watchlist
    const { data: existing } = await supabase
      .from("user_watchlist")
      .select("id")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .single()

    if (existing) {
      await supabase.from("user_watchlist").delete().eq("id", existing.id)
      return NextResponse.json({ action: "removed", id: existing.id })
    }

    const { data, error } = await supabase
      .from("user_watchlist")
      .insert([
        {
          entity_type: entityType,
          entity_id: String(entityId),
          entity_name: entityName,
          entity_slug: entitySlug || "",
          alerts_enabled: true,
        }
      ])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ action: "added", item: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
