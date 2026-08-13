'use client'

import { useEffect, useState } from 'react'

import { useAssignInstructionMutation } from '@/features/sharing/hooks/use-instructions-queries'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface AssignInstructionDialogProps {
  isOpen: boolean
  onClose: () => void
  assigneeId: string
  assigneeName: string
}

export function AssignInstructionDialog({ isOpen, onClose, assigneeId, assigneeName }: AssignInstructionDialogProps) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')

  const assignInstructionMutation = useAssignInstructionMutation()

  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setNote('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    await assignInstructionMutation.mutateAsync({
      assigneeId,
      title: trimmedTitle,
      note: note.trim() || undefined,
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase sm:text-2xl">Assign Instruction</DialogTitle>
        </DialogHeader>

        <form id="assign-instruction-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instruction-title">Title</Label>
            <Input
              id="instruction-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`What should ${assigneeName} do?`}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instruction-note">
              Note <span className="normal-case text-zinc-400">(optional)</span>
            </Label>
            <Textarea
              id="instruction-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any extra detail or context"
              rows={4}
            />
          </div>
        </form>

        <DialogFooter className="pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-instruction-form"
            disabled={assignInstructionMutation.isPending || !title.trim()}
            className="flex-1"
          >
            {assignInstructionMutation.isPending ? 'Assigning...' : 'Assign Instruction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
