import subprocess
import os
import json

# Configuration
FFMPEG_PATH = r"C:\Users\Satish\Downloads\ffmpeg-2026-03-15-git-6ba0b59d8b-full_build\ffmpeg-2026-03-15-git-6ba0b59d8b-full_build\bin\ffmpeg.exe"
ASSETS_DIR = r"C:\Users\Satish\Desktop\Projects\Moitra-Studios\Game FinalGraphics"
AUDIO_DIR = r"C:\Users\Satish\Desktop\Projects\Moitra-Studios\Meme Audio"
OUTPUT_PATH = r"C:\Users\Satish\Desktop\rajneeti_pro_reel.mp4"
FONT_PATH = r"C\:/Windows/Fonts/impact.ttf"

# Script Data from GenViral/OpenAI
script = {
    "hook_text": "YOU THINK YOU CAN RULE INDIA?",
    "middle_text": "Welcome to Rajneeti PC where every move is a power play! Conquer the corridors of power.",
    "cta_text": "DOMINATE NOW! Link in Bio."
}

def render_reel():
    img_bg = os.path.join(ASSETS_DIR, "GamePlaybackground.png")
    img_map = os.path.join(ASSETS_DIR, "India Map with Narendra Modi selected as candidate in Rajneeti Politics game.png")
    img_hq = os.path.join(ASSETS_DIR, "HQ upgrades in Indian political game Rajneeti showing think tank and voter center.png")
    audio = os.path.join(AUDIO_DIR, "Modi_is_sajjan_ko_kya_taklif_hai.wav")

    print(f"Rendering Professional Reel to {OUTPUT_PATH}...")

    cmd = [
        FFMPEG_PATH, "-y",
        "-loop", "1", "-t", "4", "-i", img_bg,
        "-loop", "1", "-t", "7", "-i", img_map,
        "-loop", "1", "-t", "4", "-i", img_hq,
        "-i", audio,
        "-filter_complex", 
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,zoompan=z='min(zoom+0.001,1.5)':d=100:s=1080x1920[v0];"
        "[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v1];"
        "[2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,zoompan=z='min(zoom+0.001,1.5)':d=100:s=1080x1920[v2];"
        "[v0][v1][v2]concat=n=3:v=1:a=0[v_base];"
        "[v_base]drawtext=text='" + script['hook_text'] + "':fontcolor=white:fontsize=100:fontfile='" + FONT_PATH + "':x=(w-text_w)/2:y=(h-text_h)/2-100:enable='between(t,0,4)':bordercolor=black:borderw=5,"
        "drawtext=text='EVERY MOVE IS A POWER PLAY':fontcolor=yellow:fontsize=80:fontfile='" + FONT_PATH + "':x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,4,11)':bordercolor=black:borderw=3,"
        "drawtext=text='" + script['cta_text'] + "':fontcolor=orange:fontsize=110:fontfile='" + FONT_PATH + "':x=(w-text_w)/2:y=(h-text_h)/2+200:enable='between(t,11,15)':bordercolor=black:borderw=5[v_final]",
        "-map", "[v_final]", "-map", "3:a", "-c:v", "libx264", "-t", "15", "-pix_fmt", "yuv420p", "-shortest", OUTPUT_PATH
    ]

    subprocess.run(cmd, check=True)
    print("Render Complete!")

if __name__ == "__main__":
    render_reel()
