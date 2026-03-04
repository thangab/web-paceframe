import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    activities: [
      {
        summaryId: '5001968355',
        activityType: 'RUNNING',
        durationInSeconds: 11580,
        distanceInMeters: 5198,
        activeKilocalories: 448,
        deviceName: 'Garmin Fenix 8',
        averagePaceInMinutesPerKilometer: 5.2,
        startTimeInSeconds: Math.floor(Date.now() / 1000) - 3600,
      },
    ],
  });
}
