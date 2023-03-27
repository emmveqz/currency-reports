
import * as fs from "fs"
import {
  createServer,
  RequestListener,
} from "http"
import {
  constants as http2Constants,
  createSecureServer,
  Http2ServerRequest,
  Http2ServerResponse,
  IncomingHttpHeaders,
  OutgoingHttpHeaders,
  SecureServerOptions,
  ServerHttp2Stream,
} from "http2"
import * as mime from "mime"
import * as _path from "path"
import {
  Stream,
  Writable,
} from "stream"
import * as zlib from "zlib"
import vars from "./config/my-config-vars"

//

interface ICachedFile {
  mime: string
  data: Buffer
  etag: string
  gzipped: boolean
}

interface ICachedFiles {
  [fileName: string]: ICachedFile
}

interface IRequestFile {
  fd: fs.promises.FileHandle
  stats: fs.Stats
}

interface IHttpWriter extends Writable {
  respond(headers?: OutgoingHttpHeaders): void
  /**
   * This will cause the Stream to end.
   * @param fd
   * @param headers
   */
  respondWithFD(fd: number, headers?: OutgoingHttpHeaders): void
}

interface IHttpResponse extends Stream {
  end(callback?: () => void): void
  end(data: string | Uint8Array, callback?: () => void): void
  end(data: string | Uint8Array, encoding: string, callback?: () => void): void
  setHeader(name: string, value: number | string | ReadonlyArray<string>): void
  write(chunk: any, encoding: string, callback?: (error: Error | null | undefined) => void): boolean
}

class Http1Writer extends Writable implements IHttpWriter {

  constructor(private resp: IHttpResponse) {
    super()

    resp.on("close", () => {
      this.emit("close")
    })

    this.on("finish", () => {
      console.log("Http1Writer.finish")
      this.resp.end()
    })
  }

  public _write(chunk: any, encoding: string, callback: (error?: Error | null | undefined) => void): void {
    this.resp.write(chunk, encoding, callback)
  }

  public respond(headers?: OutgoingHttpHeaders): void {
    if (!headers) {
      return
    }
    console.log("respond.etag", headers[http2Constants.HTTP2_HEADER_ETAG])
    Object.entries(headers).forEach(([hdr, val]) => {
      this.resp.setHeader( hdr.startsWith(":") ? hdr.substr(1) : hdr, !val ? "" : String(val) )
    })
  }

  public respondWithFD(fd: number, headers?: OutgoingHttpHeaders): void {
    console.log("respondWithFD fd etag", fd, headers?.[http2Constants.HTTP2_HEADER_ETAG])
    this.respond(headers)

    fs.createReadStream(null as unknown as string, { autoClose: false, fd, start: 0 })
      .pipe(this, { end: true })
      .on("end", () => {
        console.log("fs.createReadStream.end fd", fd)
      })
      .on("finish", () => {
        console.log("fs.createReadStream.finish fd", fd)
      })
  }

}

//

const chacheable: boolean = true

const isSecureConn = !!parseInt(vars.MYVAR_WEB_SECURECONN_ENABLED as unknown as string, 10)

console.log("isSecureConn", isSecureConn)

const cachedFiles: ICachedFiles = {}
const {
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_CACHE_CONTROL,
  HTTP2_HEADER_CONTENT_ENCODING,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_ETAG,
  HTTP2_HEADER_EXPIRES,
  HTTP2_HEADER_HOST,
  HTTP2_HEADER_IF_NONE_MATCH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_VARY,
}						= http2Constants
const GZIP_ABOVE_OF		= 8192 // bytes
/*
*/
const HTTP2_PORT		= vars.MYVAR_WEB_SERVERPORT
const DEFAULT_INDEX		= "index.html"
const PUBLIC_DIR		= _path.resolve(__dirname,	"public")
const SSL_DIR			= _path.resolve(__dirname,	"../ssl")

/*
*/
const sslCreds			= !isSecureConn ? {} : {
  ca:		fs.readFileSync(`${SSL_DIR}/ca-root.crt`,		"utf8"),
  cert:	fs.readFileSync(`${SSL_DIR}/online/crt.pem`,	"utf8"),
  key:	fs.readFileSync(`${SSL_DIR}/online/key.pem`,	"utf8"),
}
const STATIC_PATHS		= [
  "/favicon.ico",
  "/css/",
  "/fonts/",
  "/img/",
  "/js/",
  "/workers/",
]
const pathsToCache		= [
  "favicon.ico",
  "index.html",
  "css",
  // "fonts", // too expensive
  "js",
  "workers",
]
const indexPushedFolders: string[] = [
  "css",
  // "fonts", // too expensive
  "js",
  "workers",
]

