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
   * This uses ElevenLabs for voice and LivePortrait for lip-sync.
   */
  async generateTalkingReel(imageUrl: string, text: string): Promise<string> {
    // 1. Generate Voiceover using ElevenLabs via Fal.ai
    // Note: We use a younger male voice (e.g., 'Clyde' or custom)
    const audioResponse = await fetch(`${FAL_PROXY_URL}/fal-ai/elevenlabs/tts`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${import.meta.env.VITE_FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice_id: "21m00Tcm4TlvDq8ikWAM", // Example: Adam (can be changed to a teen voice)
      }),
    });
    const audioData = await audioResponse.json();
    const audioUrl = audioData.audio.url;

    // 2. Perform Lip-Sync (LivePortrait is fast and cost-effective)
    const videoResponse = await fetch(`${FAL_PROXY_URL}/fal-ai/live-portrait/video`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${import.meta.env.VITE_FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        audio_url: audioUrl,
        num_frames: 900, // Max for 30 seconds at 30fps
      }),
    });

    const videoData = await videoResponse.json();
    return videoData.video.url;
  }
};
