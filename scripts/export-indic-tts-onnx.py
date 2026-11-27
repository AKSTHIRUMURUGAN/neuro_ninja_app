#!/usr/bin/env python3
"""
NeuroNinja — AI4Bharat Indic-TTS (MIT) -> sherpa-onnx ONNX Exporter
===================================================================
Converts AI4Bharat's MIT-licensed Indic-TTS checkpoints (or VITS/FastPitch+HiFiGAN)
into sherpa-onnx OfflineTts-compatible ONNX + tokens.txt bundles for modular CDN hosting.

Usage:
  python scripts/export-indic-tts-onnx.py --lang ta --checkpoint_dir ./indic_tts_ta --out_dir ./cdn_out/tts-ta-in

Supported language codes: ta (Tamil), hi (Hindi), te (Telugu), ml (Malayalam), kn (Kannada)
"""

import argparse
import hashlib
import json
import os
from pathlib import Path


SUPPORTED_LANGS = {
    "ta": {"id": "tts-ta-in", "name": "Tamil TTS", "native": "தமிழ்"},
    "hi": {"id": "tts-hi-in", "name": "Hindi TTS", "native": "हिन्दी"},
    "te": {"id": "tts-te-in", "name": "Telugu TTS", "native": "తెలుగు"},
    "ml": {"id": "tts-ml-in", "name": "Malayalam TTS", "native": "മലയാളം"},
    "kn": {"id": "tts-kn-in", "name": "Kannada TTS", "native": "ಕನ್ನಡ"},
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def export_onnx(lang: str, checkpoint_dir: Path, out_dir: Path, quantize_int8: bool) -> None:
    try:
        import torch
        import onnx
        from onnxruntime.quantization import QuantType, quantize_dynamic
    except ImportError as exc:
        raise SystemExit(
            "Missing export dependencies. Install with:\n"
            "  pip install torch onnx onnxruntime TTS"
        ) from exc

    out_dir.mkdir(parents=True, exist_ok=True)
    fp32_onnx = out_dir / "model.onnx"
    final_onnx = out_dir / ("model.int8.onnx" if quantize_int8 else "model.onnx")

    ckpt_path = next(checkpoint_dir.glob("*.pth"), None)
    cfg_path = checkpoint_dir / "config.json"
    if not ckpt_path or not cfg_path.exists():
        raise FileNotFoundError(
            f"Expected *.pth checkpoint and config.json inside {checkpoint_dir}"
        )

    # Load Coqui / AI4Bharat VITS or FastPitch+HiFiGAN checkpoint
    from TTS.utils.synthesizer import Synthesizer

    synth = Synthesizer(
        tts_checkpoint=str(ckpt_path),
        tts_config_path=str(cfg_path),
        use_cuda=False,
    )
    model = synth.tts_model
    model.eval()

    # Export tokens.txt from model character/phoneme symbols for sherpa-onnx OfflineTts
    tokens_path = out_dir / "tokens.txt"
    symbols = getattr(getattr(model, "tokenizer", None), "characters", None)
    if symbols is not None and hasattr(symbols, "characters"):
        vocab = list(symbols.characters)
    else:
        cfg_data = json.loads(cfg_path.read_text(encoding="utf-8"))
        vocab = cfg_data.get("characters", {}).get("characters", [])
    with tokens_path.open("w", encoding="utf-8") as f:
        for idx, sym in enumerate(vocab):
            f.write(f"{sym} {idx}\n")

    # Export ONNX graph with sherpa-onnx OfflineTtsVitsModelConfig metadata
    dummy_x = torch.randint(0, max(1, len(vocab)), (1, 32), dtype=torch.long)
    dummy_x_len = torch.tensor([32], dtype=torch.long)
    dummy_scales = torch.tensor([0.667, 1.0, 0.8], dtype=torch.float32)

    if hasattr(model, "export_onnx"):
        model.export_onnx(str(fp32_onnx))
    else:
        torch.onnx.export(
            model,
            (dummy_x, dummy_x_len, dummy_scales),
            str(fp32_onnx),
            opset_version=14,
            input_names=["x", "x_length", "scales"],
            output_names=["y"],
            dynamic_axes={"x": {0: "batch", 1: "text_len"}, "y": {0: "batch", 2: "audio_len"}},
        )

    onnx_model = onnx.load(str(fp32_onnx))
    meta = {
        "model_type": "vits",
        "comment": f"AI4Bharat Indic-TTS ({lang}) - MIT License",
        "sample_rate": "22050",
        "n_speakers": str(getattr(model, "num_speakers", 1)),
    }
    for k, v in meta.items():
        entry = onnx_model.metadata_props.add()
        entry.key = k
        entry.value = v
    onnx.save(onnx_model, str(fp32_onnx))

    if quantize_int8:
        quantize_dynamic(str(fp32_onnx), str(final_onnx), weight_type=QuantType.QUInt8)
        fp32_onnx.unlink(missing_ok=True)

    pack_id = SUPPORTED_LANGS[lang]["id"]
    manifest = {
        "id": pack_id,
        "licence": "MIT",
        "files": [
            {
                "name": final_onnx.name,
                "size": final_onnx.stat().st_size,
                "sha256": sha256_file(final_onnx),
            },
            {
                "name": "tokens.txt",
                "size": tokens_path.stat().st_size,
                "sha256": sha256_file(tokens_path),
            },
        ],
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Exported {pack_id} -> {out_dir} ({final_onnx.stat().st_size / 1e6:.1f} MB)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export AI4Bharat Indic-TTS to sherpa-onnx ONNX")
    parser.add_argument("--lang", required=True, choices=sorted(SUPPORTED_LANGS.keys()))
    parser.add_argument("--checkpoint_dir", required=True, type=Path)
    parser.add_argument("--out_dir", required=True, type=Path)
    parser.add_argument("--no_quantize", action="store_true")
    args = parser.parse_args()
    export_onnx(args.lang, args.checkpoint_dir, args.out_dir, quantize_int8=not args.no_quantize)


if __name__ == "__main__":
    main()
