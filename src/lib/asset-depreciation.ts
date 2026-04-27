export interface AssetDepreciation {
  monthlyDep: number;
  annualDep: number;
  accumulated: number;
  bookValue: number;
  monthsElapsed: number;
  yearsElapsed: number;
  percentUsed: number;
  isFullyDepreciated: boolean;
}

export function calcDepreciation(
  purchaseCost: number,
  salvageValue: number,
  usefulLifeYears: number,
  purchaseDate: Date,
  asOfDate: Date = new Date()
): AssetDepreciation {
  const depreciableBase = Math.max(0, purchaseCost - salvageValue);
  const annualDep = depreciableBase / usefulLifeYears;
  const monthlyDep = annualDep / 12;

  // Calculate months elapsed
  const monthsElapsed = Math.floor(
    (asOfDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );

  const totalMonths = usefulLifeYears * 12;
  const cappedMonths = Math.min(monthsElapsed, totalMonths);

  const accumulated = monthlyDep * cappedMonths;
  const bookValue = Math.max(salvageValue, purchaseCost - accumulated);
  const isFullyDepreciated = bookValue === salvageValue;
  const percentUsed = (accumulated / depreciableBase) * 100;
  const yearsElapsed = monthsElapsed / 12;

  return {
    monthlyDep,
    annualDep,
    accumulated,
    bookValue,
    monthsElapsed,
    yearsElapsed,
    percentUsed: Math.min(100, percentUsed),
    isFullyDepreciated,
  };
}

export function generateDepreciationSchedule(
  purchaseCost: number,
  salvageValue: number,
  usefulLifeYears: number,
  purchaseDate: Date
): Array<{
  year: number;
  annualDep: number;
  accumulated: number;
  bookValue: number;
}> {
  const schedule = [];
  const depreciableBase = Math.max(0, purchaseCost - salvageValue);
  const annualDep = depreciableBase / usefulLifeYears;

  for (let year = 0; year <= usefulLifeYears; year++) {
    const dateAtEndOfYear = new Date(purchaseDate);
    dateAtEndOfYear.setFullYear(dateAtEndOfYear.getFullYear() + year);

    const accumulated = Math.min(year * annualDep, depreciableBase);
    const bookValue = Math.max(salvageValue, purchaseCost - accumulated);

    schedule.push({
      year,
      annualDep: year === 0 ? 0 : annualDep,
      accumulated,
      bookValue,
    });
  }

  return schedule;
}
