from collections import defaultdict
import json
from itertools import combinations_with_replacement
import sys

MAX_PRICE = 12
items = [(None, 0)]

with open("menu.json") as menu_file:
    summary = json.loads(menu_file.read())
    for section in summary["item"]["individualChoice"]["menuContent"]["sections"]:
        for item in section["items"]:
            items.append((item["name"], item['price']))

combs = []
for comb in combinations_with_replacement(items, 4):
    items = tuple(sorted(filter(lambda item: item is not None, map(lambda item: item[0], comb))))
    cost = sum(map(lambda item: item[1], comb))
    if cost <= 12:
        combs.append((items, cost))

combs = sorted(combs, key=lambda comb: len(set(comb[0])) if "rogue" in sys.argv else comb[1] - (len(set(comb[0])) / 10), reverse=True)

def format(items):
    totals = defaultdict(lambda: 0)
    for item in items:
        totals[item] += 1
    
    totals = sorted(totals.items(), key=lambda item: item[1], reverse=True)
    return ", ".join(map(lambda item: f"{item[0]} x{item[1]}" if item[1] > 1 else f"{item[0]}", totals))

for comb in combs[0:50 if "rogue" not in sys.argv else 50]:
    print(f"£{comb[1]:.2f} |", format(comb[0]))
