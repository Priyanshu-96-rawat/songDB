import { z } from "zod";

export const addFavoriteSchema = z.object({
    item_id: z.string().min(1, "Item ID is required"),
    item_type: z.enum(["song", "artist"]),
    item_name: z.string().min(1, "Item name is required"),
    artist_name: z.string().optional(),
    image_url: z.string().optional(),
});

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>;

export interface Favorite {
    id: string;
    user_id: string;
    item_id: string;
    item_type: "song" | "artist";
    item_name: string;
    artist_name?: string;
    image_url?: string;
    created_at: string;
}
