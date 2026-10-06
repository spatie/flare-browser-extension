from pathlib import Path

from PIL import Image, ImageDraw


root = Path(__file__).resolve().parent.parent / "extension" / "icons"
root.mkdir(parents=True, exist_ok=True)

size = 512
image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((16, 16, 496, 496), radius=112, fill="#29135F")

scale = 5.8
left = (size - 41.25 * scale) / 2
top = (size - 64 * scale) / 2


def face(points, color):
    draw.polygon([(left + x * scale, top + y * scale) for x, y in points], fill=color)


face([(13.73, 31.985), (0, 23.997), (0, 7.99), (13.82, 16.037)], "#299467")
face([(27.46, 23.968), (0, 7.99), (13.73, 0), (41.25, 15.977)], "#58E9A9")
face([(13.73, 64), (0, 56.01), (0, 40.032), (13.7, 48.022)], "#7956E7")
face([(13.7, 48.023), (0, 40.033), (13.73, 32.016), (27.49, 40.033)], "#A995F7")

for icon_size in (16, 32, 48, 128):
    image.resize((icon_size, icon_size), Image.Resampling.LANCZOS).save(
        root / f"{icon_size}.png"
    )
