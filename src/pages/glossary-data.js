function iconFor(term) {
  const t = term.toLowerCase();
  if (/mic|cardioid|condenser|lavaliere|omni|hyper|super/.test(t)) return "🎤";
  if (/mixer|board|console|desk|fader|pfl|afl|pan|mute|aux|di\b|jack|xlr|trs|y-cable/.test(t)) return "🎚️";
  if (/speaker|monitor|spl|beamwidth|watt|pmpo|amp|backline|foldback/.test(t)) return "🔊";
  return "⚙️";
}

function entry(term, definition, footnote, diagram) {
  return { term, icon: iconFor(term), definition, footnote, diagram };
}

export const GLOSSARY_TITLE = "MAXX-ON Glossary";
export const GLOSSARY_SUBTITLE =
  "A dictionary for audio engineers who know better, but the equipment keeps disappointing them anyway.";

export const GLOSSARY_SECTIONS = [
  {
    letter: "A",
    entries: [
      entry(
        "AC",
        "Alternating Current.",
        "Electricity that changes direction more often than the lead singer changes their mind about monitor levels."
      ),
      entry(
        "Active",
        "Means “requires power,” unless you’re talking to a manufacturer, in which case it means “costs more for no reason.”"
      ),
      entry("AFL", "After‑Fade Listen.", "A button that exists solely so interns can press it and panic."),
      entry(
        "Amp",
        "Either a unit of electrical current or a device that makes things louder until they break. Context determines which one ruins your day."
      ),
      entry(
        "Amplifier",
        "A box that takes a small signal and makes it big enough to cause complaints from the neighbors."
      ),
      entry(
        "Auxiliary",
        "Mixer outputs used for monitors, effects, and occasionally for routing the vocalist’s ego to a separate processing chain."
      ),
      entry(
        "Backline",
        "The pile of equipment musicians bring that is always heavier, louder, and more broken than advertised."
      ),
      entry("Balanced", "A wiring method that cancels noise, except the noise coming from the drummer."),
      entry(
        "Bandwidth",
        "The range of frequencies something can handle.",
        "Also describes how much nonsense an engineer can tolerate before quitting."
      ),
      entry(
        "Bass",
        "Everything below 200 Hz.",
        "Clients will always ask for “more punchy bass,” even though they don’t know what punchy means."
      ),
      entry(
        "Beamwidth Plot",
        "A graph showing how a loudspeaker sprays sound everywhere except where you want it.",
        null,
        "/diagrams/beamwidth.svg"
      ),
      entry("Board", "Another word for mixer.", "Also the thing people spill drinks on."),
      entry(
        "Cardioid",
        "A microphone pattern shaped like a heart, symbolizing the love engineers lose during setup.",
        null,
        "/diagrams/polar.svg"
      ),
      entry("Compressor", "A device that reduces dynamic range.", "Used to make everything sound equally mediocre."),
      entry("Condenser", "A microphone that requires phantom power and emotional support."),
      entry("Console", "Another word for mixer.", "Also the thing people touch even after you tell them not to."),
      entry("Crest Factor", "Peak‑to‑RMS ratio.", "Useful for determining how quickly a speaker will die."),
      entry(
        "Critical Distance",
        "The point where reflected sound equals direct sound.",
        "Also the distance at which the vocalist becomes unintelligible."
      ),
      entry(
        "Damping Factor",
        "A measure of how well an amplifier controls a speaker cone.",
        "Higher is better, but nobody buying budget gear cares."
      ),
      entry("dB", "A mathematical comparison tool used by engineers and misunderstood by everyone else."),
      entry("DC", "Direct Current.", "Electricity that goes in one direction, like your disappointment."),
      entry(
        "DI",
        "Direct Injection.",
        "A box that magically turns terrible instrument signals into terrible balanced signals."
      ),
      entry(
        "Desk",
        "Another word for mixer.",
        "Also the thing that gets blamed for feedback even when it’s not the desk’s fault."
      ),
      entry(
        "Distortion",
        "Any non‑linear change in a signal.",
        "Sometimes intentional, sometimes catastrophic, always blamed on the wrong device."
      ),
      entry("Dry Hire", "Hiring equipment without crew.", "Also known as “good luck.”"),
    ],
  },
  {
    letter: "E",
    entries: [
      entry(
        "Effects",
        "Devices that change a signal by adding altered versions of the original.",
        "Used primarily to hide mistakes."
      ),
      entry(
        "EMF",
        "Electromotive Force.",
        "Voltage that opposes input voltage, much like the guitarist opposes turning down."
      ),
      entry(
        "Enhancer",
        "An effect that adds harmonics.",
        "Often used to make bad sound worse in a more interesting way."
      ),
      entry(
        "EQ",
        "Equalisation.",
        "A tool used to fix problems caused by poor equipment placement, bad room acoustics, and questionable life choices."
      ),
      entry(
        "Equaliser",
        "A device that lets you pretend you’re improving the sound while actually just moving problems around."
      ),
    ],
  },
  {
    letter: "F",
    entries: [
      entry(
        "Fader",
        "A linear potentiometer used to control levels.",
        "Also the thing people grab first when they don’t know what they’re doing."
      ),
      entry("Feedback", "The sound of failure.", null, "/diagrams/feedback.svg"),
      entry(
        "Firkin",
        "An old unit of measurement equal to half a kilderkin.",
        "Used here to describe excessive loudness: “two firkin loud.”"
      ),
      entry(
        "Foldback",
        "Monitor systems that allow musicians to hear themselves, which they will still complain about."
      ),
      entry(
        "Frequency Response",
        "A graph showing how a device refuses to behave across the audible spectrum.",
        null,
        "/diagrams/freqresponse.svg"
      ),
    ],
  },
  {
    letter: "G",
    entries: [
      entry(
        "Gain",
        "The ratio between input and output voltage.",
        "Also the knob that ruins everything when turned too far."
      ),
      entry("Ground Loop", "A hum caused by improper grounding.", "Often blamed on ghosts."),
    ],
  },
  {
    letter: "H",
    entries: [
      entry("Hertz (Hz)", "Unit of frequency.", "Also the number of times per second your patience is tested."),
      entry("HF", "High Frequency.", "Everything above 3 kHz, also known as “the part of the spectrum that hurts.”"),
      entry(
        "High‑Pass Filter",
        "A filter that removes low frequencies.",
        "Useful for eliminating rumble, mud, and emotional baggage.",
        "/diagrams/hpf.svg"
      ),
      entry(
        "Hypercardioid",
        "A microphone pattern narrower than cardioid.",
        "Useful for rejecting everything except the one thing you don’t want."
      ),
    ],
  },
  {
    letter: "I",
    entries: [
      entry("Impedance", "Opposition to AC current.", "Also describes musicians resisting instructions."),
      entry("Intelligibility", "The clarity of speech.", "Rare."),
      entry(
        "Inverse Square Law",
        "Sound pressure decreases by 6 dB per doubling of distance.",
        "Unless it’s a toddler screaming."
      ),
      entry(
        "IP Rating",
        "Describes protection against dust and water.",
        "Useful for determining whether your gear will survive outdoor gigs (it won’t)."
      ),
    ],
  },
  {
    letter: "J",
    entries: [entry("Jack", "A connector that always gets plugged into the wrong socket.")],
  },
  {
    letter: "K",
    entries: [
      entry("Kilo-", "A prefix meaning “thousand.”", "Also the number of excuses given by the band for being late."),
    ],
  },
  {
    letter: "L",
    entries: [
      entry(
        "Lavaliere",
        "A tiny microphone worn on clothing.",
        "Designed to pick up everything except the person speaking."
      ),
      entry("LF", "Low Frequency.", "Everything below 200 Hz, also known as “the part of the spectrum that shakes the stage.”"),
      entry("Line-Level", "Standard operating voltage for audio signals.", "Often ignored."),
      entry(
        "Logarithm",
        "A mathematical function used in audio calculations.",
        "Engineers understand it; nobody else cares."
      ),
      entry(
        "Low-Pass Filter",
        "A filter that removes high frequencies.",
        "Useful for making things sound “warm,” which is code for “dull.”",
        "/diagrams/lpf.svg"
      ),
    ],
  },
  {
    letter: "M",
    entries: [
      entry(
        "Midrange",
        "The middle frequencies.",
        "Where all the important stuff happens and nobody EQs correctly."
      ),
      entry(
        "Mixer",
        "A device that combines audio signals.",
        "Also the thing people blame when they don’t understand gain staging."
      ),
      entry("Monitor", "A loudspeaker for performers.", "They will always ask for more."),
      entry("Mute", "A button that solves problems."),
    ],
  },
  {
    letter: "N",
    entries: [
      entry(
        "Normalised",
        "A connector that breaks or makes a circuit when a plug is inserted.",
        "Useful until it stops working."
      ),
    ],
  },
  {
    letter: "O",
    entries: [
      entry(
        "Octave",
        "A doubling or halving of frequency.",
        "Also the number of times you’ll repeat instructions before someone listens."
      ),
      entry("Ohm", "Unit of resistance.", "Also describes how resistant musicians are to following directions."),
      entry("Omni", "Omnidirectional microphone pattern.", "Useful for picking up everything except what you want."),
    ],
  },
  {
    letter: "P",
    entries: [
      entry("Pan", "Control for stereo placement.", "Used creatively by people who don’t understand mono compatibility."),
      entry("Passive", "Equipment that doesn’t require power.", "Also describes the bassist."),
      entry("Peak", "Maximum signal level.", "Often exceeded."),
      entry("PFL", "Pre-Fade Listen.", "A button that reveals how bad the signal really is."),
      entry(
        "Phantom Power",
        "48V DC supplied through an XLR cable.",
        "Used to power condenser microphones and destroy ribbon microphones."
      ),
      entry("Pink Noise", "Noise with equal energy per octave.", "Used for testing systems and annoying everyone."),
      entry(
        "PMPO",
        "Peak Music Power Output.",
        "A number manufacturers invent to impress people who don’t know better."
      ),
      entry(
        "Polar Plot",
        "A graph showing microphone sensitivity.",
        "Useful for proving that the mic is pointed the wrong way.",
        "/diagrams/polar.svg"
      ),
      entry("Post", "After something in the signal path.", "Often misunderstood."),
      entry("Pre", "Before something in the signal path.", "Also misunderstood."),
      entry(
        "Q",
        "Filter narrowness.",
        "Higher Q means narrower filter, also means “you’re trying too hard.”",
        "/diagrams/peaking.svg"
      ),
    ],
  },
  {
    letter: "R",
    entries: [
      entry("Reverb", "Artificial reverberation.", "Used to hide sins."),
      entry("RMS", "Root Mean Square.", "A way to measure effective voltage. Often misused by marketing departments."),
    ],
  },
  {
    letter: "S",
    entries: [
      entry("Series", "Connecting components end-to-end.", "Usually a bad idea."),
      entry(
        "Shelving EQ",
        "Boosts or cuts frequencies above or below a point.",
        "Useful for pretending you’re improving the sound.",
        "/diagrams/shelving.svg"
      ),
      entry("SPL", "Sound Pressure Level.", "Measured in decibels and complaints."),
      entry(
        "Supercardioid",
        "A microphone pattern narrower than cardioid.",
        "Useful for rejecting everything except the one thing you don’t want."
      ),
    ],
  },
  {
    letter: "T",
    entries: [
      entry(
        "Transducer",
        "A device that converts energy from one form to another.",
        "Also known as “the thing that breaks first.”"
      ),
      entry("TRS", "Tip-Ring-Sleeve.", "A connector that does three things, none of which are what you expect."),
    ],
  },
  {
    letter: "U",
    entries: [
      entry(
        "Unbalanced",
        "A signal carried on a single conductor.",
        "Useful for picking up noise, radio stations, and regret."
      ),
    ],
  },
  {
    letter: "V",
    entries: [
      entry("Volt", "Unit of electromotive force.", "Also the number of volts you shouldn’t apply to a microphone."),
    ],
  },
  {
    letter: "W",
    entries: [entry("Watt", "Unit of power.", "Manufacturers lie about this.")],
  },
  {
    letter: "X",
    entries: [entry("XLR", "A connector that solves problems until someone uses a cheap cable.")],
  },
  {
    letter: "Y",
    entries: [entry("Y-Cable", "A cable that splits signals.", "Useful until it causes phase issues.")],
  },
  {
    letter: "Z",
    entries: [
      entry(
        "Z-Axis",
        "The vertical dimension in 3D space.",
        "Also the direction in which speakers fall when improperly mounted."
      ),
    ],
  },
];
