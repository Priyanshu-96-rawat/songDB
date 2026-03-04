import { CohereClient } from "cohere-ai";

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY || "",
});

export async function generateSongSummary(songName: string, artistName: string): Promise<string> {
    if (!process.env.COHERE_API_KEY) return "AI Summary not available.";
    try {
        const response = await cohere.generate({
            model: "command",
            prompt: `Write a 2-sentence rich, engaging, concise summary for the song "${songName}" by ${artistName}. Focus on the genre, vibe, and what makes it unique.`,
            maxTokens: 50,
            temperature: 0.7,
        });
        return response.generations[0].text;
    } catch (error) {
        console.error("Cohere summary error:", error);
        return "Failed to generate AI summary.";
    }
}

export async function generateEmbedding(text: string): Promise<number[]> {
    if (!process.env.COHERE_API_KEY) return [];
    try {
        const response = await cohere.embed({
            texts: [text],
            model: "embed-english-v3.0",
            inputType: "search_document",
        });

        const { embeddings } = response;

        if (!Array.isArray(embeddings)) {
            console.error("Cohere embed error: unexpected embeddings shape");
            return [];
        }

        return embeddings[0] ?? [];
    } catch (error) {
        console.error("Cohere embed error:", error);
        return [];
    }
}
