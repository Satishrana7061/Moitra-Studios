import os
import sys
from PIL import Image

def optimize_avatars(directory):
    if not os.path.isdir(directory):
        print(f"Error: Directory {directory} not found.")
        sys.exit(1)

    count = 0
    saved_bytes = 0
    for filename in os.listdir(directory):
        if filename.casefold().endswith('.png'):
            filepath = os.path.join(directory, filename)
            webp_filepath = os.path.join(directory, filename[:-4] + '.webp')
            
            try:
                img = Image.open(filepath)
                # Convert RGBA to RGB for webp if necessary (Pillow handles RGBA to webp lossy fine normally, but let's be explicit)
                # WebP supports alpha channel.
                original_size = os.path.getsize(filepath)
                img.save(webp_filepath, 'webp', quality=80)
                new_size = os.path.getsize(webp_filepath)
                
                print(f"Converted {filename} ({original_size//1024}KB) to WebP ({new_size//1024}KB).")
                os.remove(filepath)
                saved_bytes += (original_size - new_size)
                count += 1
            except Exception as e:
                print(f"Failed to convert {filename}: {e}")

    print(f"\nOptimization complete! Converted {count} images.")
    print(f"Total space saved: {saved_bytes / (1024*1024):.2f} MB")

if __name__ == "__main__":
    avatars_dir = os.path.join(os.getcwd(), 'public', 'Avaters')
    optimize_avatars(avatars_dir)
