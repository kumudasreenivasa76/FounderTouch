import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

/**
 * File storage for uploads (photos, logos, resumes, decks). Local `uploads/` folder by default;
 * an S3 bucket when S3_BUCKET is set (AWS). Callers pass the stored file name only.
 */
const bucket = () => process.env.S3_BUCKET || "";
const dir = () => path.join(process.cwd(), "uploads");
const safe = (name: string) => path.basename(name);

async function s3() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  const g = globalThis as unknown as { s3?: InstanceType<typeof S3Client> };
  return (g.s3 ??= new S3Client({ region: process.env.AWS_REGION || "ap-south-1" }));
}

export async function putUpload(name: string, data: Buffer, contentType?: string) {
  if (bucket()) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(new PutObjectCommand({ Bucket: bucket(), Key: safe(name), Body: data, ContentType: contentType }));
    return;
  }
  await mkdir(dir(), { recursive: true });
  await writeFile(path.join(dir(), safe(name)), data);
}

export async function getUpload(name: string): Promise<Buffer<ArrayBuffer>> {
  if (bucket()) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const r = await (await s3()).send(new GetObjectCommand({ Bucket: bucket(), Key: safe(name) }));
    return Buffer.from(await r.Body!.transformToByteArray());
  }
  return readFile(path.join(dir(), safe(name)));
}

export async function deleteUpload(name: string) {
  if (bucket()) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(new DeleteObjectCommand({ Bucket: bucket(), Key: safe(name) }));
    return;
  }
  await unlink(path.join(dir(), safe(name)));
}
