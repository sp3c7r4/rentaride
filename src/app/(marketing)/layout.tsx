import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

/** Public content pages: solid navbar, footer, shared width. */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar solid />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </>
  );
}
