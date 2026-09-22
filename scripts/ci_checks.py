#!/usr/bin/env python3
"""共通CIポリシーチェックの単一エントリ (Single entry point for CI policy checks).

common-workflows の base-ci.yml は、このファイルが存在すれば自動的に実行する。
プロジェクト固有の Python チェックをここに集約し、呼び出し側ワークフローの
`with:` を空に保つ。

現在の ActionsBoard-Solo のチェック項目:
  - バージョン整合性 (check_version.py)
"""

import subprocess
import sys

# 実行するチェックスクリプトの一覧（順に実行する）
CHECKS = [
    ("バージョン整合性 (Version Consistency)", ["python3", "scripts/check_version.py"]),
]


def main() -> int:
    failed = []
    for label, command in CHECKS:
        print(f"::group::{label}")
        result = subprocess.run(command)
        print("::endgroup::")
        if result.returncode != 0:
            failed.append(label)

    if failed:
        print("::error::以下のチェックに失敗しました: " + ", ".join(failed))
        return 1

    print("すべてのCIポリシーチェックに合格しました。 (All CI policy checks passed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
