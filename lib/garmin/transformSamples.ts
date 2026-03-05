import type { GarminSample, SamplesVisualization, ChartPoint } from './types';

type Point = [number, number];

function encodeSignedNumber(num: number) {
  let sgnNum = num << 1;
  if (num < 0) sgnNum = ~sgnNum;

  let encoded = '';
  while (sgnNum >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63);
    sgnNum >>= 5;
  }
  encoded += String.fromCharCode(sgnNum + 63);
  return encoded;
}

function encodePolyline(points: Point[]) {
  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  for (const [lat, lng] of points) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);

    const dLat = latE5 - lastLat;
    const dLng = lngE5 - lastLng;

    lastLat = latE5;
    lastLng = lngE5;

    result += encodeSignedNumber(dLat);
    result += encodeSignedNumber(dLng);
  }

  return result;
}

function perpendicularDistance(
  point: Point,
  lineStart: Point,
  lineEnd: Point,
): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);

  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.hypot(x - projX, y - projY);
}

// tolerance ~ 0.0001 ≈ ~11m (à Paris)
function simplifyPolyline(points: Point[], tolerance = 0.0001): Point[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(
      points[i],
      points[0],
      points[points.length - 1],
    );
    if (dist > maxDistance) {
      index = i;
      maxDistance = dist;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyPolyline(points.slice(0, index + 1), tolerance);
    const right = simplifyPolyline(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[points.length - 1]];
}

function speedToPaceMinPerKm(speedMps?: number): number | null {
  if (!speedMps || speedMps <= 0) return null;
  return 1000 / speedMps / 60;
}

export function buildVisualizationFromSamples(
  samples: GarminSample[],
): SamplesVisualization {
  const gps: Point[] = [];
  const hrSeries: ChartPoint[] = [];
  const paceSeries: ChartPoint[] = [];

  for (const s of samples) {
    const t = s.startTimeInSeconds;
    if (typeof t !== 'number') continue;

    if (
      typeof s.latitudeInDegree === 'number' &&
      typeof s.longitudeInDegree === 'number'
    ) {
      gps.push([s.latitudeInDegree, s.longitudeInDegree]);
    }

    if (typeof s.heartRate === 'number') {
      hrSeries.push({ x: t, y: s.heartRate });
    }

    if (typeof s.speedMetersPerSecond === 'number') {
      const pace = speedToPaceMinPerKm(s.speedMetersPerSecond);
      if (pace !== null) paceSeries.push({ x: t, y: pace });
    }
  }

  const gpsPointsCount = gps.length;
  const samplesCount = samples.length;

  const simplified = gps.length > 2 ? simplifyPolyline(gps, 0.0001) : gps;
  const summaryPolyline = simplified.length ? encodePolyline(simplified) : null;

  return {
    summaryPolyline,
    hrSeries,
    paceSeries,
    gpsPointsCount,
    samplesCount,
  };
}

// Pour ne pas stocker les samples bruts dans raw_json
export function stripSamplesFromDetail<T extends { samples?: unknown }>(
  detail: T,
): Omit<T, 'samples'> {
  const clone = { ...(detail as Record<string, unknown>) };
  delete clone.samples;
  return clone as Omit<T, 'samples'>;
}
