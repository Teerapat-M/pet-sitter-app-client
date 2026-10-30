import Navbar from "../../components/Navbar";

export default function FindSitterLayout({ children }) {
  return (
    <>
      <Navbar />
      <div className="flex-1">{children}</div>
    </>
  );
}
