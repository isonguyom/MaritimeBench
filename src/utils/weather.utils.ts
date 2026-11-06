export interface WeatherRestriction {
  start_time: string;
  end_time: string;
  restricted_speed_kn: number;
}

export interface WeatherVoyageLeg {
  distance_nm: number;
  speed_kn: number;
}

export interface WeatherCalculationResult {
  total_travel_hours: number;
  arrival_time: string;
  restricted_distance_nm: number;
  normal_distance_nm: number;
}

const MILLISECONDS_PER_HOUR = 3_600_000;

export function calculateWeatherRestrictedVoyage(
  departureTime: string,
  legs: WeatherVoyageLeg[],
  restrictions: WeatherRestriction[],
): WeatherCalculationResult {
  const departure = Date.parse(departureTime);

  if (!Number.isFinite(departure)) {
    throw new Error("Invalid departure time.");
  }

  if (!Array.isArray(legs) || legs.length === 0) {
    throw new Error("At least one voyage leg is required.");
  }

  if (!Array.isArray(restrictions)) {
    throw new Error("Weather restrictions must be an array.");
  }

  for (const leg of legs) {
    if (
      !Number.isFinite(leg.distance_nm) ||
      leg.distance_nm <= 0 ||
      !Number.isFinite(leg.speed_kn) ||
      leg.speed_kn <= 0
    ) {
      throw new Error("Leg distance and speed must be positive and finite.");
    }
  }

  const parsedRestrictions = restrictions.map((restriction) => {
    const start = Date.parse(restriction.start_time);
    const end = Date.parse(restriction.end_time);

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      !Number.isFinite(restriction.restricted_speed_kn)
    ) {
      throw new Error("Invalid weather restriction supplied.");
    }

    if (end <= start) {
      throw new Error("Restriction end must be after its start.");
    }

    if (restriction.restricted_speed_kn <= 0) {
      throw new Error("Restricted speed must be positive.");
    }

    return {
      start,
      end,
      speed: restriction.restricted_speed_kn,
    };
  });

  let currentTime = departure;
  let restrictedDistance = 0;
  let normalDistance = 0;

  for (const leg of legs) {
    let remainingDistance = leg.distance_nm;

    while (remainingDistance > 0) {
      const activeRestrictions = parsedRestrictions.filter(
        (restriction) =>
          currentTime >= restriction.start && currentTime < restriction.end,
      );

      const effectiveSpeed = Math.min(
        leg.speed_kn,
        ...activeRestrictions.map((restriction) => restriction.speed),
      );

      const isRestricted = effectiveSpeed < leg.speed_kn;

      const nextBoundary = parsedRestrictions
        .flatMap((restriction) => [restriction.start, restriction.end])
        .filter((boundary) => boundary > currentTime)
        .reduce((next, boundary) => Math.min(next, boundary), Infinity);

      const hoursNeeded = remainingDistance / effectiveSpeed;

      const hoursUntilBoundary =
        (nextBoundary - currentTime) / MILLISECONDS_PER_HOUR;

      if (!Number.isFinite(nextBoundary) || hoursNeeded <= hoursUntilBoundary) {
        if (
          Number.isFinite(nextBoundary) &&
          Math.abs(hoursNeeded - hoursUntilBoundary) < 1e-9
        ) {
          currentTime = nextBoundary;
        } else {
          currentTime += hoursNeeded * MILLISECONDS_PER_HOUR;
        }

        if (isRestricted) {
          restrictedDistance += remainingDistance;
        } else {
          normalDistance += remainingDistance;
        }

        remainingDistance = 0;
      } else {
        const distanceUntilBoundary = hoursUntilBoundary * effectiveSpeed;

        if (isRestricted) {
          restrictedDistance += distanceUntilBoundary;
        } else {
          normalDistance += distanceUntilBoundary;
        }

        remainingDistance -= distanceUntilBoundary;
        currentTime = nextBoundary;
      }
    }
  }

  return {
    total_travel_hours: (currentTime - departure) / MILLISECONDS_PER_HOUR,
    arrival_time: new Date(currentTime).toISOString(),
    restricted_distance_nm: restrictedDistance,
    normal_distance_nm: normalDistance,
  };
}
