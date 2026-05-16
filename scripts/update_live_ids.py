import json
import re
import requests

FILE = "channels.json"


def get_video_id_from_handle(handle):

    try:

        url = f"https://www.youtube.com/{handle}/live"

        r = requests.get(
            url,
            allow_redirects=True,
            timeout=20
        )

        m = re.search(
            r"watch\?v=([A-Za-z0-9_-]{11})",
            r.url
        )

        if m:
            return m.group(1)

    except Exception:
        pass

    return None



def is_live(video_id):

    try:

        r = requests.post(

            "https://www.youtube.com/youtubei/v1/player",

            headers={
                "content-type":
                    "application/json"
            },

            json={

                "videoId":
                    video_id,

                "context": {

                    "client": {

                        "clientName":
                            "ANDROID",

                        "clientVersion":
                            "20.10.38"

                    }

                }

            },

            timeout=20

        )


        data = r.json()


        details = data.get(
            "videoDetails",
            {}
        )


        if details.get(
            "isLive"
        ):
            return True


    except Exception:
        pass


    return False



with open(
    FILE,
    encoding="utf-8"
) as f:

    data = json.load(f)


changed = False


for name, channel in data.items():

    if channel.get("type") != "youtube":
        continue


    handle = channel.get(
        "handle"
    )


    if not handle:
        continue


    new_id = get_video_id_from_handle(
        handle
    )


    if not new_id:

        print(
            f"{name}: id bulunamadı"
        )

        continue


    if not is_live(
        new_id
    ):

        print(
            f"{name}: live değil"
        )

        continue


    old_id = channel.get(
        "id"
    )


    if old_id != new_id:

        print(
            f"{name}: {old_id} -> {new_id}"
        )

        channel["id"] = new_id

        changed = True

    else:

        print(
            f"{name}: aynı"
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

    print(
        "channels.json güncellendi"
    )

else:

    print(
        "değişiklik yok"
    )
