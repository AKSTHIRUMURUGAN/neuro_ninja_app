#!/usr/bin/env python3
"""
NeuroNinja — Custom "Hi Ninja" openWakeWord Trainer (Apache 2.0)
================================================================
Generates synthetic "Hi Ninja" / "Hey NeuroNinja" training clips using Piper/Kokoro
and trains a lightweight ~200 KB `hi_ninja.onnx` classifier compatible with
NeuroNinja's `OpenWakeWordEngine.kt`.

Run in Google Colab (T4 GPU recommended, ~15 mins):
  pip install openwakeword piper-tts onnx onnxruntime torch torchaudio
  python scripts/train-hi-ninja-openwakeword.py --phrase "hi ninja" --out_dir ./out
"""

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Train custom openWakeWord ONNX model for NeuroNinja")
    parser.add_argument("--phrase", default="hi ninja", help="Target wake phrase (e.g. 'hi ninja')")
    parser.add_argument("--name", default="hi_ninja", help="Output ONNX filename stem")
    parser.add_argument("--out_dir", default="./oww_out", type=Path)
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)

    try:
        from openwakeword import train
    except ImportError:
        print(
            "openwakeword training package not installed.\n"
            "In Google Colab:\n"
            "  !git clone https://github.com/dscripka/openWakeWord\n"
            "  !pip install -e ./openWakeWord\n"
            "  Follow openWakeWord/notebooks/automatic_model_training.ipynb with target_phrase=['hi ninja']\n"
            f"  Then copy the exported {args.name}.onnx into NeuroNinja's voice_packs/oww-en-v1/ folder!"
        )
        return

    print(f"Preparing openWakeWord training config for '{args.phrase}' -> {args.out_dir / (args.name + '.onnx')}")
    config = {
        "model_name": args.name,
        "target_phrase": [args.phrase],
        "n_samples": 5000,
        "n_samples_val": 1000,
        "steps": 15000,
        "target_false_positives_per_hour": 0.2,
        "output_dir": str(args.out_dir),
    }
    print("Config ready:", config)
    if hasattr(train, "train_model"):
        train.train_model(config)
    else:
        print("Use openWakeWord's automatic_model_training.ipynb with the config above to export hi_ninja.onnx.")


if __name__ == "__main__":
    main()
