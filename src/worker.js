const GITHUB_USER = "k33n26";
const GITHUB_REPO = "yt-live-proxy";
const GITHUB_BRANCH = "main";

const CHANNELS_URL =
  `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/channels.json`;

let cache = null;
let cacheTime = 0;

async function getChannels() {

  if (
    cache &&
    (Date.now() - cacheTime) < 60000
  ) {
    return cache;
  }

  const r = await fetch(CHANNELS_URL, {
    cf: {
      cacheTtl: 60
    }
  });

  const json = await r.json();

  cache = json;
  cacheTime = Date.now();

  return json;
}


function extractId(pathname) {

  return pathname
    .replace(/^\/+/, "")
    .replace(".m3u8", "")
    .trim();
}


async function getYoutubeHls(channelId) {

  const yt = `https://www.youtube.com/channel/${channelId}/live`;

  const page = await fetch(yt, {
    headers: {
      "user-agent":
        "Mozilla/5.0"
    }
  });

  const html = await page.text();

  const match = html.match(
    /https:\\\/\\\/manifest\.googlevideo\.com[^"]+/i
  );

  if (!match) {
    return null;
  }

  return match[0]
    .replace(/\\u0026/g, "&")
    .replace(/\\/g, "");
}


export default {

  async fetch(req) {

    try {

      const url = new URL(req.url);

      let channelName =
        extractId(url.pathname);

      if (!channelName) {
        return new Response(
          "channel missing",
          { status: 400 }
        );
      }

      const channels =
        await getChannels();

      const channelId =
        channels[channelName] ||
        channelName;

      const hls =
        await getYoutubeHls(
          channelId
        );

      if (!hls) {
        return new Response(
          "live not found",
          { status: 404 }
        );
      }

      const stream =
        await fetch(hls);

      return new Response(
        stream.body,
        {
          headers: {
            "content-type":
              "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin":
              "*",
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
