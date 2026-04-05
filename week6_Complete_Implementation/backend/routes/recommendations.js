const axios = require("axios");
const router = require("express").Router();

const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS_METERS =
  Number(process.env.RECOMMENDATION_RADIUS_METERS) || 15000;
const OVERPASS_TIMEOUT_MS =
  Number(process.env.OVERPASS_TIMEOUT_MS) || 15000;

// ─── Utilities ───────────────────────────────

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const roundTo = (value, decimals = 2) =>
  Number(Number(value).toFixed(decimals));

// ─── Mock Fallback ───────────────────────────

const getMockSpecialists = (latitude, longitude) => {
  const mock = [
    {
      id: "mock-1",
      name: "City Neurology & Memory Center",
      category: "hospital",
      address: "12 Health Avenue",
      phone: "+1 555-0101",
      website: "https://example.org/city-neurology",
      latitude: latitude + 0.018,
      longitude: longitude + 0.012,
    },
    {
      id: "mock-2",
      name: "SilverAge Geriatric Psychiatry Clinic",
      category: "clinic",
      address: "245 Senior Care Road",
      phone: "+1 555-0122",
      website: "https://example.org/silverage",
      latitude: latitude - 0.021,
      longitude: longitude + 0.01,
    },
    {
      id: "mock-3",
      name: "Hope Dementia Care Facility",
      category: "hospital",
      address: "78 Wellness Street",
      phone: "+1 555-0145",
      website: "https://example.org/hope-dementia-care",
      latitude: latitude + 0.008,
      longitude: longitude - 0.02,
    },
  ];

  return mock
    .map((item) => {
      const distanceKm = calculateDistanceKm(
        latitude,
        longitude,
        item.latitude,
        item.longitude,
      );

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        address: item.address,
        distanceKm: roundTo(distanceKm, 2),
        location: {
          latitude: item.latitude,
          longitude: item.longitude,
        },
        contact: {
          phone: item.phone,
          website: item.website,
          mapsUrl: null,
        },
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
};

// ─── Overpass API ────────────────────────────

const buildOverpassQuery = (latitude, longitude, radius) =>
  [
    `[out:json][timeout:12];`,
    `(`,
    `  node["amenity"="hospital"](around:${radius},${latitude},${longitude});`,
    `  node["amenity"="clinic"](around:${radius},${latitude},${longitude});`,
    `  node["amenity"="doctors"](around:${radius},${latitude},${longitude});`,
    `  node["healthcare"="doctor"](around:${radius},${latitude},${longitude});`,
    `  node["healthcare:speciality"="neurology"](around:${radius},${latitude},${longitude});`,
    `);`,
    `out center 15;`,
  ].join("");

const buildAddressString = (tags) => {
  if (!tags) return "Address unavailable";

  // Try the full formatted address first
  if (tags["addr:full"]) return tags["addr:full"];

  // Build from components
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Address unavailable";
};

const resolveCategory = (tags) => {
  if (!tags) return "medical";

  // Prioritise neurology tagging
  const speciality = tags["healthcare:speciality"] || "";
  if (speciality.toLowerCase().includes("neurology")) return "neurologist";

  if (tags.amenity === "doctors" || tags.healthcare === "doctor") return "doctor";
  if (tags.amenity === "clinic") return "clinic";
  if (tags.amenity === "hospital") return "hospital";

  return "medical";
};

const buildOsmMapsUrl = (lat, lon) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

const mapOverpassElement = (element, userLat, userLon) => {
  const tags = element.tags || {};
  const elLat = element.lat;
  const elLon = element.lon;

  const distanceKm =
    typeof elLat === "number" && typeof elLon === "number"
      ? roundTo(calculateDistanceKm(userLat, userLon, elLat, elLon), 2)
      : null;

  return {
    id: `osm-${element.id}`,
    name: tags.name || "Unnamed Facility",
    category: resolveCategory(tags),
    address: buildAddressString(tags),
    distanceKm,
    location:
      typeof elLat === "number" && typeof elLon === "number"
        ? { latitude: elLat, longitude: elLon }
        : null,
    contact: {
      phone: tags.phone || tags["contact:phone"] || "Not available",
      website: tags.website || tags["contact:website"] || null,
      mapsUrl:
        typeof elLat === "number" && typeof elLon === "number"
          ? buildOsmMapsUrl(elLat, elLon)
          : null,
    },
  };
};

// ─── Route ───────────────────────────────────

router.get("/specialists", async (req, res) => {
  const latitude = toNumber(req.query.latitude ?? req.query.lat);
  const longitude = toNumber(req.query.longitude ?? req.query.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({
      message: "latitude and longitude query parameters are required numbers.",
    });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({
      message: "latitude or longitude is out of valid range.",
    });
  }

  const basePayload = {
    query: {
      latitude,
      longitude,
      radiusMeters: SEARCH_RADIUS_METERS,
    },
  };

  try {
    const overpassQuery = buildOverpassQuery(
      latitude,
      longitude,
      SEARCH_RADIUS_METERS,
    );

    const response = await axios.post(
      OVERPASS_API_URL,
      `data=${encodeURIComponent(overpassQuery)}`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: OVERPASS_TIMEOUT_MS,
      },
    );

    const elements = response.data?.elements || [];

    if (elements.length === 0) {
      const specialists = getMockSpecialists(latitude, longitude);
      return res.json({
        ...basePayload,
        source: "mock",
        total: specialists.length,
        specialists,
        note: "No hospitals or clinics found nearby via OpenStreetMap. Returning mock recommendations.",
      });
    }

    const specialists = elements
      .map((el) => mapOverpassElement(el, latitude, longitude))
      .filter((s) => s.name !== "Unnamed Facility" || s.address !== "Address unavailable")
      .sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });

    return res.json({
      ...basePayload,
      source: "openstreetmap",
      total: specialists.length,
      specialists,
    });
  } catch (error) {
    console.error("Overpass API error details:");
    console.error(error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else if (error.request) {
      console.error("No response received from Overpass API.");
    }
    console.error("Falling back to mock data...");

    const specialists = getMockSpecialists(latitude, longitude);
    return res.json({
      ...basePayload,
      source: "mock",
      total: specialists.length,
      specialists,
      note: "OpenStreetMap lookup failed or timed out. Returning mock recommendations.",
    });
  }
});

module.exports = router;
