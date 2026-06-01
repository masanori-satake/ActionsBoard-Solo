import json
import sys
import os
import re


def check_version_consistency():
    try:
        # 1. projects/app/manifest.json
        manifest_path = "projects/app/manifest.json"
        if not os.path.exists(manifest_path):
            print(f"Error: {manifest_path} not found", file=sys.stderr)
            return False
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest_version = json.load(f).get("version")

        # 2. package.json
        package_path = "package.json"
        if not os.path.exists(package_path):
            print(f"Error: {package_path} not found", file=sys.stderr)
            return False
        with open(package_path, "r", encoding="utf-8") as f:
            package_json = json.load(f)
            package_version = package_json.get("version")

        # 3. package-lock.json (Mandatory)
        lock_path = "package-lock.json"
        if not os.path.exists(lock_path):
            print(f"Error: {lock_path} not found", file=sys.stderr)
            return False
        with open(lock_path, "r", encoding="utf-8") as f:
            package_lock_json = json.load(f)
            lock_version = package_lock_json.get("version")

        # 4. README.md (Badge version)
        readme_path = "README.md"
        readme_version = None
        if not os.path.exists(readme_path):
            print(f"Error: {readme_path} not found", file=sys.stderr)
            return False
        with open(readme_path, "r", encoding="utf-8") as f:
            content = f.read()
            # Regex to match version in shields.io badge (supports SemVer including alpha/beta pre-release)
            # Shields.io URL format: version-{version}-{color}
            # Note: Hyphens in version are encoded as double hyphens (--) in shields.io URLs
            match = re.search(
                r"img\.shields\.io/badge/version-([a-zA-Z0-9\.\-]+)-[a-zA-Z]+", content
            )
            if match:
                readme_version = match.group(1).replace("--", "-")

        versions = {
            "projects/app/manifest.json": manifest_version,
            "package.json": package_version,
            "package-lock.json": lock_version,
            "README.md": readme_version,
        }

        print("Checking version consistency:")
        for source, version in versions.items():
            print(f" - {source}: {version}")
            if not version:
                print(
                    f"Error: Version is missing or empty in {source}", file=sys.stderr
                )
                return False

        if len(set(versions.values())) > 1:
            print("\nError: Version mismatch detected!", file=sys.stderr)
            return False

        print(f"\nAll versions are consistent: {package_version}")
        return True
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    if not check_version_consistency():
        sys.exit(1)
