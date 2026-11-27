# NeuroNinja Voice & AI CDN Hosting Guide (Commercial-Safe)

All built-in downloads in NeuroNinja use permissive **MIT** or **Apache 2.0** licenses only (no `CC-BY-NC` or `GPL-3.0`).

## 1. Why Indic TTS (`ta`, `hi`, `te`, `ml`, `kn`) Defaults to `OS Offline TTS`
- Official [`AI4Bharat/Indic-TTS`](https://github.com/AI4Bharat/Indic-TTS) (MIT) publishes PyTorch checkpoints (`*.pth`), not pre-exported `sherpa-onnx` ONNX files.
- Public `vits-mms-*` packs use `CC-BY-NC-4.0` (non-commercial), so NeuroNinja excludes them.
- Without CDN files, NeuroNinja automatically uses Android's built-in offline Indic TTS (`expo-speech`).

## 2. Export & Host AI4Bharat Indic-TTS on Your CDN
1. Download the desired MIT checkpoint (`ta`, `hi`, `te`, `ml`, `kn`) from `AI4Bharat/Indic-TTS`.
2. Run the 1-time ONNX exporter:
   ```bash
   python scripts/export-indic-tts-onnx.py --lang ta --checkpoint_dir ./indic_tts_ta --out_dir ./cdn_out/tts-ta-in
   ```
3. Zip or upload `tts-ta-in.zip` (`model.int8.onnx`, `tokens.txt`) to your CDN (e.g., `https://cdn.yourdomain.com/bharatvoice/tts-ta-in.zip`).
4. Paste `https://cdn.yourdomain.com/bharatvoice` into **Settings -> Offline Voice Packs -> Modular Pack CDN Base URL** and tap **Save**.
5. The `OS Offline TTS` button on Tamil/Hindi/Telugu/Malayalam/Kannada immediately becomes a **1-tap Download** button!
