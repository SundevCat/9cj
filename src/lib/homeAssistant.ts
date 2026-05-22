// Home Assistant local REST API client.
// Falls back to a deterministic mock fleet if HASS is unreachable or no
// HASS_TOKEN is configured. Lets the UI work out of the box.

const HASS_URL = process.env.HASS_URL || "http://homeassistant.local:8123";
const HASS_TOKEN = process.env.HASS_TOKEN || "";

export type Device = {
  entityId: string;
  name: string;
  domain: "light" | "switch" | "climate" | "sensor" | "binary_sensor";
  state: string;
  unit?: string;
  attributes?: Record<string, unknown>;
};

export type DeviceFleet = {
  devices: Device[];
  source: "home-assistant" | "mock";
  energyKwhToday: number;
  energyKwhAvg7d: number;
};

const mockState: Record<string, string> = {
  "light.desk":         "on",
  "light.living_room":  "off",
  "light.bedroom":      "off",
  "light.kitchen":      "on",
  "switch.coffee_pot":  "off",
  "switch.air_purifier":"on",
  "climate.ac_office":  "cool",
  "climate.ac_bedroom": "off",
  "sensor.power":       "0.84",
  "sensor.indoor_temp": "26.4",
  "binary_sensor.door": "off",
};

function mockFleet(): DeviceFleet {
  const devices: Device[] = [
    { entityId: "light.desk",          name: "Desk Lamp",      domain: "light",         state: mockState["light.desk"] },
    { entityId: "light.living_room",   name: "Living Room",    domain: "light",         state: mockState["light.living_room"] },
    { entityId: "light.bedroom",       name: "Bedroom",        domain: "light",         state: mockState["light.bedroom"] },
    { entityId: "light.kitchen",       name: "Kitchen",        domain: "light",         state: mockState["light.kitchen"] },
    { entityId: "switch.coffee_pot",   name: "Coffee Pot",     domain: "switch",        state: mockState["switch.coffee_pot"] },
    { entityId: "switch.air_purifier", name: "Air Purifier",   domain: "switch",        state: mockState["switch.air_purifier"] },
    { entityId: "climate.ac_office",   name: "AC · Office",    domain: "climate",       state: mockState["climate.ac_office"] },
    { entityId: "climate.ac_bedroom",  name: "AC · Bedroom",   domain: "climate",       state: mockState["climate.ac_bedroom"] },
    { entityId: "sensor.power",        name: "Power Now",      domain: "sensor",        state: mockState["sensor.power"], unit: "kW" },
    { entityId: "sensor.indoor_temp",  name: "Indoor Temp",    domain: "sensor",        state: mockState["sensor.indoor_temp"], unit: "°C" },
    { entityId: "binary_sensor.door",  name: "Front Door",     domain: "binary_sensor", state: mockState["binary_sensor.door"] },
  ];
  return {
    devices,
    source: "mock",
    energyKwhToday: 8.4 + Math.random() * 1.5,
    energyKwhAvg7d: 10.2,
  };
}

export async function getFleet(): Promise<DeviceFleet> {
  if (!HASS_TOKEN) return mockFleet();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${HASS_URL}/api/states`, {
      headers: { Authorization: `Bearer ${HASS_TOKEN}` },
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`hass ${res.status}`);
    const states = (await res.json()) as Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>;
    const devices: Device[] = states
      .filter((s) => /^(light|switch|climate|sensor|binary_sensor)\./.test(s.entity_id))
      .slice(0, 32)
      .map((s) => {
        const domain = s.entity_id.split(".")[0] as Device["domain"];
        const attrs = s.attributes || {};
        return {
          entityId: s.entity_id,
          name: (attrs.friendly_name as string) || s.entity_id,
          domain,
          state: s.state,
          unit: (attrs.unit_of_measurement as string) || undefined,
          attributes: attrs,
        };
      });
    return {
      devices,
      source: "home-assistant",
      // We don't probe energy by default. Replace with a real sensor lookup if you have one.
      energyKwhToday: 0,
      energyKwhAvg7d: 0,
    };
  } catch {
    return mockFleet();
  }
}

export async function toggleDevice(entityId: string): Promise<{ ok: boolean; state: string; source: "home-assistant" | "mock" }> {
  if (!HASS_TOKEN) {
    const prev = mockState[entityId] ?? "off";
    const next = prev === "on" ? "off" : "on";
    mockState[entityId] = next;
    return { ok: true, state: next, source: "mock" };
  }
  const domain = entityId.split(".")[0];
  const service = domain === "switch" || domain === "light" ? "toggle" : "turn_on";
  try {
    const res = await fetch(`${HASS_URL}/api/services/${domain}/${service}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${HASS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: entityId }),
    });
    if (!res.ok) throw new Error(`hass ${res.status}`);
    return { ok: true, state: "toggled", source: "home-assistant" };
  } catch {
    return { ok: false, state: "error", source: "home-assistant" };
  }
}
