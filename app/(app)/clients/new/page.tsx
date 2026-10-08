import type { Metadata } from 'next'
import { ClientForm } from '../client-form'
import { createClient } from '../actions'

export const metadata: Metadata = {
  title: 'New client · WorkSprout',
}

export default function NewClientPage() {
  return <ClientForm action={createClient} submitLabel="Add client" />
}
