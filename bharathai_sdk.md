# **Indian Voice AI Engine — Final Technical Architecture**



Architecture finalized

Android + iOS

Offline-first SDK



Your product will be a reusable, multilingual speech SDK supporting **all 22 Indian scheduled languages plus Indian English**, with local speech recognition, speech synthesis and optional voice cloning.

The architecture will prioritize:

1. High-quality natural Indian-language voices.
2. Low storage consumption through downloadable model packs.
3. Offline operation without API keys or internet.
4. Android and iOS native inference.
5. Tamil-English and Hindi-English code-switching.
6. Optional voice cloning performed locally.
7. A modular architecture that allows you to replace models without changing application integrations.

One important technical distinction: a model that supports 22 languages is not necessarily lightweight enough to run on mobile. We will use different model families for different purposes rather than forcing one large model to handle everything.

## **1. Product definition**

Working product name: **BharatVoice Engine**

# **BharatVoice**

Offline Indian Speech Intelligence SDK

**STT**

# **22+**

Languages and dialect evaluation

**TTS**

# **22+**

Language-specific voices

**Voice cloning**

# **Local**

Optional downloadable engine

**Inference**

# **100%**

Offline after model installation

### **Language coverage**

The initial language catalog will contain:

| Group            | Languages                             |
| ---------------- | ------------------------------------- |
| South Indian     | Tamil, Telugu, Kannada, Malayalam     |
| North Indian     | Hindi, Punjabi, Urdu, Kashmiri, Dogri |
| West Indian      | Gujarati, Marathi, Konkani, Sindhi    |
| East Indian      | Bengali, Assamese, Odia               |
| Northeast Indian | Bodo, Manipuri, Santali               |
| Other scheduled  | Sanskrit, Maithili                    |
| English          | Indian English                        |

These are the 22 languages in the Eighth Schedule of the Indian Constitution, plus English. Regional dialects and colloquial variants will be separately evaluated and added where suitable datasets exist.

## **2. Final model selection**

This is the most important part of the architecture.

I recommend a model portfolio rather than one universal model.

### **A. Speech-to-Text model portfolio**

Primary STT model

**AI4Bharat IndicConformer**

