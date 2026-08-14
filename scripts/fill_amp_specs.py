"""Fill amplifier card specs from the maxx-on.com site dump."""

from __future__ import annotations

import json
import re
from pathlib import Path

DUMP = Path(
    r"C:\Users\ashis_j2fpu3p\.cursor\projects\c-Projects-siac\agent-tools\9ca787dc-d0f5-498f-9807-2f418d0762d3.txt"
)
JSON_PATH = Path(r"C:\Projects\MAXXON\src\styles\amplifiers.json")


def compact(s: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "", s.upper())


def clip(v: str, n: int = 96) -> str:
    v = re.sub(r"\s+", " ", (v or "")).strip(" -:")
    v = v.replace("Ω", "Ω")
    return v if len(v) <= n else v[: n - 1] + "…"


def cut_next_label(v: str) -> str:
    return re.split(
        r"\s+(?:Digital Player|Tone Controls|Signal to Noise Ratio|"
        r"Power Supply|Power Consumption|Output Regulation|Echo|"
        r"Input Channels|Power Output|Net W(?:e)?ight|Dimensions)\s*:",
        v,
        maxsplit=1,
        flags=re.I,
    )[0].strip()


def pick(pat: str, block: str, flags: int = re.I) -> str:
    m = re.search(pat, block, flags)
    if not m:
        return ""
    return (m.group(1) if m.lastindex else m.group(0)).strip()


def first_watts(block: str) -> str:
    m = re.search(r"(\d+\s*WATTS\s*\+\s*\d+\s*WATTS)", block, re.I)
    if m:
        return re.sub(r"\s+", "", m.group(1).upper()).replace("WATTS", "W").replace("W+", "W + ")
    m = re.search(r"(?:^|\n|#+\s*)(\d+)\s*WATTS", block, re.I)
    if m:
        return f"{m.group(1)}W"
    return ""


def short_inputs(block: str) -> str:
    m = re.search(r"(\d+\s*Mic[^\n]{0,70})", block, re.I)
    if m:
        s = re.sub(r"\s+", " ", m.group(1))
        s = re.sub(r"\s+and\s+CD/Stereo.*", "", s, flags=re.I)
        s = re.sub(r"Built-in.*", "", s, flags=re.I)
        return clip(s, 80)
    ch = pick(r"Input Channels\s*:?\s*([^\n]+)", block)
    if ch and not re.search(r"\d+W", ch):
        mics = re.findall(r"(\d+)\s*x\s*Mic", ch, re.I)
        auxs = re.findall(r"(\d+)\s*x\s*Aux", ch, re.I)
        parts = []
        if mics:
            parts.append(f"{mics[0]} Mic")
        if auxs:
            parts.append(f"{sum(int(x) for x in auxs)} Aux")
        if parts:
            return ", ".join(parts)
        return clip(ch, 72)
    if re.search(r"XLR", block, re.I):
        return "2 x XLR / 6.3mm"
    return ""


def power_mixer(block: str) -> str:
    po = pick(r"Power Output\s*:?\s*([^\n]+)", block)
    if not po:
        return ""
    po = re.sub(r"\s*700W at 5% THD", "", po)
    m = re.search(
        r"((?:\d+W\s*\+\s*\d+W|\d+W)\s*RMS(?:\s*at\s*10%\s*THD)?)", po, re.I
    )
    if m:
        return clip(m.group(1), 80)
    m = re.search(r"(\d+W(?:\s*\+\s*\d+W)?\s*Max[^,]*)", po, re.I)
    if m:
        return clip(m.group(1), 80)
    return clip(po, 80)


