import asyncio
import os
import json
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw

# Constants
WIDTH = 1280
HEIGHT = 800
SIDE_PANEL_WIDTH = 320
ASSETS_DIR = "projects/web/assets"
APP_DIR = os.path.abspath("projects/app")
M3_BG_COLOR = "#fdfbff"  # Material 3 background color (light)
M3_DARK_BG_COLOR = "#1b1b1f"  # Material 3 background color (dark)

# Mock Data
MOCK_CONFIG = {
    "authConfigs": [
        {
            "id": "auth1",
            "name": "Personal GitHub",
            "pat": "********",
            "baseUrl": "https://api.github.com",
        },
        {
            "id": "auth2",
            "name": "Enterprise GitHub",
            "pat": "********",
            "baseUrl": "https://github.example.com/api/v3",
        },
    ],
    "workspaces": [
        {
            "id": "ws1",
            "name": "Main Project",
            "authConfigId": "auth1",
            "items": [
                {
                    "owner": "owner1",
                    "repo": "repo1",
                    "workflowFile": "ci.yml",
                    "alias": "CI Build",
                },
                {
                    "owner": "owner1",
                    "repo": "repo1",
                    "workflowFile": "deploy.yml",
                    "alias": "Production Deploy",
                },
                {
                    "owner": "owner1",
                    "repo": "repo2",
                    "workflowFile": "test.yml",
                    "alias": "Unit Tests",
                },
            ],
        },
        {
            "id": "ws2",
            "name": "Operations Dashboard",
            "authConfigId": "auth2",
            "items": [
                {
                    "owner": "ops",
                    "repo": "infra",
                    "workflowFile": "backup.yml",
                    "alias": "Nightly Backup",
                },
                {
                    "owner": "ops",
                    "repo": "infra",
                    "workflowFile": "audit.yml",
                    "alias": "Security Audit",
                },
            ],
        },
    ],
    "cache": {
        "runs": {
            "owner1/repo1/ci.yml": {
                "status": "completed",
                "conclusion": "success",
                "actor": "user1",
                "updated_at": "2023-10-27T10:00:00Z",
                "display_title": "feat: update layout",
                "html_url": "#",
            },
            "owner1/repo1/deploy.yml": {
                "status": "in_progress",
                "conclusion": None,
                "actor": "user1",
                "updated_at": "2023-10-27T10:05:00Z",
                "display_title": "deploy to prod",
                "html_url": "#",
            },
            "owner1/repo2/test.yml": {
                "status": "completed",
                "conclusion": "failure",
                "actor": "user1",
                "updated_at": "2023-10-27T09:50:00Z",
                "display_title": "fix: broken tests",
                "html_url": "#",
                "jobs_url": "#",
            },
            "ops/infra/backup.yml": {
                "status": "completed",
                "conclusion": "success",
                "actor": "system",
                "updated_at": "2023-10-27T02:00:00Z",
                "display_title": "scheduled backup",
                "html_url": "#",
            },
            "ops/infra/audit.yml": {
                "status": "completed",
                "conclusion": "failure",
                "actor": "system",
                "updated_at": "2023-10-27T03:00:00Z",
                "display_title": "weekly audit",
                "html_url": "#",
                "jobs_url": "#",
            },
        },
        "history": {
            "owner1/repo1/ci.yml": [{"status": "completed", "conclusion": "success"}]
            * 10,
            "owner1/repo1/deploy.yml": [
                {"status": "completed", "conclusion": "success"}
            ]
            * 9
            + [{"status": "in_progress", "conclusion": None}],
            "owner1/repo2/test.yml": [{"status": "completed", "conclusion": "success"}]
            * 5
            + [{"status": "completed", "conclusion": "failure"}] * 5,
            "ops/infra/backup.yml": [{"status": "completed", "conclusion": "success"}]
            * 10,
            "ops/infra/audit.yml": [{"status": "completed", "conclusion": "success"}]
            * 8
            + [{"status": "completed", "conclusion": "failure"}] * 2,
        },
        "pages": {"owner1/repo1": {"status": "deliverable", "page_url": "#"}},
    },
    "currentUser": {"auth1": "user1", "auth2": "admin"},
    "activeMode": "developer",
    "notificationSettings": {"scope": "all", "events": ["failure", "pages"]},
}


