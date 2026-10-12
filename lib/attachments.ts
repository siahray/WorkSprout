// Client-safe helpers and constants for the private `attachments` Storage bucket.
// ALLOWED_MIME_TYPES must stay in sync with the bucket's allowed_mime_types set in
// supabase/migrations/20261012160000_attachments.sql.

export const ATTACHMENT_BUCKET = 'attachments'
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const

// For the <input type="file"> accept attribute.
export const ATTACHMENT_ACCEPT = ALLOWED_MIME_TYPES.join(',')

export type AttachmentParentType = 'project' | 'invoice'

export type Attachment = {
  id: string
  name: string
  path: string
  mime_type: string | null
  size_bytes: number
  created_at: string
}

export function isAllowedMimeType(type: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type)
}

export function isImageMimeType(type: string | null | undefined): boolean {
  return Boolean(type && type.startsWith('image/'))
}

// Reduce a user-supplied filename to something safe for an object key, keeping a
// short extension. Path separators and exotic characters are replaced.
export function sanitizeFilename(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? 'file').trim()
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot + 1).replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() : ''

  const safeStem = stem
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 100) || 'file'

  const safeExt = ext.slice(0, 12)
  return safeExt ? `${safeStem}.${safeExt}` : safeStem
}

// Objects are namespaced by owner id so storage RLS can scope access by the
// first folder segment: `<user_id>/<parent_type>/<parent_id>/<uuid>-<name>`.
export function buildAttachmentPath(
  userId: string,
  parentType: AttachmentParentType,
  parentId: string,
  name: string,
): string {
  const unique =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${userId}/${parentType}/${parentId}/${unique}-${sanitizeFilename(name)}`
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

// A tiny badge label for the file list (e.g. PDF, PNG, DOCX).
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return 'FILE'
  return name.slice(dot + 1).toUpperCase().slice(0, 4)
}
