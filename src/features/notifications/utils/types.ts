export type NotificationType =
  | 'FEEDBACK_REPLY'
  | 'SHARED_REPORT_UNVIEWED'
  | 'INSTRUCTION_ASSIGNED'
  | 'MESSAGE_RECEIVED'
  | 'APP_RELEASE'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body?: string | null
  data?: any
  readAt?: string | null
  createdAt: string
}

export interface NotificationListResponse {
  items: AppNotification[]
  nextCursor?: string
  hasMore: boolean
  unreadCount: number
}
