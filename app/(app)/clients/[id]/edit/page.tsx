import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '../../client-form'
import { updateClient } from '../../actions'

export const metadata: Metadata = {
  title: 'Edit client · WorkSprout',
}

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()
  if (!client) notFound()

  return (
    <ClientForm
      action={updateClient}
      defaults={client}
      submitLabel="Save changes"
      cancelHref={`/clients/${id}`}
    />
  )
}
