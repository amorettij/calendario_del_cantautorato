#!/usr/bin/env python3
"""
Converte calendario.json → calendario.csv

Uso:
    python3 json_to_csv.py
    python3 json_to_csv.py --input calendario.json --output calendario.csv
"""

import csv
import json
import argparse
from pathlib import Path

INTESTAZIONI = ["data", "titolo", "autore", "autore_json", "citazione", "commento", "youtube", "spotify"]


def json_to_csv(input_path: Path, output_path: Path) -> None:
    with open(input_path, encoding="utf-8") as f:
        calendario = json.load(f)

    righe = []
    for data, canzoni in sorted(calendario.items()):
        if data == "YYYY-MM-DD":
            continue
        for canzone in canzoni:
            riga = {"data": data}
            riga.update({campo: canzone.get(campo, "") for campo in INTESTAZIONI[1:]})
            righe.append(riga)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=INTESTAZIONI)
        writer.writeheader()
        writer.writerows(righe)

    print(f"✓ {len(righe)} righe scritte in {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JSON → CSV per il Calendario del Cantautorato")
    parser.add_argument("--input",  default="calendario.json", help="File JSON di input")
    parser.add_argument("--output", default="calendario.csv",  help="File CSV di output")
    args = parser.parse_args()

    json_to_csv(Path(args.input), Path(args.output))
