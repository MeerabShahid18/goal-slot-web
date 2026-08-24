'use client'

import { memo, useRef, useState, type CSSProperties } from 'react'

import { useCategoriesQuery } from '@/features/categories'
import { useDeleteScheduleBlock } from '@/features/schedule/hooks/use-schedule-mutations'
import { scheduleQueries } from '@/features/schedule/utils/queries'
import { ScheduleBlock, ScheduleDensity } from '@/features/schedule/utils/types'
import { useDraggable } from '@dnd-kit/core'
import { useIsMutating } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Lock, Pencil, Target, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { Loading } from '@/components/ui/loading'
import { ConfirmDialog } from '@/components/confirm-dialog'

import { BlockTasksList } from './block-tasks-list'

type DraggableBlockProps = {
  block: ScheduleBlock
  top: number
  height: number
  isActiveDrag?: boolean
  onEdit: (block: ScheduleBlock) => void
  onViewDetail: (block: ScheduleBlock) => void
  density: ScheduleDensity
}

function DraggableBlockImpl({ block, top, height, isActiveDrag, onEdit, onViewDetail, density }: DraggableBlockProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const { mutateAsync: deleteBlock } = useDeleteScheduleBlock()
  const { data: categories = [] } = useCategoriesQuery()
  const draggableId = block.id
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: { type: 'block', block },
  })
  const isUpdating =
    useIsMutating({
      mutationKey: scheduleQueries.mutation.update(),
      predicate: (mutation) => (mutation.state.variables as { id?: string })?.id === block.id,
    }) > 0

  // If the block has a linked goal with a category, use the goal's category for color
  const effectiveCategory = block.goal?.category || block.category
  const categoryColor = categories.find((cat) => cat.value === effectiveCategory)?.color

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    setDeleteDialogOpen(true)
  }

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    onEdit(block)
  }

  const handleBlockClick = (event: React.MouseEvent) => {
    if (deleteDialogOpen) return
    onViewDetail(block)
  }

  const confirmDelete = async () => {
    try {
      await deleteBlock(block.id)
      toast.success('Block deleted')
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const accentColor = categoryColor || block.color || '#9CA3AF'
  // Render-mode thresholds, deliberately in absolute PIXELS, not minutes —
  // the content they gate (task-list rows, header text) has a fixed pixel
  // size regardless of density, so these stay constant across compact and
  // comfortable. Below 20px we are in "tiny" mode: title only, smaller
  // font, no padding-heavy elements. Below 44px we are "compact": title +
  // goal name, no tasks list. 44px+ is full content.
  //
  // Because comfortable mode's getPxPerMin() renders more pixels per
  // minute (see constants.ts), the SAME-duration block crosses these
  // thresholds into a fuller mode sooner in comfortable than in compact
  // (e.g. a 15-min block: 15px in compact stays "tiny", but 22.5px in
  // comfortable already clears it into "compact" mode; a 30-min block:
  // 30px in compact stays "compact", but 45px in comfortable clears into
  // full content with a tasks list). That is intentional — it's exactly
  // the "more height, more room for content" comfortable mode is for, so
  // the thresholds themselves don't need to scale with density too.
  //
  // The gap inset (1px top + 1px bottom) is kept for normal blocks so
  // adjacent same-color blocks stay visually distinct; for tiny blocks we
  // drop the inset because losing 2px of 15 is too much.
  const isTiny = height < 20
  const isCompact = height < 44
  // Grid-density-driven title wrap: only when the user has opted into the
  // wider 'comfortable' column layout (see ScheduleGrid) AND the block is
  // tall enough for a second line to matter (full-content mode, not the
  // height-based isTiny/isCompact compact-render paths above — those are
  // an orthogonal axis about a block's own vertical space, not the grid's
  // column width). BlockTasksList measures headerRef's real DOM height,
  // so a taller wrapped title correctly shrinks the room left for tasks
  // without any extra plumbing here.
  const canWrapTitle = density === 'comfortable' && !isTiny && !isCompact
  const insetTop = isTiny ? 0 : 1
  const insetTotal = isTiny ? 0 : 2
  const renderedHeight = Math.max(height - insetTotal, 8)
  const blockStyle: CSSProperties = {
    backgroundColor: `${accentColor}1a`,
    borderLeftColor: accentColor,
    top: top + insetTop,
    height: renderedHeight,
    minHeight: renderedHeight,
    zIndex: 10,
    transform: !isActiveDrag && transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isActiveDrag ? 0 : isDragging ? 0.7 : 1,
    visibility: isActiveDrag ? 'hidden' : 'visible',
    pointerEvents: isActiveDrag ? 'none' : 'auto',
    willChange: 'transform',
  }

  return (
    <motion.div
      ref={setNodeRef}
      id={`schedule-block-${block.id}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isActiveDrag ? 0 : 1, scale: isActiveDrag ? 1 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className={`group absolute left-1 right-1 cursor-grab overflow-hidden rounded-md border border-l-4 border-zinc-300 shadow-sm data-[flash=true]:!ring-2 data-[flash=true]:!ring-[#f2cc0d] data-[flash=true]:!ring-offset-2 ${
        isTiny ? 'px-1.5 py-0' : isCompact ? 'px-2 py-1' : 'p-2'
      }`}
      data-block
      style={blockStyle}
      onClick={handleBlockClick}
      {...attributes}
      {...listeners}
    >
      <div className="flex h-full min-h-0 flex-col overflow-clip">
        <div ref={headerRef} className="relative flex shrink-0 flex-col">
          <div className="flex items-start justify-between">
            <div
              className={`flex min-w-0 gap-1 font-bold uppercase leading-tight ${
                canWrapTitle ? 'items-start' : 'items-center truncate'
              } ${isTiny ? 'text-[10px]' : canWrapTitle ? 'text-sm' : 'text-xs'}`}
            >
              {block.isPrivate && (
                <Lock
                  className={`mt-px ${isTiny ? 'h-2.5 w-2.5 shrink-0' : 'h-3 w-3 shrink-0'}`}
                  aria-label="Private block, hidden from anyone you share your schedule with"
                />
              )}
              <span className={canWrapTitle ? 'line-clamp-2' : 'truncate'}>{block.title}</span>
            </div>
            {/* Desktop: Actions overlay on hover */}
            <div className="absolute right-0 top-0 hidden opacity-0 transition-opacity group-hover:opacity-100 md:flex">
              <div className="flex gap-0.5 rounded-md border border-zinc-200 bg-white shadow-sm">
                <button
                  onClick={handleEditClick}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="flex h-5 w-5 items-center justify-center border-r border-zinc-200 bg-white hover:bg-zinc-50"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={handleDeleteClick}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="flex h-5 w-5 items-center justify-center bg-white text-rose-500 hover:bg-rose-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {block.goal && !isTiny && (
            <div className="mt-0.5 flex shrink-0 items-center gap-0.5 text-xs font-semibold uppercase leading-tight">
              <Target className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{block.goal.title}</span>
            </div>
          )}
        </div>

        {!isCompact && <BlockTasksList tasks={block.tasks} blockHeight={height} headerRef={headerRef} />}
      </div>

      {isUpdating && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-zinc-200 bg-white/80 p-1 shadow-sm">
            <Loading size="sm" className="h-3 w-3" />
          </div>
        </div>
      )}

      <ResizeHandle position="top" block={block} />
      <ResizeHandle position="bottom" block={block} />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Schedule Block"
        description="Are you sure you want to delete this schedule block? This action cannot be undone."
        onConfirm={confirmDelete}
        confirmButtonText="Delete"
        variant="destructive"
      />
    </motion.div>
  )
}

// Memoized: ScheduleGrid re-renders on every drag-move pointer event (to
// update the drag preview), which previously re-rendered every block in
// the schedule on every pointer move. With stable `onEdit`/`onViewDetail`
// callbacks from SchedulePage and structurally-shared `block` data from
// react-query, only the block(s) whose own props actually changed
// (e.g. the one being dragged) re-render now.
export const DraggableBlock = memo(DraggableBlockImpl)

type ResizeHandleProps = {
  position: 'top' | 'bottom'
  block: ScheduleBlock
}

function ResizeHandle({ position, block }: ResizeHandleProps) {
  const handleId = `${block.id}-${position}`
  const type = position === 'top' ? 'resize-start' : 'resize-end'
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: handleId,
    data: { type, block },
  })

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-1 right-1 h-2 cursor-ns-resize border border-zinc-200 bg-white/70 ${
        position === 'top' ? '-top-1' : '-bottom-1'
      } ${isDragging ? 'opacity-80' : 'opacity-0 group-hover:opacity-80'}`}
      {...listeners}
      {...attributes}
      onClick={(event) => event.stopPropagation()}
    />
  )
}
