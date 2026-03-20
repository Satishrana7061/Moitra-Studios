import subprocess
import os

# Configuration
FFMPEG_PATH = r"C:\Users\Satish\Downloads\ffmpeg-2026-03-15-git-6ba0b59d8b-full_build\ffmpeg-2026-03-15-git-6ba0b59d8b-full_build\bin\ffmpeg.exe"
ASSETS_DIR = r"C:\Users\Satish\Desktop\Projects\Moitra-Studios\Game FinalGraphics"
AUDIO_DIR = r"C:\Users\Satish\Desktop\Projects\Moitra-Studios\Meme Audio"
OUTPUT_PATH = os.path.join(os.environ['USERPROFILE'], 'Desktop', 'Rajneeti_LPG_Crisis_Reel.mp4')
FONT_PATH = r"C\:/Windows/Fonts/impact.ttf"

def create_lpg_crisis_reel():
    img_war = os.path.join(ASSETS_DIR, "HQ being built in Indian political simulation game Rajneeti.png")
    img_map = os.path.join(ASSETS_DIR, "India map with Narendra Modi selected in Rajneeti political game.png")
    img_bg = os.path.join(ASSETS_DIR, "GamePlaybackground.png")
    audio = os.path.join(AUDIO_DIR, "Modi_is_sajjan_ko_kya_taklif_hai.wav")

    print("Gemini 3 Flash: Rendering LPG Crisis Reel with GPT-5.4 Script...")

    caps = [
        "IRAN WAR. LPG EXPLODES.",
        "GAS PRICES UP. PUBLIC ANGRY.",
        "TURN CRISIS INTO VOTES.",
        "RULE THE NARRATIVE. PLAY NOW."
    ]

    cmd = [
        FFMPEG_PATH, "-y",
        "-loop", "1", "-t", "4", "-i", img_bg,
        "-loop", "1", "-t", "4", "-i", img_war,
        "-loop", "1", "-t", "7", "-i", img_map,
        "-i", audio,
        "-filter_complex", 
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v0];"
        "[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v1];"
        "[2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v2];"
        "[v0][v1][v2]concat=n=3:v=1:a=0,"
        "drawtext=text='" + caps[0] + "':fontcolor=red:fontsize=100:fontfile='" + FONT_PATH + "':x=(w-text_w)/2:y=(h-text_h)/2-100:enable='between(t,0,3.5)':bordercolor=black:borderw=5,"
        "drawtext=text='" + caps[1] + "':fontcolor=white:fontsize=80:fontfile='" + FONT_PATH + "':x=(w-text_w)/2:y=(h-text_h)/2+100:enable='between(t,4,7.5)':bordercolor=black:borderw=5,"
        "drawtext=text='" + caps[2] + "':fontcolor=yellow:fontsize=90:fontfile='" + FONT_PATH + "':x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,8,11.5)':bordercolor=black:borderw=5,"
        "drawtext=text='" + caps[3] + "':fontcolor=white:fontsize=100:fontfile='" + FONT_PATH + "':x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,12,15)':bordercolor=red:borderw=5[v]",
        "-map", "[v]", "-map", "3:a", 
        "-c:v", "libx264", "-t", "15", "-pix_fmt", "yuv420p", "-shortest", OUTPUT_PATH
    ]
    
    subprocess.run(cmd, check=True)
    print(f"LPG Crisis Reel saved to Desktop: {OUTPUT_PATH}")

if __name__ == "__main__":
    create_lpg_crisis_reel()
