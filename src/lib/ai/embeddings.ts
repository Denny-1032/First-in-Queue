import OpenAI from "openai";

/**
 * Embedding model for knowledge base retrieval.
 *
 * 1536 dimensions, which is what `kb_entries.embedding` is declared as in
 * migration 025. Changing the model means changing that column and re-embedding
 * every row - the two numbers are not independent.
 */
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

/** Embedding inputs are truncated - an entry longer than this is already too big to be one topic. */
const MAX_INPUT_CHARS = 8000;

export function getEmbeddingClient(apiKey?: string): OpenAI {
  return new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
}

/**
 * Embed a batch of texts in one request. Order of the result matches the input.
 */
export async function embedTexts(openai: OpenAI, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.slice(0, MAX_INPUT_CHARS)),
  });
  // The API returns items with an `index`; sort rather than trust arrival order.
  return response.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding as number[]);
}

export async function embedOne(openai: OpenAI, text: string): Promise<number[]> {
  const [vector] = await embedTexts(openai, [text]);
  return vector;
}
