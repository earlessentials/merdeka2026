import { ensureGameData, getD1 } from "../../../../db/game";
import { getPlayer, jsonWithPlayer } from "../_shared";

type WheelRow = {
  segmentIndex: number;
  prizeType: "catalogue_20" | "catalogue_35" | "neural";
  code: string;
  revealedAt: string | null;
};

type RiddleRow = {
  id: 1 | 2;
  claimedBy: string | null;
  code: string;
};

function winnerCopy(id: 1 | 2) {
  return id === 1
    ? {
        heading: "YOU GOT IT.",
        lines: [
          "Jawabannya adalah WAKTU.",
          "And somehow you solved a riddle about time before everyone else.",
          "You win a Rp129.000 Pearling voucher!",
        ],
        emphasis: [0],
      }
    : {
        heading: "YOUR CONFUSION PAID OFF.",
        lines: [
          "Jawabannya: PARADOKS.",
          "You were the first person to get it right.",
          "You win a Rp129.000 Pearling voucher!",
        ],
        emphasis: [0],
      };
}

export async function GET(request: Request) {
  const { playerId, setCookie } = getPlayer(request);
  try {
    await ensureGameData();
    const db = getD1();
    const remainingRow = await db
      .prepare("SELECT COUNT(*) AS remaining FROM wheel_prizes WHERE claimed_by IS NULL")
      .first<{ remaining: number }>();
    const wheel = await db
      .prepare(`SELECT id AS segmentIndex, prize_type AS prizeType, code,
        revealed_at AS revealedAt
        FROM wheel_prizes WHERE claimed_by = ? LIMIT 1`)
      .bind(playerId)
      .first<WheelRow>();
    const riddleResult = await db
      .prepare("SELECT id, claimed_by AS claimedBy, code FROM riddle_prizes ORDER BY id")
      .all<RiddleRow>();

    const riddles = { 1: { claimed: false, wonByYou: false }, 2: { claimed: false, wonByYou: false } } as Record<
      1 | 2,
      { claimed: boolean; wonByYou: boolean; code?: string }
    >;
    for (const row of riddleResult.results) {
      const wonByYou = row.claimedBy === playerId;
      riddles[row.id] = {
        claimed: !!row.claimedBy,
        wonByYou,
        ...(wonByYou ? { code: row.code, ...winnerCopy(row.id) } : {}),
      };
    }

    const remaining = Number(remainingRow?.remaining ?? 0);
    return jsonWithPlayer(
      {
        remaining,
        claimed: 10 - remaining,
        wheel: wheel
          ? {
              segmentIndex: Number(wheel.segmentIndex),
              prizeType: wheel.prizeType,
              revealed: !!wheel.revealedAt,
              ...(wheel.revealedAt ? { code: wheel.code } : {}),
            }
          : null,
        riddles,
      },
      200,
      setCookie,
      request,
    );
  } catch {
    return jsonWithPlayer({ error: "Game status unavailable" }, 500, setCookie, request);
  }
}
