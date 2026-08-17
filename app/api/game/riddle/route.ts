import { ensureGameData, getD1 } from "../../../../db/game";
import { getPlayer, jsonWithPlayer, normalizeAnswer } from "../_shared";

const answers: Record<1 | 2, string[]> = {
  1: ["waktu", "time"],
  2: ["paradoks", "paradox"],
};

const wrongMessages = [
  "Nope. Waktumu terbuang sedikit untuk jawaban itu.",
  "Salah. Tapi setidaknya kamu mencoba.",
  "The brain is braining. Just not correctly yet.",
];

type RiddleRow = { claimedBy: string | null; code: string };

function successCopy(riddleId: 1 | 2, state: "winner" | "late") {
  if (riddleId === 1 && state === "winner") {
    return {
      heading: "YOU GOT IT.",
      lines: [
        "Jawabannya adalah WAKTU.",
        "And somehow you solved a riddle about time before everyone else.",
        "You win a Rp129.000 Pearling voucher!",
      ],
      emphasis: [0],
    };
  }
  if (riddleId === 1) {
    return {
      heading: "Correct!",
      lines: [
        "Jawabannya memang WAKTU.",
        "Unfortunately... someone else answered it first.",
        "Which means, ironically, you ran out of time.",
        "The riddle literally warned you.",
      ],
      emphasis: [0, 3],
    };
  }
  if (state === "winner") {
    return {
      heading: "YOUR CONFUSION PAID OFF.",
      lines: [
        "Jawabannya: PARADOKS.",
        "You were the first person to get it right.",
        "You win a Rp129.000 Pearling voucher!",
      ],
      emphasis: [0],
    };
  }
  return {
    heading: "Correct!",
    lines: [
      "It IS a paradox.",
      "But somebody already solved it before you.",
      "You were correct and still didn't win.",
      "Which, honestly, feels appropriately paradoxical.",
    ],
    emphasis: [0, 3],
  };
}

export async function POST(request: Request) {
  const { playerId, setCookie } = getPlayer(request);
  try {
    const payload = (await request.json()) as { riddleId?: number; answer?: unknown };
    const riddleId = payload.riddleId === 1 || payload.riddleId === 2 ? payload.riddleId : null;
    if (!riddleId) return jsonWithPlayer({ error: "Unknown riddle" }, 400, setCookie);

    const answer = normalizeAnswer(payload.answer);
    if (!answers[riddleId].includes(answer)) {
      const message = wrongMessages[Math.floor(Math.random() * wrongMessages.length)];
      return jsonWithPlayer({ state: "wrong", message }, 200, setCookie);
    }

    await ensureGameData();
    const db = getD1();
    const claimResult = await db
      .prepare(`UPDATE riddle_prizes
        SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP
        WHERE id = ? AND claimed_by IS NULL
        RETURNING code`)
      .bind(playerId, riddleId)
      .all<{ code: string }>();
    const won = claimResult.results[0];

    if (won) {
      return jsonWithPlayer({ state: "winner", code: won.code, ...successCopy(riddleId, "winner") }, 200, setCookie);
    }

    const existing = await db
      .prepare("SELECT claimed_by AS claimedBy, code FROM riddle_prizes WHERE id = ?")
      .bind(riddleId)
      .first<RiddleRow>();

    if (existing?.claimedBy === playerId) {
      return jsonWithPlayer({ state: "winner", code: existing.code, ...successCopy(riddleId, "winner") }, 200, setCookie);
    }

    return jsonWithPlayer({ state: "late", ...successCopy(riddleId, "late") }, 200, setCookie);
  } catch {
    return jsonWithPlayer({ error: "Answer check unavailable" }, 500, setCookie);
  }
}
