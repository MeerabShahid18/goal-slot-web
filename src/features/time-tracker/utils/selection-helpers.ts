import { Goal, Task } from '@/features/time-tracker/utils/types'

export const getCategoryFromGoal = (goalId: string | undefined | null, goals: Goal[]) => {
  if (!goalId) return ''
  return goals.find((goal) => goal.id === goalId)?.category || ''
}

// NOTE: there is deliberately no category -> goal helper here. Deriving a goal
// from a category picks whichever goal happens to be first, and narrowing the
// goal list by category hides goals from search entirely. Attribution flows one
// way only: goal -> category.

export const getTaskByGoalOrCategory = (
  tasks: Task[],
  goalId?: string,
  category?: string,
): Task | undefined => {
  if (goalId) {
    const byGoal = tasks.find((task) => task.goalId === goalId)
    if (byGoal) return byGoal
  }
  if (category) {
    return tasks.find((task) => task.category === category)
  }
  return undefined
}

export const sortTasksBySelection = (tasks: Task[], goalId?: string, category?: string) => {
  if (!goalId && !category) return tasks

  return tasks
    .map((task, index) => {
      let rank = 2
      if (goalId) {
        if (task.goalId === goalId) {
          rank = 0
        } else if (category && task.category === category) {
          rank = 1
        }
      } else if (category) {
        if (task.category === category) {
          rank = 0
        } else {
          rank = 1
        }
      }

      return { task, index, rank }
    })
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.index - b.index))
    .map(({ task }) => task)
}
