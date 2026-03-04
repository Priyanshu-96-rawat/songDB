import { z } from "zod";

export const createReviewSchema = z.object({
    song_id: z.string().min(1, "Item ID is required"),
    song_name: z.string().min(1, "Item name is required"),
    artist_name: z.string().min(1, "Artist name is required"),
    item_type: z.enum(["song", "artist"]).optional().default("song"),
    rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
    review_text: z
        .string()
        .min(5, "Review must be at least 5 characters")
        .max(500, "Review cannot exceed 500 characters"),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export interface Review {
    id: string;
    user_id: string;
    user_email: string;
    user_display_name: string;
    song_id: string;
    song_name: string;
    artist_name: string;
    item_type?: "song" | "artist";
    rating: number;
    review_text: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}
