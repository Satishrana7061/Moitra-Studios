import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || ''; // Use service role key for backend tasks

const BUCKET_NAME = 'automated-reels';

let supabase: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

export class SupabaseStorageService {
    /**
     * Uploads the video buffer to Supabase Storage and returns the public URL.
     */
    static async uploadVideo(videoBuffer: Buffer, fileName: string): Promise<string | null> {
        if (!supabase) {
            console.error("[SupabaseStorage] Missing SUPABASE_URL or SUPABASE_KEY.");
            return null;
        }

        console.log(`[SupabaseStorage] Uploading ${fileName} to bucket ${BUCKET_NAME}...`);
        
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, videoBuffer, {
                contentType: 'video/mp4',
                upsert: true
            });

        if (error) {
            console.error("[SupabaseStorage] Upload Failed:", error.message);
            return null;
        }

        const { data: publicUrlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        console.log(`[SupabaseStorage] Upload successful. Public URL: ${publicUrlData.publicUrl}`);
        return publicUrlData.publicUrl;
    }

    /**
     * Deletes videos older than 3 days to maintain free tier limits.
     */
    static async cleanupOldVideos(): Promise<void> {
        if (!supabase) return;

        console.log("[SupabaseStorage] Checking for videos older than 3 days to delete...");
        
        try {
            const { data: files, error } = await supabase.storage.from(BUCKET_NAME).list();
            if (error) throw error;
            if (!files || files.length === 0) return;

            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const filesToDelete = files
                .filter(file => new Date(file.created_at) < threeDaysAgo)
                .map(file => file.name);

            if (filesToDelete.length > 0) {
                console.log(`[SupabaseStorage] Deleting ${filesToDelete.length} old video(s)...`);
                const { error: deleteError } = await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);
                if (deleteError) throw deleteError;
                console.log("[SupabaseStorage] Cleanup complete.");
            } else {
                console.log("[SupabaseStorage] No old videos found. Storage is clean.");
            }
        } catch (err: any) {
            console.error("[SupabaseStorage] Cleanup Failed:", err.message);
        }
    }
}