export const DedicatedPaths = {
  api:	"api",
}

const refreshCachePath = `/${DedicatedPaths.api}/refresh-cache`

const defaultOrigins = isSecureConn
  ? []
  : [
    `http://localhost`,
    `http://127.0.0.1`,
  ]

const http2Config: SecureServerOptions = {
  ...sslCreds,
  allowHTTP1: true,
  origins: [
    ...defaultOrigins,
    `https://${vars.MYVAR_WEB_SERVERDOMAIN}`,
  ],
}

//

const gzipData = (data: Buffer): Promise<Buffer|Error> => {
  return new Promise<Buffer|Error>((resolv) => {
    zlib.gzip(data, (err, result) => {
      resolv(!err ? result : err)
    })
  })
}

const closeFd = async (fd: fs.promises.FileHandle, onEvent: string) => {
  const fdFd = fd.fd
  console.log(onEvent, "closing fd:", fdFd)

  if (fdFd < 0) {
    return
  }

  try {
    await fd.close()
    console.log(onEvent, "closed fd:", fdFd)
  }
  catch (ex) {
    console.log(`${onEvent} fd ${fdFd}:`, (ex as Error).message)
  }
}

const opendFd = async (fileName: string, stream: Writable): Promise<fs.promises.FileHandle|Error> => {
  let fd: fs.promises.FileHandle

  try {
    fd = await fs.promises.open(fileName, "r")
  }
  catch (e) {
    const error = e.message || `error opening file ${fileName}`
    console.log("error:", error)
    return new Error(error)
  }

  const fdFd = fd.fd
  console.log("opened fd:", fdFd)

  stream
    .on("close", (): void => {
      closeFd(fd, "sream.closed")
    })
    .on("finish", () => {
      closeFd(fd, "sream.finished")
    })

  return fd
}

const getStat = async (path: string): Promise<fs.Stats|Error> => {
  try {
    return await fs.promises.stat(path)
  }
  catch (e) {
    const error = e.message || `error reading path ${path}`
    console.log("error:", error)
    return new Error(error)
  }
}

const getStatByFd = async (fd: fs.promises.FileHandle): Promise<fs.Stats|Error> => {
  const fdFd = fd.fd
  try {
    return await fd.stat()
  }
  catch (e) {
    const error = e.message || `error stating fd ${fdFd}`
    console.log("error:", error)
    return new Error(error)
  }
}

const getAllFiles = async function*(dir: string): AsyncGenerator<string, void, void> {
  let dirents: fs.Dirent[]

  try {
    dirents = await fs.promises.readdir(dir, { withFileTypes: true })
  }
  catch (e) {
    return
  }

  for (const dirent of dirents) {
    const res = _path.resolve(dir, dirent.name)

    if ( !dirent.isDirectory() ) {
      yield res
      continue
    }
    yield* getAllFiles(res)
  }
}

/**
 * Better there's not a huge amount of bytes in `dir`, ayy lmao.
 */
const cacheFiles = async (path: string): Promise<void|Error> => {
  const stat = await getStat(path)

  if (stat instanceof Error) {
    return stat
  }

  const cacheFile = async (fileName: string, fileStat?: fs.Stats): Promise<void|Error> => {
    let fd: fs.promises.FileHandle
    let data: Buffer
    let gzipped = false

    try {
      fd		= await fs.promises.open(fileName, "r")
      data	= await fd.readFile()
    }
    catch (e) {
      return new Error(e.message || `error reading file ${fileName}`)
    }

    const fdFd		= fd.fd
    const stats2	= !fileStat ? (await getStatByFd(fd)) : fileStat

    try {
      await fd.close()
    }
    catch (e) {
      return new Error(e.message || `error closing fd ${fdFd}`)
    }

    if (stats2 instanceof Error) {
      return stats2
    }

    if (data.byteLength > GZIP_ABOVE_OF) {
      const gzippedData = await gzipData(data)

      if (gzippedData instanceof Error) {
        return gzippedData
      }
      gzipped	= true
      data	= gzippedData
    }

    console.log("caching...", fileName)

    cachedFiles[fileName] = {
      data,
      gzipped,
      etag: String(stats2.mtimeMs),
      mime: mime.getType(fileName) || "application/octet-stream",
    }
  }

  if ( stat.isFile() ) {
    return cacheFile(path, stat)
  }

  const gentor = getAllFiles(path)

  for await (const fileName of gentor) {
    const result = await cacheFile(fileName)

    if (result instanceof Error) {
      return result
    }
  }
}

