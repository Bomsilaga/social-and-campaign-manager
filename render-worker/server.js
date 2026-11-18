import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { timingSafeEqual } from 'node:crypto';
const exec = promisify(execFile);
const port = Number(process.env.PORT || 3000);
function reply(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(payload));
}
function permitted(req) {
  const expected = process.env.RENDER_WORKER_SHARED_SECRET;
  const got = req.headers.authorization?.replace(/^Bearer /i, '') || '';
  if (!expected || !got) return false;
  const a=Buffer.from(expected), b=Buffer.from(got);
  return a.length===b.length && timingSafeEqual(a,b);
}
const server = http.createServer(async (req,res) => {
  if(req.method==='GET' && req.url==='/health') {
    try {
      const {stdout} = await exec('ffmpeg',['-version'],{timeout:4000,maxBuffer:1024*1024});
      return reply(res,200,{service:'boma-render-worker',status:'ready',ffmpeg:stdout.split('\n')[0],renderingEnabled:false});
    } catch {return reply(res,503,{status:'unhealthy',reason:'FFmpeg not available'});}
  }
  if(req.url==='/render') {
    if(!permitted(req)) return reply(res,401,{error:'Worker authorisation required'});
    return reply(res,501,{error:'Rendering not enabled yet. This is an infrastructure scaffold; Remotion scenes, job queue, secure asset handling and MP4 export are not installed.'});
  }
  return reply(res,404,{error:'Not found'});
});
server.requestTimeout=15000;
server.listen(port,'0.0.0.0',()=>console.log('Boma renderer infrastructure listening on '+port));
