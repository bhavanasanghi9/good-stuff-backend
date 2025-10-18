
import fetch from "node-fetch";

export type Daily = { date: string; tmin: number; tmax: number; pop?: number };

export async function get7Day(lat: number, lon: number): Promise<Daily[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  const res = await fetch(url);
  const json = await res.json();
  const dates: string[] = json.daily?.time || [];
  const tmax: number[] = json.daily?.temperature_2m_max || [];
  const tmin: number[] = json.daily?.temperature_2m_min || [];
  const pop: number[] = json.daily?.precipitation_probability_max || [];
  return dates.map((d, i) => ({ date: d, tmax: tmax[i], tmin: tmin[i], pop: pop[i] }))
}

export function suggestBestDay(days: Daily[]) {
  const score = (d: Daily) => {
    const mid = (d.tmax + d.tmin) / 2;
    const tempIdeal = 1 - Math.min(1, Math.abs(mid - 22) / 12);
    const rainPenalty = (typeof d.pop === 'number' ? d.pop / 100 : 0) * 0.8;
    return Math.max(0, tempIdeal - rainPenalty);
  };
  let best = days[0];
  let bestScore = -1;
  for (const d of days) {
    const s = score(d);
    if (s > bestScore) { best = d; bestScore = s; }
  }
  const indoorRecommended = best.tmax < 7 || (typeof best.pop === 'number' && best.pop >= 50);
  return { best, score: bestScore, indoorRecommended };
}
