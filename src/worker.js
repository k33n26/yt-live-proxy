const GITHUB_USER = "k33n26";
const GITHUB_REPO = "yt-live-proxy";

const CHANNELS_URL =
`https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/channels.json`;

async function getChannels() {
  const r = await fetch(CHANNELS_URL);
  return await r.json();
}

async function getManifest(videoId) {

  const page = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    }
  );

  const html = await page.text();

  const match = html.match(
    /https:\\\/\\\/manifest\.googlevideo\.com[^"]+/i
  );

  if (!match) return null;

  return match[0]
    .replace(/\\u0026/g, "&")
    .replace(/\\/g, "");
}

export default {

  async fetch(req) {

    try {

      const url = new URL(req.url);

      const name = url.pathname
        .replace("/", "")
        .replace(".m3u8", "");

      const channels =
        await getChannels();

      const videoId =
        channels[name] || name;

      const manifest =
        await getManifest(videoId);

      if (!manifest) {

        return new Response(
          "live not found",
          { status: 404 }
        );

      }

      const stream =
        await fetch(manifest);

      return new Response(
        stream.body,
        {
          headers: {
            "content-type":
              "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control":
              "public,max-age=20"
          }
        }
      );

    } catch (e) {

      return new Response(
        e.toString(),
        { status: 500 }
      );

    }

  }

}
