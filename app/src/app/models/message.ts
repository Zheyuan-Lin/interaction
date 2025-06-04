export class Message {
  interactionAt: number;
  interactionDuration: number;
  appType: string;
  appLevel: string;
  appMode: string;
  chartType: string;
  interactionType: string;
  participantId: string;
  data: object;
  group: string;
}

export class Insight {
  text: string;
  timestamp: string;
  group: string;
  participantId: string;
}