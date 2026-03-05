export type GarminPingActivity = {
  userId: string;
  callbackURL: string;
};

export type GarminPingPayload = {
  activities?: GarminPingActivity[];
  activityDetails?: GarminPingActivity[];
};

export type GarminActivitySummary = {
  summaryId: string;
  activityId?: number;

  activityType?: string;
  activityName?: string;

  startTimeInSeconds?: number;

  durationInSeconds?: number;
  movingDurationInSeconds?: number;

  distanceInMeters?: number;

  averageSpeedInMetersPerSecond?: number;
  maxSpeedInMetersPerSecond?: number;

  averagePaceInMinutesPerKilometer?: number;

  averageHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;

  activeKilocalories?: number;

  totalElevationGainInMeters?: number;
  totalElevationLossInMeters?: number;

  deviceName?: string;

  manual?: boolean;
  isWebUpload?: boolean;
};

export type GarminActivitiesResponse = {
  activities: GarminActivitySummary[];
};

export type GarminSample = {
  startTimeInSeconds?: number;

  latitudeInDegree?: number;
  longitudeInDegree?: number;

  elevationInMeters?: number;

  heartRate?: number;

  speedMetersPerSecond?: number;

  totalDistanceInMeters?: number;
};

export type GarminActivityDetail = {
  summaryId: string;
  activityId?: number;

  startTimeInSeconds?: number;

  deviceName?: string;

  samples?: GarminSample[];
};

export type GarminActivityDetailsResponse = {
  activityDetails: GarminActivityDetail[];
};
