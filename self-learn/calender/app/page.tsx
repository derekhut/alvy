import Image from "next/image";
import Navbar from "./navbar/page";
import Hero from "./hero/page";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
    </main>
  );
}
