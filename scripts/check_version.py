import json
import sys
import os


def check_version_consistency():
    try:
        # 1. projects/app/manifest.json
        manifest_path = "projects/app/manifest.json"
        if not os.path.exists(manifest_path):
            print(f"Error: {manifest_path} not found")
            return False
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest_version = json.load(f).get("version")

        # 2. package.json
        package_path = "package.json"
        if not os.path.exists(package_path):
            print(f"Error: {package_path} not found")
            return False
        with open(package_path, "r", encoding="utf-8") as f:
            package_json = json.load(f)
            package_version = package_json.get("version")

        # 3. package-lock.json (Mandatory)
        lock_path = "package-lock.json"
        if not os.path.exists(lock_path):
            print(f"Error: {lock_path} not found")
            return False
        with open(lock_path, "r", encoding="utf-8") as f:
            package_lock_json = json.load(f)
            lock_version = package_lock_json.get("version")

        versions = {
            "projects/app/manifest.json": manifest_version,
            "package.json": package_version,
            "package-lock.json": lock_version,
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
            print("\nError: Version mismatch detected!")
            return False

        print(f"\nAll versions are consistent: {package_version}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


if __name__ == "__main__":
    if not check_version_consistency():
        sys.exit(1)
