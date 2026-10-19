import { ConfirmAction } from '@/components/ui/confirm-action'
import { deleteAttachment } from '@/app/attachments/actions'
import { fileExtension, formatBytes, isImageMimeType, type Attachment } from '@/lib/attachments'
import { formatDate } from '@/lib/format'
import { btnDanger } from '@/lib/ui'

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) {
    return <p className="mt-3 text-sm text-ink-2">No files yet.</p>
  }

  return (
    <ul className="mt-3 divide-y divide-line">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="flex items-center gap-3 py-3">
          {isImageMimeType(attachment.mime_type) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/attachments/${attachment.id}`}
              alt=""
              loading="lazy"
              className="h-10 w-10 shrink-0 rounded-control border border-line object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-canvas text-[10px] font-bold tracking-wide text-sprout-deep">
              {fileExtension(attachment.name)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <a
              href={`/attachments/${attachment.id}?download=1`}
              className="block truncate text-sm font-medium text-ink hover:text-sprout-deep"
            >
              {attachment.name}
            </a>
            <p className="text-xs text-ink-3">
              {formatBytes(attachment.size_bytes)} · {formatDate(attachment.created_at)}
            </p>
          </div>

          <ConfirmAction
            action={deleteAttachment}
            id={attachment.id}
            message="Remove this file?"
            className={`${btnDanger} px-2.5! py-1.5! text-xs`}
          >
            Remove
          </ConfirmAction>
        </li>
      ))}
    </ul>
  )
}
