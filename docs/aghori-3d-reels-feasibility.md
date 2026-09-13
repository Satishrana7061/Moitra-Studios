# 3D Reels with Blender + Mixamo — Feasibility Study

**Question asked:** can a Blender (3D model) + Mixamo (animation) workflow be driven
end‑to‑end by an agent — producing animated reels for an *Aghori* mini‑series and
posting them to social — *without the operator's involvement*?

**Short answer:** yes for the pipeline, no for the naive version of it. Fully
autonomous *novel* 3D animation per reel is not realistic at acceptable quality.
Autonomous *assembly and publishing* from a pre‑built 3D asset library is very
realistic — and it is close to what this repository already does in 2D.

The rest of this document separates what is actually automatable from what needs
a human once, and what needs a human every time.

---

## 1. What already exists here

This is the important finding. The hard, boring 70% of "make reels automatically
and post them" is already built and shipping in this repo:

| Stage | Where | State |
|---|---|---|
| Topic/script generation (Gemini + OpenAI fallback) | `rajneeti-backend/src/services/automatedReelPipeline.ts` Steps 1–3 | working |
| Voiceover (ElevenLabs, Hindi/Hinglish) | `elevenLabsService.ts`, `moneyVoiceService.ts` | working |
| Word‑level timing + beat alignment | `beatTimingAligner.ts`, `lipSyncAnalyzer.ts` | working |
| **Storyboard contract (JSON)** | `reel-studio/src/lib/moneySchema.ts` | working |
| Video render (2D) | `ffmpegVideoGenerator.ts`, Remotion `MoneyReel.tsx` | working |
| Storage | `supabaseStorage.ts` | working |
| **Publishing to YouTube / Instagram / Facebook Reels** | `socialUploadService.ts` (Graph API v21.0 + YouTube Data API) | working |
| Unattended scheduling | `.github/workflows/daily-reels.yml` (cron, currently paused) | working |

The architecture already has the right seam. `moneyStoryboardSchema` is a
renderer‑agnostic contract: the pipeline emits a storyboard, the composition
consumes it, "neither knows anything else about the other" (per the comment in
the file). **A 3D renderer is therefore a drop‑in second consumer of the same
contract, not a rewrite.** That is the single most important structural fact in
this study.

So the real question is narrow: *can the render stage (Step 5) be swapped from
2D ffmpeg/Remotion to Blender, and can that swap run unattended?*

---

## 2. The four sub‑problems (they have very different answers)

A 3D reel needs four things. They are usually discussed as one thing, which is
why "can this be automated?" feels unanswerable. Separated:

| # | Problem | Automatable unattended? | Notes |
|---|---|---|---|
| A | **Have a character** (Aghori model, textured, rigged) | ❌ one‑time human job | Or buy / AI‑generate. Not a per‑reel task. |
| B | **Make it move** (animation clips) | ⚠️ conditionally | Mixamo is the problem child — see §3. |
| C | **Render frames** (Blender → mp4) | ✅ yes, with a GPU | Fully scriptable headless. See §4. |
| D | **Script, voice, assemble, publish** | ✅ already done | Exists in this repo. |

A and B are **asset acquisition**. C and D are **runtime**. The mistake is
treating A and B as runtime dependencies. They are not. Do them once, commit the
results, and the nightly job never touches Mixamo or a modelling tool again.

---

## 3. Mixamo: usable, but only as a one‑time source

Findings as of September 2026:

- **Still free, still royalty‑free for unlimited commercial use** with a free
  Adobe account. Good.
- **Adobe has shipped no meaningful update since acquiring it in 2015.** Fuse CC
  (its companion character creator) was discontinued and pulled in 2020.
- **It broke for days in June 2025** with server 500s; Adobe support reportedly
  told users it "is not supported anymore." Outage threads continued through 2026.
  Adobe has published neither a roadmap nor a shutdown date.
- **There is no documented public API.** Every automation tool in the wild
  (MixamoHarvester, mixamo-downloader, various browser‑console scripts) drives
  the undocumented web endpoints or Selenium. They break when the UI changes, and
  automated harvesting of an Adobe service is on shaky ground with Adobe's terms.