def power_pa(block: str) -> str:
    stereo = pick(r"Stereo/Mono\s*:?\s*([^\n]+)", block)
    ch = pick(r"Input Channels\s*:?\s*([^\n]+)", block)
    bridged = pick(r"Bridged Output\s*:?\s*([^\n]+)", block)
    out = pick(r"(?m)^[-* ]*Output\s*:\s*(\d[^\n]+)", block)
    blob = " ".join(x for x in (stereo, ch, bridged, out) if x)
    pairs = re.findall(
        r"(\d+)\s*[ΩΩ]?\s*(?:Ohm)?\s*:\s*(\d+\s*W\s*\+\s*\d+\s*W(?:\s*RMS)?)",
        blob,
        re.I,
    )
    chosen = ""
    for ohm, watts in pairs:
        nums = [int(x) for x in re.findall(r"(\d+)", watts)]
        if nums and max(nums) >= 6000:
            continue
        if ohm == "4":
            chosen = f"{watts.strip()} @{ohm}Ω"
            break
        if not chosen:
            chosen = f"{watts.strip()} @{ohm}Ω"
    if not chosen and out:
        chosen = re.sub(r"\s+", " ", out)
    br = ""
    if bridged:
        br_m = re.search(r"(\d+\s*Ω\s*:\s*\d+\s*W\s*RMS)", bridged, re.I)
        br = br_m.group(1) if br_m else bridged
        br = f"Bridged {br}"
    if chosen and br:
        return clip(f"{chosen}; {br}", 88)
    return clip(chosen or br, 88)


def main() -> None:
    text = DUMP.read_text(encoding="utf-8", errors="replace")
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    sku_index = {}
    for items in data.values():
        for item in items:
            sku_index[compact(item["sku"])] = item

    pat = re.compile(r"^AMPLIFIER\s+(.+)$", re.M)
    matches = list(pat.finditer(text))
    blocks: dict[str, str] = {}
    for i, m in enumerate(matches):
        sku_raw = m.group(1).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end]
        cut = re.search(
            r"\n(?:HEAD/TIE|ACTIVE SPEAKERS|ACCESSORIES|STANDS|DIAPHRAGMS|"
            r"PROFFESIONAL|PROFESSIONAL|HORN|MICROPHONE|SPEAKER|MIXER)\b",
            block,
        )
        if cut:
            block = block[: cut.start()]
        key = compact(sku_raw)
        blocks[key] = block

    filled = 0
    for key, item in sku_index.items():
        block = blocks.get(key)
        if not block:
            for bk, bv in blocks.items():
                if compact(bk).replace("EUR", "") == key.replace("EUR", ""):
                    block = bv
                    break
        if not block:
            print("NO BLOCK", item["sku"])
            continue
        wattage = first_watts(block)
        is_mixer = bool(pick(r"Power Output\s*:", block)) and "Mic" in block
        power = power_mixer(block) if is_mixer else power_pa(block)
        if not power:
            power = power_mixer(block) or power_pa(block)
        response = cut_next_label(pick(r"Frequency Response(?:\(-dB\))?\s*:?\s*([^\n]+)", block))
        weight = cut_next_label(pick(r"Net W(?:e)?ight\s*:?\s*([^\n]+)", block))
        impedance = cut_next_label(pick(r"Speaker Output\s*:?\s*([^\n]+)", block))
        if not impedance:
            impedance = cut_next_label(pick(r"Input Impedance\s*:?\s*([^\n]+)", block))
        inputs = short_inputs(block)
        specs = {}
        if power:
            specs["power"] = clip(power)
        if response:
            specs["response"] = clip(response, 72)
        if weight:
            specs["weight"] = clip(weight, 40)
        if impedance:
            specs["impedance"] = clip(impedance, 72)
        if inputs:
            specs["inputs"] = clip(inputs, 72)
        item["specs"] = specs
        if wattage:
            item["wattage"] = wattage
        if item["sku"] == "MSSA-200EUR":
            item["wattage"] = "200W"
        filled += 1
        print(f"{item['sku']:16} {item['wattage']:16} {list(specs)}")

    JSON_PATH.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"filled {filled} -> {JSON_PATH}")


if __name__ == "__main__":
    main()
