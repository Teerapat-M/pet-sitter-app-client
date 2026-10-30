import AuthSplit from "@/components/AuthSplit";
import RegisterForm from "@/components/RegisterForm";

export const metadata = {
  title: "Create account | Pet Sitter Plus",
};

export default async function RegisterPage({ searchParams }) {
  const { type } = await searchParams;
  const initialMode = type === "sitter" ? "sitter" : "owner";

  return (
    <AuthSplit
      panel="mint"
      headline={
        <>
          Join as an owner
          <br />
          or become a sitter.
        </>
      }
      sub="Sitters with CCTV get a verified badge and more bookings."
      photoLabel="🏠 Sitter home photo"
    >
      <RegisterForm initialMode={initialMode} />
    </AuthSplit>
  );
}
