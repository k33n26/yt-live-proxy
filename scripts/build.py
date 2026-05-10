import os
import json

INPUT_FILE = "channels.txt"
JSON_FILE = "channels.json"
M3U_FILE = "playlist/playlist.m3u"

WORKER_URL = "https://kytv.k33n26.workers.dev"

channels = {}

m3u = [
    "#EXTM3U"
]

with open(
    INPUT_FILE,
    encoding="utf-8"
) as f:

    for line in f:

        line = line.strip()

        if not line:
            continue

        name, videoid, group, logo = \
            line.split("|")


        channels[name] = {

            "type":
                "youtube",

            "id":
                videoid,

            "group":
                group,

            "logo":
                logo
        }


        m3u.append(

f'#EXTINF:-1 tvg-id="{name}" tvg-logo="{logo}" group-title="{group}",{name}'

        )

        m3u.append(

f"{WORKER_URL}/{name}.m3u8"

        )

        m3u.append("")


# json
with open(
    JSON_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        channels,
        f,
        ensure_ascii=False,
        indent=2
    )


# playlist
os.makedirs(
    "playlist",
    exist_ok=True
)

with open(
    M3U_FILE,
    "w",
    encoding="utf-8"
) as f:

    f.write(
        "\n".join(
            m3u
        )
    )


print(
    "ok"
)
