import testimonialsData from "@/data/testimonials.json";
import { Testimonial } from "@/types/testimonial";
import { approvedTestimonials } from "@/lib/reviews";

const testimonials = testimonialsData as Testimonial[];

/** Las del archivo más las que los clientes enviaron y el dueño aprobó. */
export async function getAllTestimonials(): Promise<Testimonial[]> {
  const fromClients = await approvedTestimonials();
  return [...testimonials, ...fromClients].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
