import { useState } from 'react'
import { supabase } from './supabaseClient' // O arquivo onde você configurou o createClient

export function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // O Supabase envia um link mágico para o e-mail (Magic Link)
    // Sem senhas = Mais segurança e menos código para você!
    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) alert(error.message)
    else alert('Verifique seu e-mail para o link de login!')
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <h2>Entrar no Guia de Xadrez</h2>
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          placeholder="Seu e-mail" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
        />
        <button disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar Link Mágico'}
        </button>
      </form>
    </div>
  )
}