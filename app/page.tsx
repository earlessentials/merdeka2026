"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type PrizeType = "catalogue_20" | "catalogue_35" | "neural";

type WheelPrize = {
  segmentIndex: number;
  prizeType: PrizeType;
  revealed: boolean;
  code?: string;
};

type RiddleStatus = {
  claimed: boolean;
  wonByYou: boolean;
  code?: string;
  heading?: string;
  lines?: string[];
  emphasis?: number[];
};

type GameStatus = {
  remaining: number;
  claimed: number;
  wheel: WheelPrize | null;
  riddles: Record<"1" | "2", RiddleStatus>;
};

type RiddleResult =
  | { state: "wrong"; message: string }
  | { state: "winner"; code: string; heading: string; lines: string[]; emphasis?: number[] }
  | { state: "late"; heading: string; lines: string[]; emphasis?: number[] };

type SoundKind = "ambient" | "toggle" | "off" | "spin" | "win" | "wrong" | "late" | "copy";
type SoundNote = [number, number, number, OscillatorType];

const SOUND_EVENT = "pearling-sound";
const GAME_BACKEND = "https://pearling-merdeka2026.pearling501936.chatgpt.site";
const PLAYER_STORAGE_KEY = "pearling_merdeka_player";

function gameApi(path: string) {
  if (typeof window === "undefined") return path;
  const brandedHost = window.location.hostname === "pearlinglim.com"
    || window.location.hostname === "www.pearlinglim.com";
  if (!brandedHost) return path;

  let playerId = window.localStorage.getItem(PLAYER_STORAGE_KEY);
  if (!playerId || !/^[a-f0-9-]{36}$/i.test(playerId)) {
    playerId = crypto.randomUUID();
    window.localStorage.setItem(PLAYER_STORAGE_KEY, playerId);
  }

  const url = new URL(path, GAME_BACKEND);
  url.searchParams.set("player", playerId);
  return url.toString();
}

const spinNotes: SoundNote[] = Array.from({ length: 32 }, (_, index) => [
  [330, 392, 494, 392][index % 4],
  index * 0.08 + index * index * 0.0018,
  0.035,
  "square",
]);

const soundRecipes: Record<SoundKind, SoundNote[]> = {
  ambient: [
    [523, 0, 0.12, "square"],
    [659, 0.13, 0.12, "square"],
    [784, 0.26, 0.12, "square"],
    [1046, 0.4, 0.18, "triangle"],
    [784, 0.61, 0.11, "square"],
    [1046, 0.74, 0.25, "triangle"],
  ],
  toggle: [
    [523, 0, 0.08, "square"],
    [659, 0.08, 0.08, "square"],
    [784, 0.16, 0.14, "triangle"],
  ],
  off: [[262, 0, 0.12, "triangle"]],
  spin: spinNotes,
  win: [
    [523, 0, 0.1, "square"],
    [659, 0.1, 0.1, "square"],
    [784, 0.2, 0.1, "square"],
    [1046, 0.31, 0.18, "triangle"],
    [523, 0.52, 0.38, "triangle"],
    [659, 0.52, 0.38, "triangle"],
    [784, 0.52, 0.38, "triangle"],
  ],
  wrong: [
    [247, 0, 0.12, "sawtooth"],
    [220, 0.11, 0.12, "sawtooth"],
    [196, 0.22, 0.12, "sawtooth"],
    [165, 0.33, 0.22, "sawtooth"],
  ],
  late: [
    [494, 0, 0.1, "triangle"],
    [392, 0.11, 0.12, "triangle"],
    [330, 0.24, 0.2, "triangle"],
  ],
  copy: [
    [659, 0, 0.07, "square"],
    [988, 0.07, 0.1, "triangle"],
  ],
};

function emitSound(kind: SoundKind) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<SoundKind>(SOUND_EVENT, { detail: kind }));
  }
}