const getHeaders = (contentLength: number, mimeType: string, etag: string, gzipped: boolean = false): OutgoingHttpHeaders => {
  const encoding = gzipped
    ? { [HTTP2_HEADER_CONTENT_ENCODING]: "gzip" }
    : {}

  const headers: OutgoingHttpHeaders = {
    [HTTP2_HEADER_CACHE_CONTROL]:	"no-cache",
    [HTTP2_HEADER_CONTENT_LENGTH]:	contentLength,
    [HTTP2_HEADER_CONTENT_TYPE]:	mimeType,
    [HTTP2_HEADER_ETAG]:			etag,
    [HTTP2_HEADER_STATUS]:			200,
    [HTTP2_HEADER_VARY]:			HTTP2_HEADER_ETAG,
    ...encoding,
  }

  return headers
}

const streamFile = async (stream: IHttpWriter, fileName: string, requestFile?: IRequestFile): Promise<void|Error> => {
  const fd = !requestFile ? (await opendFd(fileName, stream)) : requestFile.fd

  if (fd instanceof Error) {
    return fd
  }

  const fdFd	= fd.fd
  const stats	= !requestFile ? (await getStatByFd(fd)) : requestFile.stats

  if (stats instanceof Error) {
    fd.close()
    return stats
  }

  let gzipped		= false
  let contLength	= stats.size
  let fileData	= Buffer.of()

  if (stats.size > GZIP_ABOVE_OF) {
    try {
      fileData = await fd.readFile()
    }
    catch (e) {
      const error = e.message || `error reading fd ${fdFd}`
      console.log("error:", error)
      fd.close()
      return new Error(error)
    }

    console.log('compressing file', fileName)
    const gzippedData = await gzipData(fileData)

    if (gzippedData instanceof Error) {
      console.log("error:", gzippedData.message)
      fd.close()
      return gzippedData
    }
    gzipped		= true
    fileData	= gzippedData
    contLength	= fileData.byteLength
  }

  const headers = getHeaders(contLength, mime.getType(fileName) || "application/octet-stream", String(stats.mtimeMs), gzipped)

  console.log('streamed file', fileName)

  if (gzipped) {
    stream.respond(headers)
    stream.end(fileData)
    return
  }

  stream.respondWithFD(fdFd, headers)
}

const streamCachedFile = (stream: IHttpWriter, cachedFile: ICachedFile): void => {
  console.log("streamCachedFile.etag", cachedFile.etag)
  const headers = getHeaders(cachedFile.data.byteLength, cachedFile.mime, cachedFile.etag, cachedFile.gzipped)
  stream.respond(headers)
  stream.end(cachedFile.data)
}

const pushFile = async (stream: ServerHttp2Stream, urlPath: string, fileName: string): Promise<void|Error> => {
  if (!stream.pushAllowed) {
    return
  }
  console.log("pushed file: ", urlPath)
  let resolve: (result: void | Error) => void
  const run = new Promise<void|Error>((resolv) => { resolve = resolv })

  const headers = {
    [HTTP2_HEADER_METHOD]:	"GET",
    [HTTP2_HEADER_PATH]:	urlPath,
  }

  stream.pushStream(headers, (err: Error|null, pushStream: ServerHttp2Stream, hdrs: OutgoingHttpHeaders) => {
    if (err) {
      const error = err.message || `error while pushing file ${urlPath}`
      console.log("error:", error)
      resolve( new Error(error) )
      return
    }
    if (fileName in cachedFiles) {
      streamCachedFile(pushStream, cachedFiles[fileName])
      resolve()
      return
    }
    streamFile(pushStream, fileName)
      .then((result) => {
        resolve(result)
      })
  })

  await run
}

const http1Handler = (req: Http2ServerRequest, resp: Http2ServerResponse): void => {
  console.log("from", req.socket.remoteAddress)

  if (parseInt(req.httpVersion, 10) === 2) {
    return
  }

  const isDomainAllowed = false
    || req.headers[HTTP2_HEADER_HOST] === vars.MYVAR_WEB_SERVERDOMAIN
  const etag = req.headers[HTTP2_HEADER_IF_NONE_MATCH] as string
  const stream = new Http1Writer(resp)

  http2Handler(req.url, stream, isDomainAllowed, etag)
}

/**
 * Returns `undefined` when sending `304` or `404` to the response. Returns a `IRequestFile` otherwise.
 */
