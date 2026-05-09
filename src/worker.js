const CHANNELS_URL =
"https://raw.githubusercontent.com/k33n26/yt-live-proxy/main/channels.json";

const cache = new Map();


async function getChannels() {
  const r = await fetch(CHANNELS_URL);
  return await r.json();
}


function getCache(videoId){

  const item = cache.get(videoId);

  if(!item) return null;

  if(Date.now() > item.expire){

    cache.delete(videoId);

    return null;
  }

  return item.url;
}


function setCache(videoId,url){

  cache.set(videoId,{
    url,
    expire:
      Date.now()+30000
  });

}



async function resolveYouTube(videoId){

  const cached =
    getCache(videoId);

  if(cached){
    return cached;
  }


  const clients = [

    {
      clientName:"ANDROID",
      clientVersion:"20.10.38"
    },

    {
      clientName:"TVHTML5",
      clientVersion:"7.202.0"
    }

  ];


  // youtubei dene
  for(const client of clients){

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


      if(hls){

        setCache(
          videoId,
          hls
        );

        return hls;

      }

    }catch(e){}
  }


  // fallback
  try{

    const res =
      await fetch(
        `https://www.youtube.com/get_video_info?video_id=${videoId}&hl=en`
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

  }catch(e){}


  return null;
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


    if(!channel){

      return new Response(
        "not found",
        {
          status:404
        }
      );

    }


    const streamUrl =
      await resolveYouTube(
        channel.id
      );


    if(!streamUrl){

      return new Response(
        "stream not available",
        {
          status:404
        }
      );

    }


    const stream =
      await fetch(
        streamUrl
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
