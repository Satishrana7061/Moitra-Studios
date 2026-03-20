import subprocess
import os

# Configuration
FFMPEG_PATH = r"C:\Users\Satish\Downloads\ffmpeg-2026-03-15-git-6ba0b59d8b-full_build\ffmpeg-2026-03-15-git-6ba0b59d8b-full_build\bin\ffmpeg.exe"
ASSETS_DIR = r"C:\Users\Satish\Desktop\Projects\Moitra-Studios\Game FinalGraphics"
AUDIO_DIR = r"C:\Users\Satish\Desktop\Projects\Moitra-Studios\Meme Audio"
OUTPUT_DIR = r"C:\Users\Satish\Desktop\Projects\Moitra-Studios\Generated_Reels"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_pro_pollution_reel():
    output_file = os.path.join(OUTPUT_DIR, "delhi_pollution_v2_pro.mp4")
    img_bg = os.path.join(ASSETS_DIR, "GamePlaybackground.png")
    img_map = os.path.join(ASSETS_DIR, "India Map with Narendra Modi selected as candidate in Rajneeti Politics game.png")
    audio_meme = os.path.join(AUDIO_DIR, "Modi_is_sajjan_ko_kya_taklif_hai.wav")
    
    print("Generating Professional Grade Reel: Delhi Pollution (Hook Optimized)...")
    
    # Strategy: High-speed montage with sharp text overlays
    cmd = [
        FFMPEG_PATH, "-y",
        "-loop", "1", "-t", "4", "-i", img_bg,
        "-loop", "1", "-t", "6", "-i", img_map,
        "-loop", "1", "-t", "5", "-i", img_bg,
        "-i", audio_meme,
        "-filter_complex", 
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v0];"
        "[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v1];"
        "[2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v2];"
        "[v0][v1][v2]concat=n=3:v=1:a=0[v]",
        "-map", "[v]", "-map", "3:a", 
        "-c:v", "libx264", "-t", "15", "-pix_fmt", "yuv420p", "-shortest", output_file
    ]
    
    subprocess.run(cmd, check=True)
    print(f"Professional Reel saved to: {output_file}")
    return output_file

if __name__ == "__main__":
    create_pro_pollution_reel()
