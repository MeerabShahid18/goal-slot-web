import { NotesPage } from '@/features/notes'

interface NotePageProps {
  params: Promise<{ id: string }>
}

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params

  return (
    <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-24px)]">
      <NotesPage initialNoteId={id} />
    </div>
  )
}