### Conclusion on Mixamo

Putting Mixamo *inside* a nightly unattended pipeline is a bad bet: an
undocumented endpoint, on an unmaintained service, with a history of multi‑day
outages, behind an Adobe login, as a hard dependency of a job that is supposed to
run without anyone watching. One outage and the series stops.

Putting Mixamo *before* the pipeline is completely fine and genuinely useful:

1. Upload the Aghori character to the Mixamo auto‑rigger once (this is the
   feature worth having — auto‑rigging a humanoid in the browser in minutes).
2. Download a **motion library** by hand, through the normal UI: walk, idle,
   sit/meditate, gesture‑talk, turn, look‑up, stand, a couple of ritual‑ish
   poses. 20–40 clips is a full series' worth.
3. Commit the FBX files (or a retargeted `.blend`) to the repo.
4. The automation selects from that library. It never logs into Adobe.

This converts a fragile runtime dependency into a static asset. Cost: one
afternoon, once. It also means a Mixamo shutdown costs you nothing later.

**API‑native alternatives** if you'd rather not depend on Adobe at all:
Meshy auto‑rigs humanoids in ~30 seconds, ships 600+ preset motions, and exports
rigged FBX/GLB **through an API** — effectively "Mixamo with an API". Text‑to‑motion
services (Uthana, Artificial Studio, QuickMagic) generate skeletal motion from a
text prompt and return FBX/BVH in seconds via API. These *can* sit inside an
unattended pipeline in a way Mixamo cannot.

---

## 4. Rendering: the real constraint is the GPU, not the scripting

Scripting Blender is a solved problem. `blender --background scene.blend --python
render.py` with a JSON payload driving camera, clip selection and timing is
routine, and the CLI is fully documented. That part is genuinely easy.

The constraint is arithmetic:

- A 30‑second vertical reel at 30 fps = **900 frames**.
- **Cycles renders on CPU or GPU. EEVEE requires a GPU** (it needs OpenGL), and
  headless EEVEE is Linux‑only, and only since Blender 3.4.
- Cycles on CPU for a character scene is minutes per frame. Even a wildly
  optimistic 30 s/frame puts 900 frames at **7.5 hours**. Realistic numbers are far
  worse.

That kills the obvious plan:

> **A standard GitHub Actions runner cannot render this.** Ubuntu runners are
> CPU‑only, and a job is hard‑capped at 6 hours. This agent container is 4 vCPU /
> 15 GB with no GPU and no Blender installed. Neither is a viable renderer.

Three ways out:

### Option 1 — GitHub GPU runners
~$0.052/min for Linux GPU runners. A 20–30 min EEVEE/Cycles‑GPU render ≈
**$1–1.60 per reel**, so ~$30–50/month at one reel a day. Caveat: GPU and larger
runners require a **Team or Enterprise Cloud plan**, are always billed (no
included minutes), and are billed even on public repos.

### Option 2 — Your laptop as a self‑hosted runner ⭐
This is the direct answer to *"without my involvement."* Register the laptop as a
self‑hosted GitHub Actions runner. The nightly workflow then dispatches to
**your** machine, uses the Blender and GPU already installed there, renders, and
pushes the mp4 to Supabase — with nobody touching it. Free. Your only obligation
is leaving the laptop on and online.

Caveat worth knowing: if the laptop is Windows or macOS, headless **EEVEE** is not
supported — use **Cycles with GPU** (CUDA/OptiX/Metal), which does work headless
everywhere. On Linux, headless EEVEE is available and much faster.

### Option 3 — Cloud GPU on demand
Modal / RunPod / a render farm, called as a step from the existing pipeline.
More moving parts than Option 2, no dependency on your hardware being awake.

**Recommendation: Option 2 to prove it out, Option 1 or 3 once it's worth paying for.**

---

## 5. The quality question nobody asks first

Even with all of the above working, note what the machine is actually good at.

Mixamo clips are generic, mocap‑derived, and instantly recognisable as stock. A
series built from unedited Mixamo loops on an auto‑rigged mesh looks like a 2012
game prototype. It will not carry a narrative mini‑series on its own merits.

What *does* work autonomously, and is the honest target:

