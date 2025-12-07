/**
 * Quote Forge - create and organize original quotes.
 *
 * Design goals:
 * - Support collections for themes ("Motivation", "Leadership").
 * - Store both text + attribution data for future publishing / sharing.
 * - Optional metadata like mood, tags, and language.
 */

import { defineTable, column, NOW } from "astro:db";

export const QuoteCollections = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    name: column.text(),                             // e.g. "Startup Motivation"
    description: column.text({ optional: true }),
    icon: column.text({ optional: true }),
    isDefault: column.boolean({ default: false }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const Quotes = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    collectionId: column.text({
      references: () => QuoteCollections.columns.id,
    }),
    userId: column.text(),                            // owner, duplicated for convenience
    text: column.text(),                              // the quote itself
    attributedTo: column.text({ optional: true }),    // "Karthik", "Astra", etc.
    mood: column.text({ optional: true }),            // "inspiring", "calm", "funny"
    tags: column.text({ optional: true }),            // comma-separated or JSON
    language: column.text({ optional: true }),
    isFavorite: column.boolean({ default: false }),
    isPublic: column.boolean({ default: false }),     // future: public gallery
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const tables = {
  QuoteCollections,
  Quotes,
} as const;