function playSound(context: AudioContext, kind: SoundKind) {
  const now = context.currentTime;
  const peak = kind === "ambient" ? 0.012 : kind === "spin" ? 0.018 : kind === "wrong" ? 0.022 : 0.038;

  soundRecipes[kind].forEach(([frequency, delay, duration, wave]) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + delay;
    const end = start + duration;

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  });
}

const wheelSlots = [
  "20K",
  "NEURAL",
  "20K",
  "NEURAL",
  "35K",
  "20K",
  "NEURAL",
  "20K",
  "NEURAL",
  "20K",
];

const riddleOne = `Aku tidak terlihat,
namun jejakku ada pada segala sesuatu.

Aku tidak memiliki suara,
namun kehadiranku dapat mengubah
hal yang paling keras menjadi rapuh.

Aku tidak pernah berhenti,
meski kamu diam.

Aku tidak pernah berlari,
meski kamu sering merasa
aku bergerak terlalu cepat.

Aku dapat mendekatkan kamu pada sesuatu,
namun pada saat yang sama
menjauhkanmu dari hal lain.

Aku bisa membuat luka terasa lebih ringan,
tetapi juga membuat kenangan
semakin sulit untuk disentuh.

Semakin banyak yang kamu miliki dariku,
semakin sedikit yang tersisa.

Kamu dapat memberikanku kepada seseorang
tanpa pernah benar-benar menyerahkanku.

Kamu dapat menyia-nyiakanku,
tetapi tidak dapat mengambil kembali
apa yang telah hilang bersamaku.

Tidak ada tempat
yang dapat menyembunyikanku.

Tidak ada tangan
yang dapat menahanku.

Bahkan ketika kamu menungguku,
aku sebenarnya sudah melewatimu.`;

const riddleTwo = `Aku lahir ketika sesuatu yang benar
membawa kamu menuju sesuatu yang terasa salah.

Aku hidup di antara dua jawaban
yang seharusnya tidak bisa berdiri bersama,
namun entah bagaimana,
keduanya tetap menolak untuk pergi.

Semakin kamu mencoba memahamiku,
semakin aku membuatmu mempertanyakan
apa arti dari memahami.

Aku bisa membuat sebuah kebenaran
menjadi alasan bagi dirinya sendiri untuk salah,
dan sebuah kesalahan
menjadi alasan bagi dirinya sendiri untuk benar.

Ketika kamu memilih satu sisi,
sisi yang lain muncul dari pilihanmu sendiri.

Aku seperti pintu
yang hanya bisa terbuka ketika tertutup,
dan harus tertutup agar bisa terbuka.

Aku seperti jalan yang membawamu maju,
namun setiap langkah ke depan
membuat tujuanmu terasa semakin jauh.

Kamu mengejarku dengan logika,
tetapi aku menggunakan logikamu
untuk membuat lingkaran tanpa ujung.

Kamu mencoba menyelesaikanku dengan jawaban,
tetapi setiap jawaban
dapat melahirkan pertanyaan baru.

Aku bisa membuat dua hal
yang tampaknya saling meniadakan
tetap benar pada saat yang sama.

Aku membuat yang mungkin terasa mustahil,
dan yang mustahil terasa mungkin.

Semakin kamu berusaha meluruskanku,
semakin aku melingkar.

Semakin kamu mencoba memisahkan
mana yang benar dan mana yang salah,
semakin keduanya terlihat terikat.

Aku tidak menghancurkan logika.
Aku justru lahir darinya.

Aku menunggu di tempat
di mana sebuah kesimpulan
berbalik menuju awalnya sendiri.

Semakin dekat kamu dengan jawabanku,
semakin jauh kamu dari kepastian.

Ketika kamu merasa
akhirnya telah memahamiku,
kebingungan yang tersisa
mungkin justru menjadi petunjuk terbesarmu.`;

function GiftLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="cta cta-dark" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const field = document.createElement("textarea");
      field.value = code;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    emitSound("copy");
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="code-box">
      <code>{code}</code>
      <button type="button" onClick={copy} aria-label={`Copy code ${code}`}>
        {copied ? "COPIED!" : "COPY CODE"}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Voucher code copied" : ""}
      </span>
    </div>
  );
}

function Confetti({ burst }: { burst: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        id: `${burst}-${index}`,
        x: Math.round(Math.random() * 92 + 4),
        delay: Math.random() * 0.35,
        duration: Math.random() * 1.4 + 1.5,
        color: ["#ee2737", "#fff8e8", "#f6bf35", "#15120f"][index % 4],
      })),
    [burst],
  );

  if (!burst) return null;

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece) => (
        <i
          key={piece.id}
          style={{
            left: `${piece.x}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            background: piece.color,
          }}
        />
      ))}
    </div>
  );
}

function PrizeBack({ prize }: { prize: Required<Pick<WheelPrize, "prizeType" | "code">> }) {
  if (prize.prizeType === "catalogue_35") {
    return (
      <div className="prize-copy">
        <h3>JACKPOT-ISH!</h3>
        <p>You just won Rp35.000 to spend in the catalogue.</p>
        <strong>Your one-time code:</strong>
        <CopyCode code={prize.code} />
        <small>Expires: 18 August</small>
        <GiftLink href="https://lynk.id/pearling">USE MY RP35.000 →</GiftLink>
      </div>
    );
  }

  if (prize.prizeType === "neural") {
    return (
      <div className="prize-copy">
        <h3>YOUR BRAIN WON SOMETHING</h3>
        <p>You just unlocked the Neural Series for FREE.</p>
        <strong>Your one-time code:</strong>
        <CopyCode code={prize.code} />
        <small>Expires: 18 August</small>
        <GiftLink href="https://lynk.id/pearling/wy4y0r7dzr71">
          CLAIM MY NEURAL SERIES →
        </GiftLink>
      </div>
    );
  }

  return (
    <div className="prize-copy">
      <h3>RP20.000 VOUCHER!</h3>
      <p>You just won Rp20.000 to spend in the catalogue.</p>
      <strong>Your one-time code:</strong>
      <CopyCode code={prize.code} />
      <small>Expires: 18 August</small>
      <GiftLink href="https://lynk.id/pearling">USE MY RP20.000 →</GiftLink>
    </div>
  );
}

function RiddleCard({
  number,
  text,
  status,
  onStatusChange,
}: {
  number: 1 | 2;
  text: string;
  status?: RiddleStatus;
  onStatusChange: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<RiddleResult | null>(
    status?.wonByYou && status.code
      ? {
          state: "winner",
          code: status.code,
          heading: status.heading ?? "VOUCHER SECURED!",
          lines: status.lines ?? ["Your winning voucher is still safely tied to this browser."],
          emphasis: status.emphasis,
        }
      : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (status?.wonByYou && status.code) {
      setResult({
        state: "winner",
        code: status.code,
        heading: status.heading ?? "VOUCHER SECURED!",
        lines: status.lines ?? ["Your winning voucher is still safely tied to this browser."],
        emphasis: status.emphasis,
      });
    }
  }, [status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch(gameApi("/api/game/riddle"), {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ riddleId: number, answer }),
      });
      const data = (await response.json()) as RiddleResult | { error: string };
      if (!response.ok || !("state" in data)) {
        setResult({ state: "wrong", message: "The puzzle room sneezed. Try once more." });
        emitSound("wrong");
      } else {
        setResult(data);
        if (data.state === "winner") {
          setBurst((value) => value + 1);
          emitSound("win");
        } else if (data.state === "wrong") {
          emitSound("wrong");
        } else {
          emitSound("late");
        }
        if (data.state !== "wrong") onStatusChange();
      }
    } catch {
      setResult({ state: "wrong", message: "Tiny internet wobble. Your brain gets a retry." });
      emitSound("wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="riddle-card">
      <Confetti burst={burst} />
      <div className="riddle-label">
        <span>RIDDLE {String(number).padStart(2, "0")}</span>
        {status?.claimed && !status.wonByYou ? <em>PRIZE CLAIMED</em> : <em>1 WINNER</em>}
      </div>
      <h3>AKU SIAPA?</h3>
      <div className="riddle-text">{text}</div>
      <h4>Siapakah aku?</h4>

      {result?.state === "winner" ? (
        <div className="answer-panel answer-win" aria-live="polite">
          <h3>{result.heading}</h3>
          {result.lines.map((line, index) => (
            <p key={`${line}-${index}`}>
              {result.emphasis?.includes(index) ? <strong>{line}</strong> : line}
            </p>
          ))}
          <CopyCode code={result.code} />
          <GiftLink href="https://lynk.id/pearling">
            USE MY RP129.000 VOUCHER →
          </GiftLink>
        </div>
      ) : result?.state === "late" ? (
        <div className="answer-panel answer-late" aria-live="polite">
          <h3>{result.heading}</h3>
          {result.lines.map((line, index) => (
            <p key={`${line}-${index}`}>
              {result.emphasis?.includes(index) ? <strong>{line}</strong> : line}
            </p>
          ))}
        </div>
      ) : (
        <form onSubmit={submit} className="riddle-form">
          <label htmlFor={`riddle-${number}`}>Your answer</label>
          <input
            id={`riddle-${number}`}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Ketik jawabanmu..."
            autoComplete="off"
            maxLength={80}
          />
          <button className="cta cta-red" type="submit" disabled={submitting || !answer.trim()}>
            {submitting ? "CHECKING..." : "COBA JAWAB →"}
          </button>
          {result?.state === "wrong" ? (
            <p className="wrong-answer" role="status">{result.message}</p>
          ) : null}
        </form>
      )}
    </article>
  );
}

export default function Home() {
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [pendingPrize, setPendingPrize] = useState<WheelPrize | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [revealedPrize, setRevealedPrize] = useState<Required<Pick<WheelPrize, "prizeType" | "code">> | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [burst, setBurst] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(true);
  const audioRef = useRef<AudioContext | null>(null);
  const prizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function ensureAudio() {
      if (!soundOnRef.current) return null;
      const AudioContextClass = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      audioRef.current ??= new AudioContextClass();
      if (audioRef.current.state !== "running") await audioRef.current.resume();
      return audioRef.current;
    }

    function primeAudio() {
      void ensureAudio();
    }

    function handleSound(event: Event) {
      if (!soundOnRef.current) return;
      const kind = (event as CustomEvent<SoundKind>).detail;
      if (!(kind in soundRecipes)) return;
      void ensureAudio().then((context) => {
        if (context) playSound(context, kind);
      });
    }

    window.addEventListener(SOUND_EVENT, handleSound);
    window.addEventListener("pointerdown", primeAudio, { once: true, passive: true });
    window.addEventListener("keydown", primeAudio, { once: true });
    return () => {
      window.removeEventListener(SOUND_EVENT, handleSound);
      window.removeEventListener("pointerdown", primeAudio);
      window.removeEventListener("keydown", primeAudio);
    };
  }, []);

  async function toggleSound() {
    const next = !soundOnRef.current;

    if (next) {
      const AudioContextClass = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      audioRef.current ??= new AudioContextClass();
      await audioRef.current.resume();
      soundOnRef.current = true;
      setSoundOn(true);
      playSound(audioRef.current, "toggle");
      return;
    }

    if (audioRef.current) playSound(audioRef.current, "off");
    soundOnRef.current = false;
    setSoundOn(false);
  }

  async function loadStatus() {
    try {
      const response = await fetch(gameApi("/api/game/status"), { cache: "no-store" });
      if (!response.ok) throw new Error("status unavailable");
      const data = (await response.json()) as GameStatus;
      setStatus(data);
      setStatusError(false);
      if (data.wheel) {
        setPendingPrize(data.wheel);
        setShowCard(true);
        setRotation((360 - data.wheel.segmentIndex * 36) % 360);
        if (data.wheel.revealed && data.wheel.code) {
          setRevealedPrize({ prizeType: data.wheel.prizeType, code: data.wheel.code });
          setCardFlipped(true);
        }
      }
    } catch {
      setStatusError(true);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function spin() {
    if (spinning || status?.remaining === 0 || pendingPrize) return;
    setSpinning(true);
    setShowCard(false);
    emitSound("spin");
    try {
      const response = await fetch(gameApi("/api/game/spin"), { method: "POST" });
      const data = (await response.json()) as
        | { state: "claimed" | "existing"; prize: WheelPrize; remaining: number }
        | { state: "soldout"; remaining: 0 };

      if (data.state === "soldout") {
        await loadStatus();
        return;
      }

      const current = ((rotation % 360) + 360) % 360;
      const desired = (360 - data.prize.segmentIndex * 36) % 360;
      const delta = (desired - current + 360) % 360;
      const nextRotation = rotation + 1440 + delta;
      setPendingPrize(data.prize);
      setRotation(nextRotation);
      setStatus((old) => old ? { ...old, remaining: data.remaining, claimed: 10 - data.remaining, wheel: data.prize } : old);
      window.setTimeout(() => {
        setSpinning(false);
        setShowCard(true);
        window.setTimeout(() => prizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
      }, 4200);
    } catch {
      setSpinning(false);
      setStatusError(true);
    }
  }

  async function revealPrize() {
    if (!pendingPrize || revealing || cardFlipped) return;
    setRevealing(true);
    try {
      const response = await fetch(gameApi("/api/game/reveal"), { method: "POST" });
      const data = (await response.json()) as { prizeType: PrizeType; code: string };
      if (!response.ok || !data.code) throw new Error("reveal unavailable");
      setRevealedPrize(data);
      setCardFlipped(true);
      setBurst((value) => value + 1);
      emitSound("win");
      setStatus((old) => old?.wheel ? { ...old, wheel: { ...old.wheel, revealed: true, code: data.code } } : old);
    } catch {
      setStatusError(true);
    } finally {
      setRevealing(false);
    }
  }

  const soldOut = status?.remaining === 0 && !pendingPrize;

  return (
    <main>
      <Confetti burst={burst} />
      <button
        type="button"
        className={`sound-toggle ${soundOn ? "is-on" : ""}`}
        onClick={toggleSound}
        aria-pressed={soundOn}
        aria-label={`Turn sound ${soundOn ? "off" : "on"}`}
      >
        <span className="sound-bars" aria-hidden="true"><i /><i /><i /></span>
        <span>SOUND {soundOn ? "ON" : "OFF"}</span>
      </button>

      <header className="hero" id="top">
        <div className="hero-bunting" aria-hidden="true">
          {Array.from({ length: 13 }, (_, index) => <i key={index} />)}
        </div>
        <div className="hero-sun" aria-hidden="true">17</div>
        <div className="hero-inner">
          <p className="eyebrow">A TINY DIGITAL MERDEKA PARTY</p>
          <div className="hero-marquee">
            <span className="admit-ticket">ADMIT ONE · 17 AGUSTUS</span>
            <h1>Gifts for<br />Independence Day</h1>
          </div>
          <p className="hero-lede"><strong>Merdeka means freedom.</strong><br />Apparently, it also means free stuff.</p>
          <p className="hero-support">Celebrating 17 Agustus with gifts, discounts, riddles, and a little bit of luck.</p>
          <a className="hero-cta" href="#gifts" onClick={() => emitSound("ambient")}>↓ OPEN YOUR GIFTS ↓</a>
          <p className="hero-note">Some gifts are for everyone. Some require luck. Some require a functioning brain.</p>
        </div>
        <div className="hero-waves" aria-hidden="true" />
      </header>

      <nav className="journey" aria-label="Page journey">
        <a href="#top">ARRIVE</a><b>→</b>
        <a href="#gifts">GIFTS</a><b>→</b>
        <a href="#wheel">SPIN</a><b>→</b>
        <a href="#riddles">RIDDLES</a><b>→</b>
        <a href="#celebrate">CELEBRATE</a>
      </nav>

      <section className="section gifts-section" id="gifts">
        <div className="pearl-string" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i />
        </div>
        <div className="section-heading">
          <p className="section-kicker">PART 1 — EVERYONE GETS SOMETHING</p>
          <h2>No games yet.<br />I&apos;m not that cruel.</h2>
          <p>Zero hand-eye coordination required for three guaranteed treats.</p>
        </div>

        <div className="gift-grid">
          <article className="gift-card gift-featured">
            <span className="gift-tag">FREE · FOR EVERYONE</span>
            <h3>THE MINDFUL MIRROR</h3>
            <p><strong>Everyone gets this one.</strong></p>
            <p>The Mindful Mirror is completely free for Independence Day.</p>
            <div className="inline-code"><span>CODE</span><code>17AUG</code></div>
            <GiftLink href="https://lynk.id/pearling/53OqWLX">GET THE MINDFUL MIRROR →</GiftLink>
          </article>

          <article className="gift-card">
            <span className="gift-tag">30% OFF</span>
            <h3>THE CATALOGUE</h3>
            <p>See something you like?</p>
            <p>Take <strong>30% OFF</strong> products in the catalogue.</p>
            <div className="inline-code"><span>CODE</span><code>MERDEKA</code></div>
            <GiftLink href="https://lynk.id/pearling">SHOP WITH 30% OFF →</GiftLink>
          </article>

          <article className="gift-card">
            <span className="gift-tag">RP10.000 OFF</span>
            <h3>HUMAN DESIGN READING</h3>
            <p>Want to understand yourself better?</p>
            <p>Get <strong>Rp10.000 OFF</strong> your Human Design Reading.</p>
            <div className="inline-code"><span>CODE</span><code>MERDEKA10</code></div>
            <GiftLink href="https://lynk.id/heypearling/Xw3NX0P">GET MY READING →</GiftLink>
          </article>
        </div>
      </section>

      <section className="wheel-section" id="wheel">
        <div className="carnival-awning" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
        </div>
        <div className="sea-bubbles" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </div>
        <div className="wheel-copy">
          <p className="section-kicker">PART 2 — THE MERDEKA WHEEL</p>
          <h2>Feeling lucky?</h2>
          <p className="big-copy"><strong>10 people, 10 prizes</strong></p>
          <p>One celebratory spin per visitor. Whatever the wheel picks, you win.</p>
          <div className="prize-legend">
            <span><b>5×</b> Rp20K vouchers</span>
            <span><b>1×</b> Rp35K voucher</span>
            <span><b>4×</b> FREE Neural Series</span>
          </div>
          <p className="remaining-pill" aria-live="polite">
            {status ? `${status.remaining} OF 10 GIFTS STILL ON THE WHEEL` : "COUNTING THE GIFTS..."}
          </p>
        </div>

        <div className="wheel-game">
          <div className="wheel-pointer" aria-hidden="true" />
          <div className="wheel-rim">
            <div
              className={`wheel ${spinning ? "is-spinning" : ""}`}
              style={{ transform: `rotate(${rotation}deg)` }}
              aria-label="Merdeka lucky wheel with ten prize slots"
            >
              {wheelSlots.map((slot, index) => (
                <span
                  key={`${slot}-${index}`}
                  className="wheel-label"
                  style={{ "--slot": index } as React.CSSProperties}
                >
                  {slot}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="spin-button"
              onClick={spin}
              disabled={spinning || soldOut || !!pendingPrize || !status}
              aria-label={soldOut ? "All wheel prizes are sold out" : "Spin the Merdeka lucky wheel"}
            >
              {soldOut ? <><strong>SOLD<br />OUT</strong><small>NO MORE PRIZES</small></> : spinning ? <><strong>WHEEE!</strong><small>HOLD ON</small></> : pendingPrize ? <><strong>DONE!</strong><small>↓ GIFT BELOW</small></> : <><strong>SPIN</strong><small>THE WHEEL</small></>}
            </button>
          </div>

          {soldOut ? (
            <div className="sold-out-message">
              <h3>SOLD OUT</h3>
              <p>The wheel has officially achieved independence from its prizes.</p>
              <p><strong>All 10 gifts have found their humans.</strong></p>
              <a href="#riddles">But the riddles are still down there.<br />Your brain may yet save you. ↓</a>
            </div>
          ) : null}

          {statusError ? (
            <button className="retry-status" type="button" onClick={loadStatus}>
              Tiny connection wobble. Tap to retry.
            </button>
          ) : null}
        </div>

        {showCard && pendingPrize ? (
          <div className="reveal-zone" ref={prizeRef}>
            <p className="reveal-arrow">YOUR GIFT LANDED ↓</p>
            <button
              type="button"
              className={`flip-card ${cardFlipped ? "is-flipped" : ""}`}
              onClick={revealPrize}
              disabled={revealing || cardFlipped}
              aria-label={cardFlipped ? "Your revealed prize" : "Tap to reveal your Independence Day gift"}
            >
              <span className="flip-card-inner">
                <span className="flip-front">
                  <span className="stamp">17<br />AUG</span>
                  <span className="envelope-flap" />
                  <strong>YOU WON!</strong>
                  <em>{revealing ? "OPENING..." : "Tap to reveal your Independence Day gift."}</em>
                  <small>NO PEEKING THROUGH THE SOURCE CODE</small>
                </span>
                <span className="flip-back">
                  {revealedPrize ? <PrizeBack prize={revealedPrize} /> : <span>Opening your gift...</span>}
                </span>
              </span>
            </button>
          </div>
        ) : null}

        <p className="limited-note">While gifts last. One unique voucher per winning claim. Codes expire 18 August.</p>
      </section>

      <section className="riddle-section" id="riddles">
        <div className="riddle-heading">
          <p className="section-kicker">PART 3 — THE MERDEKA RIDDLE ROOM</p>
          <h2>Luck failed you?</h2>
          <p className="riddle-sub">Fine. Use your brain.</p>
          <div className="riddle-rules">
            <p>Two riddles, each with an Rp129.000 voucher if you <strong>GET IT FIRST</strong> and <strong>GET IT RIGHT</strong>. Everyone can attempt both.</p>
          </div>
        </div>

        <div className="riddle-grid">
          <RiddleCard number={1} text={riddleOne} status={status?.riddles["1"]} onStatusChange={loadStatus} />
          <RiddleCard number={2} text={riddleTwo} status={status?.riddles["2"]} onStatusChange={loadStatus} />
        </div>
        <p className="limited-note light-note">While gifts last. One unique voucher per winning claim. Codes expire 18 August.</p>
      </section>

      <section className="final-section" id="celebrate">
        <div className="final-lights" aria-hidden="true">
          {Array.from({ length: 11 }, (_, index) => <i key={index} />)}
        </div>
        <p>Whatever you won (or didn&apos;t)</p>
        <h2>HAPPY<br />INDEPENDENCE DAY,<br />INDONESIA</h2>
        <div className="final-copy">
          <p><strong>Selamat Hari Kemerdekaan.</strong></p>
          <p>May we have the freedom to become, unlearn, explore, change our minds, and create lives that feel like our own.</p>
          <p className="final-joke">And may your voucher codes work on the first try.</p>
        </div>
        <div className="final-actions">
          <a className="cta cta-cream" href="https://lynk.id/pearling" target="_blank" rel="noreferrer">EXPLORE →</a>
        </div>
        <a className="back-to-top" href="#top">BACK TO THE FLAGPOLE ↑</a>
      </section>
    </main>
  );
}
