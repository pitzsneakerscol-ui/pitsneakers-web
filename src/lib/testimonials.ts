import testimonialsData from "@/data/testimonials.json";
import { Testimonial } from "@/types/testimonial";

const testimonials = testimonialsData as Testimonial[];

export function getAllTestimonials(): Testimonial[] {
  return [...testimonials].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
