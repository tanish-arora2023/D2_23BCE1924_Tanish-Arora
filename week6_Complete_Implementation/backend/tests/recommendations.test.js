const express = require("express");
const request = require("supertest");

const ENDPOINT = "/api/recommendations/specialists";

const buildApp = (router) => {
  const app = express();
  app.use("/api/recommendations", router);
  return app;
};

const loadRecommendationsRouter = () => require("../routes/recommendations");

describe("GET /api/recommendations/specialists", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it("returns 400 when latitude and longitude are missing", async () => {
    const router = loadRecommendationsRouter();
    const app = buildApp(router);

    const response = await request(app).get(ENDPOINT);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/latitude/i);
  });

  it("returns 400 when coordinates are out of range", async () => {
    const router = loadRecommendationsRouter();
    const app = buildApp(router);

    const response = await request(app)
      .get(ENDPOINT)
      .query({ latitude: 999, longitude: 79.8612 });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/out of valid range/i);
  });

  it("returns specialists from Overpass API on success", async () => {
    const mockOverpassResponse = {
      elements: [
        {
          id: 12345,
          lat: 6.928,
          lon: 79.862,
          tags: {
            name: "Test Hospital",
            amenity: "hospital",
            phone: "+94 11 234 5678",
            website: "https://testhospital.example.com",
            "addr:street": "Main Street",
            "addr:city": "Colombo",
          },
        },
        {
          id: 67890,
          lat: 6.930,
          lon: 79.865,
          tags: {
            name: "Test Clinic",
            amenity: "clinic",
            "addr:housenumber": "42",
            "addr:street": "Park Road",
          },
        },
      ],
    };

    jest.doMock("axios", () => ({
      post: jest.fn().mockResolvedValue({ data: mockOverpassResponse }),
    }));

    const router = loadRecommendationsRouter();
    const app = buildApp(router);

    const response = await request(app)
      .get(ENDPOINT)
      .query({ latitude: 6.9271, longitude: 79.8612 });

    expect(response.status).toBe(200);
    expect(response.body.source).toBe("openstreetmap");
    expect(response.body.total).toBe(2);
    expect(Array.isArray(response.body.specialists)).toBe(true);

    const first = response.body.specialists[0];
    expect(first).toMatchObject({
      name: expect.any(String),
      address: expect.any(String),
      distanceKm: expect.any(Number),
      contact: expect.objectContaining({
        phone: expect.any(String),
      }),
    });
  });

  it("falls back to mock data when Overpass API times out", async () => {
    jest.doMock("axios", () => ({
      post: jest.fn().mockRejectedValue(new Error("timeout of 15000ms exceeded")),
    }));

    const router = loadRecommendationsRouter();
    const app = buildApp(router);

    const response = await request(app)
      .get(ENDPOINT)
      .query({ latitude: 6.9271, longitude: 79.8612 });

    expect(response.status).toBe(200);
    expect(response.body.source).toBe("mock");
    expect(response.body.note).toMatch(/failed|timed out/i);
    expect(response.body.total).toBeGreaterThan(0);
    expect(Array.isArray(response.body.specialists)).toBe(true);
  });

  it("falls back to mock data when Overpass returns empty results", async () => {
    jest.doMock("axios", () => ({
      post: jest.fn().mockResolvedValue({ data: { elements: [] } }),
    }));

    const router = loadRecommendationsRouter();
    const app = buildApp(router);

    const response = await request(app)
      .get(ENDPOINT)
      .query({ latitude: 6.9271, longitude: 79.8612 });

    expect(response.status).toBe(200);
    expect(response.body.source).toBe("mock");
    expect(response.body.total).toBeGreaterThan(0);
  });
});
