import type { LifecycleAnalyticsData } from "../api-types";

/**
 * Mock data for lifecycle analytics (backend endpoint TBD).
 * Used as fallback when the real API is unavailable.
 */

export function buildMockLifecycleAnalyticsData(): LifecycleAnalyticsData {
  const now = new Date();
  const months = (n: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  return {
    total_products: 64,

    in_development: {
      stage: "in_development",
      count: 18,
      entries: [
        { month: months(11), count: 3 },
        { month: months(10), count: 5 },
        { month: months(9), count: 4 },
        { month: months(8), count: 6 },
        { month: months(7), count: 3 },
        { month: months(6), count: 5 },
        { month: months(5), count: 4 },
        { month: months(4), count: 2 },
        { month: months(3), count: 5 },
        { month: months(2), count: 3 },
        { month: months(1), count: 4 },
        { month: months(0), count: 2 },
      ],
      duration_distribution: [
        { range: "< 3 个月", count: 3 },
        { range: "3-6 个月", count: 5 },
        { range: "6-12 个月", count: 6 },
        { range: "> 12 个月", count: 4 },
      ],
      products: [
        { code: "DC-350-EU", name: "直流快充 350kW", model: "DRC-350kW", entered_at: "2025-08-15", duration_days: 305, markets: ["EU"] },
        { code: "DC-180-CN", name: "直流快充 180kW", model: "DRC-180kW", entered_at: "2025-10-01", duration_days: 258, markets: ["CN"] },
        { code: "PF-5.0-BR", name: "便携充 5.0kW", model: "PFC-5.0kW", entered_at: "2025-11-20", duration_days: 208, markets: ["BR"] },
        { code: "AC-440-AU", name: "交流桩 44kW Dual", model: "ARC-44kW", entered_at: "2026-01-10", duration_days: 156, markets: ["AU"] },
        { code: "AC-330-US", name: "交流桩 33kW", model: "ARC-33kW", entered_at: "2026-02-05", duration_days: 130, markets: ["US"] },
      ],
    },

    trial_handover: {
      stage: "trial_handover",
      count: 9,
      entries: [
        { month: months(11), count: 1 },
        { month: months(10), count: 2 },
        { month: months(9), count: 1 },
        { month: months(8), count: 0 },
        { month: months(7), count: 2 },
        { month: months(6), count: 1 },
        { month: months(5), count: 2 },
        { month: months(4), count: 1 },
        { month: months(3), count: 1 },
        { month: months(2), count: 2 },
        { month: months(1), count: 1 },
        { month: months(0), count: 2 },
      ],
      duration_distribution: [
        { range: "< 1 个月", count: 2 },
        { range: "1-3 个月", count: 4 },
        { range: "3-6 个月", count: 2 },
        { range: "> 6 个月", count: 1 },
      ],
      products: [
        { code: "DC-150-IN", name: "直流快充 150kW", model: "DRC-150kW", entered_at: "2026-02-01", duration_days: 134, markets: ["IN"] },
        { code: "PF-3.3-JP", name: "便携充 3.3kW", model: "PFC-3.3kW", entered_at: "2026-03-15", duration_days: 92, markets: ["JP"] },
        { code: "AC-740-CN", name: "交流桩 74kW Dual", model: "ARC-74kW", entered_at: "2026-04-10", duration_days: 66, markets: ["CN"] },
      ],
    },

    on_sale: {
      stage: "on_sale",
      count: 26,
      entries: [
        { month: months(11), count: 2 },
        { month: months(10), count: 3 },
        { month: months(9), count: 4 },
        { month: months(8), count: 2 },
        { month: months(7), count: 3 },
        { month: months(6), count: 5 },
        { month: months(5), count: 2 },
        { month: months(4), count: 3 },
        { month: months(3), count: 4 },
        { month: months(2), count: 2 },
        { month: months(1), count: 3 },
        { month: months(0), count: 1 },
      ],
      duration_distribution: [
        { range: "< 6 个月", count: 4 },
        { range: "6-12 个月", count: 7 },
        { range: "1-2 年", count: 10 },
        { range: "> 2 年", count: 5 },
      ],
      products: [
        { code: "AC-220-EU", name: "交流桩 22kW", model: "ARC-7.2kW", entered_at: "2024-03-01", duration_days: 836, markets: ["EU"] },
        { code: "DC-480-US", name: "直流快充 480kW", model: "DRC-150kW", entered_at: "2024-06-15", duration_days: 730, markets: ["US"] },
        { code: "AC-740-CN", name: "交流桩 74kW", model: "ARC-22kW", entered_at: "2024-09-01", duration_days: 652, markets: ["CN"] },
        { code: "DC-350-EU-V2", name: "直流快充 350kW V2", model: "DRC-350kW-V2", entered_at: "2025-02-20", duration_days: 480, markets: ["EU"] },
        { code: "PF-3.3-JP", name: "便携充 3.3kW Pro", model: "PFC-3.3kW-Pro", entered_at: "2025-05-01", duration_days: 410, markets: ["JP"] },
        { code: "AC-220-CN", name: "交流桩 22kW Lite", model: "ARC-7.2kW-Lite", entered_at: "2025-08-10", duration_days: 310, markets: ["CN"] },
      ],
    },

    discontinued: {
      stage: "discontinued",
      count: 7,
      entries: [
        { month: months(11), count: 1 },
        { month: months(10), count: 0 },
        { month: months(9), count: 2 },
        { month: months(8), count: 1 },
        { month: months(7), count: 0 },
        { month: months(6), count: 1 },
        { month: months(5), count: 0 },
        { month: months(4), count: 1 },
        { month: months(3), count: 0 },
        { month: months(2), count: 1 },
        { month: months(1), count: 0 },
        { month: months(0), count: 0 },
      ],
      duration_distribution: [
        { range: "< 1 年", count: 1 },
        { range: "1-2 年", count: 3 },
        { range: "2-3 年", count: 2 },
        { range: "> 3 年", count: 1 },
      ],
      products: [
        { code: "AC-110-EU", name: "交流桩 11kW V1", model: "ARC-3.7kW", entered_at: "2022-06-01", duration_days: 580, markets: ["EU"] },
        { code: "DC-200-US", name: "直流快充 200kW", model: "DRC-60kW", entered_at: "2023-01-10", duration_days: 720, markets: ["US"] },
        { code: "PF-2.2-CN", name: "便携充 2.2kW", model: "PFC-2.2kW", entered_at: "2023-09-15", duration_days: 470, markets: ["CN"] },
      ],
    },

    eol: {
      stage: "eol",
      count: 4,
      entries: [
        { month: months(11), count: 0 },
        { month: months(10), count: 1 },
        { month: months(9), count: 0 },
        { month: months(8), count: 0 },
        { month: months(7), count: 1 },
        { month: months(6), count: 0 },
        { month: months(5), count: 1 },
        { month: months(4), count: 0 },
        { month: months(3), count: 0 },
        { month: months(2), count: 1 },
        { month: months(1), count: 0 },
        { month: months(0), count: 0 },
      ],
      duration_distribution: [
        { range: "< 2 年", count: 0 },
        { range: "2-3 年", count: 1 },
        { range: "3-5 年", count: 2 },
        { range: "> 5 年", count: 1 },
      ],
      products: [
        { code: "AC-75-CN", name: "交流桩 7.5kW V1", model: "ARC-2.5kW", entered_at: "2020-03-01", duration_days: 1500, markets: ["CN"] },
        { code: "DC-120-EU", name: "直流快充 120kW", model: "DRC-40kW", entered_at: "2021-08-15", duration_days: 1200, markets: ["EU"] },
        { code: "PF-1.5-US", name: "便携充 1.5kW", model: "PFC-1.5kW", entered_at: "2022-01-20", duration_days: 1050, markets: ["US"] },
      ],
    },

    flows: [
      { from: "in_development", to: "trial_handover", count: 16 },
      { from: "trial_handover", to: "in_development", count: 4 },
      { from: "trial_handover", to: "on_sale", count: 11 },
      { from: "on_sale", to: "discontinued", count: 7 },
      { from: "discontinued", to: "eol", count: 4 },
    ],
  };
}
