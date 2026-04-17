export interface MIAWConfig {
  orgId: string
  esDeveloperName: string
  messagingUrl: string // e.g. https://example.my.salesforce-scrt.com
}

export interface AccessTokenResponse {
  accessToken: string
  lastEventId: string
  context?: {
    configuration?: {
      embeddedServiceConfig?: DeploymentConfig
    }
  }
}

export interface DeploymentConfig {
  prechatBackgroundImgFlatUrl?: string
  prechatFields?: PreChatField[]
  displayToAll?: boolean
}

export interface PreChatField {
  label: string
  name: string
  fieldType: string
  isRequired: boolean
  isHidden: boolean
  value?: string
}

export interface ConversationEntry {
  conversationId: string
  channelPlatformKey?: string
  conversationEntry: {
    senderDisplayName: string
    identifier: string
    entryType: EntryType
    entryPayload: string // JSON string
    sender: {
      role: SenderRole
      appType: string
      subject: string
      clientIdentifier?: string
    }
    transcriptedTimestamp: number
    clientTimestamp: number
  }
}

export type SenderRole = 'EndUser' | 'Agent' | 'Chatbot' | 'System' | 'Router' | 'Supervisor'

export type EntryType =
  | 'Message'
  | 'ParticipantChanged'
  | 'RoutingResult'
  | 'TypingStartedIndicator'
  | 'TypingStoppedIndicator'
  | 'DeliveryAcknowledgement'
  | 'ReadAcknowledgement'
  | 'CloseConversation'
  | 'SessionStatusChanged'

export interface ParsedMessage {
  id: string
  conversationId: string
  text: string
  senderRole: SenderRole
  senderName: string
  timestamp: number
  isSent: boolean
  isDelivered: boolean
  isRead: boolean
}

export interface SessionStatusChange {
  status?: string
  sessionStatus?: string
  messagingSessionStatus?: string
}

export interface SSEEventHandlers {
  onMessage: (entry: ConversationEntry) => void
  onTypingStarted: (entry: ConversationEntry) => void
  onTypingStopped: (entry: ConversationEntry) => void
  onDelivery: (entry: ConversationEntry) => void
  onRead: (entry: ConversationEntry) => void
  onParticipantChanged: (entry: ConversationEntry) => void
  onRoutingResult: (entry: ConversationEntry) => void
  onSessionStatusChanged: (entry: ConversationEntry) => void
  onConversationClosed: (entry: ConversationEntry) => void
  onError?: (err: Error) => void
}
