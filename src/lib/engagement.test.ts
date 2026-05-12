import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetEngagementDedupeForTests,
  engagementDedupeKey,
  ENGAGEMENT_ROUTES,
  ENGAGEMENT_TOPICS,
  insertEngagementEventDeduped,
  recordAiEngagement,
} from "@/lib/engagement";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("insertEngagementEventDeduped", () => {
  afterEach(() => {
    __resetEngagementDedupeForTests();
    vi.restoreAllMocks();
  });

  it("emits view topics twice when outside window", () => {
    const insert = vi.fn();
    const client = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient;

    insertEngagementEventDeduped(
      client,
      "u1",
      {
        route_key: ENGAGEMENT_ROUTES.dashboard,
        topic_key: ENGAGEMENT_TOPICS.dashboard_open,
      },
      { now: 0 },
    );
    insertEngagementEventDeduped(
      client,
      "u1",
      {
        route_key: ENGAGEMENT_ROUTES.dashboard,
        topic_key: ENGAGEMENT_TOPICS.dashboard_open,
      },
      { now: 100_000 },
    );

    expect(insert).toHaveBeenCalledTimes(2);
  });

  it("suppresses duplicate view topic inside dedupe window", () => {
    const insert = vi.fn();
    const client = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient;

    insertEngagementEventDeduped(
      client,
      "u1",
      {
        route_key: ENGAGEMENT_ROUTES.dashboard,
        topic_key: ENGAGEMENT_TOPICS.dashboard_open,
      },
      { now: 0 },
    );
    insertEngagementEventDeduped(
      client,
      "u1",
      {
        route_key: ENGAGEMENT_ROUTES.dashboard,
        topic_key: ENGAGEMENT_TOPICS.dashboard_open,
      },
      { now: 30_000 },
    );

    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("does not dedupe ai_* topics", () => {
    const insert = vi.fn();
    const client = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient;

    insertEngagementEventDeduped(
      client,
      "u1",
      {
        route_key: ENGAGEMENT_ROUTES.momento,
        topic_key: ENGAGEMENT_TOPICS.ai_transit_momento,
      },
      { now: 0 },
    );
    insertEngagementEventDeduped(
      client,
      "u1",
      {
        route_key: ENGAGEMENT_ROUTES.momento,
        topic_key: ENGAGEMENT_TOPICS.ai_transit_momento,
      },
      { now: 1000 },
    );

    expect(insert).toHaveBeenCalledTimes(2);
  });

  it("chart_detail_open keys differ by chart_id", () => {
    expect(
      engagementDedupeKey("u", {
        route_key: ENGAGEMENT_ROUTES.mapas_detail,
        topic_key: ENGAGEMENT_TOPICS.chart_detail_open,
        meta: { chart_id: "a" },
      }),
    ).not.toEqual(
      engagementDedupeKey("u", {
        route_key: ENGAGEMENT_ROUTES.mapas_detail,
        topic_key: ENGAGEMENT_TOPICS.chart_detail_open,
        meta: { chart_id: "b" },
      }),
    );
  });

  it("checkout_view keys differ when payment availability flags change", () => {
    const base = {
      route_key: ENGAGEMENT_ROUTES.assinatura,
      topic_key: ENGAGEMENT_TOPICS.checkout_view,
      meta: {
        produto: "premium",
        checkoutReady: true,
        mpTransparent: false,
        mpCheckoutPro: false,
      },
    };
    expect(engagementDedupeKey("u", base)).not.toEqual(
      engagementDedupeKey("u", {
        ...base,
        meta: { ...base.meta, checkoutReady: false },
      }),
    );
  });
});

describe("recordAiEngagement", () => {
  it("noop sem userId", () => {
    const insert = vi.fn();
    const client = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient;
    recordAiEngagement(client, null, {
      route_key: "x",
      topic_key: "y",
      cached: true,
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("insere com cached fundido em meta", () => {
    const insert = vi.fn();
    const client = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient;
    recordAiEngagement(client, "u1", {
      route_key: ENGAGEMENT_ROUTES.momento,
      topic_key: ENGAGEMENT_TOPICS.ai_transit_momento,
      cached: false,
      meta: { chart_id: "c1" },
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        user_id: "u1",
        route_key: ENGAGEMENT_ROUTES.momento,
        topic_key: ENGAGEMENT_TOPICS.ai_transit_momento,
        meta: expect.objectContaining({ chart_id: "c1", cached: false }),
      }),
    );
  });
});
