const CHANNELS_URL =
"https://raw.githubusercontent.com/k33n26/yt-live-proxy/main/channels.json";

const manifestCache = new Map();


async function getChannels() {
  const r = await fetch(CHANNELS_URL, {
    cf: { cacheTtl: 60 }
  });

  return await r.json();
}


// cache
function getCached(videoId, allowExpired = false){

  const item =
    manifestCache.get(videoId);

  if(!item) return null;

  if(
    Date.now() > item.expire
  ){

    if(allowExpired){
      return item.url;
    }

    manifestCache.delete(
      videoId
    );

    return null;
  }

  return item.url;
}


function setCache(
  videoId,
  url
){

  manifestCache.set(
    videoId,
    {
      url,

      expire:
        Date.now() + 60000
    }
  );

}


// manifest gerçekten yaşıyor mu?
async function isAlive(url){

  try{

    const r =
      await fetch(
        url,
        {
          method:"HEAD"
        }
      );

    return r.ok;

  }catch(e){

    return false;

  }

}


// youtube resolve
async function resolveYouTube(
  videoId
){

  // önce cache
  const cached =
    getCached(
      videoId
    );

  if(
    cached &&
    await isAlive(
      cached
    )
  ){
    return cached;
  }


  const clients = [

    {
      clientName:
        "ANDROID",

      clientVersion:
        "20.10.38"
    },

    {
      clientName:
        "TVHTML5",

      clientVersion:
        "7.202.0"
    },

    {
      clientName:
        "IOS",

      clientVersion:
        "20.10.4"
    }

  ];


  for(
    const client
    of clients
  ){

    try{

      const res =
        await fetch(
          "https://www.youtube.com/youtubei/v1/player",
          {
            method:"POST",

            headers:{
              "content-type":
                "application/json"
            },

            body:
              JSON.stringify({

                videoId,

                context:{
                  client
                }

              })

          }
        );


      const json =
        await res.json();


      const hls =
        json?.streamingData
          ?.hlsManifestUrl;


      if(
        hls &&
        await isAlive(
          hls
        )
      ){

        setCache(
          videoId,
          hls
        );

        return hls;

      }

    }catch(e){
      continue;
    }

  }


  // stale cache fallback
  const stale =
    getCached(
      videoId,
      true
    );

  if(
    stale &&
    await isAlive(
      stale
    )
  ){
    return stale;
  }


  return null;
}



// en yüksek kalite
async function getBestStream(
  masterUrl
){

  const r =
    await fetch(
      masterUrl
    );


  const text =
    await r.text();


  const lines =
    text.split("\n");


  let variants =
    [];


  for(
    let i=0;
    i<lines.length;
    i++
  ){

    if(
      lines[i].startsWith(
        "#EXT-X-STREAM-INF"
      )
    ){

      const bw =
        parseInt(
          lines[i]
            .match(
              /BANDWIDTH=(\d+)/
            )?.[1] || 0
        );


      let streamUrl =
        lines[i+1];


      // relative url fix
      if(
        !streamUrl.startsWith(
          "http"
        )
      ){

        streamUrl =
          new URL(
            streamUrl,
            masterUrl
          ).href;

      }


      variants.push({

        bw,

        url:
          streamUrl

      });

    }

  }


  if(
    variants.length===0
  ){
    return masterUrl;
  }


  variants.sort(
    (a,b)=>
      b.bw-a.bw
  );


  return variants[0].url;
}



export default {

  async fetch(req){

    const url =
      new URL(req.url);


    const name =
      url.pathname
        .replace("/","")
        .replace(
          ".m3u8",
          ""
        );


    const channels =
      await getChannels();


    const channel =
      channels[name];


    if(
      !channel
    ){

      return new Response(
        "not found",
        {
          status:404
        }
      );

    }


    let streamUrl =
      null;


    if(
      channel.type===
      "youtube"
    ){

      streamUrl =
        await resolveYouTube(
          channel.id
        );

    }


    if(
      !streamUrl
    ){

      return new Response(
        "stream not available",
        {
          status:404
        }
      );

    }


    const bestUrl =
      await getBestStream(
        streamUrl
      );


    const stream =
      await fetch(
        bestUrl,
        {
          headers:{
            "User-Agent":
              "Mozilla/5.0",

            "Referer":
              "https://www.youtube.com/"
          }
        }
      );


    return new Response(
      stream.body,
      {
        headers:{

          "content-type":
            "application/vnd.apple.mpegurl",

          "Access-Control-Allow-Origin":
            "*",

          "Cache-Control":
            "public,max-age=20"

        }
      }
    );

  }

}
