const GITHUB_USER = "k33n26";
const GITHUB_REPO = "yt-live-proxy";

const CHANNELS_URL =
`https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/channels.json`;


async function getChannels() {
  const r = await fetch(CHANNELS_URL);
  return await r.json();
}


async function getLive(videoId) {

  const r = await fetch(
    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    {
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
    }
  );

  const json = await r.json();

  return json?.streamingData?.hlsManifestUrl || null;
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


    // ❗ burada kritik debug
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
        "Access-Control-Allow-Origin": "*"
      }
    });

  }

}
