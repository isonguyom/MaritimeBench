export function addHoursToDate(date: string, hours: number): string {
  const timestamp = new Date(date).getTime();

  const updatedTimestamp = timestamp + hours * 60 * 60 * 1000;

  return new Date(updatedTimestamp).toISOString();
}

export function calculateTravelHours(
  distanceNm: number,
  speedKn: number,
): number {
  if (distanceNm <= 0) {
    throw new Error("Distance must be greater than zero.");
  }

  if (speedKn <= 0) {
    throw new Error("Speed must be greater than zero.");
  }

  return distanceNm / speedKn;
}
