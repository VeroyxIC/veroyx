export interface Company {
  id: string
  name: string
  slug: string
  description: string | null
  website: string | null
  headquarters: string | null
  founded_year: number | null
  employee_count: number | null
  funding_stage: string | null
  created_at: string
  updated_at: string
}

export interface Technology {
  id: string
  name: string
  slug: string
  sector: string
  description: string | null
  trl: number | null
  created_at: string
  updated_at: string
}

export interface Grant {
  id: string
  name: string
  slug: string
  description: string | null
  awarding_agency: string | null
  amount: number | null
  currency: string | null
  status: string | null
  award_date: string | null
  created_at: string
  updated_at: string
}

export interface CompanyTechnology {
  id: string
  company_id: string
  technology_id: string
  relationship_type: string | null
  created_at: string
  updated_at: string
  technology: Technology
}

export interface CompanyGrant {
  id: string
  company_id: string
  grant_id: string
  role: string | null
  created_at: string
  updated_at: string
  grant: Grant
}

export interface CompanyWithRelations extends Company {
  technologies: CompanyTechnology[]
  grants: CompanyGrant[]
}