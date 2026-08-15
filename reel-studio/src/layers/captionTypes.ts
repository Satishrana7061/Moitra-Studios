/** Shared caption shape, kept separate so layers do not import the zod schema. */
export type MoneyCaption = {
  word: string;
  startSec: number;
  endSec: number;
};
