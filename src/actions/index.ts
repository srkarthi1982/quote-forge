import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import { QuoteCollections, Quotes, and, db, eq } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedCollection(collectionId: string, userId: string) {
  const [collection] = await db
    .select()
    .from(QuoteCollections)
    .where(and(eq(QuoteCollections.id, collectionId), eq(QuoteCollections.userId, userId)));

  if (!collection) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Collection not found.",
    });
  }

  return collection;
}

export const server = {
  createCollection: defineAction({
    input: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
      isDefault: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [collection] = await db
        .insert(QuoteCollections)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          name: input.name,
          description: input.description,
          icon: input.icon,
          isDefault: input.isDefault ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { collection } };
    },
  }),

  updateCollection: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
      .refine(
        (input) =>
          input.name !== undefined ||
          input.description !== undefined ||
          input.icon !== undefined ||
          input.isDefault !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedCollection(input.id, user.id);

      const [collection] = await db
        .update(QuoteCollections)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          updatedAt: new Date(),
        })
        .where(eq(QuoteCollections.id, input.id))
        .returning();

      return { success: true, data: { collection } };
    },
  }),

  listCollections: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const collections = await db
        .select()
        .from(QuoteCollections)
        .where(eq(QuoteCollections.userId, user.id));

      return { success: true, data: { items: collections, total: collections.length } };
    },
  }),

  createQuote: defineAction({
    input: z.object({
      collectionId: z.string().min(1),
      text: z.string().min(1),
      attributedTo: z.string().optional(),
      mood: z.string().optional(),
      tags: z.string().optional(),
      language: z.string().optional(),
      isFavorite: z.boolean().optional(),
      isPublic: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedCollection(input.collectionId, user.id);

      const now = new Date();
      const [quote] = await db
        .insert(Quotes)
        .values({
          id: crypto.randomUUID(),
          collectionId: input.collectionId,
          userId: user.id,
          text: input.text,
          attributedTo: input.attributedTo,
          mood: input.mood,
          tags: input.tags,
          language: input.language,
          isFavorite: input.isFavorite ?? false,
          isPublic: input.isPublic ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { quote } };
    },
  }),

  updateQuote: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        collectionId: z.string().min(1),
        text: z.string().optional(),
        attributedTo: z.string().optional(),
        mood: z.string().optional(),
        tags: z.string().optional(),
        language: z.string().optional(),
        isFavorite: z.boolean().optional(),
        isPublic: z.boolean().optional(),
      })
      .refine(
        (input) =>
          input.text !== undefined ||
          input.attributedTo !== undefined ||
          input.mood !== undefined ||
          input.tags !== undefined ||
          input.language !== undefined ||
          input.isFavorite !== undefined ||
          input.isPublic !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedCollection(input.collectionId, user.id);

      const [existing] = await db
        .select()
        .from(Quotes)
        .where(and(eq(Quotes.id, input.id), eq(Quotes.collectionId, input.collectionId)));

      if (!existing) {
        throw new ActionError({ code: "NOT_FOUND", message: "Quote not found." });
      }

      const [quote] = await db
        .update(Quotes)
        .set({
          ...(input.text !== undefined ? { text: input.text } : {}),
          ...(input.attributedTo !== undefined ? { attributedTo: input.attributedTo } : {}),
          ...(input.mood !== undefined ? { mood: input.mood } : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(input.language !== undefined ? { language: input.language } : {}),
          ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
          ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
          updatedAt: new Date(),
        })
        .where(eq(Quotes.id, input.id))
        .returning();

      return { success: true, data: { quote } };
    },
  }),

  deleteQuote: defineAction({
    input: z.object({
      id: z.string().min(1),
      collectionId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedCollection(input.collectionId, user.id);

      const result = await db
        .delete(Quotes)
        .where(and(eq(Quotes.id, input.id), eq(Quotes.collectionId, input.collectionId)));

      if (result.rowsAffected === 0) {
        throw new ActionError({ code: "NOT_FOUND", message: "Quote not found." });
      }

      return { success: true };
    },
  }),

  listQuotes: defineAction({
    input: z.object({
      collectionId: z.string().min(1),
      favoritesOnly: z.boolean().default(false),
      includePublic: z.boolean().default(false),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedCollection(input.collectionId, user.id);

      const filters = [
        eq(Quotes.collectionId, input.collectionId),
        eq(Quotes.userId, user.id),
      ];
      if (input.favoritesOnly) {
        filters.push(eq(Quotes.isFavorite, true));
      }
      if (!input.includePublic) {
        // default: include both public/private since owner is filtering; no extra filter needed
      }

      const quotes = await db.select().from(Quotes).where(and(...filters));

      return { success: true, data: { items: quotes, total: quotes.length } };
    },
  }),
};
