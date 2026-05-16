import json
import re
import requests

FILE = "channels.json"


def get_live_id(handle):

    url = f"https://www.youtube.com/{handle}/live"

    r = requests.get(
        url,
        allow_redirects=True,
        timeout=20
    )

    m = re.search(
        r"watch\\?v=([A-Za-z0-9_-]{11})",
        r.url
    )

    if m:
        return m.group(1)

    return None



with open(
    FILE,
    encoding="utf-8"
) as f:

    data = json.load(f)


changed = False


for name, channel in data.items():

    if channel["type"] != "youtube":
        continue


    handle = channel.get("handle")

    if not handle:
        continue


    new_id =
        get_live_id(handle)


    if not new_id:
        continue


    old_id =
        channel.get("id")


    if old_id != new_id:

        channel["id"] = new_id

        changed = True

        print(
            name,
            old_id,
            "→",
            new_id
        )



if changed:

    with open(
        FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            data,
            f,
            indent=2,
            ensure_ascii=False
        )
