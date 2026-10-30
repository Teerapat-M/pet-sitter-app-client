import AuthSplit from "@/components/AuthSplit";
import LoginForm from "@/components/LoginForm";

export const metadata = {
  title: "Log in | Pet Sitter Plus",
};

export default function OwnerLoginPage() {
  return (
    <AuthSplit
      headline={
        <>
          Trusted sitters.
          <br />
          Live cameras.
          <br />
          Happy pets.
        </>
      }
      sub="Book boarding, walks and home visits — watch CCTV and track walks live."
      photoLabel="🐾 Happy pet photo"
    >
      <LoginForm
        title="Welcome back"
        subtitle="Log in to manage your bookings"
        registerHref="/register"
        registerPrompt="New here?"
        registerLabel="Create an account ›"
        showForgotPassword
        showSocial
      />
    </AuthSplit>
  );
}
