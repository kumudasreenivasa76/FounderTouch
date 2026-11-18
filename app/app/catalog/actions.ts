"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { putUpload, deleteUpload } from "@/lib/storage";

const IMG: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };

async function photo(fd: FormData) {
  const f = fd.get("image");
  if (!(f instanceof File) || !f.size) return "";
  if (!IMG[f.type] || f.size > 5 * 1024 * 1024) redirect("/app/catalog?err=image");
  const name = "product-" + randomBytes(8).toString("hex") + IMG[f.type];
  await putUpload(name, Buffer.from(await f.arrayBuffer()), f.type);
  return name;
}

export async function addProduct(fd: FormData) {
  const { profile } = await requireOwner();
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  if (!name) redirect("/app/catalog?err=name");
  const last = await db.product.findFirst({ where: { profileId: profile.id }, orderBy: { order: "desc" } });
  await db.product.create({ data: { profileId: profile.id, name, price: String(fd.get("price") ?? "").trim().slice(0, 60), description: String(fd.get("description") ?? "").trim().slice(0, 300), image: await photo(fd), order: (last?.order ?? 0) + 1 } });
  revalidatePath("/app/catalog");
  redirect("/app/catalog?saved=1");
}

export async function updateProduct(fd: FormData) {
  const { profile } = await requireOwner();
  const x = await db.product.findFirst({ where: { id: String(fd.get("id")), profileId: profile.id } });
  if (!x) return;
  const image = await photo(fd);
  if (image && x.image) await deleteUpload(x.image).catch(() => {});
  await db.product.update({ where: { id: x.id }, data: { name: String(fd.get("name") ?? x.name).trim().slice(0, 120) || x.name, price: String(fd.get("price") ?? "").trim().slice(0, 60), description: String(fd.get("description") ?? "").trim().slice(0, 300), ...(image ? { image } : {}) } });
  revalidatePath("/app/catalog");
  redirect("/app/catalog?saved=1");
}

export async function deleteProduct(fd: FormData) {
  const { profile } = await requireOwner();
  const x = await db.product.findFirst({ where: { id: String(fd.get("id")), profileId: profile.id } });
  if (!x) return;
  await db.product.delete({ where: { id: x.id } });
  if (x.image) await deleteUpload(x.image).catch(() => {});
  revalidatePath("/app/catalog");
}
