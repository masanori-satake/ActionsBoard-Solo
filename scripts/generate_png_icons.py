import os
import sys

def generate_icons(output_dir=None, bg_color=None, file_prefix="icon"):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(script_dir)
    svg_path = os.path.join(root_dir, "projects/app/assets/icon.svg")
    output_dir = os.path.abspath(output_dir) if output_dir else os.path.join(root_dir, "projects/app/icons")

    if not os.path.exists(svg_path):
        print(f"Error: {svg_path} not found.")
        return False

    with open(svg_path, "r", encoding="utf-8") as f:
        svg_content = f.read()

    if bg_color:
        # Replace the default black color (#1b1b1f) with the new bg_color if needed
        # But for this project, we primarily use the default or explicitly passed color.
        svg_content = svg_content.replace("#1b1b1f", bg_color)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Error: playwright not found. Please install it with 'pip install playwright' and 'playwright install chromium'.")
        return False

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 512, "height": 512})
        page.set_content(f'<!DOCTYPE html><html><head><style>html, body {{ margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }} svg {{ width: 100%; height: 100%; display: block; }}</style></head><body>{svg_content}</body></html>')

        for size in [16, 32, 48, 128]:
            out = os.path.join(output_dir, f"{file_prefix}{size}.png")
            page.set_viewport_size({"width": size, "height": size})
            # Brief wait for rendering
            page.wait_for_timeout(100)
            page.screenshot(path=out, omit_background=True)
            print(f"Generated {out}")
        browser.close()
    return True

if __name__ == "__main__":
    output_dir = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != "" else None
    bg_color = sys.argv[2] if len(sys.argv) > 2 else None
    file_prefix = sys.argv[3] if len(sys.argv) > 3 else "icon"
    if not generate_icons(output_dir, bg_color, file_prefix):
        sys.exit(1)
