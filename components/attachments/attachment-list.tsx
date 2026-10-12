import { ConfirmAction } from '@/components/ui/confirm-action'
import { deleteAttachment } from '@/app/attachments/actions'
import { fileExtension, formatBytes, isImageMimeType, type Attachment } from '@/lib/attachments'
import { formatDate } from '@/lib/format'
import { btnDanger } from '@/lib/ui'

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) {
    return <p className="mt-3 text-sm text-[#0E2F27]/60">No files yet.</p>
  }

  return (
    <ul className="mt-3 divide-y divide-[#0E2F27]/10">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="flex items-center gap-3 py-3">
          {isImageMimeType(attachment.mime_type) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/attachments/${attachment.id}`}
              alt=""
              loading="lazy"
              className="h-10 w-10 shrink-0 rounded-lg border border-[#0E2F27]/10 object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4F8F5] text-[10px] font-bold tracking-wide text-[#1F6B52]">
              {fileExtension(attachment.name)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <a
              href={`/attachments/${attachment.id}?download=1`}
              className="block truncate text-sm font-medium text-[#0E2F27] hover:text-[#1F6B52]"
            >
              {attachment.name}
            </a>
            <p className="text-xs text-[#0E2F27]/55">
              {formatBytes(attachment.size_bytes)} · {formatDate(attachment.created_at)}
            </p>
          </div>

          <ConfirmAction
            action={deleteAttachment}
            id={attachment.id}
            message="Remove this file?"
            className={`${btnDanger} !px-2.5 !py-1.5 text-xs`}
          >
            Remove
          </ConfirmAction>
        </li>
      ))}
    </ul>
  )
}
