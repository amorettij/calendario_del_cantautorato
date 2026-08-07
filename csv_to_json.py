#!/usr/bin/env python3
"""
Converte calendario.csv → calendario.json

Uso:
    python3 csv_to_json.py
    python3 csv_to_json.py --input mio_file.csv --output calendario.json
"""

import csv
import json
import argparse
from pathlib import Path

CAMPI = ["titolo", "autore", "autore_json", "citazione", "commento", "youtube", "spotify"]


def csv_to_json(input_path: Path, output_path: Path) -> None:
    calendario = {}

    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for riga in reader:
            data = riga.get("data", "").strip()
            if not data or data == "YYYY-MM-DD":
                continue

            canzone = {campo: riga.get(campo, "").strip() for campo in CAMPI}

            # Salta le righe segnaposto (titolo vuoto = data prenotata ma canzone ancora da scegliere)
            if not canzone.get("titolo"):
                continue

            # Se la data esiste già, aggiunge la canzone alla lista esistente.
            # Più righe con la stessa data producono una lista con più dizionari.
            if data not in calendario:
                calendario[data] = []
            calendario[data].append(canzone)

    # Ordina le date cronologicamente
    calendario = dict(sorted(calendario.items()))

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(calendario, f, ensure_ascii=False, indent=2)

    totale = sum(len(v) for v in calendario.values())
    print(f"✓ {totale} canzoni in {len(calendario)} date → {output_path}")
    for data, canzoni in calendario.items():
        if len(canzoni) > 1:
            titoli = ", ".join(f'"{c["titolo"]}"' for c in canzoni)
            print(f"  ↳ {data}: {len(canzoni)} canzoni ({titoli})")
        else:
            print(f"  ↳ {data}: {canzoni[0]['titolo']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CSV → JSON per il Calendario del Cantautorato")
    parser.add_argument("--input",  default="calendario.csv",  help="File CSV di input")
    parser.add_argument("--output", default="calendario.json", help="File JSON di output")
    args = parser.parse_args()

    csv_to_json(Path(args.input), Path(args.output))
