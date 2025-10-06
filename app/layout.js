import { AuthProvider } from './lib/hooks/useAuth'
import './globals.css'

export const metadata = {
  title: 'Admin Panel',
  description: 'Simple admin login and dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
