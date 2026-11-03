export interface PortWindow {
  opens_at: string;
  closes_at: string;
}

export interface PortArrivalResult {
  physical_eta: string;
  permitted_arrival: string;
  waiting_hours: number;
}

export function calculatePortArrival(
  physicalEta: string,
  window: PortWindow,
): PortArrivalResult {
  const eta = new Date(physicalEta);

  if (Number.isNaN(eta.getTime())) {
    throw new Error("Invalid physical ETA.");
  }

  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

  const openingMatch = window.opens_at.match(timePattern);
  const closingMatch = window.closes_at.match(timePattern);

  if (!openingMatch || !closingMatch) {
    throw new Error("Invalid port receiving window.");
  }

  const openingMinutes =
    Number(openingMatch[1]) * 60 + Number(openingMatch[2]);

  const closingMinutes =
    Number(closingMatch[1]) * 60 + Number(closingMatch[2]);

  if (openingMinutes > closingMinutes) {
    throw new Error("Overnight port windows are not supported.");
  }

  const etaMinutes = eta.getUTCHours() * 60 + eta.getUTCMinutes();

  let permittedArrival = new Date(eta);

  if (etaMinutes < openingMinutes) {
    permittedArrival.setUTCHours(
      Math.floor(openingMinutes / 60),
      openingMinutes % 60,
      0,
      0,
    );
  } else if (etaMinutes > closingMinutes) {
    permittedArrival.setUTCDate(permittedArrival.getUTCDate() + 1);

    permittedArrival.setUTCHours(
      Math.floor(openingMinutes / 60),
      openingMinutes % 60,
      0,
      0,
    );
  }

  const waitingHours =
    (permittedArrival.getTime() - eta.getTime()) / 3_600_000;

  return {
    physical_eta: eta.toISOString(),
    permitted_arrival: permittedArrival.toISOString(),
    waiting_hours: waitingHours,
  };
}