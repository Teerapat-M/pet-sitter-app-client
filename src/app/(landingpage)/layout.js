import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <div className="flex-1">{children}</div>
      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );
}
