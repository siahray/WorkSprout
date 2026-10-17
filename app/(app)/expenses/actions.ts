'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isExpenseCategory } from '@/lib/expenses'
import { round2 } from '@/lib/tax'
import { isUuid, money, optionalText, text, type FormState } from '@/lib/validation'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function createExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const description = text(formData, 'description')
  const category = text(formData, 'category')
  const projectId = optionalText(formData, 'project_id')
  const spentOn = text(formData, 'spent_on')
  const note = optionalText(formData, 'note')
  const amount = money(formData, 'amount')

  if (!description) return { error: 'Describe the expense.' }
  if (!isExpenseCategory(category)) return { error: 'Choose a category.' }
  if (projectId && !isUuid(projectId)) return { error: 'That project could not be found.' }
  if (!DATE_RE.test(spentOn)) return { error: 'Enter a valid date.' }
  if (amount === null || amount <= 0) return { error: 'Enter an amount greater than zero.' }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  if (projectId) {
    const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle()
    if (!project) return { error: 'That project could not be found.' }
  }

  const { error } = await supabase.from('expenses').insert({
    user_id: userId,
    project_id: projectId || null,
    category,
    description,
    amount: round2(amount),
    spent_on: spentOn,
    note: note || null,
  })

  if (error) {
    console.error('create expense failed:', error.message)
    return { error: 'Could not save the expense — please try again.' }
  }

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { ok: 'Expense added.' }
}

export async function updateExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const description = text(formData, 'description')
  const category = text(formData, 'category')
  const projectId = optionalText(formData, 'project_id')
  const spentOn = text(formData, 'spent_on')
  const note = optionalText(formData, 'note')
  const amount = money(formData, 'amount')

  if (!isUuid(id)) return { error: 'That expense could not be found.' }
  if (!description) return { error: 'Describe the expense.' }
  if (!isExpenseCategory(category)) return { error: 'Choose a category.' }
  if (projectId && !isUuid(projectId)) return { error: 'That project could not be found.' }
  if (!DATE_RE.test(spentOn)) return { error: 'Enter a valid date.' }
  if (amount === null || amount <= 0) return { error: 'Enter an amount greater than zero.' }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  if (projectId) {
    const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle()
    if (!project) return { error: 'That project could not be found.' }
  }

  // `.select()` distinguishes "not found / not yours" from a successful update,
  // which an update without it cannot: both return no error.
  const { data: updated, error } = await supabase
    .from('expenses')
    .update({
      project_id: projectId || null,
      category,
      description,
      amount: round2(amount),
      spent_on: spentOn,
      note: note || null,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('update expense failed:', error.message)
    return { error: 'Could not save the expense — please try again.' }
  }
  if (!updated) return { error: 'That expense could not be found.' }

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { ok: 'Expense updated.' }
}

export async function deleteExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That expense could not be found.' }

  const supabase = await createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)

  if (error) {
    console.error('delete expense failed:', error.message)
    return { error: 'Could not delete the expense — please try again.' }
  }

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { ok: 'Expense removed.' }
}