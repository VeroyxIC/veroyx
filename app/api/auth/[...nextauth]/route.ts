import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || "veroyx_institutional_production_secret_key_2026",
  providers: [
    CredentialsProvider({
      name: 'Cryptographic Token',
      credentials: {
        token: { label: "Zero-Trust Token", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.token === "vx_admin") {
          return { id: "1", name: "Command Lead", email: "admin@veroyx.com", clearance: "TOP SECRET" }
        }
        return null
      }
    })
  ],
  pages: {
    signIn: '/',
  },
  session: {
    strategy: "jwt",
  }
})

export { handler as GET, handler as POST }
