const CHANNELS_URL =
"https://raw.githubusercontent.com/k33n26/yt-live-proxy/main/channels.json";

let manifestCache = new Map();


async function getChannels() {
  const r = await fetch(CHANNELS_URL);
  return await r.json();
}


// cache
function getCached(videoId){

  const item =
    manifestCache.get(videoId);

  if(!item) return null;

  if(
    Date.now() >
    item.expire
  ){
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
        Date.now() + 30000
    }
  );

}


// youtube resolve
async function resolveYouTube(
  videoId
){

  const cached =
    getCached(videoId);

  if(cached){
    return cached;
  }


  const endpoints = [

    {
      url:
        "https://www.youtube.com/youtubei/v1/player",
      type:"post"
    },

    {
      url:
        "https://www.youtube.com/get_video_info",
      type:"get"
    }

  ];


  for(
    const ep
    of endpoints
  ){

    try{

      let res;


      if(
        ep.type==="post"
      ){

        res = await fetch(
          ep.url,
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
                  client:{
                    clientName:
                      "ANDROID",

                    clientVersion:
                      "20.10.38"
                  }
                }

              })

          }
        );


        const json =
          await res.json();


        const hls =
          json?.streamingData
            ?.hlsManifestUrl;


        if(hls){

          setCache(
            videoId,
            hls
          );

          return hls;
        }

      }else{

        res =
          await fetch(
            `${ep.url}?video_id=${videoId}&hl=en`
          );


        const text =
          await res.text();


        const params =
          new URLSearchParams(
            text
          );


        const pr =
          JSON.parse(
            params.get(
              "player_response"
            ) || "{}"
          );


        const hls =
          pr?.streamingData
            ?.hlsManifestUrl;


        if(hls){

          setCache(
            videoId,
            hls
          );

          return hls;
        }

      }

    }catch(e){
      continue;
    }

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


      variants.push({

        bw,

        url:
          lines[i+1]

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
            "public,max-age=15"
        }
      }
    );

  }

}
