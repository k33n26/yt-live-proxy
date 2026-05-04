
const CHANNELS_URL =
"https://raw.githubusercontent.com/k33n26/yt-live-proxy/main/channels.json";

async function getChannels() {
  const r = await fetch(CHANNELS_URL);
  return await r.json();
}


// 🔥 YOUTUBE RESOLVER (stabil fallback)
async function resolveYouTube(videoId) {

  const endpoints = [

    {
      url: "https://www.youtube.com/youtubei/v1/player",
      type: "post"
    },

    {
      url: "https://www.youtube.com/get_video_info",
      type: "get"
    }

  ];


  for (const ep of endpoints) {

    try {

      let res;

      if (ep.type === "post") {

        res = await fetch(ep.url, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            videoId,
            context: {
              client: {
                clientName: "ANDROID",
                clientVersion: "20.10.38"
              }
            }
          })
        });

        const json = await res.json();

        const hls =
          json?.streamingData?.hlsManifestUrl;

        if (hls) return hls;

      } else {

        res = await fetch(
          `${ep.url}?video_id=${videoId}&hl=en`
        );

        const text = await res.text();

        const params = new URLSearchParams(text);

        const pr = JSON.parse(
          params.get("player_response") || "{}"
        );

        const hls =
          pr?.streamingData?.hlsManifestUrl;

        if (hls) return hls;

      }

    } catch (e) {
      continue;
    }

  }

  return null;
}


// 🔥 MAIN HANDLER
export default {

  async fetch(req) {

    const url = new URL(req.url);

    const name = url.pathname
      .replace("/", "")
      .replace(".m3u8", "");

    const channels = await getChannels();

    const channel = channels[name];

    if (!channel) {
      return new Response("not found", { status: 404 });
    }


    let streamUrl = null;


    if (channel.type === "youtube") {
      streamUrl = await resolveYouTube(channel.id);
    }


    if (!streamUrl) {
      return new Response(
        "stream not available",
        { status: 404 }
      );
    }


    const stream = await fetch(streamUrl);

    return new Response(stream.body, {
      headers: {
        "content-type":
          "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
      }
    });

  }

}
