export interface Testimonial {
  id: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  product?: string;
  /** Foto de la reseña (ruta en /public, por ejemplo /resenas/camilo.webp). */
  photo?: string;
  date: string;
}
