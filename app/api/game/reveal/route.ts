import { ensureGameData, getD1 } from "../../../../db/game";
import { getPlayer, jsonWithPlayer } from "../_shared";

type RevealedPrize = {
  prizeType: "catalogue_20" | "catalogue_35" | "neural";
  code: string;
};

export async function POST(request: Request) {
  const { playerId, setCookie } = getPlayer(request);
  try {
    await ensureGameData();
    const result = await getD1()
      .prepare(`UPDATE wheel_prizes
        SET revealed_at = COALESCE(revealed_at, CURRENT_TIMESTAMP)
        WHERE claimed_by = ?
        RETURNING prize_type AS prizeType, code`)
      .bind(playerId)
      .all<RevealedPrize>();
    const prize = result.results[0];

    if (!prize) {
      return jsonWithPlayer({ error: "Spin the wheel first" }, 404, setCookie);
    }

    return jsonWithPlayer(prize, 200, setCookie);
  } catch {
    return jsonWithPlayer({ error: "Reveal unavailable" }, 500, setCookie);
  }
}
