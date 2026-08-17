import { ensureGameData, getD1 } from "../../../../db/game";
import { getPlayer, jsonWithPlayer } from "../_shared";

type PrizeRow = {
  segmentIndex: number;
  prizeType: "catalogue_20" | "catalogue_35" | "neural";
  code?: string;
  revealedAt?: string | null;
};

async function remainingCount() {
  const row = await getD1()
    .prepare("SELECT COUNT(*) AS remaining FROM wheel_prizes WHERE claimed_by IS NULL")
    .first<{ remaining: number }>();
  return Number(row?.remaining ?? 0);
}

export async function POST(request: Request) {
  const { playerId, setCookie } = getPlayer(request);
  try {
    await ensureGameData();
    const db = getD1();
    const existing = await db
      .prepare(`SELECT id AS segmentIndex, prize_type AS prizeType, code,
        revealed_at AS revealedAt FROM wheel_prizes WHERE claimed_by = ? LIMIT 1`)
      .bind(playerId)
      .first<PrizeRow>();

    if (existing) {
      return jsonWithPlayer(
        {
          state: "existing",
          prize: {
            segmentIndex: Number(existing.segmentIndex),
            prizeType: existing.prizeType,
            revealed: !!existing.revealedAt,
            ...(existing.revealedAt ? { code: existing.code } : {}),
          },
          remaining: await remainingCount(),
        },
        200,
        setCookie,
        request,
      );
    }

    const result = await db
      .prepare(`UPDATE wheel_prizes
        SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP
        WHERE id = (
          SELECT id FROM wheel_prizes
          WHERE claimed_by IS NULL
          ORDER BY random()
          LIMIT 1
        )
        AND NOT EXISTS (
          SELECT 1 FROM wheel_prizes WHERE claimed_by = ?
        )
        RETURNING id AS segmentIndex, prize_type AS prizeType`)
      .bind(playerId, playerId)
      .all<PrizeRow>();
    const claimed = result.results[0];

    if (!claimed) {
      const racedExisting = await db
        .prepare("SELECT id AS segmentIndex, prize_type AS prizeType FROM wheel_prizes WHERE claimed_by = ? LIMIT 1")
        .bind(playerId)
        .first<PrizeRow>();
      if (racedExisting) {
        return jsonWithPlayer(
          { state: "existing", prize: { ...racedExisting, revealed: false }, remaining: await remainingCount() },
          200,
          setCookie,
          request,
        );
      }
      return jsonWithPlayer({ state: "soldout", remaining: 0 }, 200, setCookie, request);
    }

    return jsonWithPlayer(
      {
        state: "claimed",
        prize: { segmentIndex: Number(claimed.segmentIndex), prizeType: claimed.prizeType, revealed: false },
        remaining: await remainingCount(),
      },
      200,
      setCookie,
      request,
    );
  } catch {
    return jsonWithPlayer({ error: "Spin unavailable" }, 500, setCookie, request);
  }
}
