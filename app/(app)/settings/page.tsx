import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { formatDate } from '@/lib/format'
import { SettingsForm } from './settings-form'
import { PasswordForm } from './password-form'
import { ApiKeysCard, type ApiKeyRow } from './api-keys'
import { FeedbackForm } from '../feedback/feedback-form'
import { card, eyebrow } from '@/lib/ui'

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
    .select('full_name, business_name, business_address, business_phone, taxes')
    .eq('id', userId)
    .maybeSingle()

  // Only active keys are listed; revoked ones are kept in the table as an audit
  // trail but have nothing left to act on.
  const { data: keyRows } = await supabase
    .from('api_keys')
    .select('id, name, prefix, created_at, last_used_at')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  const keys: ApiKeyRow[] = (keyRows ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    prefix: row.prefix as string,
    createdAt: formatDate(row.created_at as string),
    lastUsedAt: row.last_used_at ? formatDate(row.last_used_at as string) : null,
  }))

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Business details and taxes used on your invoices.">
        <span className={`${card} px-3 py-1.5 text-sm text-[#0E2F27]/70`}>{claimsData?.claims?.email}</span>
      </PageHeader>
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className={eyebrow}>Business</h2>
          <SettingsForm defaults={profile ?? {}} />
        </section>

        <section className="space-y-4">
          <h2 className={eyebrow}>Account</h2>
          <div className={`${card} space-y-5 p-6`}>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Password</h3>
              <p className="mt-1 text-sm text-[#0E2F27]/65">Change the password you use to sign in.</p>
            </div>
            <PasswordForm />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className={eyebrow}>Automation</h2>
          <div className={`${card} space-y-5 p-6`}>
            <ApiKeysCard keys={keys} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className={eyebrow}>Support</h2>
          <div className={`${card} space-y-5 p-6`}>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Send feedback</h3>
              <p className="mt-1 text-sm text-[#0E2F27]/65">
                Found a bug or have an idea? We read every message during the beta.
              </p>
            </div>
            <FeedbackForm page="/settings" />
          </div>
        </section>
      </div>
    </div>
  )
}
