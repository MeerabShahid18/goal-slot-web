'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'

import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import {
  AlertCircle,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Table,
  Type,
} from 'lucide-react'
import tippy, { Instance as TippyInstance } from 'tippy.js'

import { cn } from '@/lib/utils'

interface CommandItem {
  title: string
  description: string
  icon: React.ReactNode
  command: (props: { editor: any; range: any }) => void
}

const commands: CommandItem[] = [
  {
    title: 'Text',
    description: 'Just start writing with plain text.',
    icon: <Type className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run()
    },
  },
  {
    title: 'Heading 1',
    description: 'Big section heading.',
    icon: <Heading1 className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    icon: <Heading2 className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    icon: <Heading3 className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bulleted list.',
    icon: <List className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).clearIndent().toggleBulletList().run()
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a list with numbering.',
    icon: <ListOrdered className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).clearIndent().toggleOrderedList().run()
    },
  },
  {
    title: 'To-do List',
    description: 'Track tasks with a to-do list.',
    icon: <CheckSquare className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).clearIndent().toggleTaskList().run()
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote.',
    icon: <Quote className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
  },
  {
    title: 'Code Block',
    description: 'Capture a code snippet.',
    icon: <Code className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
  },
  {
    title: 'Divider',
    description: 'Visually divide blocks.',
    icon: <Minus className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
  },
  {
    title: 'Callout',
    description: 'Make writing stand out.',
    icon: <AlertCircle className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
  },
  {
    title: 'Image',
    description: 'Upload or embed an image.',
    icon: <ImageIcon className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      // Trigger file upload
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const result = e.target?.result
            if (typeof result === 'string') {
              editor
                .chain()
                .focus()
                .insertContent({ type: 'image', attrs: { src: result } })
                .run()
            }
          }
          reader.readAsDataURL(file)
        }
      }
      input.click()
    },
  },
  {
    title: 'Table',
    description: 'Add a table to organize data.',
    icon: <Table className="h-5 w-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      // Insert table after clearing the range
      setTimeout(() => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      }, 0)
    },
  },
]

interface CommandListProps {
  items: CommandItem[]
  command: (item: CommandItem) => void
}

interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index]
      if (item) {
        command(item)
      }
    },
    [items, command],
  )

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
        return true
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % items.length)
        return true
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }

      return false
    },
  }))

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  if (items.length === 0) {
    return <div className="slash-menu-empty">No results</div>
  }

  return (
    <div className="slash-menu">
      {items.map((item, index) => (
        <button
          type="button"
          key={item.title}
          onClick={() => selectItem(index)}
          className={cn('slash-menu-item', index === selectedIndex && 'is-selected')}
        >
          <div className="slash-menu-icon">{item.icon}</div>
          <div className="slash-menu-content">
            <div className="slash-menu-title">{item.title}</div>
            <div className="slash-menu-description">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  )
})

CommandList.displayName = 'CommandList'

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range })
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return commands.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
        },
        render: () => {
          let component: ReactRenderer<CommandListRef> | null = null
          let popup: TippyInstance[] | null = null

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
              })

              if (!props.clientRect) return

              // Opened from inside a Radix Dialog (create-task-modal.tsx,
              // goal-modal.tsx), this menu has to render as an actual DOM
              // DESCENDANT of the dialog's own content, not a sibling
              // appended to document.body. Two independent, confirmed bugs
              // both trace back to that one difference:
              //
              //   1. POINTER EVENTS. Radix's Dialog sets `pointer-events:
              //      none` on <body> itself while open, and explicitly
              //      overrides it back to `auto` only on its own content
              //      element (`[role="dialog"]`) so that stays clickable.
              //      A popup appended to body inherits body's `none` and
              //      the whole card of the menu becomes non-interactive to
              //      the mouse — not just unscrollable, unclickable too
              //      (arrow-key selection still worked, which is why this
              //      wasn't a total outage). Confirmed live: a
              //      document.body-appended element's computed
              //      pointer-events was "none" while a dialog was open.
              //
              //   2. SCROLL LOCK. @radix-ui/react-dialog wraps its overlay
              //      in react-remove-scroll, which installs a
              //      CAPTURE-phase wheel/touchmove listener on `document`
              //      that calls preventDefault() for any event whose
              //      target isn't inside its `shards` allowlist (the
              //      dialog's own content ref). Capture fires before the
              //      event ever reaches a bubble-phase handler anywhere
              //      inside the popup, so no listener attached to the
              //      popup itself — however it stops propagation — can
              //      intercept it in time; confirmed live by dispatching a
              //      wheel event directly on the menu and observing
              //      defaultPrevented stay true even with a bubble-phase
              //      stopPropagation listener on the popup root already in
              //      place. Rendering inside the shard is the only fix
              //      that works WITH react-remove-scroll's own extension
              //      point instead of racing its capture-phase listener.
              //
              // Falls back to document.body for every non-dialog usage
              // (the public note page, journal, the full Notes editor),
              // where neither issue applies.
              const editorDom = props.editor?.view?.dom as HTMLElement | undefined
              const dialogEl = editorDom?.closest('[role="dialog"]') as HTMLElement | null
              const appendTarget = dialogEl ?? document.body

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => appendTarget,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                // Keeps the menu from being clipped by the dialog's own
                // overflow-y-auto when there isn't enough room below the
                // caret inside it — flips above / shifts within the
                // dialog's bounds instead of the viewport's, since that's
                // now its actual containing element.
                popperOptions: dialogEl
                  ? { modifiers: [{ name: 'preventOverflow', options: { boundary: dialogEl } }] }
                  : undefined,
              })
            },

            onUpdate(props: any) {
              component?.updateProps(props)

              if (!props.clientRect) return

              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect,
              })
            },

            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide()
                return true
              }

              return component?.ref?.onKeyDown(props) ?? false
            },

            onExit() {
              popup?.[0]?.destroy()
              component?.destroy()
            },
          }
        },
      }),
    ]
  },
})

export default SlashCommands
