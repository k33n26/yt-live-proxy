const GITHUB_USER = "k33n26";
const GITHUB_REPO = "yt-live-proxy";

const CHANNELS_URL =
`https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/channels.json`;

async function getChannels() {
  const r = await fetch(CHANNELS_URL);
  return await r.json();
}


// 🔥 GERÇEK FIX: get_video_info yöntemi
async function getLive(videoId) {

  const url =
    `https://www.youtube.com/get_video_info?video_id=${videoId}&hl=en`;

  const r = await fetch(url);

  const text = await r.text();

  const params = new URLSearchParams(text);

  let playerResponse;

  try {
    playerResponse = JSON.parse(
      params.get("player_response") || "{}"
    );
  } catch (e) {
    return null;
  }

  return playerResponse
    ?.streamingData
    ?.hlsManifestUrl || null;
}


// m3u8 redirect
export default {

  async fetch(req) {

    try {

      const url = new URL(req.url);

      const name = url.pathname
        .replace("/", "")
        .replace(".m3u8", "");

      const channels = await getChannels();

      const videoId = channels[name] || name;

      const manifest = await getLive(videoId);

      if (!manifest) {
        return new Response(
          JSON.stringify({
            error: "live not found",
            videoId
          }),
          {
            status: 404,
            headers: {
              "content-type": "application/json"
            }
          }
        );
      }

      const stream = await fetch(manifest);

      return new Response(stream.body, {
        headers: {
          "content-type":
            "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public,max-age=10"
        }
      });

    } catch (e) {

      return new Response(
        e.toString(),
        { status: 500 }
      );

    }

  }

}
