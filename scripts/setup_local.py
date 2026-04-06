#!/usr/bin/env python3

import argparse
import sys

from local_dev import run_setup


def build_parser() -> argparse.ArgumentParser:
    return argparse.ArgumentParser(
        description="Bootstrap the local Guided Pain Discovery development environment.",
    )


def main(argv: list[str] | None = None) -> int:
    build_parser().parse_args(argv)
    return run_setup()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
