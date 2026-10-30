/** Static frame fixtures for development screenshots. Not sent to the API. */

export const PREVIEW_ACCESS = {
  validFrom: "2026-11-12T03:00:00.000Z",
  validTo: "2026-11-15T05:00:00.000Z",
  now: "2026-10-30T14:41:00.000Z",
  canView: true,
};

export const PREVIEW_LIVE_CAMERAS = [
  { id: "cam-1", name: "Cam 1 · Play room", status: "online", isEnabled: true },
  { id: "cam-2", name: "Cam 2 · Garden", status: "online", isEnabled: true },
  { id: "cam-3", name: "Cam 3 · Bedroom", status: "online", isEnabled: true },
];

export const PREVIEW_OFFLINE_CAMERAS = [
  { id: "cam-1", name: "Cam 1 · Play room", status: "offline", isEnabled: false },
  { id: "cam-2", name: "Cam 2 · Garden", status: "online", isEnabled: true },
  { id: "cam-3", name: "Cam 3 · Bedroom", status: "reconnecting", isEnabled: true },
];

export const PREVIEW_SITTER_CAMERAS = [
  { id: "cam-1", name: "Cam 1 · Play room", status: "online", isEnabled: true },
  { id: "cam-2", name: "Cam 2 · Garden", status: "online", isEnabled: true },
  { id: "cam-3", name: "Cam 3 · Bedroom", status: "offline", isEnabled: false },
];

export const PREVIEW_BOARDING = {
  id: "booking-2481",
  transaction_no: "PS-2481",
  status: "in_service",
  service_type: "boarding",
  sitter_name: "Ploy S.",
  sitter: { name: "Ploy S." },
  pet_names: "Bobo",
  start_date: "2026-11-12",
  start_time: "10:00",
  end_date: "2026-11-15",
  end_time: "12:00",
  created_at: "2026-11-10T07:20:00.000Z",
  total_price: 1445,
  has_cctv: true,
};
