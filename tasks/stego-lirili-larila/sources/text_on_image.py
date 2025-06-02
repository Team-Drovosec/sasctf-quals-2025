import argparse
import os

from PIL import Image, ImageDraw, ImageFont


def create_text_image(
    text,
    output_path,
    width=384,
    height=384,
    font_size=40,
    text_color=(255, 255, 255),
    bg_color=(0, 0, 0),
    position=None,
):
    image = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(image)

    try:
        font_paths = ["fonts/paseca_font.ttf"]

        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, font_size)
                break

        if font is None:
            font = ImageFont.load_default()
            print(
                "System font not found"
            )
    except Exception as e:
        print(f"Failed to load font: {e}")
        font = ImageFont.load_default()

    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]

    if position is None:
        x = (width - text_width) // 2
        y = (height - text_height) // 2
    else:
        x, y = position

    draw.text((x, y), text, font=font, fill=text_color)

    image.save(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("text", help="Text")
    parser.add_argument("output", help="Output path")
    parser.add_argument("--width", type=int, default=384, help="Image width")
    parser.add_argument("--height", type=int, default=384, help="Image height")
    parser.add_argument("--font-size", type=int, default=40, help="Font size")
    parser.add_argument(
        "--text-color", type=str, default="0,0,0", help="Text color (R,G,B)"
    )
    parser.add_argument(
        "--bg-color", type=str, default="255,255,255", help="Background color (R,G,B)"
    )
    parser.add_argument("--position", type=str, help="Text position (x,y)")

    args = parser.parse_args()

    text_color = tuple(map(int, args.text_color.split(",")))
    bg_color = tuple(map(int, args.bg_color.split(",")))

    position = None
    if args.position:
        position = tuple(map(int, args.position.split(",")))

    create_text_image(
        args.text,
        args.output,
        args.width,
        args.height,
        args.font_size,
        text_color,
        bg_color,
        position,
    )
