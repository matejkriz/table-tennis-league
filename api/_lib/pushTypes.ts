export interface PushSubscriptionShape {
  readonly endpoint: string;
  readonly expirationTime?: number | null;
  readonly keys?: {
    readonly p256dh?: string;
    readonly auth?: string;
  };
}

export interface PushSubscriptionRecord {
  readonly endpoint: string;
  readonly deviceId: string;
  readonly locale: string;
  readonly updatedAt: string;
  readonly subscription: PushSubscriptionShape;
}

export interface PushSubscribeRequest {
  readonly channelId: string;
  readonly authToken: string;
  readonly deviceId: string;
  readonly locale: string;
  readonly subscription: PushSubscriptionShape;
}

export interface PushUnsubscribeRequest {
  readonly channelId: string;
  readonly authToken: string;
  readonly subscription: PushSubscriptionShape;
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

export interface MatchPushPayload {
  readonly type: "match-played";
  readonly title: string;
  readonly body: string;
  readonly data: {
    readonly eventId: string;
    readonly url: string;
  };
}
