import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { SettingsForm } from './settings-form'
import { card } from '@/lib/ui'

export const metadata: Metadata = {
  title: 'Settings · WorkSprout',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name, business_address, business_phone, tax_rate, tax_label')
    .eq('id', userId)
    .maybeSingle()

  return (
    <>
      <PageHeader title="Settings" description="Business details and tax used on your invoices.">
        <span className={`${card} px-3 py-1.5 text-sm text-[#0E2F27]/70`}>{claimsData?.claims?.email}</span>
      </PageHeader>
      <div className="max-w-3xl">
        <SettingsForm defaults={profile ?? {}} />
      </div>
    </>
  )
}
