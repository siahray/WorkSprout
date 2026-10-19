import { AttachmentList } from './attachment-list'
import { AttachmentUploader } from './attachment-uploader'
import type { Attachment, AttachmentParentType } from '@/lib/attachments'
import { card } from '@/lib/ui'
import { display } from '@/lib/fonts'

export function AttachmentSection({
  title,
  description,
  parentType,
  parentId,
  attachments,
  uploadHint,
  emptyText,
}: {
  title: string
  description?: string
  parentType: AttachmentParentType
  parentId: string
  attachments: Attachment[]
  uploadHint?: string
  emptyText?: string
}) {
  return (
    <section className={`${card} p-5`}>
      <div>
        <h2 className={`${display.className} text-lg font-bold tracking-tight`}>{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      </div>

      <div className="mt-4">
        <AttachmentUploader parentType={parentType} parentId={parentId} hint={uploadHint} />
      </div>

      {attachments.length === 0 && emptyText ? (
        <p className="mt-3 text-sm text-ink-2">{emptyText}</p>
      ) : (
        <AttachmentList attachments={attachments} />
      )}
    </section>
  )
}