- **Fixed cast, fixed set, fixed shot grammar.** Model the Aghori once, build 3–5
  camera setups and a lit environment once. Treat them as a stage.
- **Per‑reel variation comes from the script, the voiceover, the beat timing, the
  camera choice and the clip selection** — not from new animation.
- Heavy use of atmosphere over performance: firelight, smoke, fog volumes, slow
  push‑ins, rim light, cuts on the beat. Mood covers what rigid animation cannot,
  and it is the aesthetic the subject wants anyway.
- Keep the face out of long close‑ups unless real lip‑sync is wired in (you
  already have `lipSyncAnalyzer.ts` and a SadTalker/Replicate path — that is a
  2D face solution, and bridging it to a 3D head is its own project).

This is the same discipline `MoneyReel.tsx` already follows in 2D: a small set of
hand‑built visual primitives, recombined per storyboard. Extending that idea into
3D is a much safer bet than asking a machine to direct animation.

---

## 6. Content risk — specific to the Aghori subject

This deserves a flag, because it is the one place where full autonomy is
genuinely unwise rather than merely difficult.

Aghoris are a real ascetic Shaivite tradition, not a horror trope. Content about
them touches cremation grounds, ash, skulls and death rites. Two consequences:

1. **Platform risk.** Instagram and YouTube apply sensitive/graphic content
   filters. Reels that read as occult or gore get suppressed or age‑gated rather
   than removed — which quietly kills reach without telling you why. A pipeline
   that publishes unattended will not notice this happening.
2. **Legal risk in India.** BNS §299 (deliberate and malicious acts intended to
   outrage religious feelings) and §302 are actively invoked against social media
   content, and platforms are obliged under the IT Rules 2021 to act on
   complaints. Intent matters legally, but a takedown or an FIR does not wait for
   that finding. There is a recent, well‑publicised history of creators facing
   exactly this.

Neither is a reason not to make the series. Respectful, well‑researched content
about a misunderstood tradition is a good premise. But it *is* a strong reason to
keep **one human approval gate** before publishing. Concretely: the pipeline
generates, renders, uploads to Supabase and posts a preview link — and waits.
You tap approve. That is roughly fifteen seconds of your day per reel, and it is
the difference between an automated channel and an unsupervised liability.

Note the existing `daily-reels.yml` is already paused for a related reason: a
publish bug was fixed, which means scheduled runs would genuinely post for the
first time, and the workflow comment says resuming before reel quality is fixed
"would publish it." That instinct was correct. Apply it here too.

---

## 7. The autonomy ledger — the actual answer to "without my involvement"

**One‑time, needs you (roughly a weekend):**
- The Aghori character: model it, buy it, or AI‑generate it (Meshy/Tripo/Rodin),
  then rig it (Mixamo auto‑rigger or Meshy).
- The motion library: pull 20–40 clips from Mixamo by hand, commit them.
- The stage: one Blender scene — environment, lighting, 3–5 camera setups.
- Register the laptop as a self‑hosted runner (or fund GPU minutes).

**One‑time, I can do (this is normal repo work):**
- A `blenderRenderService.ts` that consumes the existing storyboard JSON.
- The Python render script (`--background`, camera/clip/timing driven by JSON).
- A shot‑list generator so the script generator emits 3D storyboards.
- Workflow wiring, the approval gate, Supabase upload, and reuse of
  `socialUploadService.ts` as‑is.

**Per reel, needs you:** the approval tap. Nothing else.

**Per reel, automated:** topic → script → Hindi voiceover → beat timing → shot
list → Blender render → mp4 → Supabase → YouTube/Instagram/Facebook.

So: *not* zero involvement. But after setup, involvement is measured in seconds
per reel, not hours — and the setup is one‑time, not per episode.

---

## 8. Suggested sequence

Do not build all of this at once. Each phase is independently useful and each one
can kill the next if it fails.

1. **Phase 0 — one reel, by hand.** Make a single Aghori reel manually in Blender.
   Post it. If the aesthetic doesn't land, no amount of automation saves it, and
   you've spent a day instead of a month.
