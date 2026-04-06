#!/usr/bin/env python3

import argparse
import sys

from local_dev import run_doctor


def build_parser() -> argparse.ArgumentParser:
    return argparse.ArgumentParser(
        description="Check whether the local Guided Pain Discovery environment is ready.",
    )


def main(argv: list[str] | None = None) -> int:
    build_parser().parse_args(argv)
    return run_doctor()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
