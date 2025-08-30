import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar no sistema | Lab Admin",
  description: "Página de login do Lab Admin",
};

export default function SignIn() {
  return <SignInForm />;
}
