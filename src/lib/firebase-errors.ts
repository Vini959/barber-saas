export function getFirebaseAuthErrorMessage(error: unknown, fallback: string): string {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha invalidos.";
    case "auth/invalid-email":
      return "O e-mail informado e invalido.";
    case "auth/user-disabled":
      return "Esta conta foi desativada.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente em alguns minutos.";
    case "auth/network-request-failed":
      return "Falha de rede ao falar com o Firebase. Verifique sua conexao.";
    case "auth/email-already-in-use":
      return "Este e-mail ja esta em uso.";
    case "auth/weak-password":
      return "A senha precisa ter pelo menos 6 caracteres.";
    case "auth/operation-not-allowed":
      return "Login por e-mail/senha nao esta habilitado no Firebase Auth.";
    default:
      return fallback;
  }
}