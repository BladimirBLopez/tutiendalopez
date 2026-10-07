// Tiendas del sistema: cada una tiene su propio enlace de acceso (/alvina, /yeni)
export const TIENDAS_WEB = [
  { id: 1, slug: "alvina", nombre: "Alvina" },
  { id: 2, slug: "yeni", nombre: "Yeni" },
];

export const tiendaPorSlug = (slug: string) => TIENDAS_WEB.find((t) => t.slug === slug);
export const tiendaPorId = (id: number) => TIENDAS_WEB.find((t) => t.id === id);
