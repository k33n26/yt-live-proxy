const CHANNELS_URL =
"https://raw.githubusercontent.com/k33n26/yt-live-proxy/main/channels.json";

async function getChannels() {
  const r = await fetch(CHANNELS_URL);
  return await r.json();
}


// 🔥 MULTI-TRY LIVE FETCH
async function getLive(videoId) {

  const urls = [

    // 1 - android
    "https://www.youtube.com/youtubei/v1/player",

    // 2 - web
    "https://www.youtube.com/youtubei/v1/player?key=web",

    // 3 - legacy
    `https://www.youtube.com/get_video_info?video_id=${videoId}`

  ];


  for (const u of urls) {

    try {

      let res;

      if (u.includes("youtubei")) {

        res = await fetch(u, {
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

        res = await fetch(u);

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


export default {

  async fetch(req) {

    const url = new URL(req.url);

    const name = url.pathname
      .replace("/", "")
      .replace(".m3u8", "");

    const channels = await getChannels();

    const videoId = channels[name] || name;

    const manifest = await getLive(videoId);

    if (!manifest) {
      return new Response(
        "live not found",
        { status: 404 }
      );
    }

    const stream = await fetch(manifest);

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
