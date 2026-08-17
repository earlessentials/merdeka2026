import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const wheelPrizes = sqliteTable(
  "wheel_prizes",
  {
    id: integer("id").primaryKey(),
    prizeType: text("prize_type").notNull(),
    code: text("code").notNull().unique(),
    claimedBy: text("claimed_by"),
    claimedAt: text("claimed_at"),
    revealedAt: text("revealed_at"),
  },
  (table) => [uniqueIndex("idx_wheel_prizes_claimed_by").on(table.claimedBy)],
);

export const riddlePrizes = sqliteTable("riddle_prizes", {
  id: integer("id").primaryKey(),
  code: text("code").notNull().unique(),
  claimedBy: text("claimed_by"),
  claimedAt: text("claimed_at"),
});
