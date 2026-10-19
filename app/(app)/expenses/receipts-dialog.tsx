'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { AttachmentUploader } from '@/components/attachments/attachment-uploader'
import { AttachmentList } from '@/components/attachments/attachment-list'
import type { Attachment } from '@/lib/attachments'
import { btnGhost } from '@/lib/ui'

// Receipts attach from the expense row itself, not from the add/edit form: the
// upload target needs an id that only exists once the expense has been saved.
// Like the edit dialog, the content mounts only while open, and the uploader's
// refresh re-renders the server-passed list in place without closing the modal.
export function ReceiptsDialog({
  expenseId,
  description,
  attachments,
}: {
  expenseId: string
  description: string
  attachments: Attachment[]
}) {
  const [open, setOpen] = useState(false)

  const count = attachments.length

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${btnGhost} !px-2.5 !py-1.5 text-xs`}>
        Receipt{count > 0 ? ` (${count})` : ''}
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Receipts" description={description} size="lg">
        {open && (
          <div>
            <AttachmentUploader parentType="expense" parentId={expenseId} />

            {attachments.length === 0 ? (
              <p className="mt-3 text-sm text-[#0E2F27]/60">
                No receipts yet — attach a photo or PDF of the receipt.
              </p>
            ) : (
              <AttachmentList attachments={attachments} />
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
