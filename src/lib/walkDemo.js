/** Static frame data for /walk-frames. Not sent to the API. */

export const SAMPLE_WALK_POINTS = [
  { id: 1, lat: 13.7792, lng: 100.5441, recordedAt: "2026-11-14T01:02:00.000Z" },
  { id: 2, lat: 13.7808, lng: 100.5441, recordedAt: "2026-11-14T01:12:00.000Z" },
  { id: 3, lat: 13.7808, lng: 100.5466, recordedAt: "2026-11-14T01:22:00.000Z" },
  { id: 4, lat: 13.7799, lng: 100.5466, recordedAt: "2026-11-14T01:34:00.000Z" },
];

export const SAMPLE_WALK_BOOKING = {
  id: "walk-booking-1",
  transaction_no: "PS-2502",
  service_type: "dog_walking",
  status: "in_service",
  sitter_name: "Ploy Srisuk",
  sitter_id: "sitter-1",
  sitter: { id: "sitter-1", name: "Ploy Srisuk" },
  pet_owner_name: "Bell W.",
  pet_names: "Bobo",
  pets: [{ id: 1, name: "Bobo", breed: "Golden Retriever", pet_type: "Dog" }],
  owner_address: "12 Phahon Yothin 7, Ari",
  start_date: "2026-11-14",
  start_time: "08:00",
  duration: 60,
  duration_unit: "walk",
  additional_message: "Pulls on leash near cats",
  conversation_id: "c1",
  total_price: 750,
  created_at: "2026-11-10T07:20:00.000Z",
};

export const SAMPLE_LIVE_WALK = {
  id: "walk-1",
  status: "live",
  startedAt: "2026-11-14T01:02:00.000Z",
  distanceM: 2400,
  durationS: 1934,
};

export const SAMPLE_ENDED_WALK = {
  id: "walk-1",
  status: "ended",
  startedAt: "2026-11-14T01:02:00.000Z",
  endedAt: "2026-11-14T02:00:00.000Z",
  distanceM: 4100,
  durationS: 3520,
  summary: {
    distanceM: 4100,
    durationS: 3520,
    startedAt: "2026-11-14T01:02:00.000Z",
    endedAt: "2026-11-14T02:00:00.000Z",
    start: { lat: 13.7792, lng: 100.5441 },
    end: { lat: 13.7799, lng: 100.5466 },
  },
};
