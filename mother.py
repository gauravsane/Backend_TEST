import argparse
import os
import json
import subprocess
import uuid
import shutil
from moviepy.editor import VideoFileClip, CompositeVideoClip

# CLI setup
parser = argparse.ArgumentParser(description="Create animated name video/gif.")
parser.add_argument("--name", required=True, help="Name to animate (e.g. 'John Doe')")
parser.add_argument("--output", required=True, help="Output file path (e.g. 'output.gif')")
args = parser.parse_args()

NAME = args.name.upper()
OUTPUT_PATH = args.output

# Generate UUID folder for temp
temp_id = str(uuid.uuid4())
TEMP_DIR = os.path.join("temp", temp_id)
os.makedirs(TEMP_DIR, exist_ok=True)

TEMP_MP4_PATH = os.path.join(TEMP_DIR, "temp_output.mp4")
PALETTE_PATH = os.path.join(TEMP_DIR, "palette.png")

# Config
TEMPLATE_PATH = "base.mp4"
ALPHABET_GIF_DIR = "alphabet_gifs"
TEXT_START_TIME = 2  # in seconds
TEXT_END_TIME = 8
FPS = 24
SPACE_WIDTH = 12  # px space between words
Y_POSITION = -15
scale_factor = 0.7

# Load base template video
base_clip = VideoFileClip(TEMPLATE_PATH)

# Load GIF sizes
with open("gif_sizes.json") as f:
    gif_sizes = json.load(f)

# Calculate total width of the name
total_width = 0
for char in NAME:
    if char == " ":
        total_width += SPACE_WIDTH
    else:
        total_width += int(gif_sizes[char][0] * scale_factor)

video_width = base_clip.w
start_x = (video_width - total_width) // 2

# Prepare animated letters
letter_clips = []
current_x = start_x
letter_index = 0
max_anim_dur = TEXT_END_TIME - TEXT_START_TIME
num_char = len(NAME.replace(" ", ""))
delay_bet_let = max_anim_dur / max(num_char, 1)

for char in NAME:
    if char == " ":
        current_x += SPACE_WIDTH
        continue

    gif_path = os.path.join(ALPHABET_GIF_DIR, f"{char}.gif")
    gif_clip = VideoFileClip(gif_path, has_mask=True).resize(scale_factor)
    char_width = int(gif_sizes[char][0] * scale_factor)
    start_time = TEXT_START_TIME + letter_index * delay_bet_let

    gif_clip = (
        gif_clip.set_start(start_time)
        .set_duration(base_clip.duration - start_time)
        .set_position((current_x, Y_POSITION))
    )

    letter_clips.append(gif_clip)
    current_x += char_width
    letter_index += 1

# Compose the final clip
final = CompositeVideoClip([base_clip] + letter_clips)

# Write temp MP4
print("Rendering temp MP4...")
final.write_videofile(TEMP_MP4_PATH, fps=FPS)

# If output is .gif → convert using ffmpeg with palette
if OUTPUT_PATH.lower().endswith(".gif"):
    print("Converting MP4 to smooth GIF...")

    subprocess.call([
        "ffmpeg", "-y", "-i", TEMP_MP4_PATH, "-vf",
        f"fps={FPS},scale=1080:-1:flags=lanczos,palettegen", PALETTE_PATH
    ])

    subprocess.call([
        "ffmpeg", "-y", "-i", TEMP_MP4_PATH, "-i", PALETTE_PATH, "-filter_complex",
        f"fps={FPS},scale=1080:-1:flags=lanczos[x];[x][1:v]paletteuse", OUTPUT_PATH
    ])

    print(f"Smooth GIF saved at: {OUTPUT_PATH}")

else:
    # Direct MP4 export if .gif is not required
    os.rename(TEMP_MP4_PATH, OUTPUT_PATH)
    print(f"MP4 video saved at: {OUTPUT_PATH}")

# Cleanup
shutil.rmtree(TEMP_DIR)
