#!/usr/bin/env bash
# Runs on the home PC: copies MQ Expense's nightly backups off Railway into ~/backups/mq-expense.
# Needs `railway login` on the home PC, its SSH key registered, and this folder linked to the mq-expense service.
set -euo pipefail

railway="$HOME/.local/bin/railway"
out_dir="$HOME/backups/mq-expense"
keep=30 # each copy is ~300 MB
mkdir -p "$out_dir"
cd "$(dirname "${BASH_SOURCE[0]}")"

# Pulls every nightly copy not here yet, so days the PC was off are caught up.
names="$("$railway" volume files --volume mq-expense-volume list live/backups --json \
  | { grep -o 'mqx-[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\.sqlite' || true; } | sort -u)"
if [[ -z "$names" ]]; then
  echo "No nightly backup found on Railway." >&2
  exit 1
fi

for name in $names; do
  [[ -f "$out_dir/$name" ]] && continue
  # A broken download stays under .part and is retried next run, never mistaken for a good copy.
  "$railway" volume files --volume mq-expense-volume download "live/backups/$name" "$out_dir/$name.part" --overwrite
  mv "$out_dir/$name.part" "$out_dir/$name"
  echo "Pulled $name."
done

ls "$out_dir"/mqx-*.sqlite | sort | head -n -"$keep" | xargs -r rm --
