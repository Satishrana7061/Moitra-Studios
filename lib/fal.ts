/**
 * FalService - Integration for fal.ai media generation
 * This handles character image generation and lip-synced video production.
 */

const FAL_PROXY_URL = 'https://fal.run';

export const falService = {
  /**
   * Generates a realistic 14-15 year old male news anchor image.
   * We use this as the "base" for the lip-sync.
   */
  async generateTeenAnchor(): Promise<string> {
    const response = await fetch(`${FAL_PROXY_URL}/fal-ai/flux/schnell`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${import.meta.env.VITE_FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "A realistic high-quality professional news anchor, 14-15 year old teenage boy, handsome Indian features, wearing a formal navy blue suit and red tie, sitting in a modern news studio with digital screens in background, soft studio lighting, ultra-realistic, 4k resolution, looking directly at camera.",
        image_size: "portrait_4_3",
        num_inference_steps: 4,
      }),
    });

    const data = await response.json();
    return data.images[0].url;
  },

  /**
   * Generates a lip-synced video using a character image and text content.
   * This uses ElevenLabs for voice and the CHEAPER Lipsync 1.9.0 model on Fal.
   */
  async generateTalkingReel(imageUrl: string, text: string): Promise<string> {
    // 1. Generate Voiceover using ElevenLabs via Fal.ai (~$0.08 per reel)
    const audioResponse = await fetch(`${FAL_PROXY_URL}/fal-ai/elevenlabs/tts`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${import.meta.env.VITE_FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice_id: "pNInz6obpgDQGcFmaJgB", // 'Adam' - clear and authoritative
      }),
    });
    const audioData = await audioResponse.json();
    const audioUrl = audioData.audio.url;

    // 2. Perform Lip-Sync using the cheaper 1.9.0 model (~$0.35 per 30s reel)
    const videoResponse = await fetch(`${FAL_PROXY_URL}/fal-ai/lipsync-1.9.0-beta`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${import.meta.env.VITE_FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        audio_url: audioUrl,
        sync_mode: "audio", // Focus on high precision lip movement
        num_inference_steps: 20, // Balanced for speed and quality
      }),
    });

    const videoData = await videoResponse.json();
    // Lipsync 1.9.0 returns video in a slightly different structure
    return videoData.video?.url || videoData.url;
  }
};
