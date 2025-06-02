import random

import numpy as np
from PIL import Image


def optimize_gif(input_gif_path, output_gif_path, text_images=None, frame_numbers=None):
    gif = Image.open(input_gif_path)
    frames = []
    palettes = []
    durations = []
    for frame_index in range(gif.n_frames):
        gif.seek(frame_index)
        durations.append(gif.info.get("duration", 100))

        frame_p = gif.convert("P").copy()

        original_palette = frame_p.getpalette()

        if original_palette is None:
            gif_temp = Image.open(input_gif_path)
            gif_temp.seek(frame_index)
            frame_p = gif_temp.convert("P").copy()
            original_palette = frame_p.getpalette()

        frame_data = np.array(frame_p, dtype=np.uint32)
        unique_indices, counts = np.unique(frame_data, return_counts=True)
        new_palette = []

        if len(unique_indices) == 1:
            idx = unique_indices[0]
            r, g, b = original_palette[idx * 3 : idx * 3 + 3]
            new_palette = [r, g, b] * 256 
        else:
            new_palette = []
            for idx in unique_indices:
                r, g, b = original_palette[idx * 3 : idx * 3 + 3]
                new_palette.extend([r, g, b])

            sorted_indices = [
                i for _, i in sorted(zip(counts, unique_indices), reverse=True)
            ]

            slots_remaining = 256 - len(unique_indices)
            if slots_remaining > 0:
                total_pixels = np.sum(counts)
                slots_assigned = 0

                for idx in sorted_indices:
                    if slots_assigned >= slots_remaining:
                        break

                    count = counts[list(unique_indices).index(idx)]
                    proportion = count / total_pixels
                    slots = max(
                        1,
                        min(
                            slots_remaining - slots_assigned,
                            int(slots_remaining * proportion),
                        ),
                    )

                    r, g, b = original_palette[idx * 3 : idx * 3 + 3]
                    new_palette.extend([r, g, b] * slots)
                    slots_assigned += slots

                if slots_assigned < slots_remaining:
                    most_popular_idx = sorted_indices[0]
                    r, g, b = original_palette[
                        most_popular_idx * 3 : most_popular_idx * 3 + 3
                    ]
                    new_palette.extend([r, g, b] * (slots_remaining - slots_assigned))

        new_palette = new_palette[: 256 * 3]

        original_idx_to_color = {}
        for idx in np.unique(frame_data):
            if idx * 3 + 2 < len(original_palette):
                r = original_palette[idx * 3]
                g = original_palette[idx * 3 + 1]
                b = original_palette[idx * 3 + 2]
                original_idx_to_color[idx] = (r, g, b)

        color_to_new_indices = {}
        for idx in range(min(256, len(new_palette) // 3)):
            r = new_palette[idx * 3]
            g = new_palette[idx * 3 + 1]
            b = new_palette[idx * 3 + 2]
            color = (r, g, b)

            if color not in color_to_new_indices:
                color_to_new_indices[color] = []
            color_to_new_indices[color].append(idx)

        new_frame_data = np.zeros_like(frame_data)

        for original_idx in np.unique(frame_data):
            if original_idx not in original_idx_to_color:
                continue

            color = original_idx_to_color[original_idx]

            mask = frame_data == original_idx

            if color in color_to_new_indices:
                new_indices = color_to_new_indices[color]

                if len(new_indices) > 1 and np.any(mask):
                    pixel_count = np.sum(mask)
                    random_indices = np.random.choice(new_indices, size=pixel_count)
                    new_frame_data[mask] = random_indices
                else:
                    new_frame_data[mask] = new_indices[0]
            else:
                new_frame_data[mask] = original_idx

        frame_data = new_frame_data

        new_frame = Image.new("P", frame_p.size)
        new_frame.putdata(list(frame_data.flatten()))
        new_frame.putpalette(new_palette)
        actual_palette = new_frame.getpalette()
        frame_data = np.array(new_frame, dtype=np.uint8)

        color_to_indices = {}
        for i in range(256):
            if i * 3 + 2 < len(actual_palette):
                r, g, b = actual_palette[i * 3 : i * 3 + 3]
                color = (r, g, b)
                if color not in color_to_indices:
                    color_to_indices[color] = []
                color_to_indices[color].append(i)

        duplicate_colors = {
            color: indices
            for color, indices in color_to_indices.items()
            if len(indices) > 1
        }
        if duplicate_colors:
            new_data = np.array(frame_data, copy=True)

            for color, indices in duplicate_colors.items():
                for idx in indices:
                    pixels = np.where(frame_data == idx)
                    if len(pixels[0]) > 0:
                        random_indices = np.random.choice(indices, size=len(pixels[0]))
                        for i in range(len(pixels[0])):
                            new_data[pixels[0][i], pixels[1][i]] = random_indices[i]

            randomized_frame = Image.new("P", new_frame.size)
            randomized_frame.putpalette(actual_palette)
            randomized_frame.putdata(list(new_data.flatten()))

            randomized_frame.info.pop(
                "transparency", None
            )
            randomized_frame.info["disposal"] = (
                2
            )

            if text_images and frame_numbers and frame_index in frame_numbers:
                text_img_idx = frame_numbers.index(frame_index)
                text_img_path = text_images[text_img_idx]

                text_img = Image.open(text_img_path).convert(
                    "L"
                )

                white_indices = []
                frame_data = np.array(randomized_frame)
                white_color = (
                    actual_palette[frame_data[0][0] * 3],
                    actual_palette[frame_data[0][0] * 3 + 1],
                    actual_palette[frame_data[0][0] * 3 + 2],
                )
                for i in range(256):
                    if i * 3 + 2 < len(actual_palette):
                        r, g, b = actual_palette[i * 3 : i * 3 + 3]
                        if (
                            r == white_color[0]
                            and g == white_color[1]
                            and b == white_color[2]
                        ):
                            white_indices.append(i)
                white_indx = max([random.choice(white_indices) for _ in range(5)])
                white_indx_2 = min([random.choice(white_indices) for _ in range(5)])

                if 255 - white_indx_2 > white_indx:
                    white_indx = white_indx_2

                print(white_indx)
                print(white_indx_2)

                if white_indx:
                    text_data = np.array(text_img)

                    for y in range(min(text_data.shape[0], frame_data.shape[0])):
                        for x in range(min(text_data.shape[1], frame_data.shape[1])):
                            if text_data[y, x] < 128:
                                frame_data[y, x] = white_indx

                    randomized_frame.putdata(list(frame_data.flatten()))
                    randomized_frame.putpalette(actual_palette)

            frames.append(randomized_frame)
            palettes.append(actual_palette)
        else:
            if "transparency" in gif.info:
                new_frame.info["transparency"] = gif.info["transparency"]

            frames.append(new_frame)
            palettes.append(actual_palette)

    frames[0].save(
        output_gif_path,
        save_all=True,
        append_images=frames[1:],
        loop=0,
        optimize=False,
        disposal=2,
    )


text_images = [
    "text_images/frame_1.png",
    "text_images/frame_2.png",
    "text_images/frame_3.png",
    "text_images/frame_4.png",
    "text_images/frame_5.png",
    "text_images/frame_6.png",
]

frame_numbers = [0, 1, 4, 5, 7, 9]

optimize_gif("lirili_mini.gif", "output.gif", text_images, frame_numbers)
