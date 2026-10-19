import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csvResponse, toCsv } from '@/lib/csv'
import { fetchAll } from '@/lib/export'
import { isUuid } from '@/lib/validation'
import { decimalHours, hoursFromMinutes, nowDateInput, toTimeInput } from '@/lib/format'
import {
  addDays,
  manilaDayOf,
  manilaDayStart,
  resolvePeriodRange,
  type PeriodKind,
} from '@/lib/period'
import { buildTimesheet } from '@/lib/reports'

const LIST_HEADER = ['date', 'time', 'task', 'project', 'duration', 'hours', 'billable', 'invoiced']

type ListRow = {
  start_time: string
  duration_minutes: number | null
  billable: boolean
  invoice_id: string | null
  task: { title: string; project: { name: string } | null } | null
}

type MatrixRow = {
  start_time: string
  duration_minutes: number | null
  billable: boolean
  task: { project: { name: string } | null } | null
}

/**
 * Time export. ?view=list (default) dumps every entry matching ?project=;
 * ?view=timesheet&period=week|month&start=YYYY-MM-DD dumps the hours matrix
 * for that period instead — the same window the Time page renders.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return new Response('Unauthorized', { status: 401 })

  const params = request.nextUrl.searchParams
  const projectParam = params.get('project') && isUuid(params.get('project')!) ? params.get('project')! : null

  if (params.get('view') === 'timesheet') {
    const period: PeriodKind = params.get('period') === 'month' ? 'month' : 'week'
    const { from, to } = resolvePeriodRange(period, params.get('start') ?? undefined, nowDateInput())

    const rows = await fetchAll<MatrixRow>((from_, to_) => {
      const query = supabase
        .from('time_entries')
        .select(
          projectParam
            ? 'start_time, duration_minutes, billable, task:tasks!inner(project:projects(name))'
            : 'start_time, duration_minutes, billable, task:tasks(project:projects(name))',
        )
        .not('end_time', 'is', null)
        .gte('start_time', manilaDayStart(from))
        .lt('start_time', manilaDayStart(addDays(to, 1)))
        .order('start_time', { ascending: true })
      if (projectParam) query.eq('task.project_id', projectParam)
      return query.range(from_, to_)
    })
    if (!rows) return new Response('Failed to load time entries', { status: 500 })

    const timesheet = buildTimesheet(
      rows.map((row) => ({
        start_time: row.start_time,
        duration_minutes: row.duration_minutes,
        billable: row.billable,
        project_name: row.task?.project?.name ?? null,
      })),
      from,
      to,
    )

    const hours = (minutes: number) => (minutes / 60).toFixed(2)
    const body = toCsv(
      ['project', ...timesheet.days, 'total_hours'],
      [
        ...timesheet.rows.map((row) => [
          row.label,
          ...row.cells.map(hours),
          hours(row.total),
        ]),
        ['TOTAL', ...timesheet.dayTotals.map(hours), hours(timesheet.total)],
      ],
    )
    return csvResponse(body, `worksprout-timesheet-${from}_${to}`)
  }

  const rows = await fetchAll<ListRow>((from_, to_) => {
    const query = supabase
      .from('time_entries')
      .select(
        projectParam
          ? 'start_time, duration_minutes, billable, invoice_id, task:tasks!inner(title, project:projects(name))'
          : 'start_time, duration_minutes, billable, invoice_id, task:tasks(title, project:projects(name))',
      )
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false })
    if (projectParam) query.eq('task.project_id', projectParam)
    return query.range(from_, to_)
  })
  if (!rows) return new Response('Failed to load time entries', { status: 500 })

  const body = toCsv(
    LIST_HEADER,
    rows.map((row) => [
      manilaDayOf(row.start_time),
      toTimeInput(row.start_time),
      row.task?.title ?? '',
      row.task?.project?.name ?? '',
      hoursFromMinutes(row.duration_minutes),
      decimalHours(row.duration_minutes),
      row.billable ? 'yes' : 'no',
      row.invoice_id ? 'yes' : 'no',
    ]),
  )
  return csvResponse(body, 'worksprout-time-entries')
}