2. **Phase 1 — render stage only.** Script that exact reel: same scene, driven by
   a JSON shot list, rendered headless. Prove `blender --background` produces the
   same output your GUI did.
3. **Phase 2 — wire to the existing pipeline.** Emit a 3D storyboard from the
   script generator; the Blender renderer becomes the second consumer of the
   storyboard contract. Reuse voice, timing, storage and upload unchanged.
4. **Phase 3 — self‑hosted runner + approval gate.** Nightly unattended run,
   preview to you, publish on approval.
5. **Phase 4 — only if needed.** API‑native motion (Meshy / text‑to‑motion) to
   remove the last manual asset step, and drop the Adobe dependency entirely.

## 9. On the game idea

Worth noting the pivot from "a game about an Aghori" to "reels" was probably
correct, and the asset work is not wasted either way: a rigged character, a motion
library and a lit environment are exactly what a game needs too. Reels are the
cheaper way to find out whether the audience exists before building the game.
If the series works, the assets carry forward.

---

## Sources

- Mixamo status and licensing — [Cinevva: Free Character Animations and Auto-Rigging: Mixamo and Its Alternatives (2026)](https://app.cinevva.com/guides/free-character-animations-rigging), [Adobe Mixamo community discussions](https://community.adobe.com/questions-696/mixamo-is-not-end-of-life-it-s-broken-and-fixable-589870), [Neowin: Adobe revamps Mixamo, discontinues Fuse CC](https://www.neowin.net/news/adobe-revamps-mixamo-and-will-soon-be-discontinuing-support-for-fuse-cc/)
- Unofficial Mixamo automation — [MixamoHarvester](https://github.com/paulpierre/MixamoHarvester), [mixamo-downloader](https://github.com/juanjo4martinez/mixamo-downloader), [Mixamo Bulk Downloader](https://github.com/YasinSHV/Mixamo-Bulk-Downloader)
- Blender CLI / headless rendering — [Blender Manual: Rendering From The Command Line](https://docs.blender.org/manual/en/latest/advanced/command_line/render.html), [SURF: GPU-based rendering (EEVEE needs OpenGL; headless Linux-only since 3.4)](https://surf-visualization.github.io/blender-course/basics/rendering_lighting_materials/gpu_rendering/), [blender-cli-rendering](https://github.com/yuki-koyama/blender-cli-rendering)
- Render time and cost — [Super Renders: Blender Render Animation Guide — Cycles & Eevee (2026)](https://superrendersfarm.com/article/blender-render-animation-complete-guide), [Super Renders: Cloud Rendering Cost Per Frame 2026](https://superrendersfarm.com/article/render-farm-cost-per-frame-guide)
- Runner pricing — [GitHub Docs: Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing), [GitHub Changelog: Reduced pricing for GitHub-hosted runners (Jan 2026)](https://github.blog/changelog/2026-01-01-reduced-pricing-for-github-hosted-runners-usage/), [RunsOn: GPU runners for GitHub Actions](https://runs-on.com/runners/gpu/)
- API-native motion and 3D — [Uthana text-to-motion API](https://uthana.com/docs/api/capabilities/text-to-motion), [Meshy AI auto-rigging](https://www.meshy.ai/features/ai-auto-rigging), [Meshy AI animation generator](https://www.meshy.ai/features/ai-animation-generator), [Cinevva: Best AI 3D Model Generators 2026](https://app.cinevva.com/guides/ai-3d-model-generators)
- Content and legal risk — [BNS Section 299 (ApniLaw)](https://www.apnilaw.com/bare-act/bns/section-299-bharatiya-nyaya-sanhita-bns-deliberate-and-malicious-acts-intended-to-outrage-religious-feelings-of-any-class-by-insulting-its-religion-or-religious-beliefs/), [Drishti: Offences Relating to Religion Under BNS](https://www.drishtijudiciary.com/to-the-point/bharatiya-nyaya-sanhita-&-indian-penal-code/offences-relating-to-religion-under-bns), [IJLSI: Short-Form Content and the Law](https://ijlsi.com/wp-content/uploads/Short-Form-Content-and-the-Law-Navigating-Legal-Boundaries-of-Reels-and-Memes.pdf)
