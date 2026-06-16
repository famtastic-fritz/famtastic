#!/bin/bash
# Night shift status report

TIME=$(date +"%I:%M%p")
COMPLETED=$(ls ~/famtastic/ncs-redesign/admin/src/components/ 2>/dev/null | wc -l)
REPORTS=$(ls ~/famtastic/revenue-plans/*.md 2>/dev/null | wc -l)

curl -X POST \
  "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
  -d "chat_id=7456504966" \
  -d "text=🌙 $TIME STATUS

✅ NCS Components: $COMPLETED
✅ Revenue Plans: $REPORTS
⏳ Continuing to build...

Files: ~/famtastic/"
