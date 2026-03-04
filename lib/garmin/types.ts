export type GarminPingActivity = {
  userId?: string;
  callbackURL?: string;
};

export type GarminPingPayload = {
  activities?: GarminPingActivity[];
};

export type GarminSummaryActivity = {
  summaryId?: string | number;
  activityId?: string | number;
  activityUUID?: string;
  uuid?: string;
  activityType?: string;
  distanceInMeters?: number;
  durationInSeconds?: number;
  averagePaceInMinutesPerKilometer?: number;
  deviceName?: string;
  startTimeInSeconds?: number;
  startTimeInMilliseconds?: number;
  [key: string]: unknown;
};

export type GarminCallbackPayload = {
  activities?: GarminSummaryActivity[];
  activityDetails?: GarminSummaryActivity[];
  activityFiles?: GarminSummaryActivity[];
  moveIQActivities?: GarminSummaryActivity[];
};

export type NormalizedActivity = {
  user_id: string;
  provider: "garmin";
  provider_activity_id: string;
  activity_type: string | null;
  distance: number | null;
  duration: number | null;
  pace: number | null;
  device_name: string | null;
  start_time: string | null;
  raw_json: GarminSummaryActivity;
};
