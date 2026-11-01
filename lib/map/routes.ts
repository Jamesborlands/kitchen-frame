export const HOUSE: [number, number] = [52.369, -2.7165];
export interface PremadeRoute { name: string; profile: string; waypoints: [number, number][]; drive?: boolean } // [lat,lng]
export const PREMADE_ROUTES: PremadeRoute[] = [
  { name: "Ludlow town circular", profile: "trekking", waypoints: [HOUSE, [52.3740,-2.7230],[52.3660,-2.7240],[52.3628,-2.7167], HOUSE] },
  { name: "Whitcliffe Common loop", profile: "hiking-mountain", waypoints: [HOUSE, [52.3640,-2.7262], HOUSE] },
  { name: "Teme riverside & Ludford Bridge", profile: "hiking-mountain", waypoints: [HOUSE, [52.3655,-2.7240],[52.3628,-2.7167]] },
  { name: "Mortimer Forest (off-road)", profile: "mtb", waypoints: [[52.3615,-2.7480],[52.3545,-2.7800]], drive: true },
  { name: "Titterstone Clee Hill", profile: "hiking-mountain", waypoints: [[52.3925,-2.6010],[52.3985,-2.5925]], drive: true },
  { name: "Long Mynd: Carding Mill Valley", profile: "hiking-mountain", waypoints: [[52.5425,-2.8155],[52.5480,-2.8560]], drive: true },
  { name: "Clee Hill climb", profile: "trekking", waypoints: [HOUSE, [52.3790,-2.6560],[52.3800,-2.6150]] },
  { name: "Hopton Titterhill MTB", profile: "mtb", waypoints: [[52.3965,-2.9330],[52.4050,-2.9480]], drive: true },
  { name: "Corve Dale lanes", profile: "gravel", waypoints: [[52.3900,-2.7080],[52.4400,-2.6900],[52.4790,-2.6850]], drive: true },
  { name: "Teme valley to Tenbury Wells", profile: "trekking", waypoints: [HOUSE, [52.3300,-2.6600],[52.3110,-2.5960]] },
];
