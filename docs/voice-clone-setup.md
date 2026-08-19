# Making the channel voice your own

The reels currently use a rented ElevenLabs voice. It has been tuned about as
far as it goes, and it still sounds like a machine — because it is one. The fix
is not more tuning. It is to put a real person in, and the cheapest real person
available is you.

This takes about fifteen minutes, once, and then never again.

---

## Why your own voice is better here, not just cheaper

- **It is free per reel.** A clone costs nothing extra each time it speaks. A
  voice artist is ₹500–2,000 an episode, which at three a week is ₹6,000–24,000
  a month and puts a human back in the daily loop.
- **A money channel runs on trust.** People take financial advice from a person,
  not a narrator. Your voice, consistently, across two hundred reels, is the
  thing that makes the channel feel like someone rather than something.
- **It cannot be copied.** Anyone can rent the same stock voice you were using.
  Nobody else can sound like you.

---

## What you need

- A quiet room. Not silent — just no fan, no traffic, no TV.
- Your phone. The built-in voice recorder is genuinely fine; a ₹500 wired
  earphone mic is slightly better. Do NOT use Bluetooth earbuds, which compress
  the audio and make the clone sound thin.
- Two minutes of reading.

## How to record

1. Hold the phone about a hand's width from your mouth, slightly off to the
   side so your breath does not hit the mic directly.
2. Read the passage below **the way you would explain this to a friend** — not
   like a newsreader, not like a presentation. Warm, direct, unhurried.
3. Do not try to sound impressive. The clone copies whatever you give it, so
   give it the voice you actually want coming out of the reels.
4. If you stumble, keep going. One clean take with a small mistake beats six
   anxious ones.
5. Save as the highest quality your recorder offers (M4A or WAV, not a low
   bitrate MP3).

---

## The passage to read

Written on purpose: it is about money, so the clone hears the exact vocabulary
the channel uses — and it covers a wide spread of Hindi sounds, plus the English
loanwords that appear in every episode (EMI, credit card, CIBIL, subscription).
Read it all. It runs about ninety seconds.

> नमस्ते। मैं पैसों की बात करता हूँ — आसान भाषा में, बिना किसी लालच के।
>
> देखिए, ज़्यादातर लोग पैसे इसलिए नहीं जोड़ पाते कि कमाई कम है। असली वजह ये है कि
> पैसा कहाँ जा रहा है, ये किसी को ठीक से पता ही नहीं होता।
>
> एक छोटा सा उदाहरण लेते हैं। मान लीजिए आपके फ़ोन पर तीन-चार subscription चल रहे
> हैं। हर महीने पाँच सौ, छह सौ रुपये, चुपचाप कट जाते हैं। महीने में ये छोटा लगता
> है... लेकिन साल भर में यही अठारह हज़ार रुपये बन जाता है।
>
> अब credit card की बात करें। भारत में कार्ड पर हर महीने लगभग साढ़े तीन प्रतिशत
> ब्याज लगता है। साल भर में? ये बयालीस प्रतिशत बैठता है। इसीलिए मैं हमेशा कहता हूँ
> — कार्ड का बिल सबसे पहले चुकाइए, बाकी सब उसके बाद।
>
> EMI हो, किराया हो, या घरवालों से लिया गया उधार — हर चीज़ का एक असली हिसाब होता
> है। और जिस दिन आप वो हिसाब लिखना शुरू कर देते हैं, उसी दिन से चीज़ें बदलनी शुरू
> हो जाती हैं।
>
> आपका CIBIL स्कोर तीन सौ से नौ सौ के बीच होता है। साढ़े सात सौ से ऊपर हो, तो
> ज़्यादातर बैंक आपको अच्छा मानते हैं।
>
> तो शुरुआत कहाँ से करें? सबसे पहले दस हज़ार रुपये अलग रखिए। निवेश नहीं, कर्ज़ नहीं
> — सिर्फ़ एक छोटा सा बफर, जो मुश्किल वक़्त में काम आए।
>
> बस इतना ही। मिलते हैं अगली बार।

---

## Turning it into a voice

1. Go to **elevenlabs.io** and sign in with the account whose key is already in
   the GitHub secrets.
2. **Voices** → **Add a new voice** → **Instant Voice Cloning**.
3. Upload your recording. Name it something obvious — `Hisaab Kitab — Satish`.
4. Under language, pick **Hindi**. Tick the box confirming the voice is yours.
5. Create it. It takes under a minute.
6. Open the finished voice and copy its **Voice ID** — a string that looks like
   `Ms9OTvWb99V6DwRHZn6q`.

## Giving it to the pipeline

A voice ID is not a secret, but it goes in the same place as the keys so it is
easy to change later without touching code.

**GitHub → repo → Settings → Secrets and variables → Actions → New repository
secret**

- Name: `ELEVENLABS_VOICE_ID__MONEY`
- Value: the Voice ID you copied

That is all. The pipeline already reads that name and falls back to the old
rented voice if it is missing, so nothing breaks while you set it up.

---

## Then check it

Run **Actions → Money Voice Lab → Run workflow → mode: `episode`**. The MP4 in
the artifacts will be in your voice.

If it sounds off, it is almost always the recording rather than the clone:

| What you hear | What to change |
|---|---|
| Thin, phone-like | You used Bluetooth earbuds. Re-record wired or on the phone mic. |
| Echoey, distant | Room is too bare. Record sitting on a bed, or near curtains. |
| Flat, stiff | You read it like a script. Read it again like you are explaining it to a friend. |
| Rushed | Slow down and use the pauses — the `...` marks are real pauses, not decoration. |

Re-recording and re-cloning costs nothing, so it is worth one more take to get
a voice you are happy hearing two hundred times.
