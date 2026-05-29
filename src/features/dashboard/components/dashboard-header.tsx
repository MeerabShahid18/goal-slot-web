'use client'

import Link from 'next/link'

import { format } from 'date-fns'
import { Clock, Plus } from 'lucide-react'

import { CategoriesButton } from '@/features/categories/components/categories-button'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'

export function DashboardHeader() {
  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase sm:text-3xl md:text-4xl">Dashboard</h1>
        <p className="font-mono text-sm uppercase text-gray-600 sm:text-base">{today}</p>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-4">
        <Link href="/dashboard/settings?tab=categories" className="btn-brutal-secondary flex items-center gap-2">
          <Tag className="h-5 w-5" />
          <span className="hidden sm:inline">Categories</span>
        </Link>
        <Link href="/dashboard/time-tracker" className="btn-brutal-secondary flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <span className="hidden sm:inline">Log Time</span>
        </Link>
        <Link href="/dashboard/goals?open=create" className="btn-brutal flex items-center gap-2">
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">New Goal</span>
        </Link>
      </div>
    </div>
    <PageHeader
      eyebrow="Today"
      title="Dashboard"
      description={today}
      actions={
        <>
          <CategoriesButton />
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/time-tracker">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Log Time</span>
            </Link>
          </Button>
          <Button asChild variant="brand" size="sm">

            <Link href="/dashboard/goals?open=create">

              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Goal</span>
            </Link>
          </Button>
        </>
      }
    />

  )
}
