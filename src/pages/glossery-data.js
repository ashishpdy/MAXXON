function iconFor(term) {
  const t = term.toLowerCase();
  if (/mic|cardioid|condenser|lavaliere|omni|hyper|super/.test(t)) return "🎤";
  if (/mixer|board|console|desk|fader|pfl|afl|pan|mute|aux|di\b|jack|xlr|trs|y-cable|y‑cable/.test(t)) return "🎚️";
  if (/speaker|monitor|spl|beamwidth|watt|pmpo|amp|backline|foldback/.test(t)) return "🔊";
  return "⚙️";
}

function entry(term, definition, footnote, diagram) {
  return { term, icon: iconFor(term), definition, footnote, diagram };
}

export const GLOSSERY_TITLE = "MAXX‑ON Glossery";
export const GLOSSERY_SUBTITLE =
  "A dictionary for audio engineers who know better, but the equipment keeps disappointing them anyway.";

export const GLOSSERY_SECTIONS = [
  {
    letter: "A",
    entries: [
      entry(
        "AC",
        "Alternating Current.",
        "Electrical energy that reverses direction at a fixed frequency, typically 50 or 60 Hz, depending on which colonial legacy you inherited. Essential for powering equipment, less effective at powering enthusiasm."
      ),
      entry(
        "Active",
        "Describes equipment containing internal amplification or processing. Historically meaningful; now largely a marketing term indicating “this device warms itself.”"
      ),
      entry(
        "AFL",
        "After‑Fade Listen.",
        "A monitoring mode allowing one to hear precisely what the audience hears, assuming the audience is standing in the world’s least convenient location."
      ),
      entry(
        "Amp",
        "Either a unit of electrical current or a device designed to convert electrical power into heat and occasional sound."
      ),
      entry("Amplifier", "A device that increases signal amplitude. Often blamed for failures caused elsewhere."),
      entry(
        "Auxiliary",
        "A secondary output path used for monitors, effects, or routing signals one would prefer not to hear again."
      ),
    ],
  },
  {
    letter: "B",
    entries: [
      entry(
        "Backline",
        "Musicians’ personal equipment, notable for its weight, fragility, and tendency to arrive in a state best described as “historic.”"
      ),
      entry(
        "Balanced",
        "A method of signal transmission using differential pairs to reject noise. Regrettably ineffective at rejecting poor performance."
      ),
      entry(
        "Bandwidth",
        "The range of frequencies a system can reproduce. Also a measure of an engineer’s remaining patience."
      ),
      entry("Bass", "Frequencies below approximately 200 Hz. Universally requested, rarely understood."),
      entry(
        "Beamwidth Plot",
        "A graphical representation of a loudspeaker’s dispersion characteristics. Typically used to confirm that the loudspeaker is aimed incorrectly.",
        null,
        "/diagrams/beamwidth.svg"
      ),
      entry(
        "Board",
        "A colloquial term for a mixing console. Frequently blamed for issues caused by physics."
      ),
    ],
  },
  {
    letter: "C",
    entries: [
      entry(
        "Cardioid",
        "A microphone polar pattern resembling a heart shape, though rarely associated with affection.",
        null,
        "/diagrams/polar.svg"
      ),
      entry(
        "Compressor",
        "A device that reduces dynamic range. Commonly employed to ensure all audio is equally unremarkable."
      ),
      entry("Condenser", "A microphone requiring phantom power and a stable emotional environment."),
      entry(
        "Console",
        "A device for combining, routing, and adjusting audio signals. Often touched by individuals who should not."
      ),
      entry(
        "Crest Factor",
        "The ratio of peak to RMS signal levels. Useful for predicting imminent loudspeaker failure."
      ),
      entry(
        "Critical Distance",
        "The point at which direct and reverberant sound are equal. Beyond this point, intelligibility becomes a theoretical concept."
      ),
    ],
  },
  {
    letter: "D",
    entries: [
      entry(
        "Damping Factor",
        "A measure of an amplifier’s ability to control loudspeaker motion. Higher values are desirable, though rarely achieved in practice."
      ),
      entry("dB", "A logarithmic unit used to express ratios. Universally misunderstood."),
      entry(
        "DC",
        "Direct Current.",
        "Electrical energy flowing in a single direction, much like an engineer leaving a gig early."
      ),
      entry(
        "DI",
        "Direct Injection.",
        "A device that converts high‑impedance signals into balanced, low‑impedance signals, thereby preserving mediocrity across longer distances."
      ),
      entry(
        "Desk",
        "Another term for a mixing console. Often blamed for feedback, regardless of culpability."
      ),
      entry("Distortion", "Any deviation from linearity. Sometimes intentional, frequently regrettable."),
      entry("Dry Hire", "The rental of equipment without personnel. A bold and optimistic choice."),
    ],
  },
  {
    letter: "E",
    entries: [
      entry(
        "Effects",
        "Processes that alter audio signals by adding delayed or modified versions of the original. Primarily used to obscure errors."
      ),
      entry(
        "EMF",
        "Electromotive Force.",
        "The potential difference that drives current. Not to be confused with enthusiasm, which cannot be measured electrically."
      ),
      entry(
        "Enhancer",
        "A device that adds harmonics to a signal. Often used to make poor audio more complex, though not better."
      ),
      entry(
        "EQ",
        "Equalisation.",
        "The adjustment of frequency content to compensate for environmental, equipment, or existential deficiencies."
      ),
      entry("Equaliser", "A device that allows one to move problems from one frequency band to another."),
    ],
  },
  {
    letter: "F",
    entries: [
      entry(
        "Fader",
        "A linear control for adjusting signal level. Frequently operated by individuals who should not be allowed near electricity."
      ),
      entry(
        "Feedback",
        "A self‑exciting acoustic loop. The system’s way of announcing that something has gone wrong.",
        null,
        "/diagrams/feedback.svg"
      ),
      entry(
        "Firkin",
        "An archaic unit of volume. Used here to denote excessive loudness, as in “firkin loud.”"
      ),
      entry(
        "Foldback",
        "A monitor system enabling performers to hear themselves, though they will insist they cannot."
      ),
      entry(
        "Frequency Response",
        "A graph showing how a device behaves across the audible spectrum. Typically reveals that it does not.",
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
        "The ratio of output to input signal amplitude. Also the control most likely to be adjusted incorrectly."
      ),
      entry("Ground Loop", "A hum caused by improper grounding. Often attributed to supernatural forces."),
    ],
  },
  {
    letter: "H",
    entries: [
      entry(
        "Hertz (Hz)",
        "A unit of frequency equal to one cycle per second. Also a measure of how often one’s patience is tested."
      ),
      entry("HF", "High Frequency.", "Frequencies above 3 kHz, generally associated with discomfort."),
      entry(
        "High‑Pass Filter",
        "A filter that attenuates low frequencies. Useful for removing rumble, mud, and emotional baggage.",
        null,
        "/diagrams/hpf.svg"
      ),
      entry(
        "Hypercardioid",
        "A microphone pattern narrower than cardioid. Excellent for rejecting everything except the intended source."
      ),
    ],
  },
  {
    letter: "I",
    entries: [
      entry("Impedance", "Opposition to AC current. Also describes musicians’ resistance to instruction."),
      entry("Intelligibility", "The degree to which speech can be understood. Rarely encountered in live environments."),
      entry(
        "Inverse Square Law",
        "The principle that sound pressure decreases by 6 dB per doubling of distance. Except when children are involved."
      ),
      entry(
        "IP Rating",
        "A measure of protection against dust and water. Useful for determining whether equipment will survive outdoor events (it will not)."
      ),
    ],
  },
  {
    letter: "J",
    entries: [entry("Jack", "A connector that is invariably inserted into the wrong socket.")],
  },
  {
    letter: "K",
    entries: [entry("Kilo‑", "A prefix meaning “thousand.” Also the number of excuses provided by performers.")],
  },
  {
    letter: "L",
    entries: [
      entry(
        "Lavaliere",
        "A small microphone worn on clothing. Designed to capture everything except the speaker’s voice."
      ),
      entry(
        "LF",
        "Low Frequency.",
        "Frequencies below 200 Hz, responsible for structural damage and audience satisfaction."
      ),
      entry("Line‑Level", "A standard operating voltage for audio signals. Frequently ignored."),
      entry(
        "Logarithm",
        "A mathematical function essential for audio calculations. Understood by engineers, tolerated by others."
      ),
      entry(
        "Low‑Pass Filter",
        "A filter that attenuates high frequencies. Often used to make audio sound “warm,” meaning “dull.”",
        null,
        "/diagrams/lpf.svg"
      ),
    ],
  },
  {
    letter: "M",
    entries: [
      entry(
        "Midrange",
        "The central portion of the audible spectrum. Where most important content resides, and where most errors occur."
      ),
      entry("Mixer", "A device that combines audio signals. Commonly blamed for issues caused elsewhere."),
      entry("Monitor", "A loudspeaker for performers. They will always request more."),
      entry("Mute", "A button that resolves problems."),
    ],
  },
  {
    letter: "N",
    entries: [
      entry(
        "Normalised",
        "A connector that changes state when a plug is inserted. Useful until it ceases to function."
      ),
    ],
  },
  {
    letter: "O",
    entries: [
      entry(
        "Octave",
        "A doubling or halving of frequency. Also the number of times instructions must be repeated."
      ),
      entry("Ohm", "A unit of electrical resistance. Also a measure of human stubbornness."),
      entry("Omni", "An omnidirectional microphone pattern. Captures everything except what is needed."),
    ],
  },
  {
    letter: "P",
    entries: [
      entry("Pan", "A control for stereo placement. Frequently misused."),
      entry("Passive", "Equipment requiring no power. Also describes certain performers."),
      entry("Peak", "The maximum instantaneous signal level. Often exceeded."),
      entry(
        "PFL",
        "Pre‑Fade Listen.",
        "A mode revealing the true nature of a signal, usually disappointing."
      ),
      entry(
        "Phantom Power",
        "48V DC supplied through an XLR cable. Used to power condenser microphones and destroy ribbon microphones."
      ),
      entry("Pink Noise", "Noise with equal energy per octave. Used for system tuning and venue evacuation."),
      entry("PMPO", "Peak Music Power Output.", "A fictional measurement invented by marketing departments."),
      entry(
        "Polar Plot",
        "A graph showing microphone sensitivity. Useful for demonstrating incorrect microphone placement.",
        null,
        "/diagrams/polar.svg"
      ),
      entry("Post", "After a point in the signal path. Commonly misunderstood."),
      entry("Pre", "Before a point in the signal path. Also misunderstood."),
    ],
  },
  {
    letter: "Q",
    entries: [
      entry(
        "Q",
        "A measure of filter bandwidth. Higher values indicate narrower filters and greater optimism.",
        null,
        "/diagrams/peaking.svg"
      ),
    ],
  },
  {
    letter: "R",
    entries: [
      entry("Reverb", "Artificial reverberation. Used to conceal errors."),
      entry(
        "RMS",
        "Root Mean Square.",
        "A mathematically valid measure of voltage, and a mathematically dubious measure of power."
      ),
    ],
  },
  {
    letter: "S",
    entries: [
      entry("Series", "Connecting components sequentially. Rarely advisable."),
      entry(
        "Shelving EQ",
        "A filter that boosts or cuts frequencies above or below a set point. Useful for pretending to improve audio.",
        null,
        "/diagrams/shelving.svg"
      ),
      entry("SPL", "Sound Pressure Level.", "Measured in decibels and complaints."),
      entry(
        "Supercardioid",
        "A microphone pattern narrower than cardioid. Excellent for rejecting everything except the intended source."
      ),
    ],
  },
  {
    letter: "T",
    entries: [
      entry(
        "Transducer",
        "A device that converts one form of energy into another. Typically the first component to fail."
      ),
      entry(
        "TRS",
        "Tip‑Ring‑Sleeve.",
        "A connector that performs three functions, none of which are the one required."
      ),
    ],
  },
  {
    letter: "U",
    entries: [
      entry(
        "Unbalanced",
        "A signal carried on a single conductor. Ideal for collecting noise, radio interference, and regret."
      ),
    ],
  },
  {
    letter: "V",
    entries: [
      entry("Volt", "A unit of electromotive force. Also the number of volts one should not apply to a microphone."),
    ],
  },
  {
    letter: "W",
    entries: [entry("Watt", "A unit of power. Frequently exaggerated.")],
  },
  {
    letter: "X",
    entries: [entry("XLR", "A connector that solves problems until someone purchases a cheaper version.")],
  },
  {
    letter: "Y",
    entries: [entry("Y‑Cable", "A cable that splits signals. Useful until phase issues arise.")],
  },
  {
    letter: "Z",
    entries: [
      entry(
        "Z‑Axis",
        "The vertical dimension in three‑dimensional space. Also the direction in which loudspeakers fall when improperly mounted."
      ),
    ],
  },
];