const getRequestFile = async (fileName: string, stream: IHttpWriter, etag?: string): Promise<IRequestFile|undefined> => {
  if (!!etag && fileName in cachedFiles && cachedFiles[fileName].etag === etag) {
    stream.respond({ [HTTP2_HEADER_STATUS]: 304 })
    stream.end()
    return
  }

  const fd = await opendFd(fileName, stream)

  if (fd instanceof Error) {
    stream.respond({ [HTTP2_HEADER_STATUS]: 404 })
    stream.end("file not found", "utf8")
    return
  }

  const stats = await getStatByFd(fd)

  if (stats instanceof Error) {
    // Not really a 404, but we don't want to throw a 500
    stream.respond({ [HTTP2_HEADER_STATUS]: 404 })
    stream.end("file not found", "utf8")
    return
  }

  if (!!etag && String(stats.mtimeMs) === etag) {
    stream.respond({ [HTTP2_HEADER_STATUS]: 304 })
    stream.end()
    return
  }

  return { fd, stats }
}

const requestListener: RequestListener = (req, resp) => {
  console.log("from", req.socket.remoteAddress)

  if (parseInt(req.httpVersion, 10) === 2) {
    return
  }

  const isDomainAllowed = false
    || req.headers[HTTP2_HEADER_HOST] === vars.MYVAR_WEB_SERVERDOMAIN
  const etag = req.headers[HTTP2_HEADER_IF_NONE_MATCH] as string
  const stream = new Http1Writer(resp)

  http2Handler(req.url as string, stream, isDomainAllowed, etag)
}

const refreshCache = async (): Promise<void|Error> => {
  if (!chacheable) {
    return
  }

  for (const path of pathsToCache) {
    const result = await cacheFiles( _path.resolve(PUBLIC_DIR, path) )

    if (result instanceof Error) {
      return result
    }
  }
}

const http2Handler = (url: string, stream: IHttpWriter, isDomainAllowed: boolean, etag?: string, h2: boolean = false) => {
  console.log(url)

  if (!isDomainAllowed) {
    stream.respond({
      [HTTP2_HEADER_EXPIRES]: 1,
      [HTTP2_HEADER_STATUS]: 200,
    })
    stream.end("website disabled")
    return
  }

  if (url === refreshCachePath) {
    refreshCache()
      .then((res) => {
        if (res instanceof Error) {
          stream.respond({ [HTTP2_HEADER_STATUS]: 500 })
          stream.end(res.message)
          return
        }
        stream.respond({
          [HTTP2_HEADER_EXPIRES]: 1,
          [HTTP2_HEADER_STATUS]: 200,
        })
        stream.end("ok")
      })

    return
  }
  /**
   * @ToDo Could just throw a 404 file?
   */
  const sendIndex		= !STATIC_PATHS.find( (path) => url.startsWith(path) )
  const url2			= url.startsWith("/") ? url.substr(1) : url
  const fileName		= _path.resolve( PUBLIC_DIR, (sendIndex ? DEFAULT_INDEX : url2) );

  (async () => {
    if (sendIndex && h2) {
      for (const dir of indexPushedFolders) {
        const gentor = getAllFiles( _path.resolve(PUBLIC_DIR, dir) )

        for await (const pushedFileName of gentor) {
          let urlPath	= pushedFileName.startsWith(PUBLIC_DIR) ? pushedFileName.substr(PUBLIC_DIR.length) : pushedFileName
          urlPath		= urlPath.startsWith("/") ? urlPath : `/${urlPath}`

          pushFile(stream as ServerHttp2Stream, urlPath, pushedFileName)
        }
      }
    }

    if (fileName in cachedFiles) {
      streamCachedFile(stream, cachedFiles[fileName])
      return
    }

    const requestFile = await getRequestFile(fileName, stream, etag)

    if (!requestFile) {
      return
    } //

    streamFile(stream, fileName, requestFile)
  })()
}

const server = isSecureConn
  ? createSecureServer(http2Config, http1Handler)
  : createServer(requestListener)
/*
createServer(requestListener)
createSecureServer(http2Config, http1Handler)
*/
server
  .listen(HTTP2_PORT, "0.0.0.0", () => {
    console.log("HTTP2 server started on port", HTTP2_PORT)

    refreshCache()
      .then((res) => {
        // meh
        console.log("refreshCache result: ", res)
      })
  })

if (isSecureConn) {
  server
  .on("stream", (stream: ServerHttp2Stream, headers: IncomingHttpHeaders): void => {
    const isDomainAllowed = false
      || vars.MYVAR_WEB_SERVERDOMAIN === headers[HTTP2_HEADER_HOST]
      || vars.MYVAR_WEB_SERVERDOMAIN === headers[HTTP2_HEADER_AUTHORITY]

    const url = headers[HTTP2_HEADER_PATH] as string
    const etag = headers[HTTP2_HEADER_IF_NONE_MATCH] as string
    http2Handler(url, stream, isDomainAllowed, etag, true)
  })
}
