export interface MatchPushPayload {
  readonly type: "match-played";
  readonly title: string;
  readonly body: string;
  readonly data: {
    readonly eventId: string;
    readonly url: string;
  };
}

export interface PushSubscribeRequest {
  readonly channelId: string;
  readonly authToken: string;
  readonly deviceId: string;
  readonly locale: string;
  readonly subscription: PushSubscriptionJSON;
}

export interface PushUnsubscribeRequest {
  readonly channelId: string;
  readonly authToken: string;
  readonly subscription: PushSubscriptionJSON;
}

export interface PushNotifyMatchRequest {
  readonly channelId: string;
  readonly authToken: string;
  readonly senderDeviceId: string;
  readonly locale: string;
  readonly eventId: string;
  readonly playedAt: string;
  readonly playerAName: string;
  readonly playerBName: string;
  readonly winnerName: string;
}

export interface PushSubscriptionRecord {
  readonly endpoint: string;
  readonly deviceId: string;
  readonly locale: string;
  readonly updatedAt: string;
  readonly subscription: PushSubscriptionJSON;
}

export interface MatchPushEvent {
  readonly channelId: string;
  readonly authToken: string;
  readonly senderDeviceId: string;
  readonly locale: string;
  readonly eventId: string;
  readonly playedAt: string;
  readonly playerAName: string;
  readonly playerBName: string;
  readonly winnerName: string;
}

export interface EnqueueMatchNotificationInput {
  readonly playedAt: string;
  readonly playerAName: string;
  readonly playerBName: string;
  readonly winnerName: string;
}
