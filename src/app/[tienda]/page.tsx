import { notFound } from "next/navigation";
import LoginTienda from "@/components/LoginTienda";
import { tiendaPorSlug } from "@/lib/tiendas";

export default async function Page({
  params,
}: {
  params: Promise<{ tienda: string }>;
}) {
  const t = tiendaPorSlug((await params).tienda);
  if (!t) notFound();
  return <LoginTienda id={t.id} slug={t.slug} nombre={t.nombre} />;
}
