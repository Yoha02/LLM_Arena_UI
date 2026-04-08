# Together AI Logprobs Experiment Plan (Arena)

## Goal
Add an **experimental, isolated Together AI integration** for Arena so that when logprobs are enabled, selected models can run through Together API and return token-level confidence. Start with one model: `openai/gpt-oss-120b`.

## Constraints
- Keep Together integration **separate** from OpenRouter code paths.
- Easy rollback: disable/remove Together modules without impacting existing OpenRouter flow.
- No API keys committed in source control. Use env/config only.

## References
- [Together Intro](https://docs.together.ai/intro)
- [Together Quickstart](https://docs.together.ai/docs/quickstart)
- [OpenAI Compatibility](https://docs.together.ai/docs/openai-api-compatibility)
- [Logprobs](https://docs.together.ai/docs/logprobs)
- [GPT-OSS-120B model page](https://api.together.ai/models/openai/gpt-oss-120b)

## Phase 1 - Architecture & Types
1. Add a new provider module: `lib/together.ts`
   - `createTogetherClient()` with OpenAI-compatible base URL (`https://api.together.xyz/v1`).
   - `TogetherAPI` class for streaming chat completions.
   - `TOGETHER_MODEL_CONFIGS` with one experimental model ID (Arena-facing ID + Together model name).
2. Add a shared provider registry: `lib/model-registry.ts`
   - Merge OpenRouter and Together model catalogs into a single lookup.
   - Expose helper methods:
     - `getModelConfig(modelId)`
     - `isTogetherModel(modelId)`
3. Extend Arena message/config types (`lib/types.ts`):
   - `requestLogprobs?: boolean` in `ExperimentConfig`.
   - `logprobs?: LogprobsData` in `ChatMessage` (Arena).
   - Add `TokenLogprob` and `LogprobsData` types (parallel to existing StarChamber shape).

## Phase 2 - Backend Wiring (Arena)
1. Update models API (`app/api/models/route.ts`):
   - Return combined model list from registry.
   - Include provider metadata (OpenRouter vs Together) for UI visibility.
2. Update experiment start API (`app/api/experiment/start/route.ts`):
   - Accept and pass `requestLogprobs` flag into `ExperimentConfig`.
3. Update experiment manager (`lib/experiment-manager.ts`):
   - Instantiate both OpenRouter and Together clients (separate fields).
   - Route per model to provider-specific client (OpenRouter default, Together for selected model IDs).
   - When `requestLogprobs` is true and provider is Together:
     - request streaming logprobs (`logprobs` + top alternatives)
     - collect per-token logprobs from stream chunks
     - convert to probability (`Math.exp(logprob)`)
     - store on final Arena `ChatMessage.logprobs`.
   - Keep existing OpenRouter behavior unchanged.

## Phase 3 - Arena UI + Report
1. Add an experiment toggle in setup UI (`components/experiment-setup.tsx`):
   - "Enable logprobs (experimental - Together models)"
2. Pass toggle state from Arena page (`app/(experiments)/arena/page.tsx`) to start API.
3. Update message rendering (`components/chat-message.tsx`):
   - Add expandable token confidence section when `message.logprobs` exists.
4. Update Arena HTML/PDF report (`lib/report-generator.ts`):
   - Add logprobs summary and token confidence section per message if available.

## Phase 4 - Verification
1. Lint/Type check edited files.
2. Run app locally and test one experiment:
   - model A or B = Together GPT-OSS-120B experimental model
   - logprobs toggle ON
3. Validate:
   - API response contains logprobs data
   - UI renders token confidence section
   - downloaded report includes logprobs section

## Rollback Plan
- Remove/disable `lib/together.ts` and `lib/model-registry.ts` references.
- Remove Together model entry from models API.
- Keep OpenRouter modules untouched.

## Deliverables
- Isolated Together integration for Arena (1 model).
- Logprobs end-to-end visibility in live UI + report.
- No secret material committed.
