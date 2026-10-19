'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { recordAttachment } from '@/app/attachments/actions'
import { createClient } from '@/lib/supabase/client'
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_BUCKET,
  MAX_ATTACHMENT_BYTES,
  buildAttachmentPath,
  formatBytes,
  isAllowedMimeType,
  type AttachmentParentType,
} from '@/lib/attachments'
import { alertError, btnSecondary } from '@/lib/ui'

const ALLOWED_LABEL = 'Images, PDF, Office, ZIP, CSV or text'

export function AttachmentUploader({
  parentType,
  parentId,
  hint,
}: {
  parentType: AttachmentParentType
  parentId: string
  hint?: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setBusy(true)

    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      setError('Your session expired — sign in again.')
      setBusy(false)
      return
    }

    const list = Array.from(files)
    let added = 0

    for (let i = 0; i < list.length; i += 1) {
      const file = list[i]
      setStatus(`Uploading ${i + 1} of ${list.length}…`)

      if (!isAllowedMimeType(file.type)) {
        setError(`“${file.name}” is not a supported file type.`)
        continue
      }
      if (file.size === 0) {
        setError(`“${file.name}” is empty.`)
        continue
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`“${file.name}” is larger than ${formatBytes(MAX_ATTACHMENT_BYTES)}.`)
        continue
      }

      const path = buildAttachmentPath(userId, parentType, parentId, file.name)
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadError) {
        setError(`Could not upload “${file.name}”: ${uploadError.message}`)
        continue
      }

      const result = await recordAttachment({
        parentType,
        parentId,
        path,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      })

      if (result.error) {
        setError(result.error)
        continue
      }
      added += 1
    }

    setStatus(null)
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
    if (added > 0) router.refresh()
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="sr-only"
        onChange={(event) => upload(event.target.files)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btnSecondary}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? (status ?? 'Uploading…') : 'Add files'}
        </button>
        <p className="text-xs text-ink-3">
          {hint ?? `${ALLOWED_LABEL} · up to ${formatBytes(MAX_ATTACHMENT_BYTES)} each`}
        </p>
      </div>
      {error && (
        <p role="alert" className={`${alertError} mt-3`}>
          {error}
        </p>
      )}
    </div>
  )
}