def get_mock_script(mode=None):
    config = MOCK_CONFIG.copy()
    if mode:
        config["activeMode"] = mode

    return f"""
    window.chrome = {{
        runtime: {{
            onConnect: {{ addListener: () => {{}} }},
            onMessage: {{ addListener: () => {{}} }},
            connect: () => ({{ onDisconnect: {{ addListener: () => {{}} }} }}),
            sendMessage: (msg, cb) => cb && cb({{status: 'ok'}}),
            getManifest: () => ({{ version: '1.0.2' }}),
            openOptionsPage: () => {{ console.log('Open options page'); }}
        }},
        storage: {{
            local: {{
                get: (keys) => Promise.resolve({json.dumps(config)}),
    filepath = os.path.join(ASSETS_DIR, filename)
    screenshot_bytes = await page.screenshot(animations="disabled")

    # Post-process to ensure 24-bit (remove alpha) and exact size
    with Image.open(io.BytesIO(screenshot_bytes)) as img:
        img = img.convert("RGB")
        if img.size != (width, height):
            new_img = Image.new("RGB", (width, height), M3_BG_COLOR)
            new_img.paste(img, ((width - img.width) // 2, (height - img.height) // 2))
            img = new_img
        img.save(filepath, "PNG")
            setPanelBehavior: () => Promise.resolve()
        }},
        permissions: {{
            request: () => Promise.resolve(true)
        }}
    }};

    // Mock fetch for logs
    const originalFetch = window.fetch;
    window.fetch = async (url, options) => {{
        if (url === '#') {{
            return {{
                ok: true,
        await page.set_viewport_size({"width": SIDE_PANEL_WIDTH, "height": HEIGHT})
        screenshot_bytes = await page.screenshot()

        full_view = Image.new("RGB", (WIDTH, HEIGHT), "#f0f0f0")
        draw = ImageDraw.Draw(full_view)
        draw.rectangle([0, 0, WIDTH - SIDE_PANEL_WIDTH, HEIGHT], fill="#ffffff")
        draw.rectangle([0, 0, WIDTH, 40], fill="#e0e0e0")
        draw.ellipse([20, 10, 35, 25], fill="#ff5f56")
        draw.ellipse([45, 10, 60, 25], fill="#ffbd2e")
        draw.ellipse([70, 10, 85, 25], fill="#27c93f")
        draw.rectangle([100, 10, WIDTH - 150, 30], fill="#ffffff", outline="#cccccc")
        draw.text((110, 15), "https://github.com/owner1/repo1", fill="#666666")

        with Image.open(io.BytesIO(screenshot_bytes)) as sp:
            full_view.paste(sp, (WIDTH - SIDE_PANEL_WIDTH, 40))
        full_view.save(os.path.join(ASSETS_DIR, "screenshot1_full_view.png"), "PNG")

async def capture_screenshot(page, filename, width=WIDTH, height=HEIGHT):
    os.makedirs(ASSETS_DIR, exist_ok=True)
    filepath = os.path.join(ASSETS_DIR, filename)
    await page.screenshot(path=filepath, animations="disabled")

    # Post-process to ensure 24-bit (remove alpha) and exact size
    with Image.open(filepath) as img:
        img = img.convert("RGB")
        if img.size != (width, height):
            new_img = Image.new("RGB", (width, height), M3_BG_COLOR)
            new_img.paste(img, ((width - img.width) // 2, (height - img.height) // 2))
            img = new_img
        img.save(filepath, "PNG")
    print(f"Saved {filepath}")


async def main():
    async with async_playwright() as p:
            screenshot_bytes = await mode_page.screenshot()
            with Image.open(io.BytesIO(screenshot_bytes)) as img:
                composite.paste(img, (i * col_width, 0))
        await page.add_init_script(get_mock_script(mode="developer"))
        await page.goto(f"file://{os.path.join(APP_DIR, 'popup/popup.html')}")
        await page.wait_for_timeout(1000)

        side_panel_path = os.path.join(ASSETS_DIR, "temp_side_panel.png")
        await page.set_viewport_size({"width": SIDE_PANEL_WIDTH, "height": HEIGHT})
        await page.screenshot(path=side_panel_path)

        full_view = Image.new("RGB", (WIDTH, HEIGHT), "#f0f0f0")
        draw = ImageDraw.Draw(full_view)
        draw.rectangle([0, 0, WIDTH - SIDE_PANEL_WIDTH, HEIGHT], fill="#ffffff")
        draw.rectangle([0, 0, WIDTH, 40], fill="#e0e0e0")
        draw.ellipse([20, 10, 35, 25], fill="#ff5f56")
        draw.ellipse([45, 10, 60, 25], fill="#ffbd2e")
        draw.ellipse([70, 10, 85, 25], fill="#27c93f")
        draw.rectangle([100, 10, WIDTH - 150, 30], fill="#ffffff", outline="#cccccc")
        draw.text((110, 15), "https://github.com/owner1/repo1", fill="#666666")

        with Image.open(side_panel_path) as sp:
            full_view.paste(sp, (WIDTH - SIDE_PANEL_WIDTH, 40))
        full_view.save(os.path.join(ASSETS_DIR, "screenshot1_full_view.png"), "PNG")
        os.remove(side_panel_path)
        print("Saved screenshot1_full_view.png")

        # 2. Modes Composite
        modes = ["developer", "team", "operations"]
        composite = Image.new("RGB", (WIDTH, HEIGHT), M3_BG_COLOR)
        col_width = WIDTH // 3
        for i, mode in enumerate(modes):
            # Create a new context/page for each mode to ensure clean init script
            mode_page = await context.new_page()
            await mode_page.set_viewport_size({"width": col_width, "height": HEIGHT})
            await mode_page.add_init_script(get_mock_script(mode=mode))
            await mode_page.goto(f"file://{os.path.join(APP_DIR, 'popup/popup.html')}")
            await mode_page.wait_for_timeout(1000)

            if mode == "team":
                await mode_page.wait_for_selector(".workspace-header")
                await mode_page.click(".workspace-header")
                await mode_page.wait_for_timeout(200)

            mode_path = os.path.join(ASSETS_DIR, f"temp_{mode}.png")
            await mode_page.screenshot(path=mode_path)
            with Image.open(mode_path) as img:
                composite.paste(img, (i * col_width, 0))
            os.remove(mode_path)
            await mode_page.close()

        composite.save(
            os.path.join(ASSETS_DIR, "screenshot2_modes_composite.png"), "PNG"
        )
        print("Saved screenshot2_modes_composite.png")

        # 3. Developer Mode (Focused)
        page_dev = await context.new_page()
        await page_dev.set_viewport_size({"width": SIDE_PANEL_WIDTH, "height": HEIGHT})
        await page_dev.add_init_script(get_mock_script(mode="developer"))
        await page_dev.goto(f"file://{os.path.join(APP_DIR, 'popup/popup.html')}")
        await page_dev.wait_for_timeout(1000)

        dev_panel_path = os.path.join(ASSETS_DIR, "temp_dev.png")
        await page_dev.screenshot(path=dev_panel_path)

        dev_focused = Image.new("RGB", (WIDTH, HEIGHT), M3_BG_COLOR)
        with Image.open(dev_panel_path) as img:
            dev_focused.paste(img, ((WIDTH - SIDE_PANEL_WIDTH) // 2, 0))
        dev_focused.save(
            os.path.join(ASSETS_DIR, "screenshot3_developer_mode.png"), "PNG"
        )
        os.remove(dev_panel_path)
        print("Saved screenshot3_developer_mode.png")
        await page_dev.close()

        # 4. Operations Mode (with Logs)
        page_ops = await context.new_page()
        await page_ops.set_viewport_size({"width": SIDE_PANEL_WIDTH, "height": HEIGHT})
        await page_ops.add_init_script(get_mock_script(mode="operations"))
        await page_ops.goto(f"file://{os.path.join(APP_DIR, 'popup/popup.html')}")
        await page_ops.wait_for_timeout(1000)
        await page_ops.wait_for_selector(".log-toggle")
        await page_ops.click(".log-toggle")
        await page_ops.wait_for_timeout(500)

        ops_panel_path = os.path.join(ASSETS_DIR, "temp_ops.png")
        await page_ops.screenshot(path=ops_panel_path)

        ops_focused = Image.new("RGB", (WIDTH, HEIGHT), M3_BG_COLOR)
        with Image.open(ops_panel_path) as img:
            ops_focused.paste(img, ((WIDTH - SIDE_PANEL_WIDTH) // 2, 0))
        ops_focused.save(
            os.path.join(ASSETS_DIR, "screenshot4_operations_mode.png"), "PNG"
        )
        os.remove(ops_panel_path)
        print("Saved screenshot4_operations_mode.png")
        await page_ops.close()

        # 5. Options Page
        page_opt = await context.new_page()
        await page_opt.set_viewport_size({"width": WIDTH, "height": HEIGHT})
        await page_opt.add_init_script(get_mock_script())
        await page_opt.goto(f"file://{os.path.join(APP_DIR, 'options/options.html')}")
        await page_opt.wait_for_timeout(1000)
        await capture_screenshot(page_opt, "screenshot5_options_page.png")
        await page_opt.close()

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
