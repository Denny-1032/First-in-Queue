# FiQ Zambian Language Voice AI — Implementation Plan

> **Project:** Replace Retell AI with a custom voice pipeline supporting Bemba, Nyanja, Tonga, and Lozi  
> **Created:** April 10, 2026  
> **Status:** Planning  
> **Estimated Timeline:** 6–9 months (5 phases)  
> **Goal:** First-to-market voice AI for Zambian local languages

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture (What We're Replacing)](#2-current-architecture)
3. [Target Architecture](#3-target-architecture)
4. [Phase 1 — Data Acquisition & Partnerships](#phase-1--data-acquisition--partnerships-months-1-2)
5. [Phase 2 — Speech-to-Text (STT) Engine](#phase-2--speech-to-text-stt-engine-months-2-4)
6. [Phase 3 — Text-to-Speech (TTS) Engine](#phase-3--text-to-speech-tts-engine-months-3-5)
7. [Phase 4 — Voice Pipeline Orchestration](#phase-4--voice-pipeline-orchestration-months-4-6)
8. [Phase 5 — FiQ Integration & Migration](#phase-5--fiq-integration--migration-months-5-7)
9. [Infrastructure & Compute Requirements](#9-infrastructure--compute-requirements)
10. [Cost Estimates](#10-cost-estimates)
11. [Risk Register](#11-risk-register)
12. [Research References & Contacts](#12-research-references--contacts)
13. [Success Metrics](#13-success-metrics)
14. [Appendix: Language Demographics](#appendix-a-zambian-language-demographics)

---

## 1. Executive Summary

No commercial voice AI platform (Retell AI, Bland.ai, Vapi, etc.) supports Zambian languages. Their TTS/STT providers (ElevenLabs, Cartesia, OpenAI TTS, Deepgram) max out at Swahili and Afrikaans for African languages. Bemba, Nyanja, Tonga, and Lozi are completely absent.

**The opportunity:** Building this capability makes FiQ the only AI voice solution serving 18+ million Zambian-language speakers, and creates an IP moat that competitors cannot easily replicate.

**The approach:** Build a modular voice pipeline (STT → LLM → TTS) that:
- Fine-tunes OpenAI Whisper for Zambian language speech recognition
- Trains custom VITS/Piper TTS voices for Zambian language speech synthesis
- Uses GPT-4 (which already handles Bemba/Nyanja text) as the conversational brain
- Orchestrates everything via a real-time WebSocket pipeline (LiveKit or custom)
- Connects to telephony via Twilio SIP (keeping our existing Twilio infrastructure)

---

## 2. Current Architecture

### What Retell Provides Today

```
Phone Call (Twilio PSTN) 
    → Twilio SIP Dial → sip:{call_id}@sip.retellai.com
        → Retell handles:
            1. STT (speech-to-text) — Deepgram/Whisper
            2. LLM (conversation) — Retell LLM or Custom LLM via WebSocket
            3. TTS (text-to-speech) — ElevenLabs/Cartesia/OpenAI
        → Audio back to caller
```

### Current FiQ Files That Depend on Retell

| File | Purpose | Migration Impact |
|------|---------|-----------------|
| `src/lib/voice/retell-client.ts` | Retell SDK wrapper (agent CRUD, calls, KB sync) | **Replace entirely** |
| `src/lib/voice/twilio-client.ts` | Twilio + Retell SIP bridging | **Modify** — keep Twilio, change SIP target |
| `src/app/api/voice/agents/route.ts` | Voice agent CRUD API | **Modify** — remove Retell agent calls |
| `src/app/api/voice/webhook/route.ts` | Retell webhook handler | **Replace** — new pipeline webhook |
| `src/app/admin/telephony/page.tsx` | Admin config UI (Retell API key, LLM ID) | **Modify** — new config fields |
| `src/app/api/admin/telephony/route.ts` | Telephony config API | **Modify** — new config schema |
| `src/app/dashboard/voice/config/page.tsx` | Voice agent config UI | **Modify** — new voice/language options |

### Current Language Map (retell-client.ts)

```typescript
// Current: Zambian languages fall back to "multi" (generic multilingual mode)
// This gives POOR STT accuracy and ENGLISH-ONLY TTS
bem: "multi",  // Bemba → generic multilingual (bad)
ny: "multi",   // Nyanja → generic multilingual (bad)
zu: "multi",   // Zulu → generic multilingual (bad)
sw: "sw-KE",   // Swahili → supported but not Zambian
```

---

## 3. Target Architecture

### Custom Voice Pipeline

```
Phone Call (Twilio PSTN)
    → Twilio SIP/WebSocket → FiQ Voice Server (LiveKit or custom)
        → 1. STT: Fine-tuned Whisper (Zambian languages)
        → 2. LLM: GPT-4 via OpenAI API (already handles Bemba/Nyanja text)
        → 3. TTS: Custom VITS/Piper model (Zambian language voices)
    → Audio streamed back to caller via WebSocket/RTP
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FiQ Voice Server                         │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │  STT     │    │   LLM    │    │   TTS    │               │
│  │ Whisper  │───▶│  GPT-4   │───▶│  VITS/   │               │
│  │ (tuned)  │    │ (OpenAI) │    │  Piper   │               │
│  └──────────┘    └──────────┘    └──────────┘               │
│       ▲                                │                     │
│       │          Audio Stream          │                     │
│       │◀───────────────────────────────┘                     │
│                                                              │
│  ┌──────────────────────────────────────┐                    │
│  │   Orchestrator (LiveKit Agents /     │                    │
│  │   Custom WebSocket Pipeline)         │                    │
│  │   - Turn detection (VAD)             │                    │
│  │   - Interrupt handling               │                    │
│  │   - Streaming coordination           │                    │
│  │   - Language detection               │                    │
│  └──────────────────────────────────────┘                    │
│       ▲                                                      │
└───────┼──────────────────────────────────────────────────────┘
        │
  ┌─────┴─────┐
  │  Twilio   │ ← PSTN phone calls
  │  SIP/RTP  │
  └───────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| STT Engine | Fine-tuned Whisper large-v3 | Best multilingual base model; proven fine-tuning results on African languages (WER <25% achievable) |
| LLM | GPT-4 / GPT-4o | Already handles Bemba/Nyanja text well; no retraining needed |
| TTS Engine | VITS (Coqui TTS) or Piper | Open source, trainable on small datasets (6-28 hours), fast inference |
| Orchestration | LiveKit Agents framework | Open source, built-in VAD, telephony integration, WebRTC support |
| Telephony | Twilio (keep existing) | Already integrated, reliable, no migration needed |
| Deployment | GPU server (inference) | Required for Whisper + TTS real-time inference |

---

## Phase 1 — Data Acquisition & Partnerships (Months 1-2)

### 1.1 Zambezi Voice Dataset (Primary Source)

The **Zambezi Voice** project from the University of Zambia provides the only substantial labeled speech datasets for Zambian languages.

#### Available Labeled Data (Read Speech)

| Language | Code | Hours | Speakers | Source |
|----------|------|-------|----------|--------|
| **Bemba** | bem | 28 hrs | 20 speakers | BembaSpeech + extensions |
| **Nyanja** | nya | 25 hrs | 12 speakers (4M, 8F) | Flickr30K translations |
| **Tonga** | toi | 22 hrs | 9 speakers (4M, 5F) | Literature books (Lubuto Library) |
| **Lozi** | loz | 6 hrs | 4 speakers (4M, 2F) | Literature books (Lubuto Library) |
| **Total** | — | **81 hrs** | **45 speakers** | — |

#### Available Unlabeled Data (Radio Broadcasts)

| Language | Raw Hours | Segmented Hours | Source |
|----------|-----------|-----------------|--------|
| Bemba | ~100 hrs | ~50 hrs | Radio broadcasts |
| Nyanja | ~80 hrs | ~40 hrs | Radio broadcasts |
| Tonga | ~60 hrs | ~30 hrs | Radio broadcasts |
| Lozi | ~50 hrs | ~25 hrs | Radio broadcasts |
| Lunda | ~67 hrs | ~23 hrs | Radio broadcasts |
| **Total** | **~357 hrs** | **~168 hrs** | — |

**Format:** WAV, mono, 16kHz sample rate  
**License:** Open source (academic use confirmed; verify commercial license)  
**Downloads:**
- Labeled: GitHub repos under `unza-speech-lab/zambezi-voice`
  - Bemba: https://github.com/csikasote/BembaSpeech
  - Nyanja: https://github.com/unza-speech-lab/zambezi-voice-nyanja
  - Tonga: https://github.com/unza-speech-lab/zambezi-voice/tree/main/tonga
  - Lozi: https://github.com/unza-speech-lab/zambezi-voice/tree/main/lozi
- Unlabeled: Zenodo archives
  - Bemba: https://zenodo.org/record/7540277
  - Nyanja: https://zenodo.org/record/7546317
  - Tonga: https://zenodo.org/record/7543819
  - Lozi: https://zenodo.org/record/7544601
  - Lunda: https://zenodo.org/record/7589496

### 1.2 Contact UNZA for Partnership

**Action items:**
1. Email Zambezi Voice team to discuss commercial licensing
   - **Claytone Sikasote** (Project Lead): claytonsikasote@gmail.com
   - **General:** zambezivoice@gmail.com
2. Propose partnership structure:
   - FiQ sponsors compute resources for their ongoing research
   - In return, FiQ gets commercial license to use datasets and resulting models
   - Co-publish results if academically relevant
3. Discuss availability of additional data beyond the published datasets
4. Explore possibility of UNZA students contributing to data validation

### 1.3 Supplementary Data Collection

The Zambezi Voice data is primarily **read speech** (sentences read aloud from books). For a voice AI agent, we also need **conversational speech** data.

**Plan:**
1. **Record conversational prompts** (Month 2)
   - Script 500 common customer service dialogues per language
   - Hire 10-20 native speakers per language (via UNZA or local recruitment)
   - Record in realistic conditions (phone audio quality, background noise)
   - Target: 5-10 hours per language of conversational data
   
2. **Synthetic data augmentation**
   - Use GPT-4 to generate text scripts in Bemba/Nyanja/Tonga/Lozi
   - Use existing TTS (even low quality) to create audio-text pairs
   - Add noise augmentation (phone line simulation, background noise)

3. **Code-switched data** (English + local language mix)
   - Very common in Zambian business contexts
   - Record bilingual dialogues (e.g., customer asks in Nyanja, includes English product names)
   - This is critical for real-world accuracy

### 1.4 Data Preparation Pipeline

```
Raw Audio Files
    │
    ├── Quality filtering (remove corrupt/silent files)
    ├── Normalize to 16kHz mono WAV
    ├── Transcription validation (crowdsource verification)
    ├── Speaker diarization (label speaker IDs)
    ├── Train/Dev/Test splits (80/10/10, speaker-disjoint)
    │
    ├── STT dataset (audio + text pairs)
    │     └── Format: HuggingFace datasets / Common Voice format
    │
    └── TTS dataset (audio + text + speaker ID)
          └── Format: LJSpeech-style (speaker_id|text|audio_path)
```

### 1.5 Deliverables

- [ ] Zambezi Voice datasets downloaded and verified
- [ ] Commercial license agreement with UNZA (or clear open-source confirmation)
- [ ] Conversational speech recording plan finalized
- [ ] Data preparation pipeline built and tested
- [ ] Supplementary data recording started

---

## Phase 2 — Speech-to-Text (STT) Engine (Months 2-4)

### 2.1 Strategy: Fine-tune Whisper

**Why Whisper?**
- OpenAI's Whisper large-v3 is the best multilingual ASR base model
- It was trained on 680,000 hours of multilingual data
- Even though Bemba/Nyanja/Tonga/Lozi aren't in its training data, cross-lingual transfer from related Bantu languages (Swahili, Zulu, Xhosa) provides a strong starting point
- Zambezi Voice researchers achieved **22.45% WER for Nyanja** by fine-tuning the older XLS-R model — Whisper should perform significantly better

**Baseline WER (from Zambezi Voice paper, XLS-R fine-tuning):**

| Language | WER (without LM) | WER (with LM) | Data Used |
|----------|-------------------|----------------|-----------|
| Bemba | 26.63% | 25.42% | 28 hrs |
| Nyanja | 25.52% | 22.45% | 25 hrs |
| Tonga | 32.90% | 28.70% | 22 hrs |
| Lozi | 36.20% | 32.10% | 6 hrs |

**Target WER with Whisper fine-tuning:** <20% for Bemba/Nyanja, <25% for Tonga, <30% for Lozi.

### 2.2 Fine-tuning Process

#### Step 1: Environment Setup

```bash
# Required libraries
pip install transformers datasets evaluate jiwer accelerate soundfile librosa
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
```

#### Step 2: Dataset Preparation

Convert Zambezi Voice data to HuggingFace format:

```python
# Pseudocode for dataset preparation
from datasets import Dataset, Audio

def prepare_zambezi_voice(language_code, data_dir):
    """
    Convert Zambezi Voice data to HuggingFace dataset format.
    
    Expected directory structure:
    data_dir/
        train/
            audio/  (WAV files)
            text/   (transcription files)
        dev/
        test/
    """
    audio_files = glob(f"{data_dir}/train/audio/*.wav")
    transcriptions = load_transcriptions(f"{data_dir}/train/text/")
    
    dataset = Dataset.from_dict({
        "audio": audio_files,
        "sentence": transcriptions,
        "language": [language_code] * len(audio_files),
    }).cast_column("audio", Audio(sampling_rate=16000))
    
    return dataset
```

#### Step 3: Fine-tuning Configuration

```python
# Key training hyperparameters (based on successful African language fine-tuning)
training_args = {
    "model": "openai/whisper-large-v3",
    "language": None,  # Multi-language mode
    "task": "transcribe",
    
    # Training parameters
    "per_device_train_batch_size": 8,       # Adjust based on GPU VRAM
    "gradient_accumulation_steps": 2,        # Effective batch size = 16
    "learning_rate": 1e-5,                   # Conservative for fine-tuning
    "warmup_steps": 500,
    "max_steps": 5000,                       # ~20-30 epochs over 80hrs of data
    "fp16": True,                            # Mixed precision training
    
    # Regularization
    "weight_decay": 0.01,
    "dropout": 0.1,
    
    # Evaluation
    "evaluation_strategy": "steps",
    "eval_steps": 500,
    "save_steps": 500,
    "load_best_model_at_end": True,
    "metric_for_best_model": "wer",
    "greater_is_better": False,
    
    # Data
    "dataloader_num_workers": 4,
    "remove_unused_columns": False,
}
```

#### Step 4: Training Approaches (Sequential)

**Approach A: Monolingual Models (start here)**
- Train one Whisper model per language
- Best accuracy per language
- 4 separate models to deploy and maintain

**Approach B: Multilingual Model (preferred long-term)**
- Single model fine-tuned on all 4 languages simultaneously
- Detects and transcribes any Zambian language
- Handles code-switching naturally
- Slightly lower per-language accuracy but much more practical

**Approach C: Language-Prefixed Model (best of both)**
- Single model, but prefix audio with a language token
- At inference time, if language is known, provide the prefix for higher accuracy
- If language is unknown, use auto-detect mode

### 2.3 Unlabeled Data Utilization (Self-Training)

The 168 hours of unlabeled radio broadcast data can significantly improve accuracy:

```
1. Fine-tune Whisper on labeled data (81 hrs) → Base model
2. Run Base model on unlabeled data → Generate pseudo-labels
3. Filter pseudo-labels by confidence score (keep >0.8 confidence)
4. Combine original labeled data + high-confidence pseudo-labeled data
5. Fine-tune again on combined dataset → Improved model
6. Repeat steps 2-5 (iterative self-training)
```

### 2.4 Real-Time Inference Optimization

For voice conversations, STT must run in **real-time streaming mode** with <300ms latency.

**Optimizations:**
1. **Whisper Streaming:** Use `faster-whisper` (CTranslate2 backend) for 4x faster inference
2. **VAD Chunking:** Use Silero VAD to detect speech segments, only run Whisper on speech
3. **GPU Batching:** Batch multiple concurrent call streams on a single GPU
4. **Quantization:** INT8 quantization reduces model size by 2x with minimal accuracy loss

```python
# faster-whisper streaming inference (pseudocode)
from faster_whisper import WhisperModel

model = WhisperModel(
    "fiq-whisper-zambian-v1",  # Our fine-tuned model
    device="cuda",
    compute_type="int8",        # INT8 quantization for speed
)

# Real-time streaming transcription
segments, info = model.transcribe(
    audio_chunk,
    language=detected_language,  # or None for auto-detect
    beam_size=5,
    vad_filter=True,
    vad_parameters={"min_silence_duration_ms": 500},
)
```

### 2.5 Deliverables

- [ ] Monolingual Whisper models trained for Bemba, Nyanja, Tonga, Lozi
- [ ] Multilingual Whisper model trained on all 4 languages
- [ ] WER evaluation report on test sets
- [ ] Self-training pipeline using unlabeled radio data
- [ ] Real-time streaming inference server (faster-whisper based)
- [ ] Language detection module (auto-detect which Zambian language is spoken)

---

## Phase 3 — Text-to-Speech (TTS) Engine (Months 3-5)

### 3.1 Strategy: Train Custom VITS Models

**Why VITS?**
- State-of-the-art end-to-end TTS (no separate vocoder needed)
- Trainable on as little as **1-2 hours** of single-speaker data (though more is better)
- Produces natural-sounding speech at real-time speed on GPU
- Open source (Coqui TTS framework provides training recipes)
- Supports multi-speaker and multi-language models

**Alternative: Piper TTS**
- Lighter weight, designed for edge/local deployment
- Easier training pipeline
- Lower quality than VITS but faster inference
- Good fallback option if compute is constrained

### 3.2 Voice Selection & Recording

We need to select **target voices** for each language — the voice(s) that FiQ agents will use.

#### Speaker Requirements

| Requirement | Detail |
|-------------|--------|
| **Gender** | 1 male + 1 female voice per language (8 voices total) |
| **Quality** | Clear, professional diction; pleasant phone manner |
| **Native fluency** | Must be native speaker of the target language |
| **Recording quality** | Studio or treated room; USB condenser mic minimum |
| **Consent** | Full commercial voice usage rights (written contract) |

#### Recording Script Design

For each voice, record:
1. **Common customer service phrases** (200 sentences)
   - "Hello, welcome to [business name]"
   - "Let me check that for you"
   - "Your appointment is confirmed for..."
   - "I'm transferring you to a human agent"
2. **Business vocabulary** (100 sentences with product/service terms)
3. **Numbers, dates, times** (100 sentences)
   - "Your order number is 12345"
   - "The total is K499"
   - "Your appointment is on Monday, April 14th"
4. **General text** (use Zambezi Voice text sources for additional coverage)

**Target: 3-5 hours per voice (minimum), 8-10 hours per voice (ideal)**

### 3.3 TTS Training Pipeline

#### Using Coqui TTS (VITS model)

```bash
# Install Coqui TTS
pip install coqui-tts

# Data format: LJSpeech-style
# metadata.csv: audio_filename|transcription|normalized_transcription
# wavs/: directory of WAV files (22050 Hz, mono)
```

#### Step 1: Phonemizer Setup

Zambian languages use Latin script with consistent pronunciation rules, which simplifies phonemization.

```python
# Custom phonemizer for Zambian Bantu languages
# These languages are largely phonemic (written as pronounced)
# Key rules:
#   - Each letter maps to one sound (mostly)
#   - Consonant clusters: ng', ch, sh, zh, ny, mb, nd, nj, nk, ng
#   - Tonal (but tone is not written — we handle this via prosody learning)
#   - Vowels: a, e, i, o, u (consistent across all 4 languages)

# Option A: Use espeak-ng (has basic Bantu phoneme support)
# Option B: Build rule-based phonemizer (more accurate for these specific languages)
# Option C: Train a G2P (grapheme-to-phoneme) model from the labeled data
```

#### Step 2: Training Configuration (VITS)

```json
{
    "model": "vits",
    "audio": {
        "sample_rate": 22050,
        "win_length": 1024,
        "hop_length": 256,
        "num_mels": 80,
        "mel_fmin": 0,
        "mel_fmax": null
    },
    "training": {
        "batch_size": 32,
        "epochs": 1000,
        "learning_rate": 0.0002,
        "lr_scheduler": "exponential",
        "lr_decay": 0.999875
    },
    "text": {
        "phonemizer": "custom_zambian",
        "language": "bem",
        "text_cleaners": ["zambian_cleaners"]
    }
}
```

#### Step 3: Training Strategy

**Phase A — Pre-train on existing data (English)**
- Start from a pre-trained VITS checkpoint (English multi-speaker)
- This gives the model a head start on speech synthesis fundamentals

**Phase B — Fine-tune on Zambian language data**
- Replace text encoder weights (new phoneme set)
- Keep audio decoder weights (speech generation fundamentals transfer)
- Fine-tune on single-speaker Zambian language data
- Expected training time: 2-4 days on a single A100 GPU per voice

**Phase C — Multi-speaker model (optional, advanced)**
- Train one model with all speakers across all languages
- Use speaker embeddings to select voice at inference time
- More efficient deployment (1 model instead of 8)

### 3.4 Real-Time TTS Inference

For voice AI, TTS must produce audio chunks in **streaming mode** with <250ms time-to-first-byte.

```python
# Streaming TTS inference (pseudocode)
class ZambianTTSServer:
    def __init__(self, model_path, device="cuda"):
        self.model = load_vits_model(model_path, device)
    
    def synthesize_streaming(self, text, language, speaker_id=None):
        """
        Stream audio chunks as they are generated.
        Split text into sentences/phrases for incremental synthesis.
        """
        chunks = split_into_phrases(text)
        for chunk in chunks:
            phonemes = self.phonemize(chunk, language)
            audio = self.model.inference(phonemes, speaker_id=speaker_id)
            yield audio_to_pcm_bytes(audio, sample_rate=22050)
    
    def phonemize(self, text, language):
        """
        Convert text to phonemes using language-specific rules.
        Zambian Bantu languages are largely phonemic, so this is 
        simpler than for English.
        """
        return zambian_g2p(text, language)
```

### 3.5 Voice Quality Benchmarking

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **MOS (Mean Opinion Score)** | ≥3.5 / 5.0 | Human evaluation panel (10+ native speakers per language) |
| **Intelligibility** | ≥90% word accuracy | Listeners transcribe TTS output, compare to original text |
| **Naturalness** | ≥3.0 / 5.0 | Human evaluation (does it sound like a real person?) |
| **Latency (TTFB)** | <250ms | Time from text input to first audio byte |
| **Real-time factor** | <0.5 | Audio generated 2x faster than real-time playback |

### 3.6 Deliverables

- [ ] Custom phonemizer for Bemba, Nyanja, Tonga, Lozi
- [ ] Recorded voice data for 2 speakers per language (8 voices total)
- [ ] Trained VITS models for each voice
- [ ] MOS evaluation results from native speaker panel
- [ ] Streaming TTS inference server
- [ ] Voice selection API (choose language + gender at call time)

---

## Phase 4 — Voice Pipeline Orchestration (Months 4-6)

### 4.1 Orchestration Framework: LiveKit Agents

**Why LiveKit?**
- Open-source framework specifically for building voice AI agents
- Built-in VAD (Voice Activity Detection) for turn-taking
- Native Twilio SIP integration (we already use Twilio)
- Handles WebRTC/WebSocket audio transport
- Supports pluggable STT, LLM, and TTS providers
- Python SDK with async support
- Active development, production-ready

**Alternative: Custom WebSocket Pipeline**
- If LiveKit adds too much overhead, we build our own
- More control but more engineering effort
- Use Deepgram's reference architecture as a starting point

### 4.2 Pipeline Architecture (LiveKit-based)

```python
# FiQ Voice Agent using LiveKit Agents SDK (pseudocode)
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.agents.llm import ChatContext, ChatMessage
from livekit.agents.pipeline import VoicePipelineAgent

# Custom STT plugin wrapping our fine-tuned Whisper
class ZambianWhisperSTT:
    """
    STT plugin that uses our fine-tuned Whisper model
    for Bemba, Nyanja, Tonga, and Lozi.
    Falls back to standard Whisper for English.
    """
    def __init__(self, model_path, device="cuda"):
        self.model = load_faster_whisper(model_path, device)
    
    async def recognize(self, audio_stream):
        # Detect language from first few seconds
        language = await self.detect_language(audio_stream)
        
        # Transcribe with language hint
        async for segment in self.model.transcribe_stream(audio_stream, language):
            yield TranscriptionResult(
                text=segment.text,
                language=language,
                confidence=segment.confidence,
            )

# Custom TTS plugin wrapping our VITS models
class ZambianVITSTTS:
    """
    TTS plugin that uses our custom VITS models
    for Zambian language speech synthesis.
    """
    def __init__(self, model_dir):
        self.models = load_all_voice_models(model_dir)
    
    async def synthesize(self, text, language="bem", voice="female"):
        model_key = f"{language}_{voice}"
        model = self.models[model_key]
        
        async for audio_chunk in model.synthesize_streaming(text):
            yield audio_chunk

# Main agent definition
class FiQVoiceAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="...",  # Built from tenant's BusinessConfig
        )
        
    async def on_enter(self):
        # Greet the caller
        await self.session.say(
            self.greeting_message,
            language=self.default_language
        )
    
    async def on_user_turn(self, message):
        # Process through LLM (GPT-4)
        response = await self.llm.chat(message)
        
        # Speak the response in the detected language
        await self.session.say(response, language=self.detected_language)

# Wire everything together
async def create_fiq_agent(tenant_config):
    agent = FiQVoiceAgent()
    
    session = AgentSession(
        stt=ZambianWhisperSTT(model_path="models/whisper-zambian-v1"),
        llm=openai.LLM(model="gpt-4"),
        tts=ZambianVITSTTS(model_dir="models/tts/"),
        
        # Turn detection settings
        turn_detection=ServerVAD(
            threshold=0.5,
            prefix_padding_ms=300,
            silence_duration_ms=700,  # Slightly longer for tonal languages
        ),
    )
    
    await session.start()
    return agent
```

### 4.3 Telephony Integration (Twilio SIP → LiveKit)

We keep Twilio for PSTN connectivity but route calls to LiveKit instead of Retell.

```
Caller dials phone number
    → Twilio receives call
    → Twilio SIP INVITE → LiveKit SIP server
    → LiveKit connects audio to our FiQ Voice Agent
    → Agent processes: STT → LLM → TTS
    → Audio streams back through LiveKit → Twilio → Caller
```

**Configuration changes:**
- Instead of `sip:{call_id}@sip.retellai.com`, use `sip:{room_id}@{livekit_sip_endpoint}`
- LiveKit handles the SIP server; Twilio just forwards calls

### 4.4 Language Detection & Routing

```python
class LanguageRouter:
    """
    Detect caller's language and route to appropriate STT/TTS models.
    
    Strategy:
    1. Start with default language (based on tenant config or phone number region)
    2. After first few words, run language detection
    3. Switch models if different language detected
    4. Handle code-switching (Bemba/English mix) gracefully
    """
    
    LANGUAGE_MAP = {
        "bem": {"name": "Bemba", "region": "Northern/Copperbelt/Lusaka"},
        "nya": {"name": "Nyanja", "region": "Eastern/Lusaka"},
        "toi": {"name": "Tonga", "region": "Southern"},
        "loz": {"name": "Lozi", "region": "Western"},
        "en":  {"name": "English", "region": "All"},
    }
    
    async def detect_language(self, audio_segment):
        """
        Use Whisper's language detection on the first 5 seconds of audio.
        If confidence is low, default to English or tenant's primary language.
        """
        detected = await self.whisper.detect_language(audio_segment)
        
        if detected.language in self.LANGUAGE_MAP and detected.confidence > 0.7:
            return detected.language
        
        # Fallback: English (safe default for Zambian business context)
        return "en"
```

### 4.5 Latency Budget

| Stage | Budget | Notes |
|-------|--------|-------|
| Audio capture + transport | 50ms | Twilio → LiveKit |
| VAD / Turn detection | 100ms | Silero VAD |
| STT (Whisper inference) | 200-300ms | faster-whisper, INT8, GPU |
| LLM (GPT-4 first token) | 500-1500ms | OpenAI API, streaming |
| TTS (time to first byte) | 150-250ms | VITS streaming inference |
| Audio playback transport | 50ms | LiveKit → Twilio → PSTN |
| **Total round-trip** | **~1000-2300ms** | Target: <2000ms P95 |

**Optimization levers:**
- Use GPT-4o-mini for faster LLM responses (trade quality for speed)
- Pre-generate common responses (greetings, confirmations)
- Speculative TTS: start synthesizing before LLM response is complete
- Edge deployment: colocate STT/TTS server in same region as Twilio

### 4.6 Deliverables

- [ ] LiveKit Agents server setup with Twilio SIP integration
- [ ] Custom STT plugin (Zambian Whisper) integrated into pipeline
- [ ] Custom TTS plugin (Zambian VITS) integrated into pipeline
- [ ] Language detection and routing module
- [ ] VAD and turn-taking tuned for Zambian languages
- [ ] End-to-end latency under 2000ms P95
- [ ] Concurrent call handling (minimum 10 simultaneous calls)

---

## Phase 5 — FiQ Integration & Migration (Months 5-7)

### 5.1 Code Migration Plan

Replace Retell-specific code with our custom pipeline client.

#### New file: `src/lib/voice/zambian-voice-client.ts`

```typescript
// Replaces retell-client.ts
// Wraps our custom voice pipeline (LiveKit-based)

export class ZambianVoiceClient {
  // Create a voice agent (configure STT/LLM/TTS for a tenant)
  async createAgent(params: {
    name: string;
    systemPrompt: string;
    language: string;        // "bem", "nya", "toi", "loz", "en"
    voiceGender: string;     // "male", "female"
    greeting: string;
    maxDurationSeconds: number;
    transferNumber?: string;
  }): Promise<VoiceAgent>;

  // Make an outbound call
  async makeCall(params: {
    fromNumber: string;
    toNumber: string;
    agentId: string;
    language?: string;
    metadata?: Record<string, string>;
  }): Promise<CallResult>;

  // Get call details
  async getCall(callId: string): Promise<CallDetails>;

  // List available voices
  async listVoices(): Promise<Voice[]>;
  
  // Supported languages
  getSupportedLanguages(): Language[];
}
```

#### Migration checklist

| Current File | Action | New File |
|--------------|--------|----------|
| `retell-client.ts` | Replace | `zambian-voice-client.ts` |
| `twilio-client.ts` | Modify SIP target | Same file, updated endpoint |
| `api/voice/agents/route.ts` | Replace Retell calls | Use ZambianVoiceClient |
| `api/voice/webhook/route.ts` | Replace Retell webhook | LiveKit webhook handler |
| `admin/telephony/page.tsx` | Update config fields | Remove Retell fields, add model selection |
| `dashboard/voice/config/page.tsx` | Add language selection | Zambian language dropdown |

### 5.2 Database Schema Updates

```sql
-- Add language voice support columns
ALTER TABLE voice_agents 
  ADD COLUMN voice_language VARCHAR(10) DEFAULT 'en',
  ADD COLUMN voice_gender VARCHAR(10) DEFAULT 'female',
  ADD COLUMN stt_model_version VARCHAR(50),
  ADD COLUMN tts_model_version VARCHAR(50);

-- Voice model registry
CREATE TABLE voice_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language VARCHAR(10) NOT NULL,        -- 'bem', 'nya', 'toi', 'loz', 'en'
  model_type VARCHAR(10) NOT NULL,      -- 'stt' or 'tts'
  model_version VARCHAR(50) NOT NULL,
  speaker_name VARCHAR(100),            -- For TTS models
  speaker_gender VARCHAR(10),           -- 'male', 'female'
  model_path TEXT NOT NULL,             -- Path/URL to model files
  is_active BOOLEAN DEFAULT true,
  wer_score DECIMAL(5,2),              -- STT: Word Error Rate on test set
  mos_score DECIMAL(3,2),              -- TTS: Mean Opinion Score
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Call language analytics
ALTER TABLE voice_calls
  ADD COLUMN detected_language VARCHAR(10),
  ADD COLUMN language_confidence DECIMAL(3,2),
  ADD COLUMN stt_model_used VARCHAR(50),
  ADD COLUMN tts_model_used VARCHAR(50);
```

### 5.3 Feature Flag & Gradual Rollout

```typescript
// Feature flag: control which voice backend is used per tenant
const VOICE_BACKEND = {
  RETELL: "retell",          // Current: Retell AI (English)
  ZAMBIAN_PIPELINE: "zambian", // New: Custom pipeline (Zambian languages)
};

function getVoiceBackend(tenant: Tenant): string {
  // Phase 1: Only opt-in tenants use new pipeline
  if (tenant.config.voice_backend === "zambian") {
    return VOICE_BACKEND.ZAMBIAN_PIPELINE;
  }
  // Phase 2: All tenants requesting Zambian languages use new pipeline
  if (["bem", "nya", "toi", "loz"].includes(tenant.config.default_language)) {
    return VOICE_BACKEND.ZAMBIAN_PIPELINE;
  }
  // Default: Keep Retell for English-only tenants
  return VOICE_BACKEND.RETELL;
}
```

### 5.4 Testing Plan

| Test | Method | Pass Criteria |
|------|--------|---------------|
| STT accuracy (Bemba) | Automated: run test set, compute WER | WER < 20% |
| STT accuracy (Nyanja) | Automated: run test set, compute WER | WER < 20% |
| STT accuracy (Tonga) | Automated: run test set, compute WER | WER < 25% |
| STT accuracy (Lozi) | Automated: run test set, compute WER | WER < 30% |
| TTS quality (all) | Human evaluation: MOS score | MOS ≥ 3.5 |
| End-to-end latency | Automated: measure response time | P95 < 2000ms |
| Code-switching | Manual: test Bemba+English mixed speech | Reasonable transcription |
| Concurrent calls | Load test: 10 simultaneous calls | No degradation |
| Twilio integration | Manual: make real phone calls | Calls connect and work |
| Failover to Retell | Kill custom pipeline, verify fallback | English calls still work |
| Dashboard UI | Manual: configure voice agent | All options work |

### 5.5 Deliverables

- [ ] `ZambianVoiceClient` implemented and tested
- [ ] All Retell-dependent code migrated
- [ ] Database schema updated
- [ ] Feature flag system for gradual rollout
- [ ] Admin UI updated with Zambian language options
- [ ] Dashboard voice configuration updated
- [ ] Full integration test suite passing
- [ ] Production deployment checklist

---

## 9. Infrastructure & Compute Requirements

### Training Infrastructure (Temporary)

| Resource | Spec | Duration | Cost Estimate |
|----------|------|----------|---------------|
| **STT Training** | 1x NVIDIA A100 80GB | ~2 weeks total | ~$500-800 (cloud GPU rental) |
| **TTS Training** | 1x NVIDIA A100 80GB | ~4 weeks total (8 voices) | ~$1,000-1,600 |
| **Storage** | 500GB SSD | Duration of training | ~$50 |
| **Total Training** | — | ~6 weeks | **~$1,500-2,500** |

**Recommended providers:** RunPod, Lambda Cloud, or Google Colab Pro+ (cheapest for short-term GPU)

### Production Infrastructure (Ongoing)

| Component | Spec | Monthly Cost |
|-----------|------|--------------|
| **GPU Inference Server** | 1x NVIDIA T4 or L4 (16GB VRAM) | ~$200-400/month |
| **LiveKit Server** | 2 vCPU, 4GB RAM | ~$40/month |
| **Model Storage** | 50GB SSD | ~$10/month |
| **Twilio (existing)** | Per-call pricing | Existing cost |
| **OpenAI API (existing)** | GPT-4 per-token | Existing cost |
| **Total Monthly** | — | **~$250-450/month** |

**Scaling note:** One T4 GPU can handle ~10-15 concurrent calls. Scale by adding GPUs.

### Deployment Architecture

```
Production:
├── GPU Server (RunPod/Lambda/AWS)
│   ├── faster-whisper (STT inference)
│   ├── VITS TTS (TTS inference)  
│   └── API server (FastAPI)
│
├── LiveKit Cloud (or self-hosted)
│   ├── SIP integration
│   ├── Audio routing
│   └── WebRTC handling
│
├── FiQ Next.js App (Vercel - existing)
│   ├── Voice agent management API
│   ├── Dashboard UI
│   └── Webhook handlers
│
└── Twilio (existing)
    ├── Phone numbers
    └── SIP trunking
```

---

## 10. Cost Estimates

### One-Time Costs

| Item | Cost (USD) | Notes |
|------|-----------|-------|
| GPU training compute | $1,500-2,500 | Cloud GPU rental for 6 weeks |
| Voice actor recording | $2,000-4,000 | 8 voices × $250-500 each |
| Supplementary data collection | $1,000-2,000 | Native speaker recording sessions |
| MOS evaluation panel | $500-1,000 | Pay native speakers for quality evaluation |
| **Total one-time** | **$5,000-9,500** | — |

### Monthly Operating Costs (Post-Launch)

| Item | Cost (USD/month) | Notes |
|------|------------------|-------|
| GPU inference server | $200-400 | Scales with call volume |
| LiveKit hosting | $40-100 | Depends on self-hosted vs cloud |
| Model storage | $10-20 | — |
| OpenAI API (existing) | Existing | No change |
| Twilio (existing) | Existing | No change |
| **Total monthly** | **$250-520** | — |

### Cost Comparison: Retell vs Custom Pipeline

| | Retell AI | Custom Pipeline |
|---|-----------|----------------|
| Per-call cost | $0.07-0.15/min | ~$0.02-0.04/min (compute only) |
| Monthly base | $0 (pay per use) | ~$250-520 (fixed infra) |
| Break-even | — | ~3,000-5,000 minutes/month |
| Zambian languages | Not supported | Fully supported |
| Long-term IP | None (vendor lock-in) | Full ownership |

---

## 11. Risk Register

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|-------------|------------|
| R1 | STT accuracy too low for production use | High | Medium | Start with Bemba/Nyanja (most data); use self-training on radio data; supplement with custom recordings |
| R2 | TTS voice quality not natural enough | High | Medium | Record more training data; try multiple TTS architectures (VITS, Piper, StyleTTS2); use English TTS as fallback |
| R3 | Latency exceeds 2s threshold | Medium | Low | Use faster-whisper + INT8 quantization; colocate servers; use GPT-4o-mini; pre-generate common phrases |
| R4 | Zambezi Voice license doesn't cover commercial use | High | Low | Contact team early (Phase 1); offer sponsorship; worst case, record all data from scratch |
| R5 | Not enough Lozi data (only 6 hours) | Medium | High | Prioritize Bemba/Nyanja first; collect more Lozi data; use multilingual model for cross-lingual transfer |
| R6 | Code-switching (English + local language) breaks STT | Medium | Medium | Include code-switched training data; train bilingual model; use English Whisper as fallback |
| R7 | Twilio SIP → LiveKit integration issues | Medium | Low | LiveKit has documented Twilio integration; test early in Phase 4 |
| R8 | GPU costs exceed budget | Low | Medium | Use spot instances; optimize batch inference; start with T4 (cheapest inference GPU) |
| R9 | Team lacks ML/speech processing expertise | High | Medium | Hire ML contractor for Phases 2-3; partner with UNZA researchers; use well-documented training recipes |

---

## 12. Research References & Contacts

### Academic Papers

1. **Zambezi Voice** — Sikasote et al. (INTERSPEECH 2023)
   - Paper: https://arxiv.org/abs/2306.04428
   - The foundational dataset for this project
   
2. **BembaSpeech** — Sikasote & Anastasopoulos (2022)
   - 28 hours of labeled Bemba speech data
   - GitHub: https://github.com/csikasote/BembaSpeech

3. **Fine-tuning Whisper on Low-Resource Languages** — (2024)
   - https://arxiv.org/abs/2412.15726
   - Methodology for Whisper fine-tuning on small datasets

4. **Whispering in Amharic** — (2025)
   - https://arxiv.org/abs/2503.18485
   - Fine-tuning Whisper for another African language (relevant methodology)

### Key Contacts

| Who | Role | Contact | Purpose |
|-----|------|---------|---------|
| **Claytone Sikasote** | Zambezi Voice Lead, UNZA | claytonsikasote@gmail.com | Data licensing, partnership |
| **Zambezi Voice Team** | Research group | zambezivoice@gmail.com | General inquiries |
| **Masakhane** | African NLP community | masakhane.io | Community support, potential collaborators |

### Open Source Tools

| Tool | Purpose | URL |
|------|---------|-----|
| **faster-whisper** | Fast Whisper inference | https://github.com/SYSTRAN/faster-whisper |
| **Coqui TTS** | VITS training & inference | https://github.com/idiap/coqui-ai-TTS |
| **Piper TTS** | Lightweight TTS alternative | https://github.com/rhasspy/piper |
| **LiveKit Agents** | Voice AI orchestration | https://github.com/livekit/agents |
| **Silero VAD** | Voice activity detection | https://github.com/snakers4/silero-vad |
| **KenLM** | Language model for STT decoding | https://github.com/kpu/kenlm |

---

## 13. Success Metrics

### Phase Gate Criteria

| Phase | Gate Criteria | Must Pass to Proceed |
|-------|---------------|---------------------|
| Phase 1 | Data acquired, license confirmed, recordings started | Yes |
| Phase 2 | Bemba WER <25%, Nyanja WER <25% | Yes |
| Phase 3 | TTS MOS ≥3.0 for at least 2 languages | Yes |
| Phase 4 | End-to-end call works with <2.5s latency | Yes |
| Phase 5 | 10 successful test calls per language | Yes |

### Launch Metrics (6 months post-launch)

| Metric | Target |
|--------|--------|
| Zambian language calls handled | 500+/month |
| STT word error rate (production) | <25% average |
| TTS MOS score | ≥3.5 average |
| Call completion rate | >80% |
| Customer satisfaction (post-call) | ≥4.0/5.0 |
| End-to-end latency P95 | <2000ms |

---

## Appendix A: Zambian Language Demographics

Understanding the market size for each language:

| Language | % of Population | Est. Speakers | Primary Regions | Priority |
|----------|----------------|---------------|-----------------|----------|
| **Bemba** | 35% | ~6.5M | Northern, Copperbelt, Luapula, Lusaka | **P0** (highest) |
| **Nyanja** | 14.8% | ~2.8M | Eastern, Lusaka | **P0** (highest) |
| **Tonga** | 11.4% | ~2.1M | Southern, Central | **P1** |
| **Lozi** | 5.7% | ~1.1M | Western | **P2** |
| **English** | Official | ~2M fluent | Urban centers | **Already supported** |
| **Others** | ~33% | ~6M | Various | Future phases |

**Key insight:** Bemba + Nyanja cover ~50% of the population. If we nail these two languages first, we capture the majority market before expanding to Tonga and Lozi.

### Implementation Priority Order

1. **Bemba** — Most speakers, most training data (28 hrs), highest business impact
2. **Nyanja** — Second most speakers, good training data (25 hrs), lingua franca of Lusaka
3. **Tonga** — Third most speakers, decent data (22 hrs)
4. **Lozi** — Smaller speaker base, least data (6 hrs), expand data before training

---

## Appendix B: Timeline Summary

```
Month 1  ████████ Phase 1: Data acquisition, UNZA partnership
Month 2  ████████ Phase 1 (cont) + Phase 2: STT training begins
Month 3  ████████ Phase 2: STT training + Phase 3: TTS recording starts
Month 4  ████████ Phase 2: STT complete + Phase 3: TTS training
Month 5  ████████ Phase 3: TTS complete + Phase 4: Pipeline integration
Month 6  ████████ Phase 4: Pipeline testing + Phase 5: FiQ migration starts
Month 7  ████████ Phase 5: Migration, testing, soft launch
Month 8  ████████ Phase 5: Production rollout, monitoring
Month 9  ████████ Optimization, Tonga/Lozi expansion, feedback loop
```

---

*This document should be updated as each phase progresses. Create a `progress.md` companion file to track actual vs. planned milestones.*
