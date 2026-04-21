import { useState } from 'react'
import { supabase } from './supabaseClient'

export function AuthForm() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      alert('Erro: ' + error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: '0 0 16px' }}>
          Verifique seu e-mail! Enviamos um link mágico para você acessar.
        </p>
        <button
          onClick={() => setSent(false)}
          style={{
            background: 'none', border: 'none', color: '#c4a74a',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          Tentar outro e-mail
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 4 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#fff' }}>
        Entrar no ChessPlan
      </h3>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 16px', lineHeight: 1.5 }}>
        Digite seu e-mail para receber um link de acesso instantâneo.
      </p>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          id="email"   // Adicione isso
          name="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: '12px 14px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: '#1a1a1a', color: 'white',
            fontSize: 14, outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12, borderRadius: 8,
            background: loading ? 'rgba(196,167,74,0.3)' : '#c4a74a',
            color: '#000', border: 'none',
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 700, fontSize: 14,
          }}
        >
          {loading ? 'Enviando...' : 'Receber Link Mágico'}
        </button>
      </form>
    </div>
  )
}