import cv2
import struct
import gzip

CHARS = [' ', '░', '▒', '▓', '█']


def convert_frame_to_text(frame, width, height):
    resized = cv2.resize(frame, (width, height))
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    normalized = (gray / 255 * 4).astype(int)

    text_frame = []
    for row in normalized:
        text_row = ''.join([CHARS[pixel] for pixel in row])
        text_frame.append(text_row)

    return text_frame


def encode_frame(text_frame):
    symbol_mapping = {
        ' ': 0,
        '░': 1,
        '▒': 2,
        '▓': 3,
        '█': 4
    }

    pixels = []
    for row in text_frame:
        for char in row:
            pixels.append(symbol_mapping[char])
    return pixels


def pack_pixels(pixels):
    packed_data = bytearray()
    current_byte = 0
    bit_count = 0

    for pixel in pixels:
        current_byte = (current_byte << 3) | pixel
        bit_count += 3

        if bit_count >= 8:
            packed_data.append(current_byte >> (bit_count - 8))
            current_byte &= (1 << (bit_count - 8)) - 1
            bit_count -= 8

    if bit_count > 0:
        packed_data.append(current_byte << (8 - bit_count))

    return packed_data


def encode_video(video_path, output_path, width=88, height=36):
    cap = cv2.VideoCapture(video_path)
    frames = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        text_frame = convert_frame_to_text(frame, width, height)
        frames.append(encode_frame(text_frame))

    cap.release()

    with gzip.open(output_path, 'wb') as f:
        f.write(struct.pack('>H', len(frames)))

        for pixels in frames:
            packed = pack_pixels(pixels)
            f.write(packed)


if __name__ == "__main__":
    video_path = "sasflag.mp4"
    output_path = "bad_flag.bin"
    encode_video(video_path, output_path)