- Covers all 22 scheduled Indian languages.
- Language-specific model selection.
- CTC and RNN-T decoding options in its original implementation.
- MIT-licensed model family.
- Strong starting point for an offline Indian-language engine.&#x20;

  [image](https://www.google.com/s2/favicons?domain=https://ai4bharat.iitm.ac.in\&sz=32)

  ai4bharat.iitm.ac.in



Model information: [IndicConformer ASR](https://github.com/AI4Bharat/IndicConformerASR?utm_source=chatgpt.com).

**Deployment strategy:** Use validated ONNX exports where available, with sherpa-onnx as the initial runtime target. Do not assume every original NeMo checkpoint is directly compatible with sherpa-onnx; conversion and output parity must be tested.

**STT fallback and specialist models**

[Whisper – DPHN](https://images.openai.com/static-rsc-4/7dsK_Jh4BBdMLS6-5AjqkGJ2Wlfuc9FRGY4KZ_HnYlYzMiWgPrHOcPG_4Q15bwPjkBHIg7QvtqvKQiOIsmpl4JHyHu74ENna6XY9dCBsAuPtfgW3fADc9B4NJ6K6242Uk1YmY2FFVnegNN5DJmYZPdUvmpvEjMBtqUOawwwPCJg?purpose=inline)

**Whisper Tiny / Base**

Use as an alternate recognizer and for difficult multilingual inputs. INT8 and other optimized exports should be benchmarked before distribution.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+1



[Whisper repository](https://github.com/openai/whisper?utm_source=chatgpt.com)

[Qwen: AI チャットアシスタント | AI Dreamhub](https://images.openai.com/static-rsc-4/IDDoAyJvDsSzjL9W-V37Bb_1rErIzZVq4BO1JKUVVzpO4oMHQSSpTPoqZj4g3RmnmMUBQbsEBw4pjnFLZUnjiI0qxI43dqOD6RzwFUYox2db0WCRGSgWFCkzd_GtBSn6SquJi_k0Uy5tWLSk0bXfCJ81QzbSAWaG7pHNhnYa1dU?purpose=inline)

**Hinglish and code-switching specialist**

Benchmark a specialist model against IndicConformer for Hindi-English and Tamil-English mixed speech. Keep it optional if its memory requirements are too high.

### **B. Text-to-Speech model portfolio**

The TTS problem needs more attention because natural pronunciation, accent and voice quality vary considerably between languages.

**Tier 1: Lightweight mobile TTS**

Primary

[Tamil voice AI voices | Morphic](https://images.openai.com/static-rsc-4/6FSL_mN5C7ihARg-1ek9aTOAdH_ik-AYgqNn_k4KRBU7d3W9ablc3GMwv1aqQBvJc9oVaQSj8_huSa_xyqRhxQet8kdb2jN07ubC8uwQMICmnjLrz9anopmbh3IbX2oDqyR1ZUfcsf5dGIBT0N1ph4IkL813Z8WqMcwjIU41Kg8?purpose=inline)

**Indic Tiny TTS**

Start with its Tamil implementation and investigate the related multilingual collection.

- 22.5M parameters for Tamil.
- ONNX graphs available.
- CPU inference.
- Male and female voices.
- 24 kHz audio.
- CC-BY-4.0 weights and MIT code.&#x20;

  [image](https://www.google.com/s2/favicons?domain=https://huggingface.co\&sz=32)

  Hugging Face+1



Model: [Indic Tiny TTS Tamil](https://huggingface.co/sulabhkatiyar/indic-tiny-tts-tamil?utm_source=chatgpt.com)

**Tier 2: Indian-language quality models**

Quality

[TTS QA](https://images.openai.com/static-rsc-4/5SPGCyl_Xm6wgI76PBec1vkHp6jNCr4cX-xWQGiA_sa1BKDRX8-uKVmZQ7O2yLRYtPHcJCCfqVkjhj4hjdEX1n7DZkRmhDit3z2aoRiExn2C9pqAXbIjlmR0KKCI3JCSuPDNMRh54HHYiqqF4c83fzvM5n8auGzDjAthcazJgmg?purpose=inline)

**AI4Bharat Indic-TTS**

Existing monolingual models for 13 Indian languages. This is an important foundation for your language-specific voice packs.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+1



[Source repository](https://github.com/AI4Bharat/Indic-TTS?utm_source=chatgpt.com)

**Tier 3: Advanced multilingual TTS**

Not mobile baseline

[Veena TTS (Maya) | aicreators.tools](https://images.openai.com/static-rsc-4/qYbrMCNx5XHL06goBwFGZlAyd3U4cBicJ9g220Ua417HJrs1tRPu8TAIpwaRcAFVBrFHii3Wpz6bh-e5M_2n8GqdcVHE1H6hgax6Zr0I3LbD6_2p19jl6Iz-XgGPMwo-QhKbVyZd4728QAGUQ47aP-IcFQBwleWJmVKP-JU_jbU?purpose=inline)

**Maya 2 Native**

12 supported languages, 2.5B parameters and approximately 5 GB BF16 weights. Streaming and zero-shot voice cloning. Apache-2.0 model release, with component licenses to review.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://huggingface.co\&sz=32)

maya-research/maya2-native at main+2



Use as a quality reference and optional desktop/server engine, not the baseline phone model.

**Research candidate: wider coverage**

Experimental

**Volt-TTS**

A 2.02B parameter model reporting support for 25 Indian languages and reference-based voice cloning. Benchmark it for future distilled or quantized mobile variants, not as a lightweight default.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://huggingface.co\&sz=32)

Hugging Face



[Volt-TTS model card](https://huggingface.co/openarcane/Volt-TTS?utm_source=chatgpt.com)

**Important coverage gap:** Do not claim complete 22-language TTS availability at launch just because the STT model supports 22. AI4Bharat's published TTS portfolio covers 13, and the tiny collection has a smaller language portfolio. The remaining language packs need separately validated models or new training.

### **Final model routing**

| Capability            | Production selection                  |
| --------------------- | ------------------------------------- |
| Default STT           | IndicConformer                        |
| STT fallback          | Whisper Tiny/Base                     |
| Tamil TTS             | Indic Tiny TTS + AI4Bharat comparison |
| Other TTS             | AI4Bharat language-specific models    |
| Missing TTS languages | Train or source new compact models    |
| Quality benchmark     | Maya 2 Native                         |
| Advanced cloning      | Dedicated optional cloning backend    |

## **3. Native mobile architecture**

Recommended technical stack

Use React Native for the developer-facing integration, but keep the audio processing and AI inference in native C++/Kotlin/Swift.

### **Core technologies**

| Component        | Selection                   |
| ---------------- | --------------------------- |
| Shared inference | C++                         |
| Model format     | ONNX                        |
| Primary runtime  | sherpa-onnx                 |
| Android          | Kotlin + JNI                |
| iOS              | Swift + Objective-C++       |
| Android audio    | Oboe / AudioRecord          |
| iOS audio        | AVAudioEngine               |
| VAD              | Silero VAD                  |
| Audio resampling | libsamplerate or native DSP |
| Model storage    | App-private files           |
| Metadata         | SQLite                      |
| SDK interface    | React Native Native Module  |
| Model integrity  | SHA-256                     |

Why sherpa-onnx? It supports offline speech processing, streaming ASR, TTS, VAD and native Android/iOS deployment. It is a suitable common runtime foundation, although individual model architectures still require compatibility validation.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub



Official repository: [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx?utm_source=chatgpt.com).

### **Architecture diagram**

**Developer application**

React Native / Flutter / Native apps

**BharatVoice SDK**

**STT API**

Recognize, stream, transcribe

**TTS API**

Speak, stream, voices

**Clone API**

Enroll, synthesize, delete

**Model manager**

Download, verify, update

**Native C++ inference layer**

Audio buffers · Model sessions · Thread scheduling · DSP

**Android**

Kotlin / JNI / ARM64

**iOS**

Swift / Obj-C++ / ARM64

### **Internal module responsibilities**

```
bharatvoice/
│
├── sdk/
│   ├── public-api/
│   ├── session-manager/
│   ├── event-system/
│   └── error-handler/
│
├── engines/
│   ├── stt/
│   │   ├── recognizer/
│   │   ├── streaming/
│   │   ├── vad/
│   │   └── language-detection/
│   │
│   ├── tts/
│   │   ├── synthesizer/
│   │   ├── text-normalizer/
│   │   ├── voice-manager/
│   │   └── audio-player/
│   │
│   └── voice-cloning/
│       ├── enrollment/
│       ├── speaker-embedding/
│       ├── consent-manager/
│       └── clone-storage/
│
├── runtime/
│   ├── sherpa-onnx/
│   ├── onnx-runtime/
│   ├── audio-dsp/
│   └── hardware-backends/
│
├── platforms/
│   ├── android/
│   ├── ios/
│   └── react-native/
│
├── model-manager/
│   ├── manifest/
│   ├── downloader/
│   ├── verifier/
│   ├── installer/
│   └── garbage-collector/
│
├── model-packs/
│   ├── stt/
│   ├── tts/
│   └── cloning/
│
└── tests/
    ├── accuracy/
    ├── latency/
    ├── memory/
    ├── battery/
    └── licensing/
```

## **4. SDK API design**

The developer experience should be extremely simple.

A developer should not need to understand ONNX, model checkpoints, tokenizers or native audio processing.

### **Public API**

Here is the proposed TypeScript API.

```

export interface BharatVoiceConfig {
  platform?: "android" | "ios";
  modelDirectory?: string;
  maxMemoryMB?: number;
  enableOfflineOnly?: boolean;
}

export interface LanguageOptions {
  language: string;
  variant?: string;
}

export interface STTOptions extends LanguageOptions {
  streaming?: boolean;
  punctuation?: boolean;
  partialResults?: boolean;
}

export interface TTSOptions extends LanguageOptions {
  voiceId?: string;
  speed?: number;
  pitch?: number;
  sampleRate?: number;
}

export interface CloneOptions {
  referenceAudioPath: string;
  transcript?: string;
  consentConfirmed: boolean;
}

export interface BharatVoiceSDK {
  initialize(config: BharatVoiceConfig): Promise<void>;

  models: {
    list(): Promise<ModelInfo[]>;
    download(modelId: string): Promise<void>;
    delete(modelId: string): Promise<void>;
    status(modelId: string): Promise<ModelStatus>;
  };

  stt: {
    transcribe(
      audioPath: string,
      options: STTOptions
    ): Promise<Transcript>;
    start(options: STTOptions): Promise<void>;
    stop(): Promise<Transcript>;
  };

  tts: {
    speak(
      text: string,
      options: TTSOptions
    ): Promise<void>;
    synthesize(
      text: string,
      options: TTSOptions
    ): Promise<AudioResult>;
    stop(): Promise<void>;
  };

  cloning: {
    enroll(options: CloneOptions): Promise<VoiceProfile>;
    synthesize(
      text: string,
      voiceId: string,
      options: TTSOptions
    ): Promise<AudioResult>;
    delete(voiceId: string): Promise<void>;
  };

  dispose(): Promise<void>;
}

export interface Transcript {
  text: string;
  language: string;
  segments?: Array<{
    text: string;
    startMs: number;
    endMs: number;
  }>;
}

export interface ModelInfo {
  id: string;
  task: "stt" | "tts" | "cloning";
  language: string;
  sizeBytes: number;
  installed: boolean;
  quantization: string;
}

export interface ModelStatus {
  installed: boolean;
  downloadProgress?: number;
  verified?: boolean;
}

export interface AudioResult {
  filePath?: string;
  sampleRate: number;
  durationMs: number;
}

export interface VoiceProfile {
  id: string;
  languageSupport: string[];
  createdAt: number;
}

```

### **Example: Tamil speech recognition**

```

import BharatVoice from "@bharatvoice/react-native";

await BharatVoice.initialize({
  enableOfflineOnly: true,
  maxMemoryMB: 250
});

await BharatVoice.models.download("stt-ta-in");

const result = await BharatVoice.stt.transcribe(
  audioPath,
  {
    language: "ta-IN",
    punctuation: true
  }
);

console.log(result.text);

```

### **Example: Tamil text-to-speech**

```

await BharatVoice.models.download("tts-ta-in-female");

await BharatVoice.tts.speak(
  "வணக்கம்! எப்படி இருக்கிறீர்கள்?",
  {
    language: "ta-IN",
    voiceId: "ta-female-01",
    speed: 1.0,
    pitch: 1.0
  }
);

```

### **Example: Voice cloning**

```

const profile = await BharatVoice.cloning.enroll({
  referenceAudioPath: recordingPath,
  transcript: "வணக்கம், இது என்னுடைய குரல்.",
  consentConfirmed: true
});

const audio = await BharatVoice.cloning.synthesize(
  "இன்று ஒரு நல்ல நாள்.",
  profile.id,
  {
    language: "ta-IN"
  }
);

```

The cloning API is a target interface. It should only become available for a model/language combination after its on-device implementation has been validated.

## **5. Voice cloning architecture**

Advanced feature — separate model pack

You specifically want voice cloning, so I would not mix it into the standard TTS installation.

Use three independent capabilities:

1. Built-in voices: immediately available after installing a TTS pack.
2. Personal voice enrollment: capture and register an authorized reference voice.
3. Personalized synthesis: synthesize using the enrolled voice where the installed model supports it.

## **Local voice cloning pipeline**

**Voice enrollment**

Clean 10–30 second recording as an initial collection target

**Audio quality validation**

Noise, clipping, silence and speaker consistency

**Speaker embedding extraction**

Local speaker representation

**Encrypted local voice profile**

No cloud upload; explicit consent and deletion controls

**Personalized TTS**

Text + language + speaker profile → generated speech

### **Technical model decision**

Benchmark these approaches:

| Approach                             | Use                                 |
| ------------------------------------ | ----------------------------------- |
| Speaker embeddings + conditioned TTS | Preferred lightweight research path |
| Fine-tuned compact VITS              | Personalized speaker models         |
| Maya 2 Native                        | Quality and cloning reference       |
| Volt-TTS                             | Wider-language cloning research     |

Important: extracting a speaker embedding is not itself voice cloning. Your chosen synthesis model must accept that embedding or reference audio and generate a convincingly personalized voice.

**Mobile limitation:** I would not promise zero-shot cloning across all 22 languages in the first release. Start with Tamil, Hindi and English, measure speaker similarity and intelligibility, and expand only after validation.

### **Voice cloning security**

- Explicit permission from the voice owner.
- No cloning of another person without authorization.
- Encrypt stored voice profiles using platform-protected keys.
- Never expose speaker embeddings to other apps.
- Provide immediate profile deletion.
- Add optional clone provenance/watermarking.
- Do not silently retain reference recordings after enrollment.

## **6. Model storage and downloadable language packs**

This is how we achieve low installation size without sacrificing language coverage.

**Do not bundle 22 STT models and 22 TTS models in the SDK binary.**

Bundle the runtime, language catalog and model manager. Download the models when the application requests a language.

### **Example installation experience**

**BharatVoice Language Manager**

Offline ready

**Tamil**

Installed

STT + TTS · Voice packs

**Hindi**

Installed

STT + TTS

**Indian English**

Available

Download separately

**Other language packs**

20 languages

Assamese · Bengali · Bodo · Dogri · Gujarati · Kannada · Kashmiri · Konkani · Maithili · Malayalam · Manipuri · Marathi · Nepali · Odia · Punjabi · Sanskrit · Santali · Sindhi · Telugu · Urdu

Installed model storage

**Depends on selected packs**

### **Storage architecture**

Use a manifest-driven model system.

Example:

```
{
  "schemaVersion": 1,
  "engineVersion": "1.0.0",
  "models": [
    {
      "id": "stt-ta-in",
      "task": "stt",
      "language": "ta-IN",
      "runtime": "sherpa-onnx",
      "format": "onnx",
      "quantization": "int8",
      "files": [
        {
          "name": "encoder.int8.onnx",
          "size": 0,
          "sha256": "REPLACE_WITH_REAL_HASH"
        },
        {
          "name": "decoder.int8.onnx",
          "size": 0,
          "sha256": "REPLACE_WITH_REAL_HASH"
        }
      ],
      "license": "MIT"
    }
  ]
}
```

The zero sizes and placeholder hash are schema examples, not downloadable model metadata.

### **Download and installation workflow**

1. Application requests `ta-IN`.
2. Model manager checks installed models.
3. Resolve compatible model version.
4. Download missing files.
5. Verify SHA-256 for every file.
6. Validate manifest and runtime compatibility.
7. Install atomically.
8. Run a small inference smoke test.
9. Mark the pack as available.

Support resumable downloads, rollback, version pinning and removal of unused packs.

### **Storage budget**

Initial engineering targets:

| Component                   | Target      |
| --------------------------- | ----------- |
| Base SDK                    | 5–15 MB     |
| VAD and audio DSP           | 2–8 MB      |
| Small language-specific TTS | 20–100 MB   |
| Standard STT pack           | 50–200 MB   |
| Advanced cloning pack       | 100–500+ MB |
| Shared model resources      | 5–30 MB     |

These are budget estimates, not measured model sizes. The published IndicConformer export collection, for example, lists approximately 190 MB per language model.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://huggingface.co\&sz=32)

Hugging Face



For all 22 languages, use selective downloads. A full multilingual installation could consume multiple gigabytes.

## **7. Performance optimization**

The goal is to run efficiently on ordinary Android phones and supported iPhones, not only premium devices.

### **Quantization strategy**

| Optimization         | Application                               |
| -------------------- | ----------------------------------------- |
| FP32                 | Quality reference                         |
| FP16                 | Supported hardware acceleration           |
| INT8                 | Primary mobile compression candidate      |
| INT4                 | Experimental for compatible architectures |
| Dynamic quantization | Model-dependent                           |
| Structured pruning   | Future model training                     |

Do not quantize every model automatically. Quantization can affect pronunciation, intelligibility and recognition accuracy. Benchmark each exported model against its original checkpoint.

### **Hardware acceleration**

**Android**

- CPU: ARM64 with optimized ONNX kernels.
- GPU: optional NNAPI or supported GPU execution providers.
- NPU: optional Qualcomm QNN or device-specific acceleration.
- Fallback: CPU inference.

  **iOS**
- CPU: ARM64 / Accelerate.
- GPU: Metal where supported by the selected runtime.
- Neural Engine: Core ML conversion where model operators are compatible.
- Fallback: CPU inference.

The SDK must not depend on an NPU being present.

### **Memory management**

Implement:

- Lazy model loading.
- One active recognizer per session.
- Model unloading when idle.
- Configurable thread count.
- Bounded audio buffers.
- Streaming output.
- Cancellation and interruption.
- Background audio lifecycle management.
- Low-memory callbacks.

For real-time applications, avoid sending every microphone buffer over the React Native bridge. Keep audio capture, VAD and recognition inside native code.

## **8. Benchmarking and acceptance criteria**

We need a proper benchmark framework before deciding which model becomes the production default.

These are the proposed release targets.

| Metric                     | Target                                           |
| -------------------------- | ------------------------------------------------ |
| TTS first playable audio   | Under 500 ms where feasible                      |
| TTS real-time factor       | Below 1.0                                        |
| STT first partial result   | Under 500 ms target                              |
| Peak memory, standard pack | Under 250 MB target                              |
| Base SDK installation      | Under 25 MB                                      |
| Offline model inference    | 100% after installation                          |
| App crash rate             | Below 0.1% of inference sessions                 |
| Language coverage          | 22 STT + 22 TTS packs before full coverage claim |

### **STT quality**

Use:

- WER (Word Error Rate).
- CER (Character Error Rate).
- Mixed-language transcription accuracy.
- Punctuation accuracy.
- Proper noun accuracy.
- Noisy speech accuracy.
- Real-time factor.

Suggested acceptance targets:

- Clean conversational speech: WER below 12% where tokenization makes WER meaningful.
- Tamil and other agglutinative languages: CER below 8% as an initial target.
- Code-switching: separate language-specific WER/CER and mixed-script evaluation.

These are targets, not existing performance claims.

### **TTS quality**

Evaluate:

- MOS (Mean Opinion Score).
- Speaker similarity.
- Pronunciation accuracy.
- Naturalness.
- Prosody and intonation.
- Regional accent consistency.
- English technical-word pronunciation.
- Number and currency reading.

Suggested targets:

- MOS at least 4.0/5 on a controlled, native-speaker evaluation.
- No systematic pronunciation errors in the release test set.
- Speaker similarity evaluated independently for cloned voices.

### **Benchmark device matrix**

| Device category        | Example              | Test                          |
| ---------------------- | -------------------- | ----------------------------- |
| Low-end Android        | 4 GB RAM             | CPU inference                 |
| Mid-range Android      | 6–8 GB RAM           | CPU + optional NPU            |
| Flagship Android       | 12 GB RAM            | acceleration                  |
| Older supported iPhone | Lower-memory device  | CPU                           |
| Recent iPhone          | Modern Apple Silicon | CPU + compatible acceleration |

Run benchmarks on actual physical devices. Simulator performance is not representative.

### **Test datasets**

Use a combination of:

- AI4Bharat IndicVoices.
- AI4Bharat Rasa for TTS-related evaluation.
- FLEURS for multilingual evaluation.
- Mozilla Common Voice where language coverage and quality permit.
- Your own consented regional speech collection.

Keep training and test speakers separate to avoid misleading results.

## **9. Licensing and commercial distribution**

This is critical because you intend to distribute a developer SDK.

A model's open-source runtime license does not automatically cover its weights or training data.

### **Initial license register**

| Component                | License / consideration                              |
| ------------------------ | ---------------------------------------------------- |
| sherpa-onnx              | Apache-2.0                                           |
| AI4Bharat IndicConformer | MIT                                                  |
| AI4Bharat Indic-TTS code | MIT                                                  |
| Indic Tiny TTS weights   | CC-BY-4.0                                            |
| Indic Tiny TTS code      | MIT                                                  |
| Indic Tiny TTS vocoder   | MIT                                                  |
| Whisper                  | MIT                                                  |
| Maya 2 Native            | Apache-2.0 model release; inspect component licenses |

Sources:&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+5



Official license references:

- [sherpa-onnx license](https://github.com/k2-fsa/sherpa-onnx/blob/master/LICENSE?utm_source=chatgpt.com)
- [IndicConformer source](https://github.com/AI4Bharat/IndicConformerASR?utm_source=chatgpt.com)
- [AI4Bharat TTS license](https://github.com/AI4Bharat/Indic-TTS/blob/master/LICENSE.txt?utm_source=chatgpt.com)
- [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/?utm_source=chatgpt.com)

### **What to implement in your repository**

Create these documents before releasing binaries:

```
legal/
├── THIRD_PARTY_LICENSES.md
├── MODEL_LICENSE_REGISTER.md
├── MODEL_ATTRIBUTION.md
├── DATASET_PROVENANCE.md
├── VOICE_CONSENT_POLICY.md
├── VOICE_CLONING_POLICY.md
└── SOFTWARE_BILL_OF_MATERIALS.md
```

For each model, record:

- Exact model repository.
- Exact version or commit.
- Weight license.
- Code license.
- Dataset license.
- Vocoder license.
- Required attribution.
- Commercial-use restrictions.
- Redistribution rights.
- Modification and derivative-model terms.

**My recommendation:** Use a license allowlist. Do not include a model in your commercial SDK until its weights, code, datasets and dependencies have been reviewed separately.

## **10. Backend architecture for model distribution**

Although the inference is offline, you still need a lightweight distribution backend for model discovery and downloads.

You do not need an inference server for the core product.

**BharatVoice developer portal**

Model catalog · SDK downloads · API documentation

**Distribution backend**

**Catalog API**

Model versions and metadata

**CDN**

Model downloads

**Release manager**

Compatibility and releases

**Analytics**

Opt-in anonymous diagnostics

**Android and iOS SDK**

Downloads model once, verifies and runs it locally

### **Backend stack**

| Component      | Recommendation                     |
| -------------- | ---------------------------------- |
| API            | FastAPI                            |
| Metadata DB    | PostgreSQL                         |
| Object storage | S3-compatible storage              |
| CDN            | Cloudflare or equivalent           |
| Manifest       | Signed JSON                        |
| Integrity      | SHA-256                            |
| CI/CD          | GitHub Actions                     |
| Analytics      | Optional privacy-preserving events |

Do not upload microphone recordings, transcripts or voice profiles to the distribution backend by default.

### **Model release versioning**

Use independent versions:

```
SDK:          1.0.0
STT runtime:  1.0.0
TTS runtime:  1.0.0

Tamil STT:    1.0.0
Tamil TTS:    1.0.0
Hindi STT:    1.0.0
Hindi TTS:    1.0.0
```

This allows you to improve a Tamil voice model without requiring a new mobile application release.

## **11. Implementation roadmap**

I would divide development into eight milestones, with quality gates between them.

1. **M1 — Model research and benchmark laboratory**

   Weeks 1–3
   - Download candidate STT/TTS models.
   - Test Tamil, Hindi and English.
   - Verify ONNX compatibility.
   - Measure model size, memory and speed.
   - Audit licenses.
   - Create automated evaluation scripts.

   Deliverable: model benchmark report and selected model registry.
2. **M2 — Native speech runtime**

   Weeks 4–6
   - Integrate sherpa-onnx.
   - Build Android native inference.
   - Build iOS native inference.
   - Implement audio capture and playback.
   - Implement VAD.
   - Add model lifecycle management.

   Deliverable: working native STT/TTS prototypes.
3. **M3 — SDK foundation**

   Weeks 7–9
   - Public TypeScript interfaces.
   - Kotlin/Swift bridges.
   - Promise and event interfaces.
   - Error handling.
   - Cancellation.
   - Session management.

   Deliverable: first usable React Native SDK.
4. **M4 — Initial language packs**

   Weeks 10–12
   - Tamil, Hindi and English STT.
   - Initial TTS voices.
   - Text normalization.
   - Language-specific pronunciation tests.
   - Streaming recognition.

   Deliverable: three-language offline SDK beta.
5. **M5 — All 22 language STT**

   Weeks 13–16
   - Validate all IndicConformer exports.
   - Build language manifests.
   - Add appropriate tokenizers.
   - Handle RTL and non-Latin scripts.
   - Test regional speech.

   Deliverable: 22-language STT model catalog.
6. **M6 — Complete TTS coverage**

   Weeks 17–22
   - Integrate available compact language models.
   - Fill missing languages through new model training or validated alternatives.
   - Add voice catalogs.
   - Benchmark male/female voices.
   - Improve text normalization and prosody.

   Deliverable: 22 validated TTS language packs.
7. **M7 — Voice cloning**

   Weeks 23–26
   - Evaluate local speaker embeddings.
   - Select compatible synthesis architecture.
   - Implement enrollment and profile management.
   - Add encrypted storage.
   - Test Tamil, Hindi and English first.
   - Validate cloning consent controls.

   Deliverable: experimental on-device voice cloning.
8. **M8 — Production release**

   Weeks 27–30
   - Device compatibility testing.
   - Memory and battery optimization.
   - Security review.
   - License and attribution audit.
   - Developer documentation.
   - Sample applications.
   - Versioned model CDN.

   Deliverable: production SDK v1.0.

These are planning estimates for a small, experienced engineering team. TTS coverage and cloning may take longer depending on dataset availability and model training.

## **12. Repository and deliverables**

I recommend maintaining a monorepo for the SDK, native integrations, model catalog and examples.

```
bharatvoice/
│
├── apps/
│   ├── android-demo/
│   ├── ios-demo/
│   └── react-native-demo/
│
├── packages/
│   └── react-native-bharatvoice/
│
├── native/
│   ├── core-cpp/
│   ├── android/
│   └── ios/
│
├── engines/
│   ├── stt/
│   ├── tts/
│   ├── cloning/
│   └── audio/
│
├── models/
│   ├── catalog/
│   ├── manifests/
│   └── evaluation/
│
├── backend/
│   ├── catalog-api/
│   ├── release-manager/
│   └── model-distribution/
│
├── benchmarks/
│   ├── stt/
│   ├── tts/
│   ├── latency/
│   ├── memory/
│   └── battery/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MODEL_SELECTION.md
│   ├── SDK_API.md
│   ├── MODEL_PACKS.md
│   ├── VOICE_CLONING.md
│   ├── BENCHMARKING.md
│   └── LICENSING.md
│
└── legal/
    └── THIRD_PARTY_LICENSES.md
```

## **13. Final technical decisions**

| Decision             | Final selection                        |
| -------------------- | -------------------------------------- |
| Product              | BharatVoice Engine                     |
| Distribution         | Developer SDK                          |
| Platforms            | Android + iOS                          |
| Language scope       | 22 scheduled languages + English       |
| Inference            | Fully on-device                        |
| Primary model format | ONNX                                   |
| Runtime              | sherpa-onnx + compatible ONNX backends |
| STT foundation       | IndicConformer                         |
| TTS foundation       | Indic Tiny TTS + AI4Bharat Indic-TTS   |
| Quality benchmark    | Maya 2 Native                          |
| Voice cloning        | Optional advanced local engine         |
| Compression          | INT8 first                             |
| SDK interface        | React Native TypeScript                |
| Native layer         | C++ / Kotlin / Swift                   |
| Model delivery       | Downloadable language packs            |
| Backend              | Catalog + CDN, not inference           |
| Commercial licensing | Per-model approval                     |

## **14. Three important engineering risks**

**Risk 1: Complete TTS language coverage**

The STT side has a strong 22-language foundation. TTS needs more work. Don't market 22-language TTS until each language has an actual model, tested voices and a validated downloadable pack.

**Risk 2: Voice cloning on low-end phones**

Advanced cloning models can be much larger than standard TTS. Keep cloning as an optional capability and don't compromise normal speech synthesis to include it.

**Risk 3: Mixed-language accuracy**

Tamil-English and Hindi-English recognition need separate benchmarks and potentially specialized models. A multilingual model's language list does not guarantee accurate code-switching.

## **15. What I would build first**

Do not start by training 22 languages or implementing cloning.

Start with a vertical slice:

First development release

# **BharatVoice v0.1**

**Three-language mobile prototype**

- Android + iOS native inference.
- Tamil, Hindi and English.
- IndicConformer STT.
- Compact TTS models.
- Live streaming transcription.
- Text-to-speech playback.
- Downloadable model packs.
- Offline mode.
- Benchmark dashboard.

**Release acceptance test**

A user should be able to install the SDK, download Tamil models, disconnect the internet, speak Tamil into the microphone, receive Tamil text and convert that text back into speech.

This single end-to-end workflow will validate the architecture before you invest in the remaining languages.

**My strongest recommendation:** Make BharatVoice a model-independent speech runtime, not just a wrapper around IndicConformer or one TTS model. Your long-term competitive advantage will be the combination of compact Indian-language models, regional pronunciation quality, efficient mobile inference and a developer-friendly SDK.

The first three implementation documents I would create are `ARCHITECTURE.md`, `MODEL_REGISTRY.md` and `BENCHMARK_PLAN.md`. They will become the engineering source of truth for the project.