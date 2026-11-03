export interface WeatherRestriction {
  start_time: string;
  end_time: string;
  restricted_speed_kn: number;
}

export interface WeatherCalculationResult {
  total_travel_hours: number;
  arrival_time: string;
  restricted_distance_nm: number;
  normal_distance_nm: number;
}

export function calculateWeatherRestrictedVoyage(
  departureTime: string,
  distanceNm: number,
  normalSpeedKn: number,
  restriction: WeatherRestriction,
): WeatherCalculationResult {
  if (distanceNm <= 0 || normalSpeedKn <= 0) {
    throw new Error("Distance and normal speed must be positive.");
  }

  if (restriction.restricted_speed_kn <= 0) {
    throw new Error("Restricted speed must be positive.");
  }

  const departure = new Date(departureTime).getTime();
  const restrictionStart = new Date(restriction.start_time).getTime();
  const restrictionEnd = new Date(restriction.end_time).getTime();

  if (
    !Number.isFinite(departure) ||
    !Number.isFinite(restrictionStart) ||
    !Number.isFinite(restrictionEnd)
  ) {
    throw new Error("Invalid date supplied.");
  }

  if (restrictionEnd <= restrictionStart) {
    throw new Error("Restriction end must be after its start.");
  }

  let remainingDistance = distanceNm;
  let currentTime = departure;
  let restrictedDistance = 0;
  let normalDistance = 0;

  // Travel normally until the restriction starts.
  if (currentTime < restrictionStart) {
    const availableHours =
      (restrictionStart - currentTime) / 3_600_000;

    const possibleDistance = availableHours * normalSpeedKn;

    const distanceBeforeRestriction = Math.min(
      remainingDistance,
      possibleDistance,
    );

    normalDistance += distanceBeforeRestriction;
    remainingDistance -= distanceBeforeRestriction;

    currentTime +=
      (distanceBeforeRestriction / normalSpeedKn) * 3_600_000;
  }

  // Apply the restricted speed while the restriction is active.
  if (
    remainingDistance > 0 &&
    currentTime >= restrictionStart &&
    currentTime < restrictionEnd
  ) {
    const availableRestrictedHours =
      (restrictionEnd - currentTime) / 3_600_000;

    const possibleRestrictedDistance =
      availableRestrictedHours * restriction.restricted_speed_kn;

    const distanceUnderRestriction = Math.min(
      remainingDistance,
      possibleRestrictedDistance,
    );

    restrictedDistance += distanceUnderRestriction;
    remainingDistance -= distanceUnderRestriction;

    currentTime +=
      (distanceUnderRestriction /
        restriction.restricted_speed_kn) *
      3_600_000;
  }

  // Resume normal speed after the restriction ends.
  if (remainingDistance > 0) {
    if (currentTime < restrictionEnd) {
      currentTime = restrictionEnd;
    }

    normalDistance += remainingDistance;

    currentTime +=
      (remainingDistance / normalSpeedKn) * 3_600_000;
  }

  const arrivalTime = new Date(currentTime).toISOString();

  const totalTravelHours =
    (currentTime - departure) / 3_600_000;

  return {
    total_travel_hours: totalTravelHours,
    arrival_time: arrivalTime,
    restricted_distance_nm: restrictedDistance,
    normal_distance_nm: normalDistance,
  };
}