import { RajneetiEvent } from "../types/rajneeti";

export const RAJNEETI_EVENTS: RajneetiEvent[] = [
  {
    id: "ev1",
    stateCode: "MH",
    stateName: "Maharashtra",
    politicianName: "Arjun Deshmukh",
    partyName: "Congress",
    delta: +4,
    sentiment: "positive",
    avatarColor: "bg-emerald-500",
    score: 2060,
    statusLabel: "poll",
    summary:
      "Campus protests and equity reforms boost Congress visibility in Maharashtra, nudging approval upward in urban constituencies.",
    shareUrl: "/rajneeti/maharashtra/congress/arjun-deshmukh-plus-4",
  },
  {
    id: "ev2",
    stateCode: "UP",
    stateName: "Uttar Pradesh",
    politicianName: "Sanjay Verma",
    partyName: "Govt Bloc",
    delta: -3,
    sentiment: "negative",
    avatarColor: "bg-red-500",
    score: 1980,
    statusLabel: "election board",
    summary:
      "Controversial remarks around university autonomy trigger backlash in UP, slightly eroding support among student voters.",
    shareUrl: "/rajneeti/uttar-pradesh/govt-bloc/sanjay-verma-minus-3",
  },
  {
    id: "ev3",
    stateCode: "DL",
    stateName: "Delhi",
    politicianName: "Neha Kapoor",
    partyName: "Alliance",
    delta: +2,
    sentiment: "positive",
    avatarColor: "bg-sky-500",
    score: 2100,
    statusLabel: "election board",
    summary:
      "Clean governance push and campus outreach add a modest bump to Alliance support across Delhi colleges.",
    shareUrl: "/rajneeti/delhi/alliance/neha-kapoor-plus-2",
  },
  {
    id: "ev4",
    stateCode: "WB",
    stateName: "West Bengal",
    politicianName: "Ritu Ghosh",
    partyName: "Regional Front",
    delta: -1,
    sentiment: "negative",
    avatarColor: "bg-amber-500",
    score: 2025,
    statusLabel: "poll",
    summary:
      "Tension over faculty appointments slightly dents Regional Front numbers in key Kolkata constituencies.",
    shareUrl: "/rajneeti/west-bengal/regional-front/ritu-ghosh-minus-1",
  },
];
