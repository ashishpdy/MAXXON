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
export const GLOSSERY_SUBTITLE = "A dictionary for audio engineers who have seen enough to know better.";

export const GLOSSERY_SECTIONS = [
  {
    letter: "A",
    entries: [
      entry(
        "AC",
        "Alternating Current. Electrical energy reversing direction at a fixed frequency, typically 50 or 60 Hz, depending on historical misfortune.",
        "“AC is reliable, provided one does not rely on it.” — Institute of Electrical Engineers, 1949. Trivia: Early AC distribution systems were installed by individuals who had never seen electricity before, which explains much."
      ),
      entry(
        "Active",
        "Equipment containing internal amplification or processing. Historically meaningful; now largely a euphemism for “warms itself.”",
        "Trivia: The first active crossover was described as “promising, but temperamental,” much like its inventor."
      ),
      entry(
        "AFL",
        "After‑Fade Listen. Allows monitoring of a signal post‑fader, assuming one wishes to hear what the audience hears.",
        "Trivia: AFL was introduced after engineers complained that PFL revealed too much truth."
      ),
      entry("Amp", "Either a unit of electrical current or a device converting electricity into heat and occasional sound."),
      entry(
        "Amplifier",
        "A device increasing signal amplitude. Frequently blamed for failures occurring elsewhere.",
        "“Amplifiers amplify everything, including mistakes.” — BBC Research Department, 1963"
      ),
      entry("Auxiliary", "Secondary output path used for monitors, effects, or routing signals one regrets."),
    ],
  },
  {
    letter: "B",
    entries: [
      entry(
        "Backline",
        "Musicians’ personal equipment, notable for its weight, fragility, and emotional significance.",
        "Trivia: The average backline item is older than the average musician using it."
      ),
      entry(
        "Balanced",
        "Differential signal transmission rejecting noise. Regrettably ineffective at rejecting poor performance.",
        "“Balanced lines reject noise, though sadly not the performer.” — Anonymous FOH engineer, 1983. Trivia: Balanced lines were first used for telegraphy, which explains their fondness for bad news."
      ),
      entry(
        "Bandwidth",
        "Range of frequencies a system can reproduce. Also a measure of an engineer’s remaining patience."
      ),
      entry("Bass", "Frequencies below ~200 Hz. Universally requested, rarely understood."),
      entry(
        "Beamwidth Plot",
        "Graphical representation of loudspeaker dispersion.",
        "“The loudspeaker will illuminate the room in precisely the manner you did not intend.” — J. Eargood, Principles of Acoustic Misfortune (1954). Trivia: Early beamwidth plots were hand‑drawn, making inaccuracies artisanal.",
        "/diagrams/beamwidth.svg"
      ),
      entry("Board", "Colloquial term for mixing console. Frequently blamed for physics."),
    ],
  },
  {
    letter: "C",
    entries: [
      entry(
        "Cardioid",
        "Microphone polar pattern resembling a heart, though rarely associated with affection.",
        null,
        "/diagrams/polar.svg"
      ),
      entry(
        "Compressor",
        "Device reducing dynamic range.",
        "“Compression is the art of making everything equally disappointing.” — Field Notes, Royal Albert Hall. Trivia: The first compressors were designed to protect telephone circuits from loud speech. They failed."
      ),
      entry("Condenser", "Microphone requiring phantom power and emotional stability."),
      entry("Console", "Device for combining, routing, and adjusting audio signals. Often touched by individuals who should not."),
      entry(
        "Crest Factor",
        "Ratio of peak to RMS signal levels.",
        "“A high crest factor indicates dynamic range. It also indicates imminent failure.” — BBC Research Department, 1961. Trivia: Crest factor was once described as “a polite warning from physics.”"
      ),
      entry(
        "Critical Distance",
        "Point at which direct and reverberant sound are equal.",
        "“Beyond this point, intelligibility becomes a theoretical concept.” — Acoustical Society of Great Britain"
      ),
    ],
  },
  {
    letter: "D",
    entries: [
      entry(
        "Damping Factor",
        "Amplifier’s ability to control loudspeaker motion. Higher values desirable, rarely achieved."
      ),
      entry("dB", "Logarithmic unit expressing ratios. Universally misunderstood."),
      entry("DC", "Direct Current. Electrical energy flowing in one direction, much like an engineer leaving a gig early."),
      entry(
        "DI",
        "Direct Injection. Converts high‑impedance signals into balanced, low‑impedance signals, preserving mediocrity over distance."
      ),
      entry("Desk", "Another term for mixing console. Often blamed for feedback regardless of culpability."),
      entry("Distortion", "Deviation from linearity. Sometimes intentional, frequently regrettable."),
      entry("Dry Hire", "Rental of equipment without personnel. A bold and optimistic choice."),
    ],
  },
  {
    letter: "E",
    entries: [
      entry(
        "Effects",
        "Processes altering audio signals by adding delayed or modified versions of the original."
      ),
      entry(
        "EMF",
        "Electromotive Force. Potential difference driving current.",
        "“EMF should not be confused with enthusiasm, which cannot be measured electrically.” — National Physical Laboratory"
      ),
      entry(
        "Enhancer",
        "Device adding harmonics to a signal. Often makes poor audio more complex, though not better."
      ),
      entry(
        "EQ",
        "Equalisation. Adjustment of frequency content to compensate for environmental, equipment, or existential deficiencies."
      ),
      entry("Equaliser", "Device allowing one to move problems from one frequency band to another."),
    ],
  },
  {
    letter: "F",
    entries: [
      entry(
        "Fader",
        "Linear control adjusting signal level. Frequently operated by individuals who should not be near electricity."
      ),
      entry(
        "Feedback",
        "Self‑exciting acoustic loop.",
        "“Feedback is the system’s way of expressing disapproval.” — Sir Reginald Hissworthy, Acoustic Etiquette (1937). Trivia: The first documented feedback incident occurred in 1925 and was described as “a shriek of mechanical indignation.”",
        "/diagrams/feedback.svg"
      ),
      entry("Firkin", "Archaic unit of volume. Used here to denote excessive loudness."),
      entry(
        "Foldback",
        "Monitor system enabling performers to hear themselves, though they will insist they cannot."
      ),
      entry(
        "Frequency Response",
        "Graph showing how a device behaves across the audible spectrum. Typically reveals that it does not.",
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
        "Ratio of output to input signal amplitude.",
        "Trivia: Gain knobs are adjusted incorrectly in 87% of live events."
      ),
      entry("Ground Loop", "Hum caused by improper grounding. Often attributed to supernatural forces."),
    ],
  },
  {
    letter: "H",
    entries: [
      entry("Hertz (Hz)", "Unit of frequency equal to one cycle per second."),
      entry("HF", "High Frequency. Frequencies above 3 kHz, generally associated with discomfort."),
      entry("High‑Pass Filter", "Filter attenuating low frequencies.", null, "/diagrams/hpf.svg"),
      entry("Hypercardioid", "Microphone pattern narrower than cardioid."),
    ],
  },
  {
    letter: "I",
    entries: [
      entry(
        "Impedance",
        "Opposition to AC current.",
        "“Impedance is resistance with opinions.” — BBC Radiophonic Workshop. Trivia: Musicians exhibit similar impedance characteristics: high at rehearsal, low at soundcheck."
      ),
      entry(
        "Intelligibility",
        "Degree to which speech can be understood.",
        "“Speech is only intelligible when the speaker wishes it to be.” — H. Farnsworth, On Public Address Failures (1968). Trivia: The STI was invented to quantify how little people understand each other."
      ),
      entry(
        "Inverse Square Law",
        "Sound pressure decreases by 6 dB per doubling of distance.",
        "“Except when produced by children.” — British Standards Acoustic Committee, 1972"
      ),
      entry(
        "IP Rating",
        "Protection against dust and water. Useful for determining whether equipment will survive outdoor events (it will not)."
      ),
    ],
  },
  {
    letter: "J",
    entries: [entry("Jack", "Connector invariably inserted into the wrong socket.")],
  },
  {
    letter: "K",
    entries: [entry("Kilo‑", "Prefix meaning “thousand.” Also the number of excuses provided by performers.")],
  },
  {
    letter: "L",
    entries: [
      entry("Lavaliere", "Small microphone worn on clothing. Captures everything except the speaker’s voice."),
      entry("LF", "Low Frequency. Responsible for structural damage and audience satisfaction."),
      entry("Line‑Level", "Standard operating voltage for audio signals."),
      entry("Logarithm", "Mathematical function essential for audio calculations."),
      entry("Low‑Pass Filter", "Filter attenuating high frequencies.", null, "/diagrams/lpf.svg"),
    ],
  },
  {
    letter: "M",
    entries: [
      entry("Midrange", "Central portion of the audible spectrum."),
      entry("Mixer", "Device combining audio signals."),
      entry("Monitor", "Loudspeaker for performers. They will always request more."),
      entry("Mute", "Button that resolves problems."),
    ],
  },
  {
    letter: "N",
    entries: [entry("Normalised", "Connector changing state when a plug is inserted.")],
  },
  {
    letter: "O",
    entries: [
      entry("Octave", "Doubling or halving of frequency."),
      entry("Ohm", "Unit of electrical resistance."),
      entry("Omni", "Omnidirectional microphone pattern."),
    ],
  },
  {
    letter: "P",
    entries: [
      entry("Pan", "Control for stereo placement."),
      entry("Passive", "Equipment requiring no power."),
      entry("Peak", "Maximum instantaneous signal level."),
      entry("PFL", "Pre‑Fade Listen. Reveals the true nature of a signal, usually disappointing."),
      entry(
        "Phantom Power",
        "48V DC supplied through an XLR cable.",
        "Trivia: The term “phantom” was chosen because the power is present even when nobody asked for it."
      ),
      entry(
        "Pink Noise",
        "Noise with equal energy per octave.",
        "“Pink noise is the sound of progress, provided one enjoys progress at 85 dB.” — National Physical Laboratory, 1959. Trivia: White noise was deemed “too enthusiastic.”"
      ),
      entry("PMPO", "Peak Music Power Output. Fictional measurement invented by marketing departments."),
      entry("Polar Plot", "Graph showing microphone sensitivity.", null, "/diagrams/polar.svg"),
      entry("Post", "After a point in the signal path."),
      entry("Pre", "Before a point in the signal path."),
    ],
  },
  {
    letter: "Q",
    entries: [entry("Q", "Measure of filter bandwidth.", null, "/diagrams/peaking.svg")],
  },
  {
    letter: "R",
    entries: [
      entry("Reverb", "Artificial reverberation."),
      entry(
        "RMS",
        "Root Mean Square.",
        "“RMS is mathematically elegant and practically inconvenient.” — Acoustical Society of Great Britain. Trivia: Manufacturers adopted RMS because it sounded scientific."
      ),
    ],
  },
  {
    letter: "S",
    entries: [
      entry("Series", "Connecting components sequentially."),
      entry(
        "Shelving EQ",
        "Filter boosting or cutting frequencies above or below a set point.",
        "“A shelving filter is a polite way of saying ‘everything above this point is suspect.’” — Audio Engineering Quarterly, 1962",
        "/diagrams/shelving.svg"
      ),
      entry("SPL", "Sound Pressure Level."),
      entry("Supercardioid", "Microphone pattern narrower than cardioid."),
    ],
  },
  {
    letter: "T",
    entries: [
      entry("Transducer", "Device converting one form of energy into another."),
      entry(
        "TRS",
        "Tip‑Ring‑Sleeve.",
        "“TRS connectors perform three functions, none of which are the one required.” — British Telecom Engineering Notes"
      ),
    ],
  },
  {
    letter: "U",
    entries: [
      entry(
        "Unbalanced",
        "Signal carried on a single conductor.",
        "“Unbalanced lines are ideal for transmitting noise with occasional audio.” — G. H. Linton, Cable Regrets (1951). Trivia: The first unbalanced cable was made from lamp cord."
      ),
    ],
  },
  {
    letter: "V",
    entries: [entry("Volt", "Unit of electromotive force.")],
  },
  {
    letter: "W",
    entries: [entry("Watt", "Unit of power. Frequently exaggerated.")],
  },
  {
    letter: "X",
    entries: [entry("XLR", "Connector solving problems until someone purchases a cheaper version.")],
  },
  {
    letter: "Y",
    entries: [entry("Y‑Cable", "Cable splitting signals.")],
  },
  {
    letter: "Z",
    entries: [
      entry(
        "Z‑Axis",
        "Vertical dimension in 3D space.",
        "“The Z‑axis is the direction in which loudspeakers fall when improperly mounted.” — Health & Safety Bulletin, 1989. Trivia: Named after the engineer who discovered it by accident."
      ),
    ],
  },
];
