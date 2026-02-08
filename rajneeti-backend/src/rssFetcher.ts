// src/rssFetcher.ts
import Parser from "rss-parser";
import { RawNewsItem } from "./types";

const parser = new Parser();

const RSS_FEEDS = [
  "https://timesofindia.indiatimes.com/rss.cms",
  "https://www.ndtv.com/rss",
  "https://indianexpress.com/rss/",
];

const BANNED_KEYWORDS = [
  "terror",
  "terrorist",
  "attack",
  "bomb",
  "blast",
  "riot",
  "religion",
  "religious",
  "communal",
  "lynch",
  "violence",
  "murder",
  "kill",
  "rape",
  "assault",
  "hate",
];

export async function fetchFilteredNews(): Promise<RawNewsItem[]> {
  const items: RawNewsItem[] = [];

  for (const url of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items) {
        const title = item.title || "";
        const desc =
          item.contentSnippet || item.content || item.summary || "";
        const text = (title + " " + desc).toLowerCase();

        // basic filter: skip obviously violent / communal content
        const banned = BANNED_KEYWORDS.some((kw) => text.includes(kw));
        if (banned) continue;

        items.push({
          title,
          description: desc,
          link: item.link || "",
          source: url,
        });
      }
    } catch (err) {
      console.error("Error parsing RSS", url, err);
    }
  }

  return items;
}
