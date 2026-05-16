import json
import re
import requests

FILE = "channels.json"


HEADERS = {

    "User-Agent":

        "Mozilla/5.0"

}



def get_video_id_from_handle(
    handle
):

    try:

        url = (
            f"https://www.youtube.com/"
            f"{handle}/live"
        )


        r = requests.get(

            url,

            headers=
                HEADERS,

            timeout=20

        )


        html = r.text


        m = re.search(

            r'"canonicalBaseUrl":"\/watch\?v=([A-Za-z0-9_-]{11})"',

            html

        )


        if m:

            return m.group(1)


        m = re.search(

            r'watch\?v=([A-Za-z0-9_-]{11})',

            html

        )


        if m:

            return m.group(1)


    except Exception:
        pass


    return None




def is_live(
    video_id
):

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


        return details.get(
            "isLive",
            False
        )


    except Exception:

        return False




with open(
    FILE,
    encoding="utf-8"
) as f:

    data = json.load(f)


changed = False


for name, channel in data.items():

    if (
        channel.get("type")
        != "youtube"
    ):
        continue


    handle = channel.get(
        "handle"
    )


    if not handle:
        continue


    new_id = (
        get_video_id_from_handle(
            handle
        )
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


        channel["id"] = (
            new_id
        )


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
