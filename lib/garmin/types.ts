export type GarminPingActivity = {
  userId?: string;
};

export type GarminPingPayload = {
  userId?: string;
  activities?: GarminActivityPayload[];
  activityDetails?: GarminActivityDetailPayload[];
};

export type GarminPingDescriptor = GarminPingActivity & {
  userId?: string;
};

export type GarminActivitySummary = {
  summaryId?: string;
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

export type GarminActivityPayload = GarminActivitySummary & GarminPingDescriptor;

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
  summaryId?: string;
  activityId?: number;

  startTimeInSeconds?: number;

  deviceName?: string;

  samples?: GarminSample[];
};

export type GarminActivityDetailPayload = GarminActivityDetail & GarminPingDescriptor;
