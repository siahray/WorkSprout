import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { TimeEntryForm } from '../../entry-form'
import { updateManualEntry } from '../../actions'
import { loadProjectOptions } from '../../data'
import { toDateInput, toTimeInput } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Edit time entry · WorkSprout',
}

export default async function EditTimeEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const { data: entry } = await supabase
    .from('time_entries')
    .select('id, task_id, start_time, end_time, note, billable, invoice_id')
    .eq('id', id)
    .maybeSingle()

  if (!entry) notFound()
  if (entry.invoice_id) redirect('/time')

  const options = await loadProjectOptions(supabase)

  return (
    <>
      <PageHeader title="Edit time entry" description="Adjust the task, times, or note." />
      <TimeEntryForm
        action={updateManualEntry}
        projects={options}
        defaults={{
          id: entry.id,
          task_id: entry.task_id,
          date: toDateInput(entry.start_time),
          start: toTimeInput(entry.start_time),
          end: entry.end_time ? toTimeInput(entry.end_time) : '10:00',
          note: entry.note,
          billable: entry.billable,
        }}
        submitLabel="Save changes"
        cancelHref="/time"
      />
    </>
  )
}
